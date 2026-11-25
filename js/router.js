import { loadData } from "./data.js?v=20261119ac";
import { disposeAll } from "./charts.js?v=20261125c";
import { disposeAllMaps } from "./choropleth.js?v=20261125c";
import { esc } from "./ui.js?v=20261119ac";

const BERANDA_MEMBERS = [
  { name: "Mohammad Sulthon Ariefin", nim: "24060124130104" },
  { name: "Haikal Rafli Sembiring", nim: "24060124130079" },
  { name: "Daniel Lamganda Tua Gultom", nim: "24060124120048" },
  { name: "Aufaarel Nabiil Aryadh Mecca", nim: "24060124140206" },
];

const BERANDA_PAGE = {
  render(root) {
    root.innerHTML = `
      <section class="landing">
        <div class="landing-hero">
          <h1 class="landing-title">Peningkatan Kawasan Permukiman DKI Jakarta</h1>
          <div class="landing-hero-side">
            <p class="landing-description">Evaluasi program CIP berdasarkan catatan RW, kelurahan, dan PSU di enam wilayah administrasi, periode 2023-2025.</p>
            <a class="landing-cta" href="#overview">Buka dashboard <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <div class="landing-info">
          <article class="landing-card">
            <span class="landing-label">Periode</span>
            <strong>2023-2025</strong>
            <span class="landing-card-note">Tiga tahun pencatatan</span>
          </article>
          <article class="landing-card">
            <span class="landing-label">Sumber data</span>
            <strong>Satu Data Jakarta</strong>
            <span class="landing-card-note">Dinas Perumahan Rakyat &amp; Kawasan Permukiman</span>
          </article>
          <article class="landing-card">
            <span class="landing-label">Cakupan</span>
            <strong>Provinsi DKI Jakarta</strong>
            <span class="landing-card-note">Kota administrasi dan Kepulauan Seribu</span>
          </article>
        </div>

        <section class="landing-members-section" aria-labelledby="landing-members-title">
          <div class="landing-section-head">
            <h2 id="landing-members-title">Anggota kelompok 3</h2>
          </div>
          <div class="landing-members">
            ${BERANDA_MEMBERS.map(
              (member, index) => `
              <article class="landing-member">
                <span class="landing-member-number">${index + 1}</span>
                <div class="landing-member-body">
                  <span class="landing-member-name">${member.name}</span>
                  <span class="landing-member-nim">${member.nim}</span>
                </div>
              </article>`
            ).join("")}
          </div>
        </section>

        <footer class="landing-footer">
          <span>Sumber data: Satu Data Jakarta · Dinas PRKP</span>
          <span>Tugas Pertemuan 11 · Desain Idiom Visual &amp; Layout Dashboard</span>
        </footer>
      </section>
    `;
  },
};

const PAGES = {
  beranda: () => Promise.resolve(BERANDA_PAGE),
  overview: () => import("./pages/overview.js?v=20261125c"),
  cbq1: () => import("./pages/cbq1.js?v=20261125c"),
  cbq2: () => import("./pages/cbq2.js?v=20261125c"),
  cbq3: () => import("./pages/cbq3.js?v=20261125c"),
  cbq4: () => import("./pages/cbq4.js?v=20261125c"),
  cbq5: () => import("./pages/cbq5.js?v=20261125c"),
  uji: () => import("./pages/uji.js?v=20261125h"),
};

const app = document.querySelector("#app");
const navLinks = [...document.querySelectorAll("[data-route]")];

let rows = null;
let loadError = null;
let loading = null;
let renderToken = 0;
let activeCleanup = null;

function currentRoute() {
  const raw = window.location.hash.replace("#", "");
  const id = raw.split("?")[0];
  return Object.prototype.hasOwnProperty.call(PAGES, id) ? id : "beranda";
}

function setActiveNav(route) {
  for (const link of navLinks) {
    const active = link.dataset.route === route;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function showError(message) {
  app.innerHTML = `
    <div class="error-panel" role="alert">
      <h2>Data tidak dapat dimuat</h2>
      <p>${esc(message)}</p>
      <p class="note">Jalankan dashboard dari folder <code>MetroScope</code> dengan
      <code>python -m http.server 8000</code>, lalu buka <code>http://localhost:8000</code>.</p>
      <p class="note"><a href="">Muat ulang halaman</a></p>
    </div>
  `;
}

async function ensureData() {
  if (rows) return rows;
  if (loadError) throw new Error(loadError);
  if (!loading) {
    loading = loadData()
      .then((data) => {
        rows = data;
        return data;
      })
      .catch((error) => {
        loadError = error.message;
        throw error;
      });
  }
  return loading;
}

async function route() {
  const routeId = currentRoute();
  const rawHash = window.location.hash.replace("#", "");
  const rawRoute = rawHash.split("?")[0];
  if (!rawRoute || !Object.prototype.hasOwnProperty.call(PAGES, rawRoute)) {
    history.replaceState(null, "", `#${routeId}`);
  }
  setActiveNav(routeId);
  document.body.classList.toggle("is-landing", routeId === "beranda");
  document.body.classList.toggle("is-testing", routeId === "uji");
  const token = ++renderToken;
  if (typeof activeCleanup === "function") {
    activeCleanup();
    activeCleanup = null;
  }
  disposeAllMaps();
  disposeAll();
  app.innerHTML = '<p class="loading">Memuat data…</p>';
  try {
    const data = await ensureData();
    if (token !== renderToken) return;
    const module = await PAGES[routeId]();
    if (token !== renderToken) return;
    app.innerHTML = "";
    const maybeCleanup = module.render(app, data);
    if (typeof maybeCleanup === "function") {
      activeCleanup = maybeCleanup;
    }
  } catch (error) {
    if (token !== renderToken) return;
    showError(error.message);
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-table-toggle]");
  if (!button) return;
  const panel = button.closest(".panel");
  if (!panel) return;
  const table = panel.querySelector(".chart-table");
  if (!table) return;
  const isHidden = table.hasAttribute("hidden");
  if (isHidden) {
    table.removeAttribute("hidden");
    button.textContent = "Sembunyikan tabel";
    button.setAttribute("aria-expanded", "true");
  } else {
    table.setAttribute("hidden", "");
    button.textContent = "Lihat sebagai tabel";
    button.setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("hashchange", route);
route();
