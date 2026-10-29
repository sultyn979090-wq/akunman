/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Apps Script Web App untuk AI Account Manager (PWA)
 * 
 * Petunjuk Deploy:
 * 1. Buka https://script.google.com/ dan buat proyek baru.
 * 2. Salin kode ini ke file Code.gs.
 * 3. Hubungkan Spreadsheet atau biarkan skrip membuat tab pada Spreadsheet aktif.
 * 4. Atur properti script atau ubah konstanta AUTH_SECRET_KEY di bawah ini.
 * 5. Klik "Deploy" -> "New deployment" -> Type: "Web app":
 *    - Execute as: Me (akun Anda)
 *    - Who has access: Anyone (Siapa saja dengan tautan)
 * 6. Salin Web App URL (berakhiran /exec) ke Pengaturan PWA.
 */

var AUTH_SECRET_KEY = "GANTI_DENGAN_KUNCI_RAHASIA_ANDA";

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

    // 1. Verifikasi kunci rahasia
    if (!providedSecret || providedSecret !== AUTH_SECRET_KEY) {
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

  if (!rows || rows.length === 0) {
    sheet.appendRow(["_empty"]);
    return;
  }

  var headers = Object.keys(rows[0]);
  sheet.appendRow(headers);

  var dataMatrix = [];
  for (var i = 0; i < rows.length; i++) {
    var rowObj = rows[i];
    var rowValues = [];
    for (var j = 0; j < headers.length; j++) {
      var val = rowObj[headers[j]];
      if (typeof val === "object" && val !== null) {
        rowValues.push(JSON.stringify(val));
      } else {
        rowValues.push(val !== undefined ? val : "");
      }
    }
    dataMatrix.push(rowValues);
  }

  if (dataMatrix.length > 0) {
    sheet.getRange(2, 1, dataMatrix.length, headers.length).setValues(dataMatrix);
  }
}

function readFromSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers[0] === "_empty") return [];

  var rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var result = [];

  for (var i = 0; i < rawData.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var rawVal = rawData[i][j];
      if (typeof rawVal === "string" && (rawVal.startsWith("{") || rawVal.startsWith("["))) {
        try {
          item[key] = JSON.parse(rawVal);
        } catch (e) {
          item[key] = rawVal;
        }
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
