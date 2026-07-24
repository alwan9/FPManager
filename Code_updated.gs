// =================================================================
// FREELANCE PROJEK MANAGER - GOOGLE APPS SCRIPT BACKEND CODE
// Copy kode ini ke Google Apps Script Editor (Extensions > Apps Script)
// =================================================================

const API_KEY = "3e9fB2YcALL8458a1fd92ab9d1c772e6bcda";
// Opsional: Masukkan ID Folder Drive jika ingin semua folder projek dimasukkan ke 1 folder khusus di Drive.
// Kosongkan "" jika ingin dibuatkan langsung di Root / Utama Google Drive Anda.
const FOLDER_PARENT_ID = ""; 

function doGet(e) {
  const action = e.parameter.action;
  const key = e.parameter.apiKey;
  
  if (key !== API_KEY) {
    return createJsonResponse({ success: false, message: "Error: Unauthorized" });
  }

  if (action === "getProyek") {
    return handleGetProyek(e);
  } else if (action === "getKeuangan") {
    return handleGetKeuangan(e);
  }

  return createJsonResponse({ success: false, message: "Action tidak dikenal" });
}

function doPost(e) {
  const action = e.parameter.action;
  const key = e.parameter.apiKey;
  
  if (key !== API_KEY) {
    return createJsonResponse({ success: false, message: "Error: Unauthorized" });
  }

  const dataRaw = e.parameter.data;
  const id = e.parameter.id;
  let data = {};
  if (dataRaw) {
    try {
      data = JSON.parse(dataRaw);
    } catch(err) {
      data = {};
    }
  }

  if (action === "addProyek") {
    return handleAddProyek(data);
  } else if (action === "updateProyek") {
    return handleUpdateProyek(id, data);
  } else if (action === "deleteProyek") {
    return handleDeleteProyek(id);
  } else if (action === "addKeuangan") {
    return handleAddKeuangan(data);
  } else if (action === "deleteKeuangan") {
    return handleDeleteKeuangan(id);
  }

  return createJsonResponse({ success: false, message: "Action tidak dikenal" });
}

function handleAddProyek(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Proyek");
  if (!sheet) {
    sheet = ss.insertSheet("Proyek");
    sheet.appendRow(["ID Proyek", "Tanggal", "Nama Proyek", "Pelanggan", "Nomor WA", "Produk", "Jumlah", "Satuan", "Harga Satuan", "Nominal Proyek", "DP", "Sisa Pembayaran", "Deadline", "Status", "Catatan", "Link Drive"]);
  }

  const lastRow = sheet.getLastRow();
  const nextNumber = lastRow > 1 ? lastRow : 1;
  const idProyek = "PRJ-" + String(nextNumber).padStart(3, '0');
  const tanggal = new Date().toISOString().split('T')[0];

  let gdriveLink = data.gdriveLink || "";

  // Opsi Pembuatan Folder Google Drive Otomatis
  if (data.createDriveFolder === true || data.createDriveFolder === "true") {
    try {
      const folderName = idProyek + " - " + (data.namaProyek || "Projek") + " (" + (data.pelanggan || "Klien") + ")";
      let folder;
      if (FOLDER_PARENT_ID) {
        const parentFolder = DriveApp.getFolderById(FOLDER_PARENT_ID);
        folder = parentFolder.createFolder(folderName);
      } else {
        folder = DriveApp.createFolder(folderName);
      }
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      gdriveLink = folder.getUrl();
    } catch (err) {
      Logger.log("Gagal membuat folder Google Drive: " + err.message);
    }
  }

  sheet.appendRow([
    idProyek,
    tanggal,
    data.namaProyek || "",
    data.pelanggan || "",
    data.wa || "",
    data.produk || "",
    data.jumlah || 0,
    data.satuan || "pcs",
    data.hargaSatuan || 0,
    data.nominal || 0,
    data.dp || 0,
    data.sisa || 0,
    data.deadline || "",
    data.status || "Menunggu",
    data.catatan || "",
    gdriveLink
  ]);

  return createJsonResponse({
    success: true,
    message: "Projek berhasil disimpan!",
    idProyek: idProyek,
    gdriveLink: gdriveLink
  });
}

function handleGetProyek(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    data.push({
      iDProyek: String(row[0]),
      tanggal: row[1] ? (row[1] instanceof Date ? row[1].toISOString().split('T')[0] : String(row[1])) : "",
      namaProyek: String(row[2]),
      namaPelanggan: String(row[3]),
      nomorWA: String(row[4]),
      produk: String(row[5]),
      jumlah: Number(row[6]),
      satuan: String(row[7]),
      hargaSatuan: Number(row[8]),
      nominalProyek: Number(row[9]),
      dP: Number(row[10]),
      sisaPembayaran: Number(row[11]),
      deadline: row[12] ? (row[12] instanceof Date ? row[12].toISOString().split('T')[0] : String(row[12])) : "",
      status: String(row[13]),
      catatan: String(row[14] || ""),
      gdriveLink: String(row[15] || "")
    });
  }

  return createJsonResponse({ success: true, data: data });
}

function handleUpdateProyek(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const rowIdx = i + 1;
      if (data.namaProyek !== undefined) sheet.getRange(rowIdx, 3).setValue(data.namaProyek);
      if (data.pelanggan !== undefined) sheet.getRange(rowIdx, 4).setValue(data.pelanggan);
      if (data.wa !== undefined) sheet.getRange(rowIdx, 5).setValue(data.wa);
      if (data.produk !== undefined) sheet.getRange(rowIdx, 6).setValue(data.produk);
      if (data.jumlah !== undefined) sheet.getRange(rowIdx, 7).setValue(data.jumlah);
      if (data.satuan !== undefined) sheet.getRange(rowIdx, 8).setValue(data.satuan);
      if (data.hargaSatuan !== undefined) sheet.getRange(rowIdx, 9).setValue(data.hargaSatuan);
      if (data.nominal !== undefined) sheet.getRange(rowIdx, 10).setValue(data.nominal);
      if (data.dp !== undefined) sheet.getRange(rowIdx, 11).setValue(data.dp);
      if (data.sisa !== undefined) sheet.getRange(rowIdx, 12).setValue(data.sisa);
      if (data.deadline !== undefined) sheet.getRange(rowIdx, 13).setValue(data.deadline);
      if (data.status !== undefined) sheet.getRange(rowIdx, 14).setValue(data.status);
      if (data.catatan !== undefined) sheet.getRange(rowIdx, 15).setValue(data.catatan);
      if (data.gdriveLink !== undefined) sheet.getRange(rowIdx, 16).setValue(data.gdriveLink);
      
      return createJsonResponse({ success: true, message: "Data projek berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Projek tidak ditemukan" });
}

function handleDeleteProyek(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet tidak ditemukan" });

  const ids = Array.isArray(id) ? id.map(String) : [String(id)];
  const rows = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (ids.includes(String(rows[i][0]))) {
      sheet.deleteRow(i + 1);
    }
  }
  return createJsonResponse({ success: true, message: "Projek berhasil dihapus" });
}

function handleGetKeuangan(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Keuangan");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    data.push({
      id: String(row[0]),
      tanggal: row[1] ? (row[1] instanceof Date ? row[1].toISOString().split('T')[0] : String(row[1])) : "",
      jenis: String(row[2]),
      keterangan: String(row[3]),
      nominal: Number(row[4])
    });
  }
  return createJsonResponse({ success: true, data: data });
}

function handleAddKeuangan(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Keuangan");
  if (!sheet) {
    sheet = ss.insertSheet("Keuangan");
    sheet.appendRow(["ID", "Tanggal", "Jenis", "Keterangan", "Nominal"]);
  }

  const lastRow = sheet.getLastRow();
  const nextNumber = lastRow > 1 ? lastRow : 1;
  const idKeuangan = "KAS-" + String(nextNumber).padStart(3, '0');
  const tanggal = data.tanggal || new Date().toISOString().split('T')[0];

  sheet.appendRow([
    idKeuangan,
    tanggal,
    data.jenis || "Pemasukan",
    data.keterangan || "",
    data.nominal || 0
  ]);

  return createJsonResponse({ success: true, message: "Data keuangan berhasil ditambahkan" });
}

function handleDeleteKeuangan(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Keuangan");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet tidak ditemukan" });

  const ids = Array.isArray(id) ? id.map(String) : [String(id)];
  const rows = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (ids.includes(String(rows[i][0]))) {
      sheet.deleteRow(i + 1);
    }
  }
  return createJsonResponse({ success: true, message: "Data keuangan berhasil dihapus" });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
