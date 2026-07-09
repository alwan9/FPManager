// Ganti ID Spreadsheet ini dengan ID Spreadsheet Anda jika diletakkan terpisah dari Script
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const ADMIN_PASSWORD = SCRIPT_PROPERTIES.getProperty("ADMIN_PASSWORD");
const ADMIN_PASSWORD_2 = SCRIPT_PROPERTIES.getProperty("ADMIN_PASSWORD_2");
const API_KEY = SCRIPT_PROPERTIES.getProperty("API_KEY");
const TOKEN_EXPIRE_HOURS = 12;

// ID Folder Google Drive Utama untuk pembuatan folder otomatis
const PARENT_FOLDER_ID = "13a64WPJGPeqty_9vbqUIP-_tj5xKNHgk";

// Fungsi merespon request HTTP GET
function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  const apiKey = e.parameter.apiKey;

  checkApiKey(apiKey);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  initSheets(ss);

  let responseData = {
    success: false,
    message: "Action tidak valid"
  };

  try {

    requireLogin(token);

    switch (action) {

      case "getProyek":

        let proyekData = getCacheLarge("PROYEK_DATA");
        if (!proyekData) {
          proyekData = getRowsData(ss.getSheetByName("Proyek"));
          setCacheLarge("PROYEK_DATA", proyekData, 21600); // Cache selama 6 jam
        }

        responseData = {
          success: true,
          data: proyekData
        };

        break;

      case "getKeuangan":

        let keuanganData = getCacheLarge("KEUANGAN_DATA");
        if (!keuanganData) {
          const sheet = ss.getSheetByName("Keuangan");
          const values = sheet.getDataRange().getValues();
          const data = [];

          for (let i = 1; i < values.length; i++) {
            data.push({
              id: values[i][0],
              tanggal: values[i][1] instanceof Date
                ? Utilities.formatDate(values[i][1], Session.getScriptTimeZone(), "yyyy-MM-dd")
                : values[i][1],
              jenis: values[i][2],
              keterangan: values[i][3],
              nominal: Number(values[i][4])
            });
          }
          keuanganData = data;
          setCacheLarge("KEUANGAN_DATA", keuanganData, 21600); // Cache selama 6 jam
        }

        responseData = {
          success: true,
          data: keuanganData
        };

        break;

      case "getDashboardStats":

        let stats = getCacheLarge("DASHBOARD_STATS");
        if (!stats) {
          stats = calculateDashboardStats(ss);
        }

        responseData = {
          success: true,
          data: stats
        };

        break;

      case "getDashboard":

        let dashboardData = getCacheLarge("DASHBOARD_DATA");
        if (!dashboardData) {
          dashboardData = compileDashboardData(ss);
        }

        responseData = {
          success: true,
          data: dashboardData
        };

        break;

    }

  } catch (err) {

    responseData = {
      success: false,
      message: err.toString()
    };

  }

  return json(responseData);

}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  initSheets(ss);

  const action = e.parameter.action;
  const id = e.parameter.id;
  const apiKey = e.parameter.apiKey;

  checkApiKey(apiKey);

  let responseData = {
    success: false,
    message: "Metode POST bermasalah."
  };

  try {

    let data = {};

    try {
      data = JSON.parse(e.parameter.data || "{}");
    } catch (err) {
      throw new Error("Format JSON tidak valid");
    }

    // =========================
    // LOGIN
    // =========================
    if (action === "login") {

      const password = (e.parameter.password || "").trim();

      if (
        password !== ADMIN_PASSWORD &&
        password !== ADMIN_PASSWORD_2
      ) {

        responseData = {
          success: false,
          message: "Password salah"
        };

      } else {

        const token = generateToken();

        saveToken(token);

        responseData = {
          success: true,
          token: token
        };

      }

    }
    // =========================
    // LOGOUT
    // =========================
    else if (action === "logout") {

      requireLogin(e.parameter.token);
      deleteToken(e.parameter.token);
      responseData = {
        success: true,
        message: "Logout berhasil"
      };

    }
    // =========================
    // ADD PROYEK
    // =========================
    else if (action === "addProyek") {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        validateProyek(data);

        const sheet = ss.getSheetByName("Proyek");

        const nextId = generateNextId(sheet, "PRJ-");
        const tanggal = new Date().toISOString().split("T")[0];

        // ----------------------------------------------------
        // INTEGRASI GOOGLE DRIVE: PEMBUATAN FOLDER OTOMATIS
        // ----------------------------------------------------
        let folderUrl = "";
        try {
          if (PARENT_FOLDER_ID && PARENT_FOLDER_ID !== "") {
            const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
            // Format Nama Folder: PRJ-xxx - NamaPelanggan - NamaProyek
            const folderName = `${nextId} - ${data.pelanggan} - ${data.namaProyek}`;
            const newFolder = parentFolder.createFolder(folderName);

            // Ambil URL folder terlebih dahulu agar tetap tersimpan meskipun pengaturan sharing diblokir kebijakan Google
            folderUrl = newFolder.getUrl();

            try {
              // Bagikan folder secara publik (anyone with link can view) agar link bisa langsung dipakai klien
              newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (shareErr) {
              console.error("Gagal mengatur hak akses sharing folder Google Drive: " + shareErr.toString());
            }
          }
        } catch (driveErr) {
          console.error("Gagal membuat folder Google Drive: " + driveErr.toString());
        }

        sheet.appendRow([
          nextId,
          tanggal,
          data.namaProyek,
          data.pelanggan,
          data.wa,
          data.produk || "",
          Number(data.jumlah),
          data.satuan,
          Number(data.hargaSatuan),
          Number(data.nominal),
          Number(data.dp),
          Number(data.sisa),
          data.deadline,
          data.status,
          data.catatan || "",
          folderUrl // Kolom Baru ke-16 (Kolom P): Link GDrive
        ]);

        removeCacheLarge("PROYEK_DATA");
        clearRowIndexMap("Proyek");
        calculateDashboardStats(ss);

        responseData = {
          success: true,
          id: nextId,
          gdriveLink: folderUrl
        };

      } finally {

        lock.releaseLock();

      }

    }

    // =========================
    // UPDATE
    // =========================
    else if (action === "updateProyek" && id) {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        validateProyek(data);

        const sheet = ss.getSheetByName("Proyek");

        const rowIndex = findRow(sheet, id);

        if (rowIndex < 0) {

          responseData = {
            success: false,
            message: "ID tidak ditemukan"
          };

        } else {

          // Ambil link folder yang sudah ada agar tidak terhapus saat update
          const existingGDriveLink = sheet.getRange(rowIndex, 16).getValue() || "";
          const folderUrl = data.gdriveLink || existingGDriveLink;

          sheet.getRange(rowIndex, 3, 1, 14).setValues([[
            data.namaProyek,
            data.pelanggan,
            data.wa,
            data.produk,
            Number(data.jumlah),
            data.satuan,
            Number(data.hargaSatuan),
            Number(data.nominal),
            Number(data.dp),
            Number(data.sisa),
            data.deadline,
            data.status,
            data.catatan,
            folderUrl // Update kolom ke-16: Link GDrive
          ]]);

          removeCacheLarge("PROYEK_DATA");
          calculateDashboardStats(ss);

          responseData = {
            success: true,
            message: "Data berhasil diupdate"
          };

        }

      } finally {

        lock.releaseLock();

    }

    // =========================
    // BATCH UPDATE PROYEK
    // =========================
    else if (action === "batchUpdateProyek") {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        const sheet = ss.getSheetByName("Proyek");

        let updates = [];
        try {
          updates = JSON.parse(e.parameter.data || "[]");
        } catch (err) {
          throw new Error("Format JSON tidak valid");
        }

        if (!Array.isArray(updates)) {
          throw new Error("Data harus berupa array");
        }

        const map = getRowIndexMap(sheet);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const camelHeaders = headers.map(toCamelCase);

        let count = 0;
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          const projId = update.id || update.iDProyek;
          if (!projId) continue;

          const rowIndex = map[String(projId)];
          if (rowIndex && rowIndex > 1) {
            const rowRange = sheet.getRange(rowIndex, 1, 1, headers.length);
            const rowValues = rowRange.getValues()[0];

            for (let j = 0; j < camelHeaders.length; j++) {
              const field = camelHeaders[j];
              let updateVal = update[field];
              if (updateVal === undefined) {
                if (field === "iDProyek") updateVal = update.id || update.iDProyek;
                else if (field === "dP") updateVal = update.dp || update.dP;
                else if (field === "nomorWA") updateVal = update.wa || update.nomorWA;
                else if (field === "namaPelanggan") updateVal = update.pelanggan || update.namaPelanggan;
                else if (field === "nominalProyek") updateVal = update.nominal || update.nominalProyek;
                else if (field === "sisaPembayaran") updateVal = update.sisa || update.sisaPembayaran;
              }

              if (updateVal !== undefined) {
                if (field === "jumlah" || field === "hargaSatuan" || field === "nominalProyek" || field === "dP" || field === "sisaPembayaran") {
                  rowValues[j] = Number(updateVal);
                } else {
                  rowValues[j] = updateVal;
                }
              }
            }

            rowRange.setValues([rowValues]);
            count++;
          }
        }

        removeCacheLarge("PROYEK_DATA");
        calculateDashboardStats(ss);

        responseData = {
          success: true,
          message: count + " data proyek berhasil diupdate"
        };

      } finally {

        lock.releaseLock();

      }

    }

    // =========================
    // DELETE
    // =========================
    else if (action === "deleteProyek") {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        const sheet = ss.getSheetByName("Proyek");
        const rawId = e.parameter.id;

        let idsToDelete = [];
        if (rawId) {
          if (rawId.indexOf("[") === 0) {
            try {
              idsToDelete = JSON.parse(rawId);
            } catch (err) {
              idsToDelete = [rawId];
            }
          } else if (rawId.indexOf(",") !== -1) {
            idsToDelete = rawId.split(",").map(function (item) { return item.trim(); });
          } else {
            idsToDelete = [rawId];
          }
        }

        if (idsToDelete.length > 0) {
          const map = getRowIndexMap(sheet);
          const rowIndices = [];
          for (let i = 0; i < idsToDelete.length; i++) {
            const rIndex = map[idsToDelete[i]];
            if (rIndex !== undefined && rIndex > 1) {
              rowIndices.push(rIndex);
            }
          }
          rowIndices.sort((a, b) => b - a);

          let count = 0;
          for (let i = 0; i < rowIndices.length; i++) {
            sheet.deleteRow(rowIndices[i]);
            count++;
          }

          removeCacheLarge("PROYEK_DATA");
          clearRowIndexMap("Proyek");
          calculateDashboardStats(ss);

          responseData = {
            success: true,
            message: count + " data berhasil dihapus"
          };

        } else {

          responseData = {
            success: false,
            message: "ID tidak valid atau kosong"
          };

        }

      } finally {

        lock.releaseLock();

      }

    }
    // ======================
    // GENERATE AI
    // ======================

    else if (action === "generateAI") {

      requireLogin(e.parameter.token);

      const result = generateAI(data);

      responseData = {
        success: true,
        text: result
      };

    }

    // =========================
    // ADD KEUANGAN
    // =========================
    else if (action === "addKeuangan") {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        const sheet = ss.getSheetByName("Keuangan");

        const nextId = generateNextId(sheet, "KAS-");

        sheet.appendRow([
          nextId,
          data.tanggal || new Date().toISOString().split("T")[0],
          data.jenis,
          data.keterangan,
          Number(data.nominal)
        ]);

        removeCacheLarge("KEUANGAN_DATA");
        clearRowIndexMap("Keuangan");
        calculateDashboardStats(ss);

        responseData = {
          success: true,
          id: nextId
        };

      } finally {

        lock.releaseLock();

      }

    }

    else if (action === "updateKeuangan" && id) {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        const sheet = ss.getSheetByName("Keuangan");

        const rowIndex = findRow(sheet, id);

        if (rowIndex > 0) {

          sheet.getRange(rowIndex, 2, 1, 4).setValues([[
            data.tanggal,
            data.jenis,
            data.keterangan,
            Number(data.nominal)
          ]]);

          removeCacheLarge("KEUANGAN_DATA");
          calculateDashboardStats(ss);

          responseData = {
            success: true,
            message: "Berhasil diupdate"
          };

        } else {

          responseData = {
            success: false,
            message: "ID tidak ditemukan"
          };

        }

      } finally {

        lock.releaseLock();

      }

    }
    else if (action === "deleteKeuangan" && id) {

      requireLogin(e.parameter.token);
      checkRateLimit(e.parameter.token);

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {

        const sheet = ss.getSheetByName("Keuangan");

        const rowIndex = findRow(sheet, id);

        if (rowIndex > 0) {

          sheet.deleteRow(rowIndex);

          removeCacheLarge("KEUANGAN_DATA");
          clearRowIndexMap("Keuangan");
          calculateDashboardStats(ss);

          responseData = {
            success: true,
            message: "Berhasil dihapus"
          };

        } else {

          responseData = {
            success: false,
            message: "ID tidak ditemukan"
          };

        }

      } finally {

        lock.releaseLock();

      }

    }

  } catch (err) {

    responseData = {
      success: false,
      message: err.toString()
    };

  }

  return json(responseData);
}

// Inisialisasi Sheet jika masih kosong
function initSheets(ss) {
  let sheetProyek = ss.getSheetByName('Proyek');
  if (!sheetProyek) {
    sheetProyek = ss.insertSheet('Proyek');
    sheetProyek.appendRow([
      'ID Proyek', 'Tanggal', 'Nama Proyek', 'Nama Pelanggan', 'Nomor WA',
      'Produk', 'Jumlah', 'Satuan', 'Harga Satuan', 'Nominal Proyek',
      'DP', 'Sisa Pembayaran', 'Deadline', 'Status', 'Catatan', 'Link GDrive'
    ]);
  } else {
    // Tambah header jika belum ada
    const lastCol = sheetProyek.getLastColumn();
    const headers = sheetProyek.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf('Link GDrive') === -1) {
      sheetProyek.getRange(1, lastCol + 1).setValue('Link GDrive');
    }
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
  const propKey = "LAST_ID_" + prefix;
  const props = PropertiesService.getScriptProperties();
  let lastIdNumVal = props.getProperty(propKey);

  if (!lastIdNumVal) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      lastIdNumVal = "0";
    } else {
      const lastValue = String(sheet.getRange(lastRow, 1).getValue());
      const match = lastValue.match(/\d+$/);
      lastIdNumVal = match ? match[0] : "0";
    }
  }

  const next = Number(lastIdNumVal) + 1;
  props.setProperty(propKey, next.toString());
  return prefix + String(next).padStart(3, "0");
}

// Helper membaca data row spreadsheet ke array of JSON objects
function getRowsData(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const objects = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const colName = headers[j];
      const camelName = toCamelCase(colName);

      // Format tanggal ke String YYYY-MM-DD jika value adalah Date
      if (row[j] instanceof Date) {
        obj[camelName] = row[j].toISOString().split('T')[0];
      } else {
        obj[camelName] = row[j];
      }
    }
    objects.push(obj);
  }
  return objects;
}

// Helper convert "Nama Proyek" ke "namaProyek", khusus Link GDrive/Link Drive ke gdriveLink
function toCamelCase(str) {
  const normalized = (str || "").trim().toLowerCase();
  if (normalized === "link gdrive" || normalized === "link drive" || normalized === "gdrive link" || normalized === "linkdrive" || normalized === "gdrivelink") {
    return "gdriveLink";
  }
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

// ================================
// AUTH HELPER
// ================================

// Membuat token acak
function generateToken() {
  return Utilities.getUuid();
}

function saveToken(token) {

  const props = PropertiesService.getScriptProperties();

  const tokens = JSON.parse(
    props.getProperty("LOGIN_TOKENS") || "[]"
  );

  tokens.push({
    token: token,
    expire: Date.now() + TOKEN_EXPIRE_HOURS * 60 * 60 * 1000
  });

  props.setProperty(
    "LOGIN_TOKENS",
    JSON.stringify(tokens)
  );

}
// Cek token
function validateToken(token) {

  const props = PropertiesService.getScriptProperties();

  let tokens = JSON.parse(
    props.getProperty("LOGIN_TOKENS") || "[]"
  );

  const now = Date.now();

  // Hapus token yang sudah expired
  tokens = tokens.filter(t => t.expire > now);

  props.setProperty(
    "LOGIN_TOKENS",
    JSON.stringify(tokens)
  );

  return tokens.some(t => t.token === token);

}

function json(data) {

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

}
function requireLogin(token) {

  if (!validateToken(token)) {

    throw new Error("Unauthorized");

  }

}

function checkApiKey(apiKey) {

  if (!apiKey) {
    throw new Error("API Key tidak ditemukan");
  }

  if (apiKey !== API_KEY) {
    throw new Error("API Key tidak valid");
  }

}

// ================================
// RATE LIMIT HELPER
// Maksimal 1 request setiap 2 detik
// ================================
function checkRateLimit(token) {

  const cache = CacheService.getScriptCache();

  const key = "RATE_" + token;

  // Jika masih ada di cache berarti terlalu cepat
  if (cache.get(key)) {
    throw new Error("Terlalu banyak request. Silakan tunggu beberapa detik.");
  }

  // Simpan selama 2 detik
  cache.put(key, "1", 2);

}

function findRow(sheet, id) {
  const map = getRowIndexMap(sheet);
  const rowIndex = map[String(id)];
  return rowIndex !== undefined ? rowIndex : -1;
}

function validateProyek(data) {

  // Bersihkan karakter yang tidak diperlukan
  data.wa = String(data.wa || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  // Jika diawali 08 → ubah menjadi 62
  if (data.wa.startsWith("08")) {
    data.wa = "62" + data.wa.substring(1);
  }

  // Jika diawali +62 → hilangkan +
  if (data.wa.startsWith("+62")) {
    data.wa = data.wa.substring(1);
  }

  // Validasi hasil akhir harus 62xxxxxxxxxx
  if (!/^62\d{8,13}$/.test(data.wa)) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  if (!data.namaProyek?.trim())
    throw new Error("Nama proyek wajib diisi");

  if (!data.pelanggan?.trim())
    throw new Error("Nama pelanggan wajib diisi");

  if (isNaN(Number(data.jumlah)))
    throw new Error("Jumlah harus berupa angka");

  if (isNaN(Number(data.hargaSatuan)))
    throw new Error("Harga satuan tidak valid");

  if (isNaN(Number(data.nominal)))
    throw new Error("Nominal tidak valid");

  if (isNaN(Number(data.dp)))
    throw new Error("DP tidak valid");

  if (isNaN(Number(data.sisa)))
    throw new Error("Sisa pembayaran tidak valid");
}

// Logout
function deleteToken(token) {

  const props = PropertiesService.getScriptProperties();

  let tokens = JSON.parse(
    props.getProperty("LOGIN_TOKENS") || "[]"
  );

  tokens = tokens.filter(t => t.token !== token);

  props.setProperty(
    "LOGIN_TOKENS",
    JSON.stringify(tokens)
  );

}

function generateAI(data) {

  const apiKey =
    PropertiesService
      .getScriptProperties()
      .getProperty("GEMINI_API_KEY");

  const prompt = `
Anda adalah Customer Service ProjekManager.

Jenis pesan yang diminta:

${data.jenis}

Buatkan pesan WhatsApp profesional sesuai jenis tersebut.

Jika jenis = followup
→ tanyakan perkembangan.

Jika jenis = invoice
→ kirim tagihan.

Jika jenis = penawaran
→ kirim penawaran.

Jika jenis = deadline
→ mengingatkan deadline.

Data proyek

Nama Pelanggan :
${data.namaPelanggan}

Nama Proyek :
${data.namaProyek}

Produk :
${data.produk}

Jumlah :
${data.jumlah} ${data.satuan}

Status :
${data.status}

Deadline :
${data.deadline}

DP :
Rp ${data.dP}

Sisa Pembayaran :
Rp ${data.sisaPembayaran}

Catatan :
${data.catatan}

Gunakan bahasa Indonesia.

Jangan memakai markdown.

Maksimal 100 kata.

Gunakan emoji seperlunya.
`;

  const payload = {

    contents: [

      {

        parts: [

          {
            text: prompt
          }

        ]

      }

    ]

  };

  const response = UrlFetchApp.fetch(

    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,

    {

      method: "post",

      contentType: "application/json",

      payload: JSON.stringify(payload),

      muteHttpExceptions: true

    }

  );

  const json = JSON.parse(response.getContentText());

  return json.candidates[0]
    .content.parts[0].text;

}

// ================================
// CACHE HELPERS (Large Payload Support)
// ================================
function setCacheLarge(key, dataObj, expirationSeconds) {
  const cache = CacheService.getScriptCache();
  const jsonStr = JSON.stringify(dataObj);
  const chunkSize = 90000; // Aman di bawah batas 100KB dari CacheService Google

  if (jsonStr.length <= chunkSize) {
    cache.put(key, jsonStr, expirationSeconds);
    cache.remove(key + "_chunks");
  } else {
    const numChunks = Math.ceil(jsonStr.length / chunkSize);
    cache.put(key + "_chunks", numChunks.toString(), expirationSeconds);
    for (let i = 0; i < numChunks; i++) {
      const chunk = jsonStr.substring(i * chunkSize, (i + 1) * chunkSize);
      cache.put(key + "_" + i, chunk, expirationSeconds);
    }
    cache.remove(key);
  }
}

function getCacheLarge(key) {
  const cache = CacheService.getScriptCache();
  const numChunksStr = cache.get(key + "_chunks");

  if (numChunksStr) {
    const numChunks = parseInt(numChunksStr, 10);
    let jsonStr = "";
    for (let i = 0; i < numChunks; i++) {
      const chunk = cache.get(key + "_" + i);
      if (chunk === null) {
        return null;
      }
      jsonStr += chunk;
    }
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  } else {
    const value = cache.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
}

function removeCacheLarge(key) {
  const cache = CacheService.getScriptCache();
  const numChunksStr = cache.get(key + "_chunks");
  if (numChunksStr) {
    const numChunks = parseInt(numChunksStr, 10);
    for (let i = 0; i < numChunks; i++) {
      cache.remove(key + "_" + i);
    }
    cache.remove(key + "_chunks");
  }
  cache.remove(key);
}

// ================================
// ROW INDEX MAPPING HELPERS
// ================================
function getRowIndexMap(sheet) {
  const sheetName = sheet.getName();
  const cacheKey = "ROW_INDEX_MAP_" + sheetName;
  let map = getCacheLarge(cacheKey);

  if (!map) {
    map = {};
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ids = sheet.getRange(1, 1, lastRow, 1).getValues();
      for (let i = 1; i < ids.length; i++) {
        const idVal = String(ids[i][0]);
        if (idVal) {
          map[idVal] = i + 1;
        }
      }
    }
    setCacheLarge(cacheKey, map, 21600); // Simpan 6 jam
  }
  return map;
}

function clearRowIndexMap(sheetName) {
  removeCacheLarge("ROW_INDEX_MAP_" + sheetName);
}

// ================================
// DASHBOARD STATS HELPER
// ================================
function calculateDashboardStats(ss) {
  const proyekSheet = ss.getSheetByName("Proyek");
  const keuanganSheet = ss.getSheetByName("Keuangan");

  const totalProyek = Math.max(0, proyekSheet.getLastRow() - 1);

  let totalPemasukan = 0;
  let totalPengeluaran = 0;

  const keuanganLastRow = keuanganSheet.getLastRow();
  if (keuanganLastRow > 1) {
    const values = keuanganSheet.getRange(2, 3, keuanganLastRow - 1, 3).getValues();
    for (let i = 0; i < values.length; i++) {
      const jenis = values[i][0];
      const nominal = Number(values[i][2]) || 0;
      if (jenis === 'Pemasukan') {
        totalPemasukan += nominal;
      } else if (jenis === 'Pengeluaran') {
        totalPengeluaran += nominal;
      }
    }
  }

  const stats = {
    totalProyek: totalProyek,
    totalPemasukan: totalPemasukan,
    totalPengeluaran: totalPengeluaran,
    labaBersih: totalPemasukan - totalPengeluaran
  };

  setCacheLarge("DASHBOARD_STATS", stats, 21600); // Simpan 6 jam
  removeCacheLarge("DASHBOARD_DATA"); // Invalidate compiled dashboard cache
  return stats;
}

// ================================
// COMPILE DASHBOARD DATA HELPER
// ================================
function compileDashboardData(ss) {
  const proyekSheet = ss.getSheetByName("Proyek");
  const keuanganSheet = ss.getSheetByName("Keuangan");

  let stats = getCacheLarge("DASHBOARD_STATS");
  if (!stats) {
    stats = calculateDashboardStats(ss);
  }

  const proyekList = getRowsData(proyekSheet);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentProjects = [...proyekList].reverse().slice(0, 5);

  const deadlineAlerts = [];
  const revisiProjects = [];

  proyekList.forEach(p => {
    const statusLower = (p.status || '').toLowerCase();
    
    if (statusLower === 'revisi') {
      revisiProjects.push({
        iDProyek: p.iDProyek,
        namaProyek: p.namaProyek,
        namaPelanggan: p.namaPelanggan,
        deadline: p.deadline,
        status: p.status
      });
    }

    if (statusLower === 'selesai' || statusLower === 'belum pembayaran' || statusLower === 'dibatalkan') {
      return;
    }
    if (!p.deadline) return;

    const deadlineDate = new Date(p.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      deadlineAlerts.push({
        namaProyek: p.namaProyek,
        namaPelanggan: p.namaPelanggan,
        deadline: p.deadline,
        diffDays: diffDays
      });
    }
  });

  const monthlyData = {};
  const keuanganLastRow = keuanganSheet.getLastRow();
  if (keuanganLastRow > 1) {
    const values = keuanganSheet.getRange(2, 2, keuanganLastRow - 1, 4).getValues();
    for (let i = 0; i < values.length; i++) {
      const tanggalVal = values[i][0];
      if (!tanggalVal) continue;
      
      const date = new Date(tanggalVal);
      const monthNames = ["Jan", "Feb", "Mar", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const key = monthNames[date.getMonth()] + " " + date.getFullYear();
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          monthLabel: key,
          sortKey: date.getFullYear() * 100 + (date.getMonth() + 1),
          pemasukan: 0,
          pengeluaran: 0
        };
      }
      
      const jenis = values[i][1];
      const nominal = Number(values[i][3]) || 0;
      if (jenis === 'Pemasukan') {
        monthlyData[key].pemasukan += nominal;
      } else if (jenis === 'Pengeluaran') {
        monthlyData[key].pengeluaran += nominal;
      }
    }
  }

  const sortedMonths = Object.values(monthlyData)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-6);

  const chartData = {
    labels: sortedMonths.map(item => item.monthLabel),
    pemasukan: sortedMonths.map(item => item.pemasukan),
    pengeluaran: sortedMonths.map(item => item.pengeluaran)
  };

  const dashboardData = {
    stats: stats,
    recentProjects: recentProjects,
    deadlineAlerts: deadlineAlerts,
    revisiProjects: revisiProjects,
    chartData: chartData
  };

  setCacheLarge("DASHBOARD_DATA", dashboardData, 21600); // Simpan 6 jam
  return dashboardData;
}
