/**
 * MetroScope — Kolektor & Pembaca Hasil Usability Testing (ISO 9241-11 + SUS)
 *
 * Cara update deployment (±30 detik):
 * 1. Di Google Apps Script yang sudah ada, ganti seluruh isi file dengan kode ini lalu Ctrl + S.
 * 2. Klik Deploy -> Manage deployments -> klik ikon pensil (Edit).
 * 3. Pada kolom Version, pilih "New version" -> klik Deploy.
 *    (URL Web App /exec tetap sama, tidak berubah!)
 */

var SHEET_NAME = "Hasil_Uji_Kinerja";
var ADMIN_PIN = "metroscope2026";

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
  "device_type",
  "viewport",
];

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

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

function readAllRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    var obj = {};
    var hasAny = false;
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var val = raw[c];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      if (val !== "" && val !== null && val !== undefined) {
        hasAny = true;
      }
      obj[key] = val;
    }
    if (hasAny) {
      rows.push(obj);
    }
  }
  return rows;
}

function hasRespondentId_(sheet, respondentId) {
  if (!respondentId || sheet.getLastRow() < 2) return false;
  var headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (h) {
      return String(h).trim();
    });
  var idCol = headers.indexOf("respondent_id") + 1;
  if (idCol <= 0) return false;
  var ids = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(respondentId).trim()) {
      return true;
    }
  }
  return false;
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === "list") {
    if (String(params.pin || "") !== ADMIN_PIN) {
      return jsonOut_({ ok: false, error: "PIN tidak sesuai." });
    }
    var rows = readAllRows_();
    return jsonOut_({
      ok: true,
      service: "MetroScope Usability Collector",
      version: 2,
      count: rows.length,
      rows: rows,
    });
  }
  return jsonOut_({
    ok: true,
    service: "MetroScope Usability Collector",
    version: 2,
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    if (payload.respondent_id && hasRespondentId_(sheet, payload.respondent_id)) {
      return jsonOut_({
        ok: true,
        duplicate: true,
        respondent_id: payload.respondent_id,
      });
    }
    var row = COLUMNS.map(function (col) {
      var val = payload[col];
      return val === undefined || val === null ? "" : val;
    });
    sheet.appendRow(row);
    return jsonOut_({
      ok: true,
      respondent_id: payload.respondent_id || "",
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
