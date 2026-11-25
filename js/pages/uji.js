import { render as renderOverview } from "./overview.js?v=20261125c";
import { esc } from "../ui.js?v=20261119ac";
import {
  TASKS,
  SUS_ITEMS,
  isFilterError,
  detectDeviceType,
  buildSessionRecord,
  recordsToCsv,
} from "../uji-core.js?v=20261125c";

// Tempel URL Web App Google Apps Script Anda di bawah ini setelah deploy
// (panduan & skrip lengkap ada di scripts/google-apps-script.gs).
// Data responden jarak jauh otomatis masuk ke Google Sheets pribadi Anda.
const GOOGLE_SHEETS_WEBHOOK_URL = "";

// PIN untuk melihat rekap data lokal melalui link khusus peneliti: #uji?admin=1
const ADMIN_PIN = "metroscope2026";

const STORAGE_KEY = "metroscope_uji_sessions_v1";

function isAdminRoute() {
  const raw = window.location.hash.replace(/^#/, "");
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  return new URLSearchParams(query).get("admin") === "1";
}

function generateRespondentId() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MHS-${stamp}-${rand}`;
}

function loadSavedSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionLocally(record) {
  try {
    const sessions = loadSavedSessions();
    sessions.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return sessions;
  } catch {
    return [record];
  }
}

function triggerCsvDownload(records, filename) {
  const csv = recordsToCsv(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function submitToGoogleSheets(record) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    return { status: "unconfigured" };
  }
  const body = JSON.stringify(record);
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
    if (response.ok) return { status: "sent" };
    throw new Error(`HTTP ${response.status}`);
  } catch {
    try {
      await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
      });
      return { status: "sent_opaque" };
    } catch (error) {
      return { status: "failed", message: error.message };
    }
  }
}

function renderTaskAnswerControl(task, draft) {
  if (task.inputType === "number_and_trend") {
    const countVal = draft?.count ?? "";
    const trendVal = draft?.trend ?? "";
    return `
      <div class="uji-answer-compound">
        <label class="uji-inline-field" for="uji-t1-count">
          <span>Jumlah catatan RW 2025</span>
          <input
            id="uji-t1-count"
            type="number"
            inputmode="numeric"
            min="0"
            placeholder="contoh: 100"
            value="${esc(countVal)}"
            data-uji-count
          />
        </label>
        <fieldset class="uji-choice-group">
          <legend>Arah tren 2023–2025</legend>
          <div class="uji-pills">
            ${task.trendOptions
              .map(
                (option) => `
                  <label class="uji-pill ${trendVal === option ? "is-selected" : ""}">
                    <input
                      type="radio"
                      name="uji-trend"
                      value="${esc(option)}"
                      ${trendVal === option ? "checked" : ""}
                    />
                    <span>${esc(option)}</span>
                  </label>
                `
              )
              .join("")}
          </div>
        </fieldset>
      </div>
    `;
  }

  const selected = typeof draft === "string" ? draft : "";
  return `
    <fieldset class="uji-choice-group">
      <legend>Pilih jawaban Anda</legend>
      <div class="uji-pills">
        ${task.options
          .map(
            (option) => `
              <label class="uji-pill ${selected === option ? "is-selected" : ""}">
                <input
                  type="radio"
                  name="uji-choice"
                  value="${esc(option)}"
                  ${selected === option ? "checked" : ""}
                />
                <span>${esc(option)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function isAnswerReady(task, draft) {
  if (task.inputType === "number_and_trend") {
    return (
      String(draft?.count ?? "").trim() !== "" &&
      String(draft?.trend ?? "").trim() !== ""
    );
  }
  return String(draft ?? "").trim() !== "";
}

export function render(root, rows) {
  let stage = isAdminRoute() ? "admin" : "intro"; // intro | tasks | sus | done | admin
  let adminUnlocked = false;
  let confirmClearLocal = false;
  let respondent = { nama: "", nim: "" };
  let respondentId = generateRespondentId();

  let taskIndex = 0;
  let taskPhase = "ready"; // ready | active
  let dockCollapsed = false;
  let draftAnswer = null;
  let confirmGiveUp = false;

  let taskStartMs = 0;
  let activeTracker = null;
  const taskLogs = {};

  let overviewController = null;
  let stageClickHandler = null;
  let dockEl = null;

  let susAnswers = Array(10).fill(null);
  let feedbackText = "";
  let finalRecord = null;
  let savedSessions = loadSavedSessions();
  let uploadResult = null;

  function removeDock() {
    if (dockEl) {
      dockEl.remove();
      dockEl = null;
    }
    document.body.classList.remove("has-uji-dock");
  }

  function destroyDashboard() {
    if (stageClickHandler) {
      document.removeEventListener("click", stageClickHandler, true);
      stageClickHandler = null;
    }
    if (overviewController) {
      overviewController.destroy();
      overviewController = null;
    }
  }

  function resetAll() {
    removeDock();
    destroyDashboard();
    stage = "intro";
    respondent = { nama: "", nim: "" };
    respondentId = generateRespondentId();
    taskIndex = 0;
    taskPhase = "ready";
    dockCollapsed = false;
    draftAnswer = null;
    confirmGiveUp = false;
    taskStartMs = 0;
    activeTracker = null;
    for (const key of Object.keys(taskLogs)) delete taskLogs[key];
    susAnswers = Array(10).fill(null);
    feedbackText = "";
    finalRecord = null;
    uploadResult = null;
    renderCurrentStage();
  }

  function startTaskSession() {
    const task = TASKS[taskIndex];
    if (
      task.ensureStartFilter !== undefined &&
      overviewController &&
      overviewController.getSelectedYear() !== task.ensureStartFilter
    ) {
      overviewController.setYear(task.ensureStartFilter);
    }

    taskPhase = "active";
    dockCollapsed = window.innerWidth <= 760;
    confirmGiveUp = false;
    draftAnswer =
      task.inputType === "number_and_trend" ? { count: "", trend: "" } : "";

    activeTracker = {
      clicks: 0,
      errors: 0,
      usedRequiredFilter: false,
      filterHistory: [],
      zoomUsed: [],
      tableUsed: 0,
    };
    taskStartMs = performance.now();

    const stageWrap = root.querySelector("#uji-dashboard-wrap");
    if (stageWrap) {
      stageWrap.classList.remove("is-locked");
      stageWrap.removeAttribute("aria-hidden");
    }
    const lockNote = root.querySelector("#uji-lock-banner");
    if (lockNote) lockNote.hidden = true;

    renderDock();
  }

  function finishCurrentTask({ gaveUp = false }) {
    const task = TASKS[taskIndex];
    const elapsedSec = Math.max(0, (performance.now() - taskStartMs) / 1000);
    const currentFilter = overviewController
      ? overviewController.getSelectedYear()
      : "all";

    if (overviewController) overviewController.closeModal();

    const tracker = activeTracker || {
      clicks: 0,
      errors: 0,
      usedRequiredFilter: false,
      filterHistory: [],
      zoomUsed: [],
      tableUsed: 0,
    };

    let correct = false;
    let filterOk = false;
    let answerText = "MENYERAH";
    let errors = tracker.errors;

    if (gaveUp) {
      errors += 1;
    } else {
      const evaluation = task.evaluate({
        value: draftAnswer,
        usedRequiredFilter: tracker.usedRequiredFilter,
        currentFilter,
      });
      correct = evaluation.correct;
      filterOk = evaluation.filterOk;
      answerText = evaluation.answerText;
      if (!filterOk) errors += 1;
      if (!correct) errors += 1;
    }

    taskLogs[task.id] = {
      answerText,
      correct,
      gaveUp,
      timeSec: elapsedSec,
      clicks: tracker.clicks,
      errors,
      filterOk,
      filterHistory: tracker.filterHistory,
      zoomUsed: tracker.zoomUsed,
      tableUsed: tracker.tableUsed,
    };

    activeTracker = null;
    confirmGiveUp = false;

    if (taskIndex + 1 < TASKS.length) {
      taskIndex += 1;
      taskPhase = "ready";
      dockCollapsed = false;
      draftAnswer = null;

      const nextTask = TASKS[taskIndex];
      if (
        nextTask.ensureStartFilter !== undefined &&
        overviewController &&
        overviewController.getSelectedYear() !== nextTask.ensureStartFilter
      ) {
        overviewController.setYear(nextTask.ensureStartFilter);
      }

      const stageWrap = root.querySelector("#uji-dashboard-wrap");
      if (stageWrap) {
        stageWrap.classList.add("is-locked");
        stageWrap.setAttribute("aria-hidden", "true");
      }
      const lockNote = root.querySelector("#uji-lock-banner");
      if (lockNote) {
        lockNote.innerHTML = `<strong>Panel dashboard siap di bawah.</strong> Baca instruksi <em>Task ${nextTask.number}</em> pada panel bawah, lalu tekan <strong>Mulai Task ${nextTask.number}</strong> untuk mulai berinteraksi.`;
        lockNote.hidden = false;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      renderDock();
    } else {
      stage = "sus";
      removeDock();
      destroyDashboard();
      window.scrollTo({ top: 0, behavior: "smooth" });
      renderCurrentStage();
    }
  }

  function renderDock() {
    if (!dockEl) {
      dockEl = document.createElement("aside");
      dockEl.className = "uji-dock";
      dockEl.setAttribute("role", "region");
      dockEl.setAttribute("aria-label", "Panel tugas pengujian");
      document.body.appendChild(dockEl);
      document.body.classList.add("has-uji-dock");
    }

    const task = TASKS[taskIndex];
    const progressDots = TASKS.map(
      (item, idx) => `
        <span
          class="uji-step-dot ${
            idx < taskIndex
              ? "is-done"
              : idx === taskIndex
              ? "is-current"
              : ""
          }"
          title="Task ${item.number}"
        ></span>
      `
    ).join("");

    if (taskPhase === "ready") {
      dockEl.classList.remove("is-collapsed");
      dockEl.classList.add("is-ready");
      dockEl.innerHTML = `
        <div class="uji-dock-inner wrap">
          <div class="uji-dock-top">
            <div class="uji-dock-meta">
              <span class="uji-badge">Task ${task.number} dari ${TASKS.length}</span>
              <span class="uji-task-name">${esc(task.shortTitle)}</span>
              <div class="uji-step-dots" aria-hidden="true">${progressDots}</div>
            </div>
            <span class="uji-status-chip">Baca instruksi terlebih dahulu</span>
          </div>
          <p class="uji-instruction">${esc(task.instruction)}</p>
          <div class="uji-dock-actions">
            <button type="button" class="uji-btn uji-btn-primary" data-uji-start-task>
              Mulai Task ${task.number} →
            </button>
          </div>
        </div>
      `;

      dockEl
        .querySelector("[data-uji-start-task]")
        .addEventListener("click", () => startTaskSession());
      return;
    }

    dockEl.classList.remove("is-ready");
    dockEl.classList.toggle("is-collapsed", dockCollapsed);

    const readyToSubmit = isAnswerReady(task, draftAnswer);

    dockEl.innerHTML = `
      <div class="uji-dock-inner wrap">
        <div class="uji-dock-top">
          <div class="uji-dock-meta">
            <span class="uji-badge">Task ${task.number} dari ${TASKS.length}</span>
            <span class="uji-task-name">${esc(task.shortTitle)}</span>
            <div class="uji-step-dots" aria-hidden="true">${progressDots}</div>
          </div>
          <div class="uji-dock-top-right">
            <span class="uji-status-chip is-live">Sedang mengerjakan</span>
            <button type="button" class="uji-btn ${dockCollapsed ? "uji-btn-primary" : "uji-btn-ghost"}" data-uji-toggle-dock aria-expanded="${String(!dockCollapsed)}">
              ${dockCollapsed ? "Isi Jawaban ▲" : "Lipat panel ▼"}
            </button>
          </div>
        </div>

        ${
          dockCollapsed
            ? `<p class="uji-collapsed-hint">${esc(task.instruction)}</p>`
            : `
              <p class="uji-instruction">${esc(task.instruction)}</p>
              <div class="uji-answer-area">
                ${renderTaskAnswerControl(task, draftAnswer)}
              </div>
              <div class="uji-dock-actions">
                <button
                  type="button"
                  class="uji-btn uji-btn-primary"
                  data-uji-submit-task
                  ${readyToSubmit ? "" : "disabled"}
                >
                  ${
                    taskIndex + 1 < TASKS.length
                      ? `Kirim & Lanjut ke Task ${task.number + 1} →`
                      : "Kirim & Lanjut ke Kuesioner SUS →"
                  }
                </button>
                ${
                  confirmGiveUp
                    ? `
                      <div class="uji-giveup-confirm" role="alert">
                        <span>Yakin tidak menemukan jawabannya?</span>
                        <button type="button" class="uji-btn uji-btn-danger" data-uji-giveup-yes>Ya, lewati task ini</button>
                        <button type="button" class="uji-btn uji-btn-ghost" data-uji-giveup-no>Batal</button>
                      </div>
                    `
                    : `<button type="button" class="uji-btn uji-btn-danger" data-uji-giveup>Menyerah / Tidak ketemu</button>`
                }
              </div>
            `
        }
      </div>
    `;

    dockEl
      .querySelector("[data-uji-toggle-dock]")
      .addEventListener("click", () => {
        dockCollapsed = !dockCollapsed;
        renderDock();
      });

    if (dockCollapsed) return;

    const submitBtn = dockEl.querySelector("[data-uji-submit-task]");
    const syncSubmitState = () => {
      if (submitBtn) submitBtn.disabled = !isAnswerReady(task, draftAnswer);
    };

    const countInput = dockEl.querySelector("[data-uji-count]");
    if (countInput) {
      countInput.addEventListener("input", () => {
        draftAnswer = { ...(draftAnswer || {}), count: countInput.value };
        syncSubmitState();
      });
    }

    dockEl.querySelectorAll('input[name="uji-trend"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        draftAnswer = { ...(draftAnswer || {}), trend: radio.value };
        dockEl
          .querySelectorAll('input[name="uji-trend"]')
          .forEach((item) =>
            item.closest(".uji-pill")?.classList.toggle("is-selected", item.checked)
          );
        syncSubmitState();
      });
    });

    dockEl.querySelectorAll('input[name="uji-choice"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        draftAnswer = radio.value;
        dockEl
          .querySelectorAll('input[name="uji-choice"]')
          .forEach((item) =>
            item.closest(".uji-pill")?.classList.toggle("is-selected", item.checked)
          );
        syncSubmitState();
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        if (!isAnswerReady(task, draftAnswer)) return;
        finishCurrentTask({ gaveUp: false });
      });
    }

    const giveUpBtn = dockEl.querySelector("[data-uji-giveup]");
    if (giveUpBtn) {
      giveUpBtn.addEventListener("click", () => {
        confirmGiveUp = true;
        renderDock();
      });
    }

    const giveUpYes = dockEl.querySelector("[data-uji-giveup-yes]");
    if (giveUpYes) {
      giveUpYes.addEventListener("click", () => finishCurrentTask({ gaveUp: true }));
    }

    const giveUpNo = dockEl.querySelector("[data-uji-giveup-no]");
    if (giveUpNo) {
      giveUpNo.addEventListener("click", () => {
        confirmGiveUp = false;
        renderDock();
      });
    }
  }

  function renderIntroStage() {
    removeDock();
    destroyDashboard();
    root.innerHTML = `
      <section class="uji-shell">
        <div class="panel uji-card">
          <span class="uji-kicker">Pengujian Kinerja Dashboard · ISO 9241-11</span>
          <h1 class="uji-title">Uji Usability Dashboard MetroScope</h1>
          <p class="uji-lead">
            Terima kasih telah meluangkan waktu untuk menguji dashboard
            <strong>Peningkatan Kawasan dan Fasilitas Permukiman DKI Jakarta (2023–2025)</strong>.
            Pengujian ini terdiri dari <strong>4 tugas singkat</strong> di satu layar dashboard
            dilanjutkan dengan <strong>kuesioner 10 pernyataan</strong> (estimasi 3–5 menit).
          </p>

          <div class="uji-callout">
            <strong>Yang diuji adalah dashboard-nya, bukan kemampuan Anda.</strong>
            Kerjakan setiap tugas secara alami. Jika tidak menemukan jawaban, Anda dapat memilih tombol menyerah.
          </div>

          <div class="uji-guide">
            <h2>Petunjuk singkat penggunaan dashboard</h2>
            <ul>
              <li>Pengujian ini dapat dikerjakan melalui <strong>HP maupun laptop/komputer</strong>, namun <strong>sangat disarankan menggunakan laptop/komputer</strong> agar grafik dan peta terlihat lebih luas serta nyaman dibaca.</li>
              <li>Gunakan filter <strong>Tahun analisis</strong> di bagian atas dashboard untuk menyaring seluruh grafik sekaligus.</li>
              <li>Arahkan kursor (di komputer) atau <strong>ketuk/tekan</strong> (di HP) pada grafik dan peta untuk melihat nilai eksak serta keterangan wilayah.</li>
              <li>Jika grafik atau peta terasa terlalu kecil, tekan tombol <strong>Perbesar</strong> di pojok kanan atas panel untuk melihatnya lebih jelas, atau buka <strong>Lihat sebagai tabel</strong> di bawah panel.</li>
              <li>Seluruh tugas dikerjakan di <strong>satu halaman ini</strong> tanpa perlu berpindah tab. Anda dapat menekan <strong>Lipat panel</strong> / <strong>Isi Jawaban</strong> pada panel bawah kapan saja agar tampilan grafik lebih lega.</li>
            </ul>
          </div>

          <form class="uji-form" id="uji-intro-form" novalidate>
            <div class="uji-form-grid">
              <label class="uji-field" for="uji-nama">
                <span>Nama <em>*</em></span>
                <input id="uji-nama" name="nama" type="text" required placeholder="Masukkan nama lengkap" value="${esc(respondent.nama)}" />
              </label>
              <label class="uji-field" for="uji-nim">
                <span>NIM <em>*</em></span>
                <input id="uji-nim" name="nim" type="text" required placeholder="Contoh: 24060124130079" value="${esc(respondent.nim)}" />
              </label>
            </div>
            <p class="uji-form-error" id="uji-intro-error" role="alert" hidden></p>
            <div class="uji-form-actions">
              <button type="submit" class="uji-btn uji-btn-primary">
                Mulai Pengujian →
              </button>
            </div>
          </form>
        </div>
      </section>
    `;

    const form = root.querySelector("#uji-intro-form");
    const errEl = root.querySelector("#uji-intro-error");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nama = form.elements.nama.value.trim();
      const nim = form.elements.nim.value.trim();
      if (!nama || !nim) {
        errEl.textContent = "Mohon isi Nama dan NIM terlebih dahulu.";
        errEl.hidden = false;
        return;
      }
      respondent = { nama, nim };
      stage = "tasks";
      taskIndex = 0;
      taskPhase = "ready";
      renderCurrentStage();
    });
  }

  function renderTasksStage() {
    destroyDashboard();
    root.innerHTML = `
      <div class="uji-lock-banner" id="uji-lock-banner">
        <strong>Panel dashboard siap di bawah.</strong> Baca instruksi <em>Task ${TASKS[taskIndex].number}</em> pada panel bawah, lalu tekan <strong>Mulai Task ${TASKS[taskIndex].number}</strong> untuk mulai berinteraksi.
      </div>
      <div id="uji-dashboard-wrap" class="uji-dashboard-wrap is-locked" aria-hidden="true"></div>
    `;

    const dashWrap = root.querySelector("#uji-dashboard-wrap");

    overviewController = renderOverview(dashWrap, rows, {
      testMode: true,
      initialYear: "all",
      onYearChange(year) {
        if (taskPhase !== "active" || !activeTracker) return;
        const task = TASKS[taskIndex];
        activeTracker.filterHistory.push(String(year));
        if (year === task.requiredFilter) {
          activeTracker.usedRequiredFilter = true;
        } else if (isFilterError(task, year)) {
          activeTracker.errors += 1;
        }
      },
      onZoomOpen(panelKey) {
        if (taskPhase !== "active" || !activeTracker) return;
        activeTracker.zoomUsed.push(panelKey);
      },
    });

    stageClickHandler = (event) => {
      if (taskPhase !== "active" || !activeTracker) return;
      const inDashboard = dashWrap.contains(event.target);
      const inModal = Boolean(event.target.closest(".zoom-modal-card"));
      if (!inDashboard && !inModal) return;
      activeTracker.clicks += 1;
      if (event.target.closest("[data-table-toggle]")) {
        activeTracker.tableUsed += 1;
      }
    };
    document.addEventListener("click", stageClickHandler, true);

    renderDock();
  }

  function renderSusStage() {
    removeDock();
    destroyDashboard();
    root.innerHTML = `
      <section class="uji-shell">
        <div class="panel uji-card">
          <span class="uji-kicker">Tahap Akhir · System Usability Scale (SUS)</span>
          <h1 class="uji-title">Kuesioner Pengalaman Penggunaan</h1>
          <p class="uji-lead">
            Seluruh 4 tugas telah selesai. Mohon berikan penilaian singkat Anda terhadap dashboard MetroScope
            dari skala <strong>1 (Sangat Tidak Setuju)</strong> hingga <strong>5 (Sangat Setuju)</strong>.
          </p>

          <div class="uji-sus-scale-note" aria-hidden="true">
            <span><strong>1</strong> = Sangat Tidak Setuju</span>
            <span><strong>3</strong> = Netral</span>
            <span><strong>5</strong> = Sangat Setuju</span>
          </div>

          <form class="uji-sus-form" id="uji-sus-form" novalidate>
            <div class="uji-sus-list">
              ${SUS_ITEMS.map(
                (statement, idx) => `
                  <div class="uji-sus-item" data-sus-row="${idx}" role="group" aria-labelledby="sus-q-${idx + 1}">
                    <p class="uji-sus-question" id="sus-q-${idx + 1}">
                      <span class="uji-sus-num">${idx + 1}.</span>
                      <span class="uji-sus-text">${esc(statement)}</span>
                    </p>
                    <div class="uji-likert" role="radiogroup" aria-labelledby="sus-q-${idx + 1}">
                      ${[1, 2, 3, 4, 5]
                        .map(
                          (score) => `
                            <label class="uji-likert-option ${
                              susAnswers[idx] === score ? "is-selected" : ""
                            }">
                              <input
                                type="radio"
                                name="sus_q${idx + 1}"
                                value="${score}"
                                ${susAnswers[idx] === score ? "checked" : ""}
                              />
                              <span class="uji-likert-num">${score}</span>
                              ${
                                score === 1
                                  ? '<span class="uji-likert-cap">Sangat tidak setuju</span>'
                                  : score === 5
                                  ? '<span class="uji-likert-cap">Sangat setuju</span>'
                                  : '<span class="uji-likert-cap">&nbsp;</span>'
                              }
                            </label>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                `
              ).join("")}
            </div>

            <label class="uji-field uji-feedback-field" for="uji-feedback">
              <span>Bagian, grafik, atau filter mana yang paling membingungkan saat mengerjakan tugas tadi? <span class="muted">(Opsional)</span></span>
              <textarea
                id="uji-feedback"
                name="feedback"
                rows="3"
                placeholder="Contoh: Peta kelurahan awalnya agak kecil, tombol reset tidak langsung terlihat, dll."
              >${esc(feedbackText)}</textarea>
            </label>

            <p class="uji-form-error" id="uji-sus-error" role="alert" hidden></p>

            <div class="uji-form-actions">
              <button type="submit" class="uji-btn uji-btn-primary" id="uji-sus-submit">
                Selesaikan &amp; Kirim Hasil →
              </button>
            </div>
          </form>
        </div>
      </section>
    `;

    const form = root.querySelector("#uji-sus-form");
    const errEl = root.querySelector("#uji-sus-error");

    form.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const row = radio.closest("[data-sus-row]");
        const idx = Number(row.dataset.susRow);
        susAnswers[idx] = Number(radio.value);
        row.classList.remove("is-missing");
        row
          .querySelectorAll(".uji-likert-option")
          .forEach((opt) =>
            opt.classList.toggle(
              "is-selected",
              opt.querySelector("input").checked
            )
          );
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      feedbackText = form.elements.feedback.value.trim();

      const missingIndices = [];
      susAnswers.forEach((val, idx) => {
        const row = form.querySelector(`[data-sus-row="${idx}"]`);
        if (val === null) {
          missingIndices.push(idx + 1);
          row?.classList.add("is-missing");
        } else {
          row?.classList.remove("is-missing");
        }
      });

      if (missingIndices.length > 0) {
        errEl.textContent = `Mohon lengkapi pernyataan nomor: ${missingIndices.join(", ")}.`;
        errEl.hidden = false;
        const firstMissing = form.querySelector(
          `[data-sus-row="${missingIndices[0] - 1}"]`
        );
        firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const submitBtn = form.querySelector("#uji-sus-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Menyimpan hasil…";

      const coarsePointer =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      finalRecord = buildSessionRecord({
        timestamp: new Date().toISOString(),
        respondentId,
        respondent,
        taskLogs,
        susAnswers,
        feedback: feedbackText,
        deviceType: detectDeviceType({
          width: window.innerWidth,
          coarsePointer,
        }),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });

      savedSessions = saveSessionLocally(finalRecord);
      uploadResult = await submitToGoogleSheets(finalRecord);

      stage = "done";
      window.scrollTo({ top: 0, behavior: "smooth" });
      renderCurrentStage();
    });
  }

  function renderDoneStage() {
    removeDock();
    destroyDashboard();

    const retryHtml =
      uploadResult?.status === "failed"
        ? `
          <div class="uji-status-box is-warn" role="alert">
            Koneksi sempat terganggu saat mengirim jawaban. Tekan tombol di bawah untuk mencoba mengirim ulang.
          </div>
          <div class="uji-form-actions">
            <button type="button" class="uji-btn uji-btn-primary" data-uji-retry>Kirim Ulang</button>
          </div>
        `
        : "";

    root.innerHTML = `
      <section class="uji-shell">
        <div class="panel uji-card uji-done-card">
          <span class="uji-kicker">Pengujian Selesai</span>
          <h1 class="uji-title">Terima Kasih, ${esc(finalRecord.nama)}!</h1>
          <p class="uji-lead">
            Seluruh jawaban dan masukan Anda telah berhasil dicatat. Terima kasih telah berpartisipasi
            dalam pengujian dashboard <strong>MetroScope</strong>. Anda sudah dapat menutup halaman ini.
          </p>
          ${retryHtml}
        </div>
      </section>
    `;

    root.querySelector("[data-uji-retry]")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.textContent = "Mengirim ulang…";
      uploadResult = await submitToGoogleSheets(finalRecord);
      renderDoneStage();
    });
  }

  function renderAdminStage() {
    removeDock();
    destroyDashboard();
    savedSessions = loadSavedSessions();

    if (!adminUnlocked) {
      root.innerHTML = `
        <section class="uji-shell">
          <div class="panel uji-card">
            <span class="uji-kicker">Khusus Peneliti · Rekap Lokal</span>
            <h1 class="uji-title">Masuk Panel Hasil Pengujian</h1>
            <p class="uji-lead">
              Halaman ini khusus peneliti untuk melihat ID responden, skor metrik ISO 9241-11, skor SUS,
              dan mengunduh rekap CSV yang tersimpan di perangkat ini.
            </p>
            <form class="uji-form" id="uji-admin-form" novalidate>
              <label class="uji-field" for="uji-admin-pin">
                <span>PIN Peneliti</span>
                <input id="uji-admin-pin" name="pin" type="password" required placeholder="Masukkan PIN peneliti" />
              </label>
              <p class="uji-form-error" id="uji-admin-error" role="alert" hidden></p>
              <div class="uji-form-actions">
                <button type="submit" class="uji-btn uji-btn-primary">Buka Rekap →</button>
              </div>
            </form>
          </div>
        </section>
      `;

      const form = root.querySelector("#uji-admin-form");
      const errEl = root.querySelector("#uji-admin-error");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (form.elements.pin.value === ADMIN_PIN) {
          adminUnlocked = true;
          renderAdminStage();
        } else {
          errEl.textContent = "PIN tidak sesuai.";
          errEl.hidden = false;
        }
      });
      return;
    }

    const n = savedSessions.length;
    const avgCompletion = n
      ? (
          savedSessions.reduce((sum, s) => sum + Number(s.completion_rate_pct || 0), 0) / n
        ).toFixed(1)
      : "0.0";
    const avgTime = n
      ? (
          savedSessions.reduce((sum, s) => sum + Number(s.avg_time_sec || 0), 0) / n
        ).toFixed(2)
      : "0.00";
    const avgSus = n
      ? (
          savedSessions.reduce((sum, s) => sum + Number(s.sus_score || 0), 0) / n
        ).toFixed(1)
      : "0.0";

    const webhookNote = GOOGLE_SHEETS_WEBHOOK_URL
      ? "Integrasi Google Sheets <strong>aktif</strong> — hasil responden dari perangkat lain otomatis masuk ke Google Sheet pribadi Anda."
      : "Integrasi Google Sheets <strong>belum dipasang</strong> — saat ini hanya menampilkan sesi yang dikerjakan di perangkat/browser ini. Pasang URL Apps Script di <code>js/pages/uji.js</code> untuk mengumpulkan data dari HP/laptop responden lain.";

    root.innerHTML = `
      <section class="uji-shell uji-admin-shell">
        <div class="panel uji-card">
          <span class="uji-kicker">Panel Peneliti · MetroScope</span>
          <h1 class="uji-title">Rekap Hasil Pengujian Kinerja</h1>
          <p class="uji-lead">${webhookNote}</p>

          <div class="uji-done-meta">
            <div><span class="muted">Responden Lokal</span><strong>${n} orang</strong></div>
            <div><span class="muted">Rata-rata Completion</span><strong>${avgCompletion}%</strong></div>
            <div><span class="muted">Rata-rata Time/Task</span><strong>${avgTime} dtk</strong></div>
            <div><span class="muted">Rata-rata Skor SUS</span><strong>${avgSus}</strong></div>
          </div>

          <div class="uji-form-actions">
            <button type="button" class="uji-btn uji-btn-primary" data-admin-download ${n === 0 ? "disabled" : ""}>
              Unduh Rekap CSV (${n} responden)
            </button>
            <a class="uji-btn uji-btn-secondary" href="#uji">Buka Form Pengujian</a>
            ${
              n > 0
                ? confirmClearLocal
                  ? `
                    <div class="uji-giveup-confirm" role="alert">
                      <span>Hapus semua ${n} data lokal di browser ini?</span>
                      <button type="button" class="uji-btn uji-btn-danger" data-admin-clear-yes>Ya, hapus</button>
                      <button type="button" class="uji-btn uji-btn-ghost" data-admin-clear-no>Batal</button>
                    </div>
                  `
                  : `<button type="button" class="uji-btn uji-btn-danger" data-admin-clear>Hapus Data Lokal</button>`
                : ""
            }
          </div>

          ${
            n === 0
              ? `<p class="empty-state" style="margin-top:16px">Belum ada data pengujian tersimpan di browser ini.</p>`
              : `
                <div class="table-wrap" style="margin-top:18px">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">ID Responden</th>
                        <th scope="col">Nama</th>
                        <th scope="col">NIM</th>
                        <th scope="col">Perangkat</th>
                        <th scope="col" class="num">Completion</th>
                        <th scope="col" class="num">Avg Time</th>
                        <th scope="col" class="num">Errors</th>
                        <th scope="col" class="num">SUS</th>
                        <th scope="col">Masukan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${savedSessions
                        .map(
                          (item) => `
                            <tr>
                              <td class="nowrap"><code>${esc(item.respondent_id)}</code></td>
                              <td>${esc(item.nama)}</td>
                              <td class="nowrap">${esc(item.nim)}</td>
                              <td>${esc(item.device_type || "-")}</td>
                              <td class="num">${esc(item.completion_rate_pct)}%</td>
                              <td class="num">${esc(item.avg_time_sec)} dtk</td>
                              <td class="num">${esc(item.total_errors)}</td>
                              <td class="num"><strong>${esc(item.sus_score)}</strong> (${esc(item.sus_grade)})</td>
                              <td>${esc(item.feedback || "-")}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>
      </section>
    `;

    root.querySelector("[data-admin-download]")?.addEventListener("click", () => {
      if (savedSessions.length === 0) return;
      triggerCsvDownload(
        savedSessions,
        `metroscope-uji-rekap-${savedSessions.length}-responden.csv`
      );
    });

    root.querySelector("[data-admin-clear]")?.addEventListener("click", () => {
      confirmClearLocal = true;
      renderAdminStage();
    });

    root.querySelector("[data-admin-clear-no]")?.addEventListener("click", () => {
      confirmClearLocal = false;
      renderAdminStage();
    });

    root.querySelector("[data-admin-clear-yes]")?.addEventListener("click", () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
      confirmClearLocal = false;
      renderAdminStage();
    });
  }

  function renderCurrentStage() {
    if (stage === "admin") renderAdminStage();
    else if (stage === "intro") renderIntroStage();
    else if (stage === "tasks") renderTasksStage();
    else if (stage === "sus") renderSusStage();
    else renderDoneStage();
  }

  renderCurrentStage();

  return function cleanup() {
    removeDock();
    destroyDashboard();
  };
}
