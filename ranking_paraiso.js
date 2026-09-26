import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let allEvaluations = [];
const paraisoStartups = new Set([
  "CoffeeTech Solutions",
  "AgroDrone Paraíso",
  "BioGrao Analytics",
  "SmartHarvest"
]);

const rankingBody = document.getElementById("rankingBody");
const observationDialog = document.getElementById("observationDialog");
const observationTitle = document.getElementById("observationTitle");
const observationContent = document.getElementById("observationContent");

document.getElementById("closeObservationDialog").addEventListener("click", () => {
  observationDialog.close();
});

// Listener em tempo real do Firestore
onSnapshot(collection(db, "evaluations"), (snapshot) => {
  allEvaluations = [];
  snapshot.forEach(doc => allEvaluations.push(doc.data()));
  renderRanking();
});

function renderRanking() {
  // Agrupa e calcula as médias por startup
  const summary = {};

  allEvaluations
    .filter(ev => ev.campus === "paraiso" || paraisoStartups.has(ev.startup))
    .forEach(ev => {
      if (!summary[ev.startup]) {
        summary[ev.startup] = {
          name: ev.startup,
          totalScoreSum: 0,
          evaluationsCount: 0,
          observations: []
        };
      }
      summary[ev.startup].totalScoreSum += (ev.totalScore || 0);
      summary[ev.startup].evaluationsCount += 1;
      const note = typeof ev.notes === "string" ? ev.notes.trim() : "";
      if (note) {
        summary[ev.startup].observations.push({
          evaluator: typeof ev.evaluator === "string" ? ev.evaluator.trim() : "",
          note
        });
      }
    });

  const ranked = Object.values(summary).map(item => ({
    ...item,
    average: item.evaluationsCount > 0 ? (item.totalScoreSum / item.evaluationsCount).toFixed(2) : 0
  })).sort((a, b) => b.average - a.average);

  // Renderiza tabela
  rankingBody.innerHTML = "";

  if (ranked.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma avaliação registrada.</td></tr>`;
    return;
  }

  ranked.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const posClass = idx === 0 ? "pos-1" : idx === 1 ? "pos-2" : idx === 2 ? "pos-3" : "";

    const positionCell = document.createElement("td");
    positionCell.className = posClass;
    positionCell.textContent = `#${idx + 1}`;

    const nameCell = document.createElement("td");
    nameCell.className = "startup-name";
    nameCell.textContent = item.name;

    const evaluationsCell = document.createElement("td");
    evaluationsCell.textContent = item.evaluationsCount;

    const averageCell = document.createElement("td");
    averageCell.className = "ranking-average";
    averageCell.textContent = `${item.average} pts`;

    const observationsCell = document.createElement("td");
    if (item.observations.length > 0) {
      const eyeButton = document.createElement("button");
      eyeButton.type = "button";
      eyeButton.className = "observation-button";
      eyeButton.setAttribute("aria-label", `Ver observações de ${item.name}`);
      eyeButton.title = "Ver observações";
      eyeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      eyeButton.addEventListener("click", () => showObservations(item));
      observationsCell.appendChild(eyeButton);
    }

    tr.append(positionCell, nameCell, evaluationsCell, averageCell, observationsCell);
    rankingBody.appendChild(tr);
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
