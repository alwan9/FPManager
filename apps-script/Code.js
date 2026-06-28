/**
 * Kelola ProjekBareng Backend API
 * Google Apps Script Web App
 * Database: Google Spreadsheet
 */

// Ganti ID Spreadsheet ini dengan ID Spreadsheet Anda jika diletakkan terpisah dari Script
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Fungsi merespon request HTTP GET
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Inisialisasi sheet jika belum ada
  initSheets(ss);

  let responseData = { success: false, message: 'Aksi tidak valid atau kosong.' };

  try {
    if (action === 'getProyek') {
      const sheet = ss.getSheetByName('Proyek');
      const data = getRowsData(sheet);
      responseData = { success: true, data: data };
    }
    else if (action === 'getKeuangan') {
      const sheet = ss.getSheetByName('Keuangan');
      const data = getRowsData(sheet);
      responseData = { success: true, data: data };
    }
  } catch (error) {
    responseData = { success: false, message: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi merespon request HTTP POST
function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  initSheets(ss);

  const action = e.parameter.action;
  const id = e.parameter.id;
  let responseData = { success: false, message: 'Metode POST bermasalah.' };

  try {
    const data = JSON.parse(e.parameter.data);

    if (action === 'addProyek') {
      const sheet = ss.getSheetByName('Proyek');

      // Auto ID Increment
      const nextId = generateNextId(sheet, 'PRJ-');
      const tanggal = new Date().toISOString().split('T')[0];

      // Susun baris baru sesuai struktur kolom
      // ID | Tanggal | Nama Proyek | Pelanggan | WA | Produk | Jumlah | Satuan | Harga Satuan | Nominal | DP | Sisa | Deadline | Status | Catatan
      const newRow = [
        nextId,
        tanggal,
        data.namaProyek,
        data.pelanggan,
        data.wa,
        data.produk || '',
        Number(data.jumlah),
        data.satuan,
        Number(data.hargaSatuan),
        Number(data.nominal),
        Number(data.dp),
        Number(data.sisa),
        data.deadline,
        data.status,
        data.catatan || ''
      ];

      sheet.appendRow(newRow);

      // Jika ada uang muka (DP), otomatis catat ke buku kas Keuangan
      if (Number(data.dp) > 0) {
        const sheetKas = ss.getSheetByName('Keuangan');
        const nextKasId = generateNextId(sheetKas, 'KAS-');
        sheetKas.appendRow([
          nextKasId,
          tanggal,
          'Pemasukan',
          `DP Proyek ${data.namaProyek} - ${data.pelanggan}`,
          Number(data.dp)
        ]);
      }

      responseData = { success: true, id: nextId };
    }

    else if (action === 'updateProyek' && id) {
      const sheet = ss.getSheetByName('Proyek');
      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;

      // Cari baris berdasarkan ID Proyek (dikonversi ke String untuk keamanan tipe data)
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(id).trim()) {
          rowIndex = i + 1; // 1-indexed row number
          break;
        }
      }

      if (rowIndex !== -1) {
        const oldDp = Number(rows[rowIndex - 1][10]); // Kolom DP lama

        // Kolom update: Nama Proyek, Pelanggan, WA, Produk, Jumlah, Satuan, Harga Satuan, Nominal, DP, Sisa, Deadline, Status, Catatan
        sheet.getRange(rowIndex, 3).setValue(data.namaProyek);
        sheet.getRange(rowIndex, 4).setValue(data.pelanggan);
        sheet.getRange(rowIndex, 5).setValue(data.wa);
        sheet.getRange(rowIndex, 6).setValue(data.produk || '');
        sheet.getRange(rowIndex, 7).setValue(Number(data.jumlah));
        sheet.getRange(rowIndex, 8).setValue(data.satuan);
        sheet.getRange(rowIndex, 9).setValue(Number(data.hargaSatuan));
        sheet.getRange(rowIndex, 10).setValue(Number(data.nominal));
        sheet.getRange(rowIndex, 11).setValue(Number(data.dp));
        sheet.getRange(rowIndex, 12).setValue(Number(data.sisa));
        sheet.getRange(rowIndex, 13).setValue(data.deadline);
        sheet.getRange(rowIndex, 14).setValue(data.status);
        sheet.getRange(rowIndex, 15).setValue(data.catatan || '');

        // Jika ada penambahan pembayaran DP / Pelunasan
        const selisihDp = Number(data.dp) - oldDp;
        if (selisihDp > 0) {
          const sheetKas = ss.getSheetByName('Keuangan');
          const nextKasId = generateNextId(sheetKas, 'KAS-');
          const tglSkrg = new Date().toISOString().split('T')[0];
          sheetKas.appendRow([
            nextKasId,
            tglSkrg,
            'Pemasukan',
            `Pembayaran Tambahan Proyek ${data.namaProyek} - ${data.pelanggan}`,
            selisihDp
          ]);
        }

        responseData = { success: true };
      } else {
        responseData = { success: false, message: 'ID Proyek tidak ditemukan' };
      }
    }

    else if (action === 'deleteProyek' && id) {
      const sheet = ss.getSheetByName('Proyek');
      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(id).trim()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
        responseData = { success: true };
      } else {
        responseData = { success: false, message: 'ID Proyek tidak ditemukan' };
      }
    }

    else if (action === 'addKeuangan') {
      const sheet = ss.getSheetByName('Keuangan');
      const nextId = generateNextId(sheet, 'KAS-');

      // ID | Tanggal | Jenis | Keterangan | Nominal
      const newRow = [
        nextId,
        data.tanggal || new Date().toISOString().split('T')[0],
        data.jenis,
        data.keterangan,
        Number(data.nominal)
      ];

      sheet.appendRow(newRow);
      responseData = { success: true, id: nextId };
    }
  } catch (error) {
    responseData = { success: false, message: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// Inisialisasi Sheet jika masih kosong
function initSheets(ss) {
  let sheetProyek = ss.getSheetByName('Proyek');
  if (!sheetProyek) {
    sheetProyek = ss.insertSheet('Proyek');
    sheetProyek.appendRow([
      'ID Proyek', 'Tanggal', 'Nama Proyek', 'Nama Pelanggan', 'Nomor WA',
      'Produk', 'Jumlah', 'Satuan', 'Harga Satuan', 'Nominal Proyek',
      'DP', 'Sisa Pembayaran', 'Deadline', 'Status', 'Catatan'
    ]);
  }

  let sheetKeuangan = ss.getSheetByName('Keuangan');
  if (!sheetKeuangan) {
    sheetKeuangan = ss.insertSheet('Keuangan');
    sheetKeuangan.appendRow([
      'ID Transaksi', 'Tanggal', 'Jenis', 'Keterangan', 'Nominal'
    ]);
  }
}

// Auto Increment ID generator helper (ex: PRJ-001, KAS-005)
function generateNextId(sheet, prefix) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return prefix + '001';
  }
  const lastRowId = rows[rows.length - 1][0];
  const lastNum = parseInt(lastRowId.replace(prefix, ''), 10);
  if (isNaN(lastNum)) {
    return prefix + '001';
  }
  return prefix + String(lastNum + 1).padStart(3, '0');
}

// Helper membaca data row spreadsheet ke array of JSON objects
// Helper membaca data Spreadsheet menjadi JSON sesuai frontend
function getRowsData(sheet) {
  const values = sheet.getDataRange().getValues();

  // Jika hanya header
  if (values.length <= 1) return [];

  const data = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    data.push({
      id: row[0], // PRJ-001
      tanggal: row[1] instanceof Date
        ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : row[1],

      namaProyek: row[2],
      pelanggan: row[3],
      wa: row[4],
      produk: row[5],
      jumlah: Number(row[6]) || 0,
      satuan: row[7],
      hargaSatuan: Number(row[8]) || 0,
      nominal: Number(row[9]) || 0,
      dp: Number(row[10]) || 0,
      sisa: Number(row[11]) || 0,

      deadline: row[12] instanceof Date
        ? Utilities.formatDate(row[12], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : row[12],

      status: row[13],
      catatan: row[14]
    });
  }

  return data;
}