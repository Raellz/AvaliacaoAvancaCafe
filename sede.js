import { db } from "./firebase-config.js";
import { addDoc, collection, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Dados importados do Google Forms devem ser gravados em startups_sede
// com os campos nome (ou name) e pdfUrl (link de download do Firebase Storage).
const STARTUPS_COLLECTION = "startups_sede";
const EVALUATIONS_COLLECTION = "evaluations_sede";
const startupSelect = document.getElementById("startupSelect");
const startupStatus = document.getElementById("startupStatus");
const presentationPdf = document.getElementById("presentationPdf");
const presentationLink = document.getElementById("presentationLink");
const evaluatorInput = document.getElementById("evaluatorName");
const form = document.getElementById("evaluationForm");
const submitButton = form.querySelector('button[type="submit"]');
const evaluatorStorageKey = "avancaCafeEvaluatorName_sede";

let startups = new Map();

try {
  evaluatorInput.value = localStorage.getItem(evaluatorStorageKey) || "";
} catch (err) {
  console.warn("Não foi possível recuperar o nome do avaliador neste navegador.", err);
}

evaluatorInput.addEventListener("input", () => {
  try {
    const name = evaluatorInput.value.trim();
    if (name) {
      localStorage.setItem(evaluatorStorageKey, name);
    } else {
      localStorage.removeItem(evaluatorStorageKey);
    }
  } catch (err) {
    console.warn("Não foi possível salvar o nome do avaliador neste navegador.", err);
  }
});

function normalizeKey(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function readField(data, aliases) {
  const fields = new Map(Object.entries(data).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = fields.get(normalizeKey(alias));
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function updatePresentationLink() {
  const startup = startups.get(startupSelect.value);
  const pdfUrl = startup ? safeWebUrl(startup.pdfUrl) : "";

  if (!pdfUrl) {
    presentationPdf.hidden = true;
    presentationLink.removeAttribute("href");
    startupStatus.textContent = startup
      ? "PDF ainda não cadastrado para esta startup."
      : startups.size
        ? "Selecione uma startup para abrir o PDF do pitch, se disponível."
        : "Nenhuma startup da Sede cadastrada em startups_sede.";
    return;
  }

  presentationLink.href = pdfUrl;
  presentationPdf.hidden = false;
  startupStatus.textContent = "PDF do pitch disponível no Firebase Storage.";
}

startupSelect.addEventListener("change", updatePresentationLink);

onSnapshot(collection(db, STARTUPS_COLLECTION), (snapshot) => {
  startups = new Map();
  snapshot.forEach((startupDoc) => {
    const data = startupDoc.data();
    const name = readField(data, ["nome", "name", "startup", "nome da startup", "equipe"]) || startupDoc.id;
    const pdfUrl = readField(data, ["pdfUrl", "link do pdf", "link do pdf do pitch", "url do pdf", "linkPdf", "pdf"]);
    startups.set(startupDoc.id, { id: startupDoc.id, name, pdfUrl });
  });

  const selectedId = startupSelect.value;
  startupSelect.replaceChildren(new Option("Selecione a startup...", ""));
  [...startups.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .forEach((startup) => startupSelect.add(new Option(startup.name, startup.id)));

  if (startups.has(selectedId)) startupSelect.value = selectedId;
  updatePresentationLink();
}, (err) => {
  console.error("Erro ao carregar startups da UFLA Sede:", err);
  startupSelect.replaceChildren(new Option("Não foi possível carregar as startups", ""));
  startupStatus.textContent = "Falha ao consultar startups_sede. Verifique a conexão e as permissões do Firebase.";
  presentationPdf.hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  evaluatorInput.value = evaluatorInput.value.trim();
  if (!form.reportValidity()) return;

  const selectedStartup = startups.get(startupSelect.value);
  if (!selectedStartup) {
    startupStatus.textContent = "Selecione uma startup cadastrada para continuar.";
    startupSelect.focus();
    return;
  }

  const getScore = (name) => {
    const selected = form.querySelector(`input[name="${name}"]:checked`);
    return selected ? Number(selected.value) : null;
  };
  const scores = Object.fromEntries(
    ["c1", "c2", "c3", "c4", "c5", "c6"].map((name) => [name, getScore(name)])
  );
  if (Object.values(scores).some((score) => score === null)) return;

  const payload = {
    evaluator: evaluatorInput.value,
    startup: selectedStartup.name,
    startupId: selectedStartup.id,
    ...scores,
    notes: document.getElementById("observations").value.trim(),
    createdAt: serverTimestamp()
  };
  payload.totalScore = payload.c1 + payload.c2 + payload.c3 + payload.c4 + payload.c5 + payload.c6;

  submitButton.disabled = true;
  try {
    await addDoc(collection(db, EVALUATIONS_COLLECTION), payload);
    alert("Avaliação da UFLA Sede registrada com sucesso!");
    const currentEvaluator = evaluatorInput.value;
    form.reset();
    evaluatorInput.value = currentEvaluator;
    updatePresentationLink();
  } catch (err) {
    console.error("Erro ao salvar avaliação da UFLA Sede:", err);
    alert("Ocorreu um erro ao salvar a avaliação. Verifique a conexão.");
  } finally {
    submitButton.disabled = false;
  }
});
