/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Apps Script Web App untuk AI Account Manager (PWA)
 * 
 * Pembaruan TASK-REV-01:
 * 1. Skema kolom tetap (SCHEMAS) mencegah hilangnya properti opsional (resetAt, limitedAt, durationSec).
 * 2. Pemformatan teks murni ('@') mencegah formula injection (=IMPORTDATA, dll) dan konversi angka otomatis.
 * 3. Parser tipe eksplisit (JSON_COLS & TYPES) mencegah korupsi teks catatan bebas seperti "[1]" atau "{}".
 * 4. Dukungan pembacaan kunci dari PropertiesService untuk keamanan deployment.
 */

var AUTH_SECRET_KEY = "GANTI_DENGAN_KUNCI_RAHASIA_ANDA";

var SCHEMAS = {
  services: ['id', 'name', 'urlTemplate', 'usesAuthuser', 'resetRule', 'createdAt', 'updatedAt'],
  persons:  ['id', 'ownerName', 'googleEmail', 'label', 'note', 'createdAt', 'updatedAt'],
  access:   ['id', 'personId', 'serviceId', 'loginMethod', 'loginName', 'status', 'limitedAt', 'resetAt', 'activeSessionStart', 'createdAt', 'updatedAt'],
  logs:     ['id', 'accessId', 'type', 'at', 'durationSec', 'detail'],
  handoff:  ['id', 'serviceId', 'accessId', 'authorName', 'text', 'createdAt']
};

var JSON_COLS = {
  services: ['resetRule']
};

var TYPES = {
  services: { usesAuthuser: 'bool' },
  logs: { durationSec: 'num' }
};

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "AI Account Manager Web App is active. Use POST with secret key to interact."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Empty request body" }, 400);
    }

    var requestData = JSON.parse(e.postData.contents);
    var providedSecret = requestData.secret || "";

    // 1. Verifikasi kunci rahasia (prioritas script property, fallback ke konstanta)
    var configuredSecret = PropertiesService.getScriptProperties().getProperty("AUTH_SECRET_KEY") || AUTH_SECRET_KEY;
    if (!providedSecret || providedSecret !== configuredSecret) {
      return createJsonResponse({ 
        success: false, 
        error: "Akses ditolak: Kunci rahasia salah atau tidak disediakan." 
      }, 403);
    }

    var action = requestData.action || "ping";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // Jika skrip berdiri sendiri (standalone), buat atau buka via ID
      var fileId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
      if (fileId) {
        ss = SpreadsheetApp.openById(fileId);
      } else {
        ss = SpreadsheetApp.create("AI_Account_Manager_Backup");
        PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
      }
    }

    // 2. Aksi: Ping (CORS & Connectivity probe)
    if (action === "ping") {
      return createJsonResponse({
        success: true,
        message: "Pong! Koneksi Apps Script Web App berhasil terverifikasi.",
        timestamp: new Date().toISOString(),
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl()
      });
    }

    // 3. Aksi: Backup (PWA -> Sheet)
    if (action === "backup") {
      var backupData = requestData.data || {};
      writeToSheet(ss, "services", backupData.services || []);
      writeToSheet(ss, "persons", backupData.persons || []);
      writeToSheet(ss, "access", backupData.access || []);
      writeToSheet(ss, "logs", backupData.logs || []);
      writeToSheet(ss, "handoff", backupData.handoffNotes || []);

      return createJsonResponse({
        success: true,
        message: "Backup berhasil ditulis ke seluruh tab Spreadsheet.",
        backupTimestamp: new Date().toISOString()
      });
    }

    // 4. Aksi: Restore (Sheet -> PWA)
    if (action === "restore") {
      var restored = {
        services: readFromSheet(ss, "services"),
        persons: readFromSheet(ss, "persons"),
        access: readFromSheet(ss, "access"),
        logs: readFromSheet(ss, "logs"),
        handoffNotes: readFromSheet(ss, "handoff")
      };

      return createJsonResponse({
        success: true,
        message: "Data pemulihan berhasil dibaca dari Spreadsheet.",
        data: restored
      });
    }

    return createJsonResponse({ success: false, error: "Aksi tidak dikenal: " + action }, 400);

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() }, 500);
  }
}

function writeToSheet(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();

  var headers = SCHEMAS[sheetName] || (rows && rows.length > 0 ? Object.keys(rows[0]) : []);
  if (!headers || headers.length === 0) {
    sheet.appendRow(["_empty"]);
    return;
  }

  if (!rows || rows.length === 0) {
    sheet.appendRow(headers);
    return;
  }

  var dataMatrix = [headers];
  var jsonCols = JSON_COLS[sheetName] || [];

  for (var i = 0; i < rows.length; i++) {
    var rowObj = rows[i];
    var rowValues = [];
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      var val = rowObj[h];
      if (val === undefined || val === null) {
        rowValues.push("");
      } else if (jsonCols.indexOf(h) >= 0) {
        rowValues.push(JSON.stringify(val));
      } else {
        rowValues.push(String(val));
      }
    }
    dataMatrix.push(rowValues);
  }

  // Tulis dengan proteksi format teks murni (@) untuk mencegah formula injection
  var range = sheet.getRange(1, 1, dataMatrix.length, headers.length);
  range.setNumberFormat('@');
  range.setValues(dataMatrix);
}

function readFromSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var headers = SCHEMAS[sheetName];
  if (!headers) {
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  if (lastRow < 2) return [];

  var rawData = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  var result = [];
  var jsonCols = JSON_COLS[sheetName] || [];
  var typeMap = TYPES[sheetName] || {};

  for (var i = 0; i < rawData.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var rawVal = rawData[i][j];
      if (rawVal === "" || rawVal === undefined) {
        continue; // abaikan kolom kosong agar nilai undefined terjaga
      }

      if (jsonCols.indexOf(key) >= 0) {
        try {
          item[key] = JSON.parse(rawVal);
        } catch (e) {
          item[key] = rawVal;
        }
      } else if (typeMap[key] === 'bool') {
        item[key] = (rawVal === 'true');
      } else if (typeMap[key] === 'num') {
        item[key] = Number(rawVal);
      } else {
        item[key] = rawVal;
      }
    }
    result.push(item);
  }

  return result;
}

function createJsonResponse(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
