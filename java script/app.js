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
const triActifs = document.getElementById("triActifs");
let triMode = "none";

if (triActifs) {
  triActifs.addEventListener("change", function () {
    triMode = this.value;
    afficherActifs();
  });
}

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
let chartPortefeuille = null;

/* =========================
   DETAILS
========================= */
function showDetails(id) {
  const box = document.getElementById("detailsActif");
  if (!box) return;

  const actif = actifs.find(a => a.id === Number(id));
  if (!actif) {
    box.innerHTML = "";
    return;
  }

  const sym = String(actif.symbole || "").toUpperCase();
  const prixLive = liveUSD[sym];
  const prixUtilise = (prixLive ?? Number(actif.prixAchat));
  const valeur = Number(actif.quantite) * Number(prixUtilise);

  box.innerHTML = `
    <div class="details-card">
      <div class="details-head">
        <div>
          <h3 class="details-title">${actif.nom} (${actif.symbole})</h3>
          <p class="details-sub">Portefeuille : <b>${actif.portefeuille}</b></p>
        </div>
        <div class="details-actions">
          <button type="button" id="btnCloseDetails">Fermer</button>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-item">
          <p class="details-label">Quantité</p>
          <p class="details-value">${Number(actif.quantite)}</p>
        </div>

        <div class="details-item">
          <p class="details-label">Prix d’achat</p>
          <p class="details-value">${Number(actif.prixAchat).toLocaleString("fr-FR")} MAD</p>
        </div>

        <div class="details-item">
          <p class="details-label">Prix live (CoinGecko)</p>
          <p class="details-value">${prixLive ? prixLive.toLocaleString("fr-FR") + " USD" : "N/A"}</p>
        </div>

        <div class="details-item">
          <p class="details-label">Prix utilisé (live sinon achat)</p>
          <p class="details-value">${Number(prixUtilise).toLocaleString("fr-FR")}</p>
        </div>

        <div class="details-item">
          <p class="details-label">Valeur estimée</p>
          <p class="details-value">${valeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} MAD</p>
        </div>

        <div class="details-item">
          <p class="details-label">ID</p>
          <p class="details-value">${actif.id}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnCloseDetails").addEventListener("click", function () {
    box.innerHTML = "";
  });
}

/* =========================
   AJOUT ACTIF
========================= */
if (form) {
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
}

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
   CHART ACTIFS
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
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* =========================
   AFFICHAGE TABLE
========================= */
function afficherActifs() {
  if (!tbody) return;

  tbody.innerHTML = "";

  if (actifs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Aucun actif ajouté.</td></tr>`;
    updateDashboard();
    updateChart();
    updatePortfolioStats();
    fetchPrices();
    return;
  }

  let liste = [...actifs];

  if (triMode === "nom_asc") {
    liste.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  } else if (triMode === "nom_desc") {
    liste.sort((a, b) => (b.nom || "").localeCompare(a.nom || ""));
  } else if (triMode === "val_desc" || triMode === "val_asc") {
    liste.sort((a, b) => {
      const sa = (a.symbole || "").toUpperCase();
      const sb = (b.symbole || "").toUpperCase();
      const va = Number(a.quantite) * (liveUSD[sa] ?? Number(a.prixAchat));
      const vb = Number(b.quantite) * (liveUSD[sb] ?? Number(b.prixAchat));
      return triMode === "val_desc" ? (vb - va) : (va - vb);
    });
  }

  liste.forEach((a) => {
    const tr = document.createElement("tr");
    tr.dataset.id = a.id;

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
  updatePortfolioStats();

  fetchPrices();
}

/* =========================
   RECHERCHE (bouton)
========================= */
const rech = document.getElementById("recherche");
if (rech) {
  rech.addEventListener("click", function () {
    const nom_de_actif = document.getElementById("re");
    const resultBox = document.getElementById("rechercherResult");
    if (!nom_de_actif || !resultBox) return;

    const le_nom = nom_de_actif.value.trim().toLowerCase();
    resultBox.innerHTML = "";

    const actttif = actifs.find(a => (a.nom || "").toLowerCase() === le_nom);

    if (!actttif) {
      resultBox.innerHTML = "<p>Aucun actif trouvé.</p>";
      return;
    }

    resultBox.innerHTML = `
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

    const fermer = document.getElementById("fermerr");
    if (fermer) {
      fermer.addEventListener("click", function () {
        resultBox.innerHTML = "";
      });
    }
  });
}

/* =========================
   SUPPRIMER
========================= */
if (tbody) {
  tbody.addEventListener("click", function (e) {
    if (!e.target.classList.contains("btn-supprimer")) return;

    const id = Number(e.target.dataset.id);
    if (!confirm("Voulez-vous vraiment supprimer cet actif ?")) return;

    actifs = actifs.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actifs));

    afficherActifs();

    const box = document.getElementById("detailsActif");
    if (box) box.innerHTML = "";
  });
}

/* =========================
   MODIFIER
========================= */
if (tbody) {
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
    if (!zone) return;
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
}

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
    updatePortfolioStats();
    if (box) box.innerHTML = "";
    const updated = document.getElementById("api-updated");
    if (updated) updated.textContent = "";
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

      const updated = document.getElementById("api-updated");
      if (updated) {
        updated.textContent = "Dernière mise à jour : " + new Date().toLocaleString("fr-FR");
      }

      if (box) {
        box.innerHTML = "";
        actifs.forEach(a => {
          const sym = (a.symbole || "").toUpperCase();
          const p = liveUSD[sym];

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${a.nom}</td>
            <td><b>${sym}</b></td>
            <td>${p ? p.toLocaleString("fr-FR") + " USD" : "N/A"}</td>
            <td>CoinGecko</td>
          `;
          box.appendChild(tr);
        });
      }

      updateDashboard();
      updateChart();
      updatePortfolioStats();

     
      if (chartInstance) chartInstance.resize();
      if (chartPortefeuille) chartPortefeuille.resize();
    })
    .catch(err => {
      console.log(err);
      if (status) status.textContent = "API: erreur (voir console)";
      liveUSD = {};
      updateDashboard();
      updateChart();
      updatePortfolioStats();
      const updated = document.getElementById("api-updated");
      if (updated) updated.textContent = "";
    });
}

const btn = document.getElementById("btn-refresh");
if (btn) {
  btn.addEventListener("click", fetchPrices);
}

/* =========================
   MODULE 2 — PORTEFEUILLES
========================= */
const PF_KEY = "cryptofolio_portefeuilles";

const pfForm = document.getElementById("pf-form");
const pfNom = document.getElementById("pf-nom");
const pfBody = document.getElementById("pf-body");

let portefeuilles = JSON.parse(localStorage.getItem(PF_KEY)) || [];

if (portefeuilles.length === 0) {
  portefeuilles = ["Long terme", "Court terme", "Trading"];
  localStorage.setItem(PF_KEY, JSON.stringify(portefeuilles));
}

afficherPortefeuilles();
updatePortefeuilleSelect();

if (pfForm) {
  pfForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const nomP = (pfNom ? pfNom.value : "").trim();
    if (!nomP) return;

    const existe = portefeuilles.some(p => p.toLowerCase() === nomP.toLowerCase());
    if (existe) {
      alert("Ce portefeuille existe déjà.");
      return;
    }

    portefeuilles.push(nomP);
    localStorage.setItem(PF_KEY, JSON.stringify(portefeuilles));

    afficherPortefeuilles();
    updatePortefeuilleSelect();

    pfForm.reset();
  });
}

function afficherPortefeuilles() {
  if (!pfBody) return;

  pfBody.innerHTML = "";

  if (portefeuilles.length === 0) {
    pfBody.innerHTML = `<tr><td colspan="2">Aucun portefeuille.</td></tr>`;
    return;
  }

  portefeuilles.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p}</td>
      <td><button type="button" class="pf-supprimer" data-name="${p}">Supprimer</button></td>
    `;
    pfBody.appendChild(tr);
  });
}

if (pfBody) {
  pfBody.addEventListener("click", function (e) {
    if (!e.target.classList.contains("pf-supprimer")) return;

    const name = e.target.dataset.name;
    if (!confirm(`Supprimer le portefeuille "${name}" ?`)) return;

    const utilise = actifs.some(a => String(a.portefeuille || "").toLowerCase() === String(name || "").toLowerCase());
    if (utilise) {
      alert("Impossible : ce portefeuille est utilisé par un ou plusieurs actifs.");
      return;
    }

    portefeuilles = portefeuilles.filter(p => p !== name);
    localStorage.setItem(PF_KEY, JSON.stringify(portefeuilles));

    afficherPortefeuilles();
    updatePortefeuilleSelect();
  });
}

function updatePortefeuilleSelect() {
  const select = document.getElementById("portefeuille");
  if (!select) return;

  const current = select.value;

  select.innerHTML = `<option value="" selected disabled>Choisir un portefeuille</option>`;

  portefeuilles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });

  if (current && portefeuilles.includes(current)) {
    select.value = current;
  }
}

/* =========================
   STATS PORTEFEUILLES (table + pie)
========================= */
function updatePortfolioStats() {
  const body = document.getElementById("pfStatsBody");
  const canvas = document.getElementById("chartPortefeuilles");

  const map = {};

  actifs.forEach(a => {
    const pf = String(a.portefeuille || "Sans portefeuille");
    const sym = String(a.symbole || "").toUpperCase();
    const prix = (liveUSD[sym] ?? Number(a.prixAchat));
    const val = Number(a.quantite) * Number(prix);

    if (!map[pf]) map[pf] = { total: 0, count: 0 };
    map[pf].total += val;
    map[pf].count += 1;
  });

  const labels = Object.keys(map);
  const totals = labels.map(pf => map[pf].total);
  const counts = labels.map(pf => map[pf].count);

  if (body) {
    body.innerHTML = "";
    if (labels.length === 0) {
      body.innerHTML = `<tr><td colspan="3">Aucune donnée.</td></tr>`;
    } else {
      labels.forEach((pf, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${pf}</td>
          <td>${totals[i].toLocaleString("fr-FR", { maximumFractionDigits: 2 })} MAD</td>
          <td>${counts[i]}</td>
        `;
        body.appendChild(tr);
      });
    }
  }

  if (!canvas) return;

  if (chartPortefeuille) {
    chartPortefeuille.destroy();
    chartPortefeuille = null;
  }

  if (labels.length === 0) return;

  chartPortefeuille = new Chart(canvas, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        label: "Valeur par portefeuille",
        data: totals
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/* =========================
   SPA MENU (affichage sections)
========================= */
const links = document.querySelectorAll(".menu__link");
const panels = document.querySelectorAll("main .panel");

function showSection(id) {
  panels.forEach(p => p.style.display = "none");

  const target = document.querySelector(id);
  if (target) target.style.display = "block";

  links.forEach(a => a.classList.remove("menu__link--active"));
  const active = document.querySelector(`.menu__link[href="${id}"]`);
  if (active) active.classList.add("menu__link--active");

  // ✅ IMPORTANT Chart.js: après display:block
  setTimeout(() => {
    updateChart();
    updatePortfolioStats();
    if (chartInstance) chartInstance.resize();
    if (chartPortefeuille) chartPortefeuille.resize();
  }, 80);
}

links.forEach(a => {
  a.addEventListener("click", function (e) {
    e.preventDefault();
    const id = this.getAttribute("href");
    history.replaceState(null, "", id);
    showSection(id);
  });
});

/* click sur ligne => détails */
if (tbody) {
  tbody.addEventListener("click", function (e) {
    if (e.target.closest("button")) return;

    const tr = e.target.closest("tr");
    if (!tr || !tr.dataset.id) return;

    showDetails(tr.dataset.id);
  });
}

/* =========================
   INIT
========================= */
const start = window.location.hash || "#dashboard";
showSection(start);
afficherActifs();
fetchPrices(); 
/* =========================
   API TABLE CLICK => GRAPH
========================= */

let apiChartInstance = null;

function renderApiChart(symbol) {
  const sym = String(symbol || "").toUpperCase();
  const coinId = COINS[sym];

  const box = document.getElementById("apiChartBox");
  if (!box) return;

  if (!coinId) {
    box.innerHTML = `
      <div class="chart-card">
        <h3>Graphique</h3>
        <p>Symbole non reconnu : <b>${sym}</b> (ex: BTC, ETH, BNB...)</p>
      </div>
    `;
    return;
  }

  // Zone + canvas via innerHTML
  box.innerHTML = `
    <div class="chart-card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <h3>Évolution du prix — ${sym} (USD) — 7 jours</h3>
        <button type="button" id="apiChartClose" style="height:34px;padding:0 12px;border-radius:10px;border:none;cursor:pointer;font-weight:900;background:#111827;color:#fff;">
          Fermer
        </button>
      </div>
      <div style="margin-top:10px;">
        <canvas id="apiPriceChart"></canvas>
      </div>
      <p style="margin:10px 0 0; color:#6b7280; font-size:12px;">
        Source: CoinGecko market_chart
      </p>
    </div>
  `;

  // bouton fermer
  const closeBtn = document.getElementById("apiChartClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (apiChartInstance) {
        apiChartInstance.destroy();
        apiChartInstance = null;
      }
      box.innerHTML = "";
    });
  }

  const canvas = document.getElementById("apiPriceChart");
  if (!canvas) return;

  // IMPORTANT (SPA): forcer une hauteur pour Chart.js
  canvas.style.height = "320px";

  // Si un graph existe déjà => destroy
  if (apiChartInstance) {
    apiChartInstance.destroy();
    apiChartInstance = null;
  }

  // Fetch historique prix (7 jours)
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const prices = Array.isArray(data.prices) ? data.prices : [];

      if (prices.length === 0) {
        box.querySelector(".chart-card").insertAdjacentHTML(
          "beforeend",
          `<p style="color:#ef4444;font-weight:800;">Aucune donnée retournée par l’API.</p>`
        );
        return;
      }

      // prices: [ [timestamp, price], ... ]
      const labels = prices.map(item => {
        const d = new Date(item[0]);
        return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      });


      const serie = prices.map(item => Number(item[1]));

      apiChartInstance = new Chart(canvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: `${sym} (USD)`,
            data: serie,
            tension: 0.25,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: false }
          }
        }
      });

      // SPA fix: resize après affichage
      setTimeout(() => {
        if (apiChartInstance) apiChartInstance.resize();
      }, 60);
    })
    .catch(err => {
      console.log(err);
      box.querySelector(".chart-card").insertAdjacentHTML(
        "beforeend",
        `<p style="color:#ef4444;font-weight:800;">Erreur API (voir console).</p>`
      );
    });
}

// Click sur une ligne du tableau API
const apiTbody = document.getElementById("api-prices");
if (apiTbody) {
  apiTbody.addEventListener("click", function (e) {
    const tr = e.target.closest("tr");
    if (!tr) return;

    // 2ème colonne = symbole (dans ton HTML)
    const tds = tr.querySelectorAll("td");
    if (!tds || tds.length < 2) return;

    const sym = tds[1].innerText.trim(); // ex: BTC
    renderApiChart(sym);
  });
}
