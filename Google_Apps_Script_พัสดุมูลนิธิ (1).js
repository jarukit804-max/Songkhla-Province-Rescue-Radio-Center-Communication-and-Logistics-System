/**
 * Google Apps Script - ระบบพัสดุสื่อสาร มูลนิธิ V2
 * ไฟล์: Google_Apps_Script_พัสดุมูลนิธิ.js
 * วางโค้ดนี้ใน Extensions > Apps Script ของ Google Sheets
 */
var SHEET_NAME_ITEMS = 'พัสดุ';
var SHEET_NAME_LOGS = 'ประวัติเบิก';

function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh1 = ss.getSheetByName(SHEET_NAME_ITEMS);
  if (!sh1) {
    sh1 = ss.insertSheet(SHEET_NAME_ITEMS);
    sh1.appendRow(["id","image","name","type","brand","model","serial","qty","unit","status","location","responsible","dateAcquired","price","notes","history_json"]);
  }
  var sh2 = ss.getSheetByName(SHEET_NAME_LOGS);
  if (!sh2) {
    sh2 = ss.insertSheet(SHEET_NAME_LOGS);
    sh2.appendRow(["id","itemId","borrower","department","purpose","borrowDate","dueDate","returnDate"]);
  }
  return {itemsSheet: sh1, logsSheet: sh2};
}

function doGet(e) {
  try {
    var sheets = ensureSheets();
    var itemsSheet = sheets.itemsSheet;
    var logsSheet = sheets.logsSheet;
    var lastRow = itemsSheet.getLastRow();
    var items = [];
    if (lastRow > 1) {
      var values = itemsSheet.getRange(2,1,lastRow-1,16).getValues();
      items = values.filter(function(r){return r[0] !== ''}).map(function(r){
        var history = [];
        try { history = JSON.parse(r[15] || '[]'); } catch(e){ history = []; }
        return {
          id: r[0], image: r[1], name: r[2], type: r[3], brand: r[4], model: r[5], serial: r[6],
          qty: Number(r[7])||1, unit: r[8], status: r[9], location: r[10], responsible: r[11],
          dateAcquired: r[12], price: Number(r[13])||0, notes: r[14], history: history
        };
      });
    }
    var logs = [];
    var logsLast = logsSheet.getLastRow();
    if (logsLast > 1) {
      var logVals = logsSheet.getRange(2,1,logsLast-1,8).getValues();
      logs = logVals.filter(function(r){return r[0]!==''}).map(function(r){
        return {id:r[0], itemId:r[1], borrower:r[2], department:r[3], purpose:r[4], borrowDate:r[5], dueDate:r[6], returnDate:r[7]};
      });
    }
    var output = { status: "success", items: items, logs: logs, count: items.length, timestamp: new Date().toISOString() };
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheets = ensureSheets();
    var itemsSheet = sheets.itemsSheet;
    var logsSheet = sheets.logsSheet;
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
      if (body.items && typeof body.items === 'string') {
        try { body.items = JSON.parse(body.items); } catch(x){}
      }
    }
    if (body.action === 'sync' || body.items) {
      var items = body.items || [];
      if (typeof items === 'string') items = JSON.parse(items);
      // Clear and rewrite items
      itemsSheet.clearContents();
      itemsSheet.appendRow(["id","image","name","type","brand","model","serial","qty","unit","status","location","responsible","dateAcquired","price","notes","history_json"]);
      var rows = items.map(function(it){
        return [it.id, it.image||'', it.name||'', it.type||'', it.brand||'', it.model||'', it.serial||'', it.qty||1, it.unit||'', it.status||'', it.location||'', it.responsible||'', it.dateAcquired||'', it.price||0, it.notes||'', JSON.stringify(it.history||[])];
      });
      if (rows.length > 0) itemsSheet.getRange(2,1,rows.length,16).setValues(rows);

      // Logs
      var logs = body.logs || [];
      if (typeof logs === 'string') { try{ logs = JSON.parse(logs);}catch(x){ logs=[]; } }
      // if logs empty, flatten from items
      if (logs.length === 0) {
        logs = [];
        items.forEach(function(it){
          (it.history||[]).forEach(function(h){
            logs.push({id:h.id, itemId:it.id, borrower:h.borrower, department:h.department, purpose:h.purpose, borrowDate:h.borrowDate, dueDate:h.dueDate, returnDate:h.returnDate});
          });
        });
      }
      logsSheet.clearContents();
      logsSheet.appendRow(["id","itemId","borrower","department","purpose","borrowDate","dueDate","returnDate"]);
      var logRows = logs.map(function(l){ return [l.id, l.itemId||'', l.borrower||'', l.department||'', l.purpose||'', l.borrowDate||'', l.dueDate||'', l.returnDate||'']; });
      if (logRows.length > 0) logsSheet.getRange(2,1,logRows.length,8).setValues(logRows);

      return ContentService.createTextOutput(JSON.stringify({status:"success", message:"ซิงค์สำเร็จ "+items.length+" รายการ", count: items.length})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Unknown action"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status:"error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
