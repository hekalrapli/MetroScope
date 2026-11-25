import assert from "node:assert/strict";
import {
  TASKS,
  SUS_ITEMS,
  CSV_COLUMNS,
  computeSusScore,
  susGrade,
  isFilterError,
  buildSessionRecord,
  recordsToCsv,
} from "../js/uji-core.js";

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    passed += 1;
    console.log(`PASS ${name}`);
  } catch {
    failures.push(name);
    console.log(
      `FAIL ${name}\n     got:      ${JSON.stringify(actual)}\n     expected: ${JSON.stringify(expected)}`
    );
  }
}

check("jumlah task = 4", TASKS.length, 4);
check("jumlah pernyataan SUS = 10", SUS_ITEMS.length, 10);

// SUS scoring checks
check("SUS sempurna = 100", computeSusScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
check("SUS netral = 50", computeSusScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
check("SUS terendah = 0", computeSusScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
check("SUS 75 = Grade B", susGrade(75), "B");
check("SUS 82.5 = Grade A", susGrade(82.5), "A");
check("SUS 70 = Grade C", susGrade(70), "C");

// Task evaluation checks
check(
  "Task 1 benar (119, Meningkat)",
  TASKS[0].evaluate({ value: { count: "119", trend: "Meningkat" } }).correct,
  true
);
check(
  "Task 1 salah angka",
  TASKS[0].evaluate({ value: { count: "98", trend: "Meningkat" } }).correct,
  false
);
check(
  "Task 2 benar dengan filter 2024",
  TASKS[1].evaluate({ value: "Jakarta Utara", usedRequiredFilter: true, currentFilter: 2024 }).correct,
  true
);
check(
  "Task 2 gagal bila tidak memakai filter 2024",
  TASKS[1].evaluate({ value: "Jakarta Utara", usedRequiredFilter: false, currentFilter: "all" }).correct,
  false
);
check(
  "Task 3 benar dengan filter 2023",
  TASKS[2].evaluate({ value: "Penjaringan", usedRequiredFilter: true, currentFilter: 2023 }).correct,
  true
);
check(
  "Task 3 salah jika pilih Kalibaru (belum filter)",
  TASKS[2].evaluate({ value: "Kalibaru", usedRequiredFilter: true, currentFilter: 2023 }).correct,
  false
);
check(
  "Task 4 benar jika Menteng & filter sudah reset ke Semua tahun",
  TASKS[3].evaluate({ value: "Menteng", currentFilter: "all" }).correct,
  true
);
check(
  "Task 4 gagal jika lupa reset filter dari 2023",
  TASKS[3].evaluate({ value: "Menteng", currentFilter: 2023 }).correct,
  false
);

// Filter error helper
check("Task 2 filter 2023 dihitung error", isFilterError(TASKS[1], 2023), true);
check("Task 2 filter 2024 bukan error", isFilterError(TASKS[1], 2024), false);
check("Task 4 filter all bukan error", isFilterError(TASKS[3], "all"), false);

// Session record + CSV output
const sampleRecord = buildSessionRecord({
  timestamp: "2026-11-25T10:00:00.000Z",
  respondentId: "MHS-TEST-01",
  respondent: { nama: "Budi, S.Kom", nim: "24060124130001" },
  taskLogs: {
    t1: { answerText: "119 | Meningkat", correct: true, gaveUp: false, timeSec: 12.345, clicks: 2, errors: 0, filterOk: true, filterHistory: [], zoomUsed: [], tableUsed: 0 },
    t2: { answerText: "Jakarta Utara", correct: true, gaveUp: false, timeSec: 16.5, clicks: 3, errors: 0, filterOk: true, filterHistory: ["2024"], zoomUsed: ["cbq2"], tableUsed: 0 },
    t3: { answerText: "Penjaringan", correct: true, gaveUp: false, timeSec: 19.2, clicks: 4, errors: 1, filterOk: true, filterHistory: ["2025", "2023"], zoomUsed: [], tableUsed: 1 },
    t4: { answerText: "Menteng", correct: true, gaveUp: false, timeSec: 22.1, clicks: 5, errors: 0, filterOk: true, filterHistory: ["all"], zoomUsed: ["cbq5"], tableUsed: 0 },
  },
  susAnswers: [4, 2, 5, 1, 4, 2, 5, 1, 4, 2],
  feedback: 'Peta agak kecil, "Perbesar" sangat membantu',
  viewport: "1440x900",
});

check("completion_rate_pct = 100", sampleRecord.completion_rate_pct, 100);
check("total_errors = 1", sampleRecord.total_errors, 1);
check("total_zoom_uses = 2", sampleRecord.total_zoom_uses, 2);
check("sus_score sampel = 85", sampleRecord.sus_score, 85);
check("sus_grade sampel = A", sampleRecord.sus_grade, "A");

const csv = recordsToCsv([sampleRecord]);
const csvLines = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
check("CSV memiliki header + 1 baris data", csvLines.length, 2);
check("CSV header cocok dengan CSV_COLUMNS", csvLines[0], CSV_COLUMNS.join(","));
check("CSV escape koma & kutip ganda aman", csvLines[1].includes('"Budi, S.Kom"') && csvLines[1].includes('"Peta agak kecil, ""Perbesar"" sangat membantu"'), true);

console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length > 0) process.exit(1);
