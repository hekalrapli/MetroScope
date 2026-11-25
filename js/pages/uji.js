import { render as renderOverview } from "./overview.js?v=20261125a";
import { esc } from "../ui.js?v=20261119ac";
import {
  TASKS,
  SUS_ITEMS,
  isFilterError,
  buildSessionRecord,
  recordsToCsv,
} from "../uji-core.js?v=20261125b";

// Tempel URL Web App Google Apps Script Anda di bawah ini setelah deploy
// (panduan & skrip lengkap ada di scripts/google-apps-script.gs).
// Biarkan kosong jika hanya memakai penyimpanan lokal & unduh CSV.
const GOOGLE_SHEETS_WEBHOOK_URL = "";

const STORAGE_KEY = "metroscope_uji_sessions_v1";

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
  let stage = "intro"; // intro | tasks | sus | done
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
    dockCollapsed = false;
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
        lockNote.innerHTML = `<strong>Panel dashboard siap di bawah.</strong> Baca instruksi <em>Task ${nextTask.number}</em> pada panel bawah, lalu klik <strong>Mulai Task ${nextTask.number}</strong> untuk mulai berinteraksi.`;
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
            <button type="button" class="uji-btn uji-btn-ghost" data-uji-toggle-dock aria-expanded="${String(!dockCollapsed)}">
              ${dockCollapsed ? "Tampilkan soal & jawaban" : "Lipat panel"}
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
                    : `<button type="button" class="uji-btn uji-btn-muted" data-uji-giveup>Menyerah / Tidak ketemu</button>`
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
              <li>Gunakan filter <strong>Tahun analisis</strong> di bagian atas dashboard untuk menyaring seluruh grafik sekaligus.</li>
              <li>Arahkan kursor (<em>hover</em>) pada grafik atau peta untuk membaca nilai eksak dan keterangan wilayah.</li>
              <li>Jika grafik atau peta terasa terlalu kecil, klik tombol <strong>Perbesar</strong> di pojok kanan atas panel untuk melihatnya lebih jelas, atau klik <strong>Lihat sebagai tabel</strong> di bawah panel.</li>
              <li>Seluruh tugas dikerjakan di <strong>satu halaman ini</strong> tanpa perlu berpindah tab.</li>
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
        <strong>Panel dashboard siap di bawah.</strong> Baca instruksi <em>Task ${TASKS[taskIndex].number}</em> pada panel bawah, lalu klik <strong>Mulai Task</strong> untuk mulai berinteraksi.
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

          <form class="uji-sus-form" id="uji-sus-form" novalidate>
            <div class="uji-sus-list">
              ${SUS_ITEMS.map(
                (statement, idx) => `
                  <fieldset class="uji-sus-item" data-sus-row="${idx}">
                    <legend class="uji-sus-question">
                      <span class="uji-sus-num">${idx + 1}.</span>
                      <span>${esc(statement)}</span>
                    </legend>
                    <div class="uji-likert" role="radiogroup" aria-label="Pernyataan ${idx + 1}">
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
                  </fieldset>
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

      finalRecord = buildSessionRecord({
        timestamp: new Date().toISOString(),
        respondentId,
        respondent,
        taskLogs,
        susAnswers,
        feedback: feedbackText,
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

    let statusHtml = "";
    if (uploadResult?.status === "sent" || uploadResult?.status === "sent_opaque") {
      statusHtml = `
        <div class="uji-status-box is-success" role="status">
          <strong>Data berhasil dikirim ke Google Sheets.</strong>
          Anda dapat menutup halaman ini atau mengunduh salinan CSV sebagai cadangan.
        </div>
      `;
    } else if (uploadResult?.status === "failed") {
      statusHtml = `
        <div class="uji-status-box is-warn" role="alert">
          <strong>Pengiriman otomatis ke Google Sheets gagal (${esc(uploadResult.message || "masalah koneksi")}).</strong>
          Hasil Anda tetap tersimpan aman di perangkat ini—silakan klik <strong>Coba Kirim Ulang</strong> atau <strong>Unduh Hasil (CSV)</strong> lalu kirim ke peneliti.
        </div>
      `;
    } else {
      statusHtml = `
        <div class="uji-status-box is-info" role="status">
          <strong>Hasil pengujian tersimpan di perangkat ini (ID: <code>${esc(finalRecord.respondent_id)}</code>).</strong>
          Klik <strong>Unduh Hasil (CSV)</strong> di bawah untuk menyerahkan log pengujian ke peneliti.
        </div>
      `;
    }

    root.innerHTML = `
      <section class="uji-shell">
        <div class="panel uji-card">
          <span class="uji-kicker">Pengujian Selesai</span>
          <h1 class="uji-title">Terima Kasih, ${esc(finalRecord.nama)}!</h1>
          <p class="uji-lead">
            Seluruh 4 tugas interaksi dan 10 pernyataan kuesioner SUS telah tercatat.
            Masukan Anda sangat membantu evaluasi dan peningkatan desain dashboard <strong>MetroScope</strong>.
          </p>

          ${statusHtml}

          <div class="uji-done-meta">
            <div><span class="muted">ID Responden</span><strong>${esc(finalRecord.respondent_id)}</strong></div>
            <div><span class="muted">Persona</span><strong>${esc(finalRecord.persona)}</strong></div>
            <div><span class="muted">Tugas Selesai</span><strong>${TASKS.length} / ${TASKS.length}</strong></div>
            <div><span class="muted">Kuesioner SUS</span><strong>Tercatat (10/10)</strong></div>
          </div>

          <div class="uji-form-actions uji-done-actions">
            ${
              uploadResult?.status === "failed"
                ? `<button type="button" class="uji-btn uji-btn-primary" data-uji-retry>Coba Kirim Ulang</button>`
                : ""
            }
            <button type="button" class="uji-btn ${
              uploadResult?.status === "unconfigured" ? "uji-btn-primary" : "uji-btn-secondary"
            }" data-uji-download-one>
              Unduh Hasil Sesi Ini (CSV)
            </button>
            ${
              savedSessions.length > 1
                ? `<button type="button" class="uji-btn uji-btn-secondary" data-uji-download-all>
                    Unduh Semua Sesi di Perangkat Ini (${savedSessions.length} responden, CSV)
                  </button>`
                : ""
            }
            <button type="button" class="uji-btn uji-btn-ghost" data-uji-restart>
              Mulai Sesi Responden Baru
            </button>
          </div>
        </div>
      </section>
    `;

    root
      .querySelector("[data-uji-download-one]")
      ?.addEventListener("click", () => {
        triggerCsvDownload(
          [finalRecord],
          `metroscope-uji-${finalRecord.respondent_id}.csv`
        );
      });

    root
      .querySelector("[data-uji-download-all]")
      ?.addEventListener("click", () => {
        triggerCsvDownload(
          savedSessions,
          `metroscope-uji-rekap-${savedSessions.length}-responden.csv`
        );
      });

    root.querySelector("[data-uji-retry]")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.textContent = "Mengirim ulang…";
      uploadResult = await submitToGoogleSheets(finalRecord);
      renderDoneStage();
    });

    root
      .querySelector("[data-uji-restart]")
      ?.addEventListener("click", () => resetAll());
  }

  function renderCurrentStage() {
    if (stage === "intro") renderIntroStage();
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
