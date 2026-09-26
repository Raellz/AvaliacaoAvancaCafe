import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Lista de equipes cadastradas por polo
const startupsByCampus = {
  paraiso: [
    "CoffeeTech Solutions",
    "AgroDrone Paraíso",
    "BioGrao Analytics",
    "SmartHarvest"
  ],
  sede: [
    "Lavras AgroAI",
    "CafeVerde Sustentabilidade",
    "RoboCrop UFLA",
    "SensorGraos"
  ]
};

const campusSelect = document.getElementById("campusSelect");
const startupSelect = document.getElementById("startupSelect");
const form = document.getElementById("evaluationForm");

// Atualiza o select de startups dinamicamente ao trocar de polo
campusSelect.addEventListener("change", (e) => {
  const campus = e.target.value;
  startupSelect.innerHTML = '<option value="">Selecione a startup...</option>';
  
  if (startupsByCampus[campus]) {
    startupsByCampus[campus].forEach(startup => {
      const opt = document.createElement("option");
      opt.value = startup;
      opt.textContent = startup;
      startupSelect.appendChild(opt);
    });
  }
});

// Envio da avaliação para o Firestore
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const getScore = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? Number(el.value) : 0;
  };

  const payload = {
    evaluator: document.getElementById("evaluatorName").value.trim(),
    campus: campusSelect.value,
    startup: startupSelect.value,
    c1: getScore("c1"),
    c2: getScore("c2"),
    c3: getScore("c3"),
    c4: getScore("c4"),
    c5: getScore("c5"),
    c6: getScore("c6"), // Opcional
    notes: document.getElementById("observations").value.trim(),
    createdAt: serverTimestamp()
  };

  payload.totalScore = payload.c1 + payload.c2 + payload.c3 + payload.c4 + payload.c5;

  try {
    await addDoc(collection(db, "evaluations"), payload);
    alert("Avaliação registrada com sucesso!");
    
    // Mantém o avaliador e o polo para agilizar a próxima avaliação da mesma pessoa
    const currentEvaluator = document.getElementById("evaluatorName").value;
    const currentCampus = campusSelect.value;
    form.reset();
    document.getElementById("evaluatorName").value = currentEvaluator;
    campusSelect.value = currentCampus;
    campusSelect.dispatchEvent(new Event("change"));
  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("Ocorreu um erro ao salvar a avaliação. Verifique a conexão.");
  }
});