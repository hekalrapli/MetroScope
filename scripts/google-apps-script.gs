/**
 * MetroScope — Kolektor Hasil Usability Testing (ISO 9241-11 + SUS) ke Google Sheets
 *
 * Cara pasang (±1 menit):
 * 1. Buat Google Spreadsheet baru (mis. "MetroScope Usability Testing").
 * 2. Klik menu: Extensions -> Apps Script.
 * 3. Hapus kode default, lalu tempel seluruh isi file ini dan klik Simpan.
 * 4. Klik Deploy -> New deployment -> pilih jenis "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Klik Deploy, izinkan akses, lalu salin URL Web App (berakhiran /exec).
 * 6. Tempel URL tersebut ke konstanta GOOGLE_SHEETS_WEBHOOK_URL di file js/pages/uji.js,
 *    lalu commit & push ke GitHub Pages.
 */

var SHEET_NAME = "Hasil_Uji_Kinerja";

var COLUMNS = [
  "timestamp",
  "respondent_id",
  "persona",
  "nama",
  "nim",
  "t1_answer",
  "t1_correct",
  "t1_gave_up",
  "t1_time_sec",
  "t1_clicks",
  "t1_errors",
  "t1_filter_ok",
  "t1_filter_history",
  "t1_zoom_used",
  "t1_table_used",
  "t2_answer",
  "t2_correct",
  "t2_gave_up",
  "t2_time_sec",
  "t2_clicks",
  "t2_errors",
  "t2_filter_ok",
  "t2_filter_history",
  "t2_zoom_used",
  "t2_table_used",
  "t3_answer",
  "t3_correct",
  "t3_gave_up",
  "t3_time_sec",
  "t3_clicks",
  "t3_errors",
  "t3_filter_ok",
  "t3_filter_history",
  "t3_zoom_used",
  "t3_table_used",
  "t4_answer",
  "t4_correct",
  "t4_gave_up",
  "t4_time_sec",
  "t4_clicks",
  "t4_errors",
  "t4_filter_ok",
  "t4_filter_history",
  "t4_zoom_used",
  "t4_table_used",
  "completion_rate_pct",
  "avg_time_sec",
  "total_errors",
  "total_zoom_uses",
  "sus_q1",
  "sus_q2",
  "sus_q3",
  "sus_q4",
  "sus_q5",
  "sus_q6",
  "sus_q7",
  "sus_q8",
  "sus_q9",
  "sus_q10",
  "sus_score",
  "sus_grade",
  "feedback",
  "viewport",
];

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
  }
  return sheet;
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: "MetroScope Usability Collector" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    var row = COLUMNS.map(function (col) {
      var val = payload[col];
      return val === undefined || val === null ? "" : val;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, respondent_id: payload.respondent_id || "" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
