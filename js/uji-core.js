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
      "Kembalikan filter Tahun analisis ke kondisi awal (Semua tahun), lalu periksa pada Peta Sebaran PSU (CBQ 5): kelurahan mana yang memiliki peningkatan PSU tertinggi (warna biru paling gelap)? (Anda dapat zoom atau klik Perbesar pada peta jika diperlukan.)",
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
  "viewport",
];

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
  record.viewport = String(viewport ?? "");

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
