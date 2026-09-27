import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const rankingBody = document.getElementById("rankingBody");
const observationDialog = document.getElementById("observationDialog");
const observationTitle = document.getElementById("observationTitle");
const observationContent = document.getElementById("observationContent");
let evaluations = [];
let startups = [];
let evaluationsLoaded = false;
let startupsLoaded = false;
let evaluationsError = "";
let startupsError = "";

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

function renderRanking() {
  rankingBody.replaceChildren();
  const loadError = evaluationsError || startupsError;
  if (loadError) {
    rankingBody.innerHTML = `<tr><td colspan="6" class="ranking-message">${loadError}</td></tr>`;
    return;
  }
  if (!evaluationsLoaded || !startupsLoaded) {
    rankingBody.innerHTML = '<tr><td colspan="6" class="ranking-message">Carregando resultados...</td></tr>';
    return;
  }

  const startupsById = new Map(startups.map((startup) => [startup.id, startup]));
  const startupsByName = new Map(startups.map((startup) => [startup.name, startup]));
  const summary = new Map();

  evaluations.forEach((evaluation) => {
    const startupId = evaluation.startupId || "";
    const startup = startupsById.get(startupId) || startupsByName.get(evaluation.startup) || null;
    const name = startup?.name || evaluation.startup || "Startup sem nome";
    const key = startupId || name;

    if (!summary.has(key)) {
      summary.set(key, {
        id: startupId,
        name,
        pdfUrl: startup?.pdfUrl || "",
        totalScoreSum: 0,
        evaluationsCount: 0,
        observations: []
      });
    }

    const item = summary.get(key);
    const score = Number(evaluation.totalScore) || ["c1", "c2", "c3", "c4", "c5", "c6"]
      .reduce((sum, criterion) => sum + (Number(evaluation[criterion]) || 0), 0);
    item.totalScoreSum += score;
    item.evaluationsCount += 1;

    const note = typeof evaluation.notes === "string" ? evaluation.notes.trim() : "";
    if (note) {
      item.observations.push({
        evaluator: typeof evaluation.evaluator === "string" ? evaluation.evaluator.trim() : "",
        note
      });
    }
  });

  const ranked = [...summary.values()]
    .sort((a, b) => b.totalScoreSum - a.totalScoreSum);

  if (!ranked.length) {
    rankingBody.innerHTML = '<tr><td colspan="6" class="ranking-message">Nenhuma avaliação da Sede registrada.</td></tr>';
    return;
  }

  ranked.forEach((item, index) => {
    const row = document.createElement("tr");
    const position = document.createElement("td");
    position.className = index === 0 ? "pos-1" : index === 1 ? "pos-2" : index === 2 ? "pos-3" : "";
    position.textContent = `#${index + 1}`;

    const name = document.createElement("td");
    name.className = "startup-name";
    name.textContent = item.name;

    const pdfCell = document.createElement("td");
    const pdfUrl = safeWebUrl(item.pdfUrl);
    if (pdfUrl) {
      const pdfLink = document.createElement("a");
      pdfLink.className = "pitch-pdf-link";
      pdfLink.href = pdfUrl;
      pdfLink.target = "_blank";
      pdfLink.rel = "noopener noreferrer";
      pdfLink.textContent = "Abrir PDF";
      pdfCell.appendChild(pdfLink);
    } else {
      pdfCell.textContent = "—";
    }

    const count = document.createElement("td");
    count.textContent = item.evaluationsCount;

    const score = document.createElement("td");
    score.className = "ranking-total-score";
    score.textContent = `${item.totalScoreSum} pts`;

    const notes = document.createElement("td");
    if (item.observations.length) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "observation-button";
      button.setAttribute("aria-label", `Ver observações de ${item.name}`);
      button.title = "Ver observações";
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      button.addEventListener("click", () => showObservations(item));
      notes.appendChild(button);
    }

    row.append(position, name, pdfCell, count, score, notes);
    rankingBody.appendChild(row);
  });
}

function showObservations(item) {
  observationTitle.textContent = `Observações — ${item.name}`;
  observationContent.replaceChildren();

  item.observations.forEach(({ evaluator, note }) => {
    const entry = document.createElement("article");
    entry.className = "observation-entry";
    if (evaluator) {
      const author = document.createElement("h3");
      author.textContent = evaluator;
      entry.appendChild(author);
    }
    const text = document.createElement("p");
    text.textContent = note;
    entry.appendChild(text);
    observationContent.appendChild(entry);
  });

  observationDialog.showModal();
}

document.getElementById("closeObservationDialog").addEventListener("click", () => observationDialog.close());

onSnapshot(collection(db, "evaluations_sede"), (snapshot) => {
  evaluations = snapshot.docs.map((doc) => doc.data());
  evaluationsLoaded = true;
  evaluationsError = "";
  renderRanking();
}, (err) => {
  console.error("Erro ao carregar avaliações da Sede:", err);
  evaluationsError = "Não foi possível carregar evaluations_sede. Verifique a conexão e as permissões do Firebase.";
  renderRanking();
});

onSnapshot(collection(db, "startups_sede"), (snapshot) => {
  startups = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: readField(data, ["nome", "name", "startup", "nome da startup", "equipe"]) || doc.id,
      pdfUrl: readField(data, ["pdfUrl", "link do pdf", "link do pdf do pitch", "url do pdf", "linkPdf", "pdf"])
    };
  });
  startupsLoaded = true;
  startupsError = "";
  renderRanking();
}, (err) => {
  console.error("Erro ao carregar startups e PDFs da Sede:", err);
  startupsError = "Não foi possível carregar startups_sede. Verifique a conexão e as permissões do Firebase.";
  renderRanking();
});
