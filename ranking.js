import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentCampusFilter = "paraiso";
let allEvaluations = [];

const rankingBody = document.getElementById("rankingBody");
const tabButtons = document.querySelectorAll(".tab-btn");

// Gerenciamento de abas de filtro
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCampusFilter = btn.dataset.campus;
    renderRanking();
  });
});

// Listener em tempo real do Firestore
onSnapshot(collection(db, "evaluations"), (snapshot) => {
  allEvaluations = [];
  snapshot.forEach(doc => allEvaluations.push(doc.data()));
  renderRanking();
});

function renderRanking() {
  const filtered = currentCampusFilter === "todos" 
    ? allEvaluations 
    : allEvaluations.filter(ev => ev.campus === currentCampusFilter);

  // Agrupa e calcula as médias por startup
  const summary = {};

  filtered.forEach(ev => {
    if (!summary[ev.startup]) {
      summary[ev.startup] = {
        name: ev.startup,
        campus: ev.campus === "paraiso" ? "Paraíso" : "Sede (Lavras)",
        totalScoreSum: 0,
        evaluationsCount: 0
      };
    }
    summary[ev.startup].totalScoreSum += (ev.totalScore || 0);
    summary[ev.startup].evaluationsCount += 1;
  });

  const ranked = Object.values(summary).map(item => ({
    ...item,
    average: item.evaluationsCount > 0 ? (item.totalScoreSum / item.evaluationsCount).toFixed(2) : 0
  })).sort((a, b) => b.average - a.average);

  // Renderiza tabela
  rankingBody.innerHTML = "";

  if (ranked.length === 0) {
    rankingBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhuma avaliação registrada para este filtro.</td></tr>`;
    return;
  }

  ranked.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const posClass = idx === 0 ? "pos-1" : idx === 1 ? "pos-2" : idx === 2 ? "pos-3" : "";
    
    tr.innerHTML = `
      <td class="${posClass}">#${idx + 1}</td>
      <td style="font-weight: 600;">${item.name}</td>
      <td>${item.campus}</td>
      <td>${item.evaluationsCount}</td>
      <td style="font-weight: bold; color: var(--coffee-accent);">${item.average} pts</td>
    `;
    rankingBody.appendChild(tr);
  });
}