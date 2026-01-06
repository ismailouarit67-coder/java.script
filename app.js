const STORAGE_KEY = "cryptofolio_actifs";

const form = document.getElementById("ajouter_crypto");
const tbody = document.getElementById("tableaux");

const nom = document.querySelector("#nom");
const symbole = document.getElementById("symbole");
const quantite = document.getElementById("quantiter");
const prixAchat = document.getElementById("prixAchat");
const portefeuille = document.getElementById("portefeuille");

let actifs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const kpis = document.querySelectorAll("#dashboard .kpi__value");

const COINS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LTC: "litecoin"
};

let liveUSD = {};
let chartInstance = null;

afficherActifs();

/* =========================
   AJOUT ACTIF
========================= */
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const nomVal = nom.value.trim();
  const symboleVal = symbole.value.trim().toUpperCase();
  const quantiteVal = Number(quantite.value);
  const prixVal = Number(prixAchat.value);
  const portefeuilleVal = portefeuille.value;

  if (!nomVal || !symboleVal || !portefeuilleVal || quantiteVal <= 0 || prixVal <= 0) {
    alert("Veuillez remplir correctement tous les champs.");
    return;
  }

  const actif = {
    id: Date.now(),
    nom: nomVal,
    symbole: symboleVal,
    quantite: quantiteVal,
    prixAchat: prixVal,
    portefeuille: portefeuilleVal,
  };

  actifs.push(actif);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actifs));

  afficherActifs();
  form.reset();
});

/* =========================
   DASHBOARD (KPI)
========================= */
function updateDashboard() {
  if (!kpis || kpis.length < 3) return;

  let valeur = 0;
  let compteur = 0;

  actifs.forEach((a) => {
    const sym = (a.symbole || "").toUpperCase();
    valeur += Number(a.quantite) * (liveUSD[sym] ?? Number(a.prixAchat));
    compteur++;
  });

  kpis[0].textContent = valeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " MAD";
  kpis[1].textContent = compteur;

  let bestNom = "-";
  let bestVal = -Infinity;

  actifs.forEach((a) => {
    const sym = (a.symbole || "").toUpperCase();
    const v = Number(a.quantite) * (liveUSD[sym] ?? Number(a.prixAchat));
    if (v > bestVal) {
      bestVal = v;
      bestNom = a.nom + " (" + a.symbole + ")";
    }
  });

  kpis[2].textContent = bestNom;
}

/* =========================
   CHART
========================= */
function updateChart() {
  const canvas = document.getElementById("chartActifs");
  if (!canvas) return;

  const labels = [];
  const data = [];

  actifs.forEach((a) => {
    const sym = (a.symbole || "").toUpperCase();
    labels.push(a.nom + " (" + a.symbole + ")");
    data.push(Number(a.quantite) * (liveUSD[sym] ?? Number(a.prixAchat)));
  });

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (labels.length === 0) return;

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Valeur (quantité × prix)",
        data: data
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* =========================
   AFFICHAGE TABLE
========================= */
function afficherActifs() {
  tbody.innerHTML = "";

  if (actifs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Aucun actif ajouté.</td></tr>`;
    updateDashboard();
    updateChart();
    fetchPrices();
    return;
  }

  actifs.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.nom}</td>
      <td>${a.symbole}</td>
      <td>${a.quantite}</td>
      <td>${a.prixAchat}</td>
      <td>${a.portefeuille}</td>
      <td><button type="button" class="btn-supprimer" data-id="${a.id}">Supprimer</button></td>
      <td><button type="button" class="btn-modifier" data-id="${a.id}">modifier</button></td>
    `;
    tbody.appendChild(tr);
  });

  updateDashboard();
  updateChart();
  fetchPrices(); // ✅ pour que CoinGecko se mette à jour après ajout/suppression/modif
}

/* =========================
   RECHERCHE (bouton)
========================= */
const rech = document.getElementById("recherche");
if (rech) {
  rech.addEventListener("click", function () {
    const nom_de_actif = document.getElementById("re");
    const zonee = document.getElementById("rechercher");
    if (!nom_de_actif || !zonee) return;

    const le_nom = nom_de_actif.value.trim().toLowerCase();
    zonee.innerHTML = "";

    const actttif = actifs.find(a => (a.nom || "").toLowerCase() === le_nom);

    if (!actttif) {
      zonee.innerHTML = "<p>Aucun actif trouvé.</p>";
      return;
    }

    const r = document.createElement("div");

    r.innerHTML = `
      <table id="table-pour-modifier">
        <thead>
          <tr>
            <th>nom</th>
            <th>symbole</th>
            <th>quantité</th>
            <th>prix d’achat</th>
            <th>portefeuille</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${actttif.nom}</td>
            <td>${actttif.symbole}</td>
            <td>${actttif.quantite}</td>
            <td>${actttif.prixAchat}</td>
            <td>${actttif.portefeuille}</td>
            <td><button type="button" id="fermerr">fermer</button></td>
          </tr>
        </tbody>
      </table>
    `;

    zonee.appendChild(r);

    // ✅ fermer = faire disparaître le tableau
    document.getElementById("fermerr").addEventListener("click", function () {
      zonee.innerHTML = "";
    });
  });
}

/* =========================
   SUPPRIMER
========================= */
tbody.addEventListener("click", function (e) {
  if (!e.target.classList.contains("btn-supprimer")) return;

  const id = Number(e.target.dataset.id);
  if (!confirm("Voulez-vous vraiment supprimer cet actif ?")) return;

  actifs = actifs.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actifs));

  afficherActifs();
});

/* =========================
   MODIFIER
========================= */
tbody.addEventListener("click", function (mod) {
  if (!mod.target.classList.contains("btn-modifier")) return;

  const ido = Number(mod.target.dataset.id);
  const actifo = actifs.find(a => a.id === ido);
  if (!actifo) return;

  const x = document.createElement("div");

  x.innerHTML = `
    <table id="table-pour-modifier">
      <thead>
        <tr>
          <th>Nouveau nom</th>
          <th>Nouveau symbole</th>
          <th>Nouvelle quantité</th>
          <th>Nouveau prix d’achat</th>
          <th>Nouveau portefeuille</th>
          <th>enregistrer</th>
        </tr>
      </thead>
      <tbody id="valeur-modifier">
        <tr>
          <td><input id="m-nom" value="${actifo.nom}"></td>
          <td><input id="m-symbole" value="${actifo.symbole}"></td>
          <td><input id="m-quantite" type="number" value="${actifo.quantite}"></td>
          <td><input id="m-prix" type="number" value="${actifo.prixAchat}"></td>
          <td><input id="m-portefeuille" value="${actifo.portefeuille}"></td>
          <td><button type="button" id="enregistrer">enregistrer</button></td>
        </tr>
      </tbody>
    </table>
  `;

  const zone = document.getElementById("modifiere");
  zone.innerHTML = "";
  zone.appendChild(x);

  document.getElementById("enregistrer").addEventListener("click", function () {
    const newNom = document.getElementById("m-nom").value;
    const newSymbole = document.getElementById("m-symbole").value;
    const newQuantite = document.getElementById("m-quantite").value;
    const newPrix = document.getElementById("m-prix").value;
    const newPortefeuille = document.getElementById("m-portefeuille").value;

    actifo.nom = newNom.trim();
    actifo.symbole = newSymbole.trim().toUpperCase();
    actifo.quantite = Number(newQuantite);
    actifo.prixAchat = Number(newPrix);
    actifo.portefeuille = newPortefeuille.trim();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(actifs));
    afficherActifs();
    document.getElementById("modifiere").innerHTML = "";
  });
});

/* =========================
   COINGECKO
========================= */
function fetchPrices() {
  const status = document.getElementById("api-status");
  const box = document.getElementById("api-prices");

  const ids = [];

  actifs.forEach(a => {
    const sym = (a.symbole || "").toUpperCase();
    if (COINS[sym] && !ids.includes(COINS[sym])) {
      ids.push(COINS[sym]);
    }
  });

  if (ids.length === 0) {
    if (status) status.textContent = "API: aucun symbole reconnu (ex: BTC, ETH...)";
    liveUSD = {};
    updateDashboard();
    updateChart();
    if (box) box.innerHTML = "";
    return;
  }

  if (status) status.textContent = "API: chargement...";
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      liveUSD = {};

      Object.keys(COINS).forEach(sym => {
        const id = COINS[sym];
        if (data[id] && typeof data[id].usd === "number") {
          liveUSD[sym] = data[id].usd;
        }
      });

      if (status) status.textContent = "API: prix chargés ✅";

      if (box) {
        box.innerHTML = "";
        actifs.forEach(a => {
          const sym = (a.symbole || "").toUpperCase();
          const p = liveUSD[sym];
          const row = document.createElement("div");
          row.className = "api-row";
          row.innerHTML = `<b>${sym}</b><span>${p ? p.toLocaleString("fr-FR") + " USD" : "N/A"}</span>`;
          box.appendChild(row);
        });
      }

      updateDashboard();
      updateChart();
    })
    .catch(err => {
      console.log(err);
      if (status) status.textContent = "API: erreur (voir console)";
      liveUSD = {};
      updateDashboard();
      updateChart();
    });
}

const btn = document.getElementById("btn-refresh");
if (btn) {
  btn.addEventListener("click", fetchPrices);
}

fetchPrices();
