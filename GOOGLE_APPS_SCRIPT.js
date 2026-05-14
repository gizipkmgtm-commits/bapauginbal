/**
 * BaPau GinBal - Google Apps Script for Spreadsheet Recap
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Click on Extensions > App Script.
 * 3. Delete any code in the editor and paste this code.
 * 4. Save and click "Deploy" > "New Deployment".
 * 5. Select "Web App".
 * 6. Set "Execute as" to "Me".
 * 7. Set "Who has access" to "Anyone" (Required for the webhook to work).
 * 8. Click "Deploy", copy the "Web App URL".
 * 9. Paste that URL into the SPREADSHEET_WEBHOOK secret in AI Studio Settings.
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Waktu Input",
        "NIK",
        "Nama Balita",
        "Nama Orang Tua",
        "Nama Posyandu",
        "Tanggal Lahir",
        "Jenis Kelamin",
        "Umur (Bulan)",
        "Umur (Lengkap)",
        "Berat Badan (kg)",
        "Tinggi Badan (cm)",
        "Status BB/U",
        "Z-Score BB/U",
        "Status TB/U",
        "Z-Score TB/U",
        "Status BB/TB",
        "Z-Score BB/TB",
        "Lokasi (Lat, Lng)"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }

    const { child, results, ageString, timestamp } = data;
    
    const row = [
      timestamp ? new Date(timestamp) : new Date(),
      child.nik || "-",
      child.name,
      child.parentName || "-",
      child.posyanduName || "-",
      child.birthDate,
      child.gender === 'male' ? 'L' : 'P',
      child.ageMonths,
      ageString,
      child.weight,
      child.height,
      results.weightForAge.category,
      results.weightForAge.zScore.toFixed(2),
      results.heightForAge.category,
      results.heightForAge.zScore.toFixed(2),
      results.weightForHeight.category,
      results.weightForHeight.zScore.toFixed(2),
      child.location ? `${child.location.lat}, ${child.location.lng}` : "-"
    ];

    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
