export const CONSENT_TEXT =
  "Saya menyatakan bahwa saya telah memahami tujuan pengujian ini dan bersedia berpartisipasi secara sukarela tanpa adanya paksaan dari pihak mana pun. Saya juga bersedia menyelesaikan tugas serta memberikan jawaban sesuai dengan pemahaman dan pendapat pribadi selama proses pengujian berlangsung.";

export const SUS_ITEMS = [
  "Saya merasa akan sering menggunakan dashboard ini.",
  "Saya merasa dashboard ini terlalu rumit padahal seharusnya bisa lebih sederhana.",
  "Saya merasa dashboard ini mudah digunakan.",
  "Saya merasa membutuhkan bantuan orang teknis untuk dapat menggunakan dashboard ini.",
  "Saya merasa berbagai fitur dan filter pada dashboard ini terintegrasi dengan baik.",
  "Saya merasa terlalu banyak ketidakkonsistenan pada dashboard ini.",
  "Saya membayangkan kebanyakan orang akan cepat belajar menggunakan dashboard ini.",
  "Saya merasa dashboard ini sangat merepotkan atau canggung untuk digunakan.",
  "Saya merasa sangat percaya diri saat menggunakan dashboard ini.",
  "Saya perlu mempelajari banyak hal terlebih dahulu sebelum bisa menggunakan dashboard ini.",
];

export const TASKS = [
  {
    id: "t1",
    number: 1,
    shortTitle: "Tren Catatan RW (CBQ 1)",
    component: "CBQ 1 — Line Chart",
    instruction:
      "Pada grafik tren tahunan catatan RW (CBQ 1), berapa jumlah catatan RW pada tahun 2025 dan bagaimana arah trennya dari 2023 ke 2025?",
    requiredFilter: "all",
    requiresFilterAction: false,
    inputType: "number_and_trend",
    trendOptions: ["Meningkat", "Menurun", "Tetap"],
    groundTruthLabel: "119 — Meningkat",
    evaluate({ value }) {
      const cleaned = String(value?.count ?? "").replace(/[^\d]/g, "");
      const num = cleaned === "" ? NaN : Number(cleaned);
      const trend = String(value?.trend ?? "");
      return {
        correct: num === 119 && trend === "Meningkat",
        filterOk: true,
        answerText: `${cleaned || "-"} | ${trend || "-"}`,
      };
    },
  },
  {
    id: "t2",
    number: 2,
    shortTitle: "Filter Tahun & Wilayah (CBQ 2)",
    component: "CBQ 2 — Grouped Bar",
    instruction:
      "Gunakan filter Tahun analisis di bagian atas untuk memilih tahun 2024. Pada tahun 2024, wilayah administrasi mana yang memiliki catatan RW terbanyak pada grafik perbandingan antarwilayah (CBQ 2)?",
    requiredFilter: 2024,
    requiresFilterAction: true,
    inputType: "choice",
    options: [
      "Jakarta Barat",
      "Jakarta Pusat",
      "Jakarta Selatan",
      "Jakarta Timur",
      "Jakarta Utara",
      "Kep. Seribu",
    ],
    groundTruthLabel: "Jakarta Utara (40 catatan RW)",
    evaluate({ value, usedRequiredFilter, currentFilter }) {
      const answer = String(value ?? "");
      const filterOk = Boolean(usedRequiredFilter || currentFilter === 2024);
      return {
        correct: answer === "Jakarta Utara" && filterOk,
        filterOk,
        answerText: answer || "-",
      };
    },
  },
  {
    id: "t3",
    number: 3,
    shortTitle: "Konsentrasi Lokasi 2023 (CBQ 3)",
    component: "CBQ 3 — Horizontal Bar",
    instruction:
      "Ubah filter Tahun analisis ke tahun 2023. Pada diagram batang horizontal konsentrasi lokasi (CBQ 3), kelurahan apa yang berada di peringkat pertama pada tahun 2023?",
    requiredFilter: 2023,
    requiresFilterAction: true,
    inputType: "choice",
    options: [
      "Kalibaru",
      "Penjaringan",
      "Ancol",
      "Cipete Utara",
      "Koja",
      "Menteng",
    ],
    groundTruthLabel: "Penjaringan (12 catatan RW)",
    evaluate({ value, usedRequiredFilter, currentFilter }) {
      const answer = String(value ?? "");
      const filterOk = Boolean(usedRequiredFilter || currentFilter === 2023);
      return {
        correct: answer === "Penjaringan" && filterOk,
        filterOk,
        answerText: answer || "-",
      };
    },
  },
  {
    id: "t4",
    number: 4,
    shortTitle: "Reset Filter & Peta PSU (CBQ 5)",
    component: "CBQ 5 — Choropleth Map",
    instruction:
      "Kembalikan filter Tahun analisis ke kondisi awal (Semua tahun), lalu periksa pada Peta Sebaran PSU (CBQ 5): kelurahan mana yang memiliki peningkatan PSU tertinggi (warna biru paling gelap)? (Anda dapat memperbesar/zoom peta atau menekan tombol Perbesar, lalu arahkan kursor atau ketuk wilayah pada peta.)",
    requiredFilter: "all",
    requiresFilterAction: true,
    mustEndOnRequiredFilter: true,
    ensureStartFilter: 2023,
    inputType: "choice",
    options: [
      "Menteng",
      "Cipete Utara",
      "Duri Pulo",
      "Galur",
      "Kalibaru",
      "Penjaringan",
    ],
    groundTruthLabel: "Menteng (23 PSU)",
    evaluate({ value, currentFilter }) {
      const answer = String(value ?? "");
      const filterOk = currentFilter === "all";
      return {
        correct: answer === "Menteng" && filterOk,
        filterOk,
        answerText: answer || "-",
      };
    },
  },
];

export const CSV_COLUMNS = [
  "timestamp",
  "respondent_id",
  "persona",
  "nama",
  "nim",
  ...TASKS.flatMap((task) => [
    `${task.id}_answer`,
    `${task.id}_correct`,
    `${task.id}_gave_up`,
    `${task.id}_time_sec`,
    `${task.id}_clicks`,
    `${task.id}_errors`,
    `${task.id}_filter_ok`,
    `${task.id}_filter_history`,
    `${task.id}_zoom_used`,
    `${task.id}_table_used`,
  ]),
  "completion_rate_pct",
  "avg_time_sec",
  "total_errors",
  "total_zoom_uses",
  ...SUS_ITEMS.map((_, index) => `sus_q${index + 1}`),
  "sus_score",
  "sus_grade",
  "feedback",
  "device_type",
  "viewport",
  "pernyataan_sukarela",
];

export function detectDeviceType({ width, coarsePointer = false }) {
  if (width <= 768) return "mobile";
  if (width <= 1024 && coarsePointer) return "tablet";
  return "desktop";
}

export function computeSusScore(answers) {
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new Error("SUS membutuhkan tepat 10 jawaban (skala 1–5).");
  }
  let total = 0;
  for (let i = 0; i < 10; i += 1) {
    const val = Number(answers[i]);
    if (!Number.isInteger(val) || val < 1 || val > 5) {
      throw new Error(`Jawaban SUS nomor ${i + 1} harus bilangan bulat 1–5.`);
    }
    total += i % 2 === 0 ? val - 1 : 5 - val;
  }
  return Number((total * 2.5).toFixed(1));
}

export function susGrade(score) {
  if (score >= 80.3) return "A";
  if (score >= 75) return "B";
  if (score >= 68) return "C";
  if (score >= 51) return "D";
  return "F";
}

export function isFilterError(task, selectedYear) {
  if (!task) return false;
  return selectedYear !== task.requiredFilter;
}

export function buildSessionRecord({
  timestamp,
  respondentId,
  respondent,
  taskLogs,
  susAnswers,
  feedback,
  deviceType,
  viewport,
}) {
  const susScore = computeSusScore(susAnswers);
  const record = {
    timestamp,
    respondent_id: respondentId,
    persona: "Mahasiswa",
    nama: String(respondent?.nama ?? "").trim(),
    nim: String(respondent?.nim ?? "").trim(),
  };

  let correctCount = 0;
  let totalTime = 0;
  let totalErrors = 0;
  let totalZoomUses = 0;

  for (const task of TASKS) {
    const log = taskLogs[task.id] || {};
    const correct = log.correct ? 1 : 0;
    const gaveUp = log.gaveUp ? 1 : 0;
    const timeSec = Number((Number(log.timeSec) || 0).toFixed(2));
    const clicks = Number(log.clicks) || 0;
    const errors = Number(log.errors) || 0;
    const filterOk = log.filterOk ? 1 : 0;
    const zoomList = Array.isArray(log.zoomUsed) ? log.zoomUsed : [];

    correctCount += correct;
    totalTime += timeSec;
    totalErrors += errors;
    totalZoomUses += zoomList.length;

    record[`${task.id}_answer`] = String(log.answerText ?? "-");
    record[`${task.id}_correct`] = correct;
    record[`${task.id}_gave_up`] = gaveUp;
    record[`${task.id}_time_sec`] = timeSec;
    record[`${task.id}_clicks`] = clicks;
    record[`${task.id}_errors`] = errors;
    record[`${task.id}_filter_ok`] = filterOk;
    record[`${task.id}_filter_history`] = Array.isArray(log.filterHistory)
      ? log.filterHistory.join(">")
      : "";
    record[`${task.id}_zoom_used`] = zoomList.join(";");
    record[`${task.id}_table_used`] = Number(log.tableUsed) || 0;
  }

  record.completion_rate_pct = Number(
    ((correctCount / TASKS.length) * 100).toFixed(1)
  );
  record.avg_time_sec = Number((totalTime / TASKS.length).toFixed(2));
  record.total_errors = totalErrors;
  record.total_zoom_uses = totalZoomUses;

  for (let i = 0; i < 10; i += 1) {
    record[`sus_q${i + 1}`] = Number(susAnswers[i]);
  }
  record.sus_score = susScore;
  record.sus_grade = susGrade(susScore);
  record.feedback = String(feedback ?? "").trim();
  record.device_type = String(deviceType ?? "desktop");
  record.viewport = String(viewport ?? "");
  record.pernyataan_sukarela = respondent?.consent ? "Setuju" : "Tidak";

  return record;
}

export function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function recordsToCsv(records) {
  const header = CSV_COLUMNS.map(csvEscape).join(",");
  const lines = records.map((record) =>
    CSV_COLUMNS.map((col) => csvEscape(record[col])).join(",")
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}

export function mergeSessions(cloudRows = [], localRows = []) {
  const byId = new Map();
  const cloudIds = new Set();

  for (const row of cloudRows) {
    if (!row || typeof row !== "object") continue;
    const id = String(row.respondent_id ?? "").trim();
    const key = id || `cloud-${byId.size}`;
    if (id) cloudIds.add(id);
    byId.set(key, { ...row, _source: "sheets" });
  }

  const unsyncedLocal = [];
  for (const row of localRows) {
    if (!row || typeof row !== "object") continue;
    const id = String(row.respondent_id ?? "").trim();
    if (id && cloudIds.has(id)) continue;
    const key = id || `local-${byId.size}`;
    if (!byId.has(key)) {
      byId.set(key, { ...row, _source: "lokal" });
      unsyncedLocal.push(row);
    }
  }

  const merged = [...byId.values()].sort((a, b) =>
    String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? ""))
  );

  return { merged, unsyncedLocal };
}

export function summarizeSessions(records = []) {
  const count = records.length;
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };

  if (count === 0) {
    return {
      count: 0,
      deviceCounts,
      avgCompletionPct: 0,
      passCompletion: false,
      avgTimeSec: 0,
      passTime: false,
      avgErrorsPerUser: 0,
      totalErrors: 0,
      avgSusScore: 0,
      avgSusGrade: "-",
      passSus: false,
      perTask: TASKS.map((task) => ({
        id: task.id,
        number: task.number,
        shortTitle: task.shortTitle,
        component: task.component,
        completionPct: 0,
        avgTimeSec: 0,
        totalErrors: 0,
        gaveUpCount: 0,
        zoomCount: 0,
        tableCount: 0,
      })),
    };
  }

  let sumCompletion = 0;
  let sumAvgTime = 0;
  let sumErrors = 0;
  let sumSus = 0;

  for (const row of records) {
    const dev = String(row.device_type || "desktop").toLowerCase();
    if (dev === "mobile") deviceCounts.mobile += 1;
    else if (dev === "tablet") deviceCounts.tablet += 1;
    else deviceCounts.desktop += 1;

    sumCompletion += Number(row.completion_rate_pct) || 0;
    sumAvgTime += Number(row.avg_time_sec) || 0;
    sumErrors += Number(row.total_errors) || 0;
    sumSus += Number(row.sus_score) || 0;
  }

  const avgCompletionPct = Number((sumCompletion / count).toFixed(1));
  const avgTimeSec = Number((sumAvgTime / count).toFixed(2));
  const avgErrorsPerUser = Number((sumErrors / count).toFixed(2));
  const avgSusScore = Number((sumSus / count).toFixed(1));

  const perTask = TASKS.map((task) => {
    let correct = 0;
    let timeSum = 0;
    let errors = 0;
    let gaveUp = 0;
    let zooms = 0;
    let tables = 0;
    for (const row of records) {
      correct += Number(row[`${task.id}_correct`]) ? 1 : 0;
      timeSum += Number(row[`${task.id}_time_sec`]) || 0;
      errors += Number(row[`${task.id}_errors`]) || 0;
      gaveUp += Number(row[`${task.id}_gave_up`]) ? 1 : 0;
      const z = String(row[`${task.id}_zoom_used`] ?? "").trim();
      if (z) zooms += z.split(";").filter(Boolean).length;
      tables += Number(row[`${task.id}_table_used`]) || 0;
    }
    return {
      id: task.id,
      number: task.number,
      shortTitle: task.shortTitle,
      component: task.component,
      completionPct: Number(((correct / count) * 100).toFixed(1)),
      avgTimeSec: Number((timeSum / count).toFixed(2)),
      totalErrors: errors,
      gaveUpCount: gaveUp,
      zoomCount: zooms,
      tableCount: tables,
    };
  });

  return {
    count,
    deviceCounts,
    avgCompletionPct,
    passCompletion: avgCompletionPct >= 90,
    avgTimeSec,
    passTime: avgTimeSec <= 30,
    avgErrorsPerUser,
    totalErrors: sumErrors,
    avgSusScore,
    avgSusGrade: susGrade(avgSusScore),
    passSus: avgSusScore >= 75,
    perTask,
  };
}
