// =================================================================
// FREELANCE PROJEK MANAGER (FPManager) - GOOGLE APPS SCRIPT BACKEND CODE
// Copy/Paste kode ini ke Editor Google Apps Script (Extensions > Apps Script)
// Lalu deploy sebagai Web App (Execute as: Me, Access: Anyone)
// =================================================================

// =================================================================
// PENGAMBILAN KONFIGURASI DARI SCRIPT PROPERTIES (PROJECT SETTINGS)
// =================================================================
function getScriptProp(key, fallbackValue) {
  try {
    const props = PropertiesService.getScriptProperties();
    const val = props.getProperty(key);
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      return String(val).trim();
    }
  } catch (err) {
    Logger.log("Peringatan membaca Script Property '" + key + "': " + err.message);
  }
  return fallbackValue || "";
}

function getApiKey() {
  return getScriptProp("API_KEY", "3e9fB2YcALL8458a1fd92ab9d1c772e6bcda");
}

function getFolderParentId() {
  return getScriptProp("FOLDER_PARENT_ID", "13a64WPJGPeqty_9vbqUIP-_tj5xKNHgk");
}

function getGeminiApiKey() {
  return getScriptProp("GEMINI_API_KEY", "");
}

// Helper: Buat Folder Google Drive dengan Fallback Aman ke Root Drive
function createProjectDriveFolder(folderName) {
  let folder = null;
  const parentId = getFolderParentId();
  
  // 1. Coba buat di dalam FOLDER_PARENT_ID dari Script Properties
  if (parentId && parentId !== "") {
    try {
      const parentFolder = DriveApp.getFolderById(parentId);
      if (parentFolder) {
        folder = parentFolder.createFolder(folderName);
      }
    } catch (parentErr) {
      Logger.log("Folder Parent ID '" + parentId + "' tidak dapat diakses / tidak ditemukan (" + parentErr.message + "), otomatis fallback ke Root Google Drive.");
      folder = null;
    }
  }

  // 2. Fallback: Buat langsung di Root Google Drive jika parent folder gagal / kosong
  if (!folder) {
    folder = DriveApp.createFolder(folderName);
  }

  // 3. Atur permission link view publik jika diperbolehkan akun Google
  if (folder) {
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log("Peringatan set sharing publik (kebijakan domain): " + shareErr.message);
    }
    return folder.getUrl();
  }

  return "";
}

// Fungsi tes cepat untuk otorisasi Google Drive di Editor Apps Script
function testCreateDriveFolder() {
  const testUrl = createProjectDriveFolder("FPManager_Test_Folder");
  Logger.log("Berhasil membuat folder tes: " + testUrl);
  return testUrl;
}

function hashPassword(password) {
  if (!password) return "";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hash = "";
  for (let i = 0; i < digest.length; i++) {
    let byteValue = digest[i];
    if (byteValue < 0) byteValue += 256;
    let byteString = byteValue.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    hash += byteString;
  }
  return hash;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =================================================================
// SISTEM ROLE BERSIH (HANYA 3 ROLE: super_admin, designer, service)
// =================================================================
function normalizeRole(role) {
  if (!role) return "service";
  const r = String(role).toLowerCase().trim();
  if (r === "super_admin" || r === "super admin" || r === "superadmin" || r.indexOf("super_admin") !== -1 || r.indexOf("superadmin") !== -1 || r.indexOf("admin") !== -1 || r === "wansmin") {
    return "super_admin";
  }
  if (r === "desainer" || r === "designer") {
    return "designer";
  }
  return "service";
}

function isSuperAdminRole(role) {
  return normalizeRole(role) === "super_admin";
}

function doGet(e) {
  const action = e.parameter.action;
  const key = e.parameter.apiKey;
  const token = e.parameter.token || "";
  const role = normalizeRole(e.parameter.role);

  if (key !== getApiKey() || !token) {
    return createJsonResponse({ success: false, message: "Error: Unauthorized" });
  }

  // Role Access Validation on GET
  if (role === "designer") {
    // Designer can only access Proyek (view), Tools, Shortcuts, References, Dashboard
    const forbiddenForDesigner = ["getKeuangan", "getInvoices", "getAdminTasks", "getAdminTaskSettings", "getUsers"];
    if (forbiddenForDesigner.indexOf(action) !== -1) {
      return createJsonResponse({ success: false, message: "Akses Ditolak: Role Designer tidak memiliki akses ke fitur ini" });
    }
  } else if (role === "service") {
    // Service can access Proyek, Keuangan, Invoices, AdminTasks, Dashboard. Cannot access User Management or Tools
    if (action === "getUsers") {
      return createJsonResponse({ success: false, message: "Akses Ditolak: Hanya Super Admin yang dapat mengakses Manajemen User" });
    }
  }

  if (action === "getProyek") {
    return handleGetProyek(e);
  } else if (action === "getKeuangan") {
    return handleGetKeuangan(e);
  } else if (action === "getInvoices") {
    return handleGetInvoices(e);
  } else if (action === "getUsers") {
    return handleGetUsers(e);
  } else if (action === "getTools") {
    return handleGetTools(e);
  } else if (action === "getAdminTasks") {
    return handleGetAdminTasks(e);
  } else if (action === "getAdminTaskSettings") {
    return handleGetAdminTaskSettings(e);
  } else if (action === "getShortcuts") {
    return handleGetShortcuts(e);
  } else if (action === "getReferences") {
    return handleGetReferences(e);
  } else if (action === "getDashboardStats" || action === "getDashboard") {
    return handleGetDashboardStats(e);
  } else if (action === "setupERDDatabase" || action === "syncDatabaseHeaders") {
    return setupERDDatabase();
  }

  return createJsonResponse({ success: false, message: "Action tidak dikenal" });
}

function generateUniqueNextId(sheet, prefix, colIndex) {
  if (!sheet) return prefix + "-001";
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return prefix + "-001";
  
  const cIdx = colIndex || 0;
  const values = sheet.getRange(2, cIdx + 1, lastRow - 1, 1).getValues();
  let maxNum = 0;
  const reg = new RegExp("^" + prefix + "-?(\\d+)", "i");
  
  for (let i = 0; i < values.length; i++) {
    const val = String(values[i][0] || "");
    const match = val.match(reg);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return prefix + "-" + String(maxNum + 1).padStart(3, '0');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse({ success: false, message: "Server sedang melayani transaksi lain. Silakan klik simpan kembali dalam beberapa detik." });
  }

  try {
    const action = e.parameter.action;
    const key = e.parameter.apiKey;
    const token = e.parameter.token || "";
    const role = normalizeRole(e.parameter.role);
    const userId = e.parameter.userId || "";
    const id = e.parameter.id;

    if (key !== getApiKey() || (action !== "login" && !token)) {
      return createJsonResponse({ success: false, message: "Error: Unauthorized" });
    }

    const dataRaw = e.parameter.data;
    let data = {};
    if (dataRaw) {
      try {
        data = JSON.parse(dataRaw);
      } catch(err) {
        data = {};
      }
    }

    // Action Login
    if (action === "login") {
      return handleLogin(e.parameter.username, e.parameter.password);
    }

    // Role Security Guards on POST actions
    if (role === "designer") {
      // Designer cannot mutate projects, invoices, financials, admin tasks, or users
      const forbiddenForDesigner = [
        "addProyek", "updateProyek", "deleteProyek",
        "saveInvoice", "addInvoice", "updateInvoice", "deleteInvoice",
        "addKeuangan", "updateKeuangan", "deleteKeuangan",
        "addAdminTask", "updateAdminTask", "deleteAdminTask", "saveAdminTaskSettings", "resetAdminTasksStatus",
        "addUser", "deleteUser"
      ];
      if (forbiddenForDesigner.indexOf(action) !== -1) {
        return createJsonResponse({ success: false, message: "Akses Ditolak: Role Designer tidak diizinkan melakukan aksi ini" });
      }
      if (action === "updateUser" && String(id) !== String(userId)) {
        return createJsonResponse({ success: false, message: "Akses Ditolak: Designer hanya dapat memperbarui profil sendiri" });
      }
    } else if (role === "service") {
      // Service cannot manage other users
      if (action === "addUser" || action === "deleteUser") {
        return createJsonResponse({ success: false, message: "Akses Ditolak: Hanya Super Admin yang dapat mengelola akun pengguna" });
      }
      if (action === "updateUser" && String(id) !== String(userId)) {
        return createJsonResponse({ success: false, message: "Akses Ditolak: Hanya Super Admin yang dapat mengubah data pengguna lain" });
      }
    }

    if (action === "addProyek") {
      return handleAddProyek(data, userId);
    } else if (action === "updateProyek") {
      return handleUpdateProyek(id, data);
    } else if (action === "deleteProyek") {
      return handleDeleteProyek(id);
    } else if (action === "saveInvoice" || action === "addInvoice" || action === "updateInvoice") {
      return handleSaveInvoice(data, userId);
    } else if (action === "deleteInvoice") {
      return handleDeleteInvoice(id);
    } else if (action === "addKeuangan") {
      return handleAddKeuangan(data, userId);
    } else if (action === "updateKeuangan") {
      return handleUpdateKeuangan(id, data);
    } else if (action === "deleteKeuangan") {
      return handleDeleteKeuangan(id);
    } else if (action === "addUser") {
      return handleAddUser(data);
    } else if (action === "updateUser") {
      return handleUpdateUser(id, data);
    } else if (action === "deleteUser") {
      return handleDeleteUser(id);
    } else if (action === "addTool") {
      return handleAddTool(data, userId);
    } else if (action === "updateTool") {
      return handleUpdateTool(id, data);
    } else if (action === "deleteTool") {
      return handleDeleteTool(id);
    } else if (action === "addShortcut") {
      return handleAddShortcut(data, userId);
    } else if (action === "updateShortcut") {
      return handleUpdateShortcut(id, data);
    } else if (action === "deleteShortcut") {
      return handleDeleteShortcut(id);
    } else if (action === "addReference") {
      return handleAddReference(data, userId);
    } else if (action === "updateReference") {
      return handleUpdateReference(id, data);
    } else if (action === "deleteReference") {
      return handleDeleteReference(id);
    } else if (action === "addAdminTask") {
      return handleAddAdminTask(data, userId);
    } else if (action === "updateAdminTask") {
      return handleUpdateAdminTask(id, data);
    } else if (action === "deleteAdminTask") {
      return handleDeleteAdminTask(id);
    } else if (action === "saveAdminTaskSettings") {
      return handleSaveAdminTaskSettings(data);
    } else if (action === "resetAdminTasksStatus") {
      return handleResetAdminTasksStatus();
    } else if (action === "generateAI") {
      return handleGenerateAI(data);
    } else if (action === "uploadFile") {
      return handleUploadFile(data, e);
    } else if (action === "setupERDDatabase" || action === "syncDatabaseHeaders") {
      return setupERDDatabase();
    }

    return createJsonResponse({ success: false, message: "Action tidak dikenal" });
  } finally {
    lock.releaseLock();
  }
}


// ------------------- USER MANAGEMENT HANDLERS (3 ROLES ONLY) -------------------

function handleLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  
  if (!sheet || sheet.getLastRow() <= 1) {
    sheet = initUsersSheet(ss);
  }

  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    if (username === "wansmin" && password === "Sapi17$") {
      return createJsonResponse({
        success: true,
        token: "token-wansmin-" + Date.now(),
        user: { id: "USR-001", username: "wansmin", role: "super_admin", name: "Super Admin Wans" }
      });
    }
    return createJsonResponse({ success: false, message: "Username atau Password salah" });
  }

  const hMap = getUserHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uName = String(row[hMap.username] || "");
    const uPass = String(row[hMap.password] || "");
    
    if (uName.toLowerCase() === String(username).toLowerCase()) {
      const hashedInput = hashPassword(password);
      let match = false;
      let needsUpgrade = false;
      
      if (/^[0-9a-f]{64}$/i.test(uPass)) {
        match = (uPass === hashedInput);
      } else {
        // Fallback plaintext comparison
        match = (uPass === String(password));
        if (match) {
          needsUpgrade = true;
        }
      }
      
      if (match) {
        if (needsUpgrade) {
          sheet.getRange(i + 1, hMap.password + 1).setValue(hashedInput);
        }
        
        const uId = String(row[hMap.id] || "USR-001");
        const rawRole = String(row[hMap.role] || (uName.toLowerCase() === "wansmin" ? "super_admin" : "service"));
        const uRole = normalizeRole(rawRole);

        return createJsonResponse({
          success: true,
          token: "token-" + uId + "-" + Date.now(),
          user: {
            id: uId,
            username: uName,
            role: uRole,
            name: String(row[hMap.name] || uName),
            email: hMap.email !== undefined ? String(row[hMap.email] || "") : "",
            phone: hMap.phone !== undefined ? String(row[hMap.phone] || "") : "",
            avatar: hMap.avatar !== undefined ? String(row[hMap.avatar] || "") : ""
          }
        });
      }
    }
  }

  return createJsonResponse({ success: false, message: "Username atau Password salah" });
}

function initUsersSheet(ss) {
  let sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
  }
  
  const stdHeaders = ["Id_user", "Username", "Name", "Pass", "Email", "No_wa", "Url_profile", "Role", "Created_at", "Update_at"];
  if (sheet.getLastRow() <= 0) {
    sheet.appendRow(stdHeaders);
  }
  
  if (sheet.getLastRow() <= 1) {
    const now = new Date().toISOString();

    sheet.appendRow(["USR-001", "wansmin", "Super Admin Wans", hashPassword("Sapi17$"), "wansmin@fpmanager.com", "", "", "super_admin", now, now]);
    sheet.appendRow(["USR-002", "service1", "Staff Service", hashPassword("Service123!"), "service1@fpmanager.com", "", "", "service", now, now]);
    sheet.appendRow(["USR-003", "desainer1", "Staff Designer", hashPassword("Desain123!"), "desainer1@fpmanager.com", "", "", "designer", now, now]);
  }
  return sheet;
}

function handleGetUsers(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet || sheet.getLastRow() <= 1) {
    sheet = initUsersSheet(ss);
  }

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const hMap = getUserHeaderMap(rows[0]);
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uId = String(row[hMap.id] || "");
    const rawRole = String(row[hMap.role] || "service");
    const uRole = normalizeRole(rawRole);

    data.push({
      id: uId,
      username: String(row[hMap.username] || ""),
      role: uRole,
      name: String(row[hMap.name] || row[hMap.username] || ""),
      email: hMap.email !== undefined ? String(row[hMap.email] || "") : "",
      phone: hMap.phone !== undefined ? String(row[hMap.phone] || "") : "",
      avatar: hMap.avatar !== undefined ? String(row[hMap.avatar] || "") : "",
      createdAt: row[hMap.createdAt] ? (row[hMap.createdAt] instanceof Date ? row[hMap.createdAt].toISOString().split('T')[0] : String(row[hMap.createdAt])) : "",
      updatedAt: row[hMap.updatedAt] ? (row[hMap.updatedAt] instanceof Date ? row[hMap.updatedAt].toISOString().split('T')[0] : String(row[hMap.updatedAt])) : ""
    });
  }
  return createJsonResponse({ success: true, data: data });
}

function handleAddUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet || sheet.getLastRow() <= 1) {
    sheet = initUsersSheet(ss);
  }

  const rows = sheet.getDataRange().getValues();
  const hMap = getUserHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.username]).toLowerCase() === String(data.username).toLowerCase()) {
      return createJsonResponse({ success: false, message: "Username sudah terpakai" });
    }
  }

  const nextId = generateUniqueNextId(sheet, "USR", hMap.id);
  const now = new Date().toISOString();
  const role = normalizeRole(data.role || "service");

  const newRow = new Array(rows[0].length).fill("");
  newRow[hMap.id] = nextId;
  newRow[hMap.username] = data.username || "";
  newRow[hMap.name] = data.name || data.username || "User";
  newRow[hMap.password] = hashPassword(data.password || "123456");
  if (hMap.email !== undefined) newRow[hMap.email] = data.email || "";
  if (hMap.phone !== undefined) newRow[hMap.phone] = data.phone || "";
  if (hMap.avatar !== undefined) newRow[hMap.avatar] = data.avatar || "";
  if (hMap.role !== undefined) newRow[hMap.role] = role;
  if (hMap.createdAt !== undefined) newRow[hMap.createdAt] = now;
  if (hMap.updatedAt !== undefined) newRow[hMap.updatedAt] = now;

  sheet.appendRow(newRow);

  return createJsonResponse({ success: true, message: "User berhasil ditambahkan", id: nextId });
}

function handleUpdateUser(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Users tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: false, message: "Sheet Users kosong" });

  const hMap = getUserHeaderMap(rows[0]);
  const now = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      const rowIdx = i + 1;

      if (data.name !== undefined && hMap.name !== undefined) sheet.getRange(rowIdx, hMap.name + 1).setValue(data.name);
      if (data.email !== undefined && hMap.email !== undefined) sheet.getRange(rowIdx, hMap.email + 1).setValue(data.email);
      if (data.phone !== undefined && hMap.phone !== undefined) sheet.getRange(rowIdx, hMap.phone + 1).setValue(data.phone);
      if (data.avatar !== undefined && hMap.avatar !== undefined) sheet.getRange(rowIdx, hMap.avatar + 1).setValue(data.avatar);

      if (data.role !== undefined && hMap.role !== undefined) {
        const currentRole = normalizeRole(data.role);
        sheet.getRange(rowIdx, hMap.role + 1).setValue(currentRole);
      }
      if (data.password && hMap.password !== undefined) sheet.getRange(rowIdx, hMap.password + 1).setValue(hashPassword(data.password));
      if (hMap.updatedAt !== undefined) sheet.getRange(rowIdx, hMap.updatedAt + 1).setValue(now);

      return createJsonResponse({ success: true, message: "Data User berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID User tidak ditemukan" });
}

function handleDeleteUser(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Users tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: false, message: "Sheet Users kosong" });

  const hMap = getUserHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      if (String(rows[i][hMap.username]) === "wansmin") {
        return createJsonResponse({ success: false, message: "Super Admin utama tidak dapat dihapus!" });
      }
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: "User berhasil dihapus" });
    }
  }
  return createJsonResponse({ success: false, message: "ID User tidak ditemukan" });
}

// ------------------- ERD DATABASE & TABLE HEADERS STANDARDIZATION -------------------

// Standar Header Sesuai ERD Diagram (STRICT & LOCKED):
// 1. Users: Id_user, Username, Name, Pass, Email, No_wa, Url_profile, Role, Permision, Created_at, Update_at
// 2. UsersPermissions: Id_user, Username, Projek_create, Projek_read, Projek_update, Projek_delete, Keuangan_create, Keuangan_read, Keuangan_update, Keuangan_delete, Laporan_create, Laporan_read, Laporan_update, Laporan_delete, Created_at, Update_at
// 3. keuangan: Id_transaksi, Id_user, Id_projek, Jenis, Keterangan, Metode_bayar_dp, Metode_bayar_pelunasan, Total_dp, Total_pelunasan, Total_pembayaran, Created_at, Update_at
// 4. Projek: Id_projek, Id_user, Id_transaksi, Nama_projek, No_wa, Total_dp, Total_pelunasan, Deatline, Status, Link_Drive, Pelanggan
// 5. Referensi: Id_refrensi, Id_user, Nama_referensi, Url_referensi, Sumber, Created_at, Update_at
// 6. Tools: Id_tools, Id_user, Nama_Tools, Prompt, Created_at, Update_at
// 7. Shortcuts: Id_shortcut, Id_user, Url_shortcut, Url_icon, Created_at, Update_at

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("FPManager Database")
      .addItem("Sinkronkan Semua Header Tabel Sesuai Relasi ERD", "setupERDDatabase")
      .addToUi();
  } catch (e) {
    Logger.log("Menu UI onOpen dilewati: " + e.message);
  }
}

function setupERDDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Users Sheet
  const usersSheet = initUsersSheet(ss);
  ensureUsersHeaders(usersSheet);

  // 2. Proyek Sheet
  const proyekSheet = initProyekSheet(ss);
  ensureProyekHeaders(proyekSheet);

  // 3. Keuangan Sheet
  const keuanganSheet = initKeuanganSheet(ss);
  ensureKeuanganHeaders(keuanganSheet);

  // 4. Referensi Sheet
  let refSheet = ss.getSheetByName("Referensi") || ss.getSheetByName("References");
  if (!refSheet) refSheet = ss.insertSheet("Referensi");
  ensureReferensiHeaders(refSheet);

  // 5. Tools Sheet
  let toolSheet = ss.getSheetByName("Tools");
  if (!toolSheet) toolSheet = ss.insertSheet("Tools");
  ensureToolsHeaders(toolSheet);

  // 6. Shortcuts Sheet
  let shortcutSheet = ss.getSheetByName("Shortcuts");
  if (!shortcutSheet) shortcutSheet = ss.insertSheet("Shortcuts");
  ensureShortcutsHeaders(shortcutSheet);

  const msg = "Semua header tabel (Users, Proyek, Keuangan, Referensi, Tools, Shortcuts) berhasil disinkronkan sesuai relasi ERD!";
  Logger.log(msg);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Sukses Relasi Database", 5);
  } catch (e) {}
  return createJsonResponse({ success: true, message: msg });
}

function ensureUsersHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = ["Id_user", "Username", "Name", "Pass", "Email", "No_wa", "Url_profile", "Role", "Created_at", "Update_at"];
  if (sheet.getLastRow() <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  const lastCol = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(lastCol, stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function ensureProyekHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = [
    "Id_projek", "Id_user", "Id_transaksi", "Nama_projek", "No_wa",
    "Total_dp", "Total_pelunasan", "Deatline", "Status", "Link_Drive",
    "Pelanggan"
  ];
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(lastCol, stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function ensureKeuanganHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = [
    "Id_transaksi", "Id_user", "Id_projek", "Jenis", "Keterangan",
    "Metode_bayar_dp", "Metode_bayar_pelunasan", "Total_dp", "Total_pelunasan",
    "Total_pembayaran", "Created_at", "Update_at"
  ];
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(lastCol, stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function ensureReferensiHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = ["Id_refrensi", "Id_user", "Nama_referensi", "Url_referensi", "Sumber", "Created_at", "Update_at"];
  if (sheet.getLastRow() <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function ensureToolsHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = ["Id_tools", "Id_user", "Nama_Tools", "Prompt", "Created_at", "Update_at"];
  if (sheet.getLastRow() <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function ensureShortcutsHeaders(sheet) {
  if (!sheet) return;
  const stdHeaders = ["Id_shortcut", "Id_user", "Url_shortcut", "Url_icon", "Created_at", "Update_at"];
  if (sheet.getLastRow() <= 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return;
  }
  sheet.getRange(1, 1, 1, stdHeaders.length).setValues([stdHeaders]);
  sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), stdHeaders.length)).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function getProyekHeaderMap(headerRow) {
  const map = {
    idProyek: 0,
    userId: 1,
    idTransaksi: 2,
    namaProyek: 3,
    wa: 4,
    dp: 5,
    pelunasan: 6,
    deadline: 7,
    status: 8,
    gdriveLink: 9,
    pelanggan: 10,
    produk: 11,
    jumlah: 12,
    satuan: 13,
    hargaSatuan: 14,
    nominal: 15,
    sisa: 16,
    sumber: 17,
    metodePembayaran: 18,
    catatan: 19,
    createdAt: 20,
    updatedAt: 21
  };
  
  if (!headerRow || !Array.isArray(headerRow)) return map;

  headerRow.forEach(function(col, idx) {
    const name = String(col).toLowerCase().replace(/[\_\-\s]/g, "");
    if (name === "idprojek" || name === "idproyek" || name === "id") map.idProyek = idx;
    else if (name === "iduser" || name === "userid") map.userId = idx;
    else if (name === "idtransaksi" || name === "idkas" || name === "idkeuangan") map.idTransaksi = idx;
    else if (name === "namaprojek" || name === "namaproyek" || name === "namapekerjaan" || name === "projek" || name === "proyek") map.namaProyek = idx;
    else if (name === "nowa" || name === "nomorwa" || name === "wa" || name === "telepon" || name === "kontak") map.wa = idx;
    else if (name === "totaldp" || name === "dp" || name === "uangmuka") map.dp = idx;
    else if (name === "totalpelunasan" || name === "pelunasan") map.pelunasan = idx;
    else if (name === "deatline" || name === "deadline" || name === "tenggatwaktu" || name === "tenggat") map.deadline = idx;
    else if (name === "status" || name === "statusprojek") map.status = idx;
    else if (name === "linkdrive" || name === "glink" || name === "gdrive" || name === "drivelink" || name === "folderdrive") map.gdriveLink = idx;
    else if (name === "pelanggan" || name === "namapelanggan" || name === "klien" || name === "namaklien") map.pelanggan = idx;
    else if (name === "produk" || name === "jenisproduk") map.produk = idx;
    else if (name === "jumlah" || name === "qty" || name === "quantity") map.jumlah = idx;
    else if (name === "satuan" || name === "unit") map.satuan = idx;
    else if (name === "hargasatuan" || name === "harga") map.hargaSatuan = idx;
    else if (name === "totalpembayaran" || name === "nominalproyek" || name === "nominal" || name === "total" || name === "totalnominal") map.nominal = idx;
    else if (name === "sisapembayaran" || name === "sisa" || name === "sisatagihan") map.sisa = idx;
    else if (name === "sumber" || name === "sumberprojek" || name === "sumberproyek" || name === "platform" || name === "channel" || name === "asal") map.sumber = idx;
    else if (name === "metodepembayaran" || name === "metodebayar" || name === "metode" || name === "carabayar" || name === "paymentmethod") map.metodePembayaran = idx;
    else if (name === "catatan" || name === "note" || name === "keterangan" || name === "spesifikasi") map.catatan = idx;
    else if (name === "createdat" || name === "tanggal" || name === "tgl") map.createdAt = idx;
    else if (name === "updateat" || name === "updatedat" || name === "lastupdated") map.updatedAt = idx;
  });

  return map;
}

function getKeuanganHeaderMap(headerRow) {
  const map = {
    idTransaksi: 0,
    userId: 1,
    idProyek: 2,
    jenis: 3,
    keterangan: 4,
    metodeBayarDp: 5,
    metodeBayarPelunasan: 6,
    dp: 7,
    pelunasan: 8,
    nominal: 9,
    totalProyek: 10,
    statusPembayaran: 11,
    sisa: 12,
    catatanPelunasan: 13,
    createdAt: 14,
    updatedAt: 15
  };

  if (!headerRow || !Array.isArray(headerRow)) return map;

  headerRow.forEach(function(col, idx) {
    const name = String(col).toLowerCase().replace(/[\_\-\s]/g, "");
    if (name === "idtransaksi" || name === "idkas" || name === "id") map.idTransaksi = idx;
    else if (name === "iduser" || name === "userid") map.userId = idx;
    else if (name === "idprojek" || name === "idproyek") map.idProyek = idx;
    else if (name === "jenis" || name === "tipe") map.jenis = idx;
    else if (name === "keterangan" || name === "deskripsi" || name === "catatan") map.keterangan = idx;
    else if (name === "metodebayardp" || name === "metodedp") map.metodeBayarDp = idx;
    else if (name === "metodebayarpelunasan" || name === "metodepelunasan") map.metodeBayarPelunasan = idx;
    else if (name === "metodepembayaran" || name === "metodebayar" || name === "metode") {
      if (map.metodeBayarDp === 5) map.metodeBayarDp = idx;
      if (map.metodeBayarPelunasan === 6) map.metodeBayarPelunasan = idx;
    }
    else if (name === "totaldp" || name === "dp") map.dp = idx;
    else if (name === "totalpelunasan" || name === "pelunasan") map.pelunasan = idx;
    else if (name === "totalpembayaran" || name === "nominal" || name === "total") map.nominal = idx;
    else if (name === "totalproyek") map.totalProyek = idx;
    else if (name === "statuspembayaran" || name === "status") map.statusPembayaran = idx;
    else if (name === "sisapembayaran" || name === "sisa") map.sisa = idx;
    else if (name === "catatanpelunasan") map.catatanPelunasan = idx;
    else if (name === "createdat" || name === "tanggal") map.createdAt = idx;
    else if (name === "updateat" || name === "updatedat" || name === "lastupdated") map.updatedAt = idx;
  });

  return map;
}

function initProyekSheet(ss) {
  let sheet = ss.getSheetByName("Proyek");
  if (!sheet) {
    sheet = ss.insertSheet("Proyek");
  }
  ensureProyekHeaders(sheet);
  return sheet;
}

function initKeuanganSheet(ss) {
  let sheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
  const stdHeaders = [
    "Id_transaksi", "Id_user", "Id_projek", "Jenis", "Keterangan",
    "Metode_bayar_dp", "Metode_bayar_pelunasan", "Total_dp", "Total_pelunasan",
    "Total_pembayaran", "Created_at", "Update_at"
  ];

  if (!sheet) {
    sheet = ss.insertSheet("keuangan");
    sheet.appendRow(stdHeaders);
  }
  ensureKeuanganHeaders(sheet);
  return sheet;
}

function handleAddProyek(data, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = initProyekSheet(ss);
  let rows = sheet.getDataRange().getValues();
  let hMap = getProyekHeaderMap(rows[0]);

  // Generate Unique ID Proyek
  const idProyekSeq = generateUniqueNextId(sheet, "PRJ", hMap.idProyek);
  const cleanProd = String(data.produk || "").toLowerCase().replace(/\s+/g, "");
  const cleanPel = String(data.pelanggan || "").toLowerCase().replace(/\s+/g, "");
  const suffix = (cleanProd + cleanPel) || "proyek";
  const idProyekFull = idProyekSeq + "-" + suffix;
  const namaProyekDisplay = data.namaProyek || idProyekFull;

  // Auto Create Google Drive Folder if requested
  let gdriveLink = data.gdriveLink || "";
  if (data.createDriveFolder === true || data.createDriveFolder === "true") {
    try {
      const folderName = idProyekFull + " (" + (data.pelanggan || "Klien") + ")";
      const createdUrl = createProjectDriveFolder(folderName);
      if (createdUrl) gdriveLink = createdUrl;
    } catch (err) {
      Logger.log("Gagal membuat folder Google Drive: " + err.message);
    }
  }

  const nowIso = new Date().toISOString();
  const dpNum = Number(data.dp) || 0;
  const nomNum = Number(data.nominal) || 0;
  const pelunasanNum = Number(data.pelunasan) || 0;
  const sisaNum = data.sisa !== undefined ? Number(data.sisa) : Math.max(0, nomNum - dpNum - pelunasanNum);
  const effectiveUserId = userId || data.userId || "USR-001";
  const sumberVal = data.sumber || "WhatsApp";
  const metodeVal = data.metodePembayaran || "QRIS";

  // Create Linked Keuangan Record (TRX)
  let idTransaksi = "";
  try {
    let kasSheet = initKeuanganSheet(ss);
    let kRows = kasSheet.getDataRange().getValues();
    let kMap = getKeuanganHeaderMap(kRows[0]);
    idTransaksi = generateUniqueNextId(kasSheet, "TRX", kMap.idTransaksi);

    let statusBayar = "Belum";
    let kasNominalMasuk = 0;
    if (dpNum >= nomNum && nomNum > 0) {
      statusBayar = "Lunas";
      kasNominalMasuk = nomNum;
    } else if (dpNum > 0) {
      statusBayar = "DP";
      kasNominalMasuk = dpNum;
    } else {
      statusBayar = "Belum";
      kasNominalMasuk = 0;
    }

    const desc = statusBayar === "Lunas"
      ? ("Pembayaran Lunas - " + (data.pelanggan || "Klien") + " (" + idProyekFull + ")")
      : (statusBayar === "DP"
        ? ("Pembayaran DP - " + (data.pelanggan || "Klien") + " (" + idProyekFull + ")")
        : ("Tagihan Projek - " + (data.pelanggan || "Klien") + " (" + idProyekFull + ")"));

    const newKasRow = new Array(kRows[0].length).fill("");
    newKasRow[kMap.idTransaksi] = idTransaksi;
    newKasRow[kMap.userId] = effectiveUserId;
    newKasRow[kMap.idProyek] = idProyekFull;
    newKasRow[kMap.jenis] = "Pemasukan";
    newKasRow[kMap.keterangan] = desc;
    if (kMap.metodeBayarDp !== undefined) newKasRow[kMap.metodeBayarDp] = metodeVal;
    if (kMap.metodeBayarPelunasan !== undefined) newKasRow[kMap.metodeBayarPelunasan] = data.metodeBayarPelunasan || (dpNum >= nomNum && nomNum > 0 ? metodeVal : "");
    if (kMap.dp !== undefined) newKasRow[kMap.dp] = dpNum;
    if (kMap.pelunasan !== undefined) newKasRow[kMap.pelunasan] = pelunasanNum;
    if (kMap.nominal !== undefined) newKasRow[kMap.nominal] = kasNominalMasuk;
    if (kMap.totalProyek !== undefined) newKasRow[kMap.totalProyek] = nomNum;
    if (kMap.statusPembayaran !== undefined) newKasRow[kMap.statusPembayaran] = statusBayar;
    if (kMap.sisa !== undefined) newKasRow[kMap.sisa] = sisaNum;
    if (kMap.catatanPelunasan !== undefined) newKasRow[kMap.catatanPelunasan] = data.catatanPelunasan || "";
    if (kMap.createdAt !== undefined) newKasRow[kMap.createdAt] = nowIso;
    if (kMap.updatedAt !== undefined) newKasRow[kMap.updatedAt] = nowIso;

    kasSheet.appendRow(newKasRow);
  } catch(kErr) {
    Logger.log("Peringatan auto-insert keuangan: " + kErr.message);
  }

  // Insert Proyek Row matching exact header positions
  const maxCols = Math.max(sheet.getLastColumn(), rows[0].length, 22);
  const newRow = new Array(maxCols).fill("");
  newRow[hMap.idProyek] = idProyekFull;
  if (hMap.userId !== undefined) newRow[hMap.userId] = effectiveUserId;
  if (hMap.idTransaksi !== undefined) newRow[hMap.idTransaksi] = idTransaksi;
  if (hMap.namaProyek !== undefined) newRow[hMap.namaProyek] = namaProyekDisplay;
  if (hMap.pelanggan !== undefined) newRow[hMap.pelanggan] = data.pelanggan || "";
  if (hMap.wa !== undefined) newRow[hMap.wa] = data.wa || "";
  if (hMap.produk !== undefined) newRow[hMap.produk] = data.produk || "";
  if (hMap.jumlah !== undefined) newRow[hMap.jumlah] = data.jumlah || 1;
  if (hMap.satuan !== undefined) newRow[hMap.satuan] = data.satuan || "pcs";
  if (hMap.hargaSatuan !== undefined) newRow[hMap.hargaSatuan] = data.hargaSatuan || 0;
  if (hMap.nominal !== undefined) newRow[hMap.nominal] = nomNum;
  if (hMap.dp !== undefined) newRow[hMap.dp] = dpNum;
  if (hMap.pelunasan !== undefined) newRow[hMap.pelunasan] = pelunasanNum;
  if (hMap.sisa !== undefined) newRow[hMap.sisa] = sisaNum;
  if (hMap.deadline !== undefined) newRow[hMap.deadline] = data.deadline || "";
  if (hMap.status !== undefined) newRow[hMap.status] = data.status || "Menunggu";
  if (hMap.catatan !== undefined) newRow[hMap.catatan] = data.catatan || "";
  if (hMap.gdriveLink !== undefined) newRow[hMap.gdriveLink] = gdriveLink;
  if (hMap.sumber !== undefined) newRow[hMap.sumber] = sumberVal;
  if (hMap.metodePembayaran !== undefined) newRow[hMap.metodePembayaran] = metodeVal;
  if (hMap.createdAt !== undefined) newRow[hMap.createdAt] = nowIso;
  if (hMap.updatedAt !== undefined) newRow[hMap.updatedAt] = nowIso;

  sheet.appendRow(newRow);

  return createJsonResponse({
    success: true,
    message: "Projek berhasil disimpan!",
    idProyek: idProyekFull,
    idTransaksi: idTransaksi,
    gdriveLink: gdriveLink
  });
}

function handleGetProyek(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  ensureProyekHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const tz = (ss && typeof ss.getSpreadsheetTimeZone === 'function') ? ss.getSpreadsheetTimeZone() : (Session.getScriptTimeZone() || "GMT+7");
  const formatCellDate = function(val) {
    if (!val) return "";
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, "yyyy-MM-dd");
    }
    const s = String(val).trim();
    if (s.indexOf("T") !== -1) return s.split("T")[0];
    return s;
  };

  const hMap = getProyekHeaderMap(rows[0]);
  let data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const idProyekVal = String(row[hMap.idProyek] || "");
    if (!idProyekVal) continue;

    data.push({
      iDProyek: idProyekVal,
      idProjek: idProyekVal,
      userId: hMap.userId !== undefined ? String(row[hMap.userId] || "") : "",
      idTransaksi: hMap.idTransaksi !== undefined ? String(row[hMap.idTransaksi] || "") : "",
      namaProyek: hMap.namaProyek !== undefined ? String(row[hMap.namaProyek] || "") : idProyekVal,
      namaPelanggan: hMap.pelanggan !== undefined ? String(row[hMap.pelanggan] || "") : "",
      pelanggan: hMap.pelanggan !== undefined ? String(row[hMap.pelanggan] || "") : "",
      nomorWA: hMap.wa !== undefined ? String(row[hMap.wa] || "") : "",
      noWa: hMap.wa !== undefined ? String(row[hMap.wa] || "") : "",
      produk: hMap.produk !== undefined ? String(row[hMap.produk] || "") : "",
      jumlah: hMap.jumlah !== undefined ? Number(row[hMap.jumlah] || 1) : 1,
      satuan: hMap.satuan !== undefined ? String(row[hMap.satuan] || "pcs") : "pcs",
      hargaSatuan: hMap.hargaSatuan !== undefined ? Number(row[hMap.hargaSatuan] || 0) : 0,
      nominalProyek: hMap.nominal !== undefined ? Number(row[hMap.nominal] || 0) : 0,
      totalPembayaran: hMap.nominal !== undefined ? Number(row[hMap.nominal] || 0) : 0,
      dP: hMap.dp !== undefined ? Number(row[hMap.dp] || 0) : 0,
      totalDp: hMap.dp !== undefined ? Number(row[hMap.dp] || 0) : 0,
      pelunasan: hMap.pelunasan !== undefined ? Number(row[hMap.pelunasan] || 0) : 0,
      totalPelunasan: hMap.pelunasan !== undefined ? Number(row[hMap.pelunasan] || 0) : 0,
      sisaPembayaran: hMap.sisa !== undefined ? Number(row[hMap.sisa] || 0) : 0,
      deadline: hMap.deadline !== undefined ? formatCellDate(row[hMap.deadline]) : "",
      status: hMap.status !== undefined ? String(row[hMap.status] || "Menunggu") : "Menunggu",
      catatan: hMap.catatan !== undefined ? String(row[hMap.catatan] || "") : "",
      gdriveLink: hMap.gdriveLink !== undefined ? String(row[hMap.gdriveLink] || "") : "",
      sumber: hMap.sumber !== undefined ? String(row[hMap.sumber] || "WhatsApp") : "WhatsApp",
      metodePembayaran: hMap.metodePembayaran !== undefined ? String(row[hMap.metodePembayaran] || "QRIS") : "QRIS",
      tanggal: hMap.createdAt !== undefined ? formatCellDate(row[hMap.createdAt]) : "",
      createdAt: hMap.createdAt !== undefined ? String(row[hMap.createdAt] || "") : "",
      lastUpdated: hMap.updatedAt !== undefined ? (row[hMap.updatedAt] ? (typeof row[hMap.updatedAt] === 'number' ? row[hMap.updatedAt] : new Date(row[hMap.updatedAt]).getTime() || 0) : 0) : 0
    });
  }

  const role = (e && e.parameter && e.parameter.role) ? e.parameter.role : "";
  const filterUserId = (e && e.parameter && e.parameter.filterUserId) ? e.parameter.filterUserId : "";
  if (filterUserId) {
    data = data.filter(p => (p.userId || "USR-001") === filterUserId);
  }

  const search = e.parameter.search;
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escapedSearch, "i");
    data = data.filter(p => 
      (p.namaProyek && rx.test(p.namaProyek)) ||
      (p.namaPelanggan && rx.test(p.namaPelanggan)) ||
      (p.iDProyek && rx.test(p.iDProyek)) ||
      (p.sumber && rx.test(p.sumber))
    );
  }

  return createJsonResponse({ success: true, data: data });
}

function handleUpdateProyek(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Proyek tidak ditemukan" });

  ensureProyekHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  const hMap = getProyekHeaderMap(rows[0]);
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.idProyek]) === String(id)) {
      const rowIdx = i + 1;
      
      const currentPel = data.pelanggan !== undefined ? data.pelanggan : String(rows[i][hMap.pelanggan] || "");
      const currentProd = data.produk !== undefined ? data.produk : String(rows[i][hMap.produk] || "");
      
      const cleanProd = String(currentProd).toLowerCase().replace(/\s+/g, "");
      const cleanPel = String(currentPel).toLowerCase().replace(/\s+/g, "");
      const suffix = (cleanProd + cleanPel) || "proyek";
      
      let prefix = id;
      const prefixMatch = id.match(/^(PRJ-\d+)/i);
      if (prefixMatch) {
        prefix = prefixMatch[1];
      }
      const newIdVal = prefix + "-" + suffix;
      
      const maxCols = Math.max(sheet.getLastColumn(), rows[0].length, 22);
      const rowValues = sheet.getRange(rowIdx, 1, 1, maxCols).getValues()[0];
      rowValues[hMap.idProyek] = newIdVal;

      if (data.namaProyek !== undefined && hMap.namaProyek !== undefined) rowValues[hMap.namaProyek] = data.namaProyek;
      if (data.pelanggan !== undefined && hMap.pelanggan !== undefined) rowValues[hMap.pelanggan] = data.pelanggan;
      if (data.wa !== undefined && hMap.wa !== undefined) rowValues[hMap.wa] = data.wa;
      if (data.produk !== undefined && hMap.produk !== undefined) rowValues[hMap.produk] = data.produk;
      if (data.jumlah !== undefined && hMap.jumlah !== undefined) rowValues[hMap.jumlah] = data.jumlah;
      if (data.satuan !== undefined && hMap.satuan !== undefined) rowValues[hMap.satuan] = data.satuan;
      if (data.hargaSatuan !== undefined && hMap.hargaSatuan !== undefined) rowValues[hMap.hargaSatuan] = data.hargaSatuan;
      if (data.nominal !== undefined && hMap.nominal !== undefined) rowValues[hMap.nominal] = data.nominal;
      if (data.dp !== undefined && hMap.dp !== undefined) rowValues[hMap.dp] = data.dp;
      if (data.pelunasan !== undefined && hMap.pelunasan !== undefined) rowValues[hMap.pelunasan] = data.pelunasan;
      if (data.sisa !== undefined && hMap.sisa !== undefined) rowValues[hMap.sisa] = data.sisa;
      if (data.deadline !== undefined && hMap.deadline !== undefined) rowValues[hMap.deadline] = data.deadline;
      if (data.status !== undefined && hMap.status !== undefined) rowValues[hMap.status] = data.status;
      if (data.catatan !== undefined && hMap.catatan !== undefined) rowValues[hMap.catatan] = data.catatan;
      if (data.gdriveLink !== undefined && hMap.gdriveLink !== undefined) rowValues[hMap.gdriveLink] = data.gdriveLink;

      // Auto Drive Folder on edit if needed
      if ((data.createDriveFolder === true || data.createDriveFolder === "true") && (!rowValues[hMap.gdriveLink] || String(rowValues[hMap.gdriveLink]).trim() === "")) {
        try {
          const folderName = newIdVal + " (" + (currentPel || "Klien") + ")";
          const createdUrl = createProjectDriveFolder(folderName);
          if (createdUrl) rowValues[hMap.gdriveLink] = createdUrl;
        } catch (err) {
          Logger.log("Gagal membuat folder Google Drive saat edit: " + err.message);
        }
      }

      if (data.sumber !== undefined && hMap.sumber !== undefined) rowValues[hMap.sumber] = data.sumber;
      if (data.metodePembayaran !== undefined && hMap.metodePembayaran !== undefined) rowValues[hMap.metodePembayaran] = data.metodePembayaran;
      if (hMap.updatedAt !== undefined) rowValues[hMap.updatedAt] = nowIso;

      sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);

      // Relasi update 2 arah: Sync ke sheet Keuangan
      try {
        const kasSheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
        if (kasSheet && kasSheet.getLastRow() > 1) {
          const kasRows = kasSheet.getDataRange().getValues();
          const kMap = getKeuanganHeaderMap(kasRows[0]);
          const linkedTrxId = hMap.idTransaksi !== undefined ? String(rows[i][hMap.idTransaksi] || "") : "";

          for (let r = 1; r < kasRows.length; r++) {
            const rowTrxId = String(kasRows[r][kMap.idTransaksi] || "");
            const rowIdProyek = String(kasRows[r][kMap.idProyek] || "");
            const rowKet = String(kasRows[r][kMap.keterangan] || "");

            if ((linkedTrxId && rowTrxId === linkedTrxId) || rowIdProyek === id || rowIdProyek === newIdVal || rowKet.includes(id) || rowKet.includes(newIdVal)) {
              const rIdx = r + 1;
              const dpVal = data.dp !== undefined ? Number(data.dp) : Number(kasRows[r][kMap.dp] || 0);
              const nomVal = data.nominal !== undefined ? Number(data.nominal) : Number(kasRows[r][kMap.totalProyek] || 0);
              const pelunasanVal = data.pelunasan !== undefined ? Number(data.pelunasan) : Number(kasRows[r][kMap.pelunasan] || 0);
              const sisaVal = data.sisa !== undefined ? Number(data.sisa) : Math.max(0, nomVal - dpVal - pelunasanVal);
              
              let statusBayar = "Belum";
              let kasNominalMasuk = 0;
              if (sisaVal <= 0 && nomVal > 0) {
                statusBayar = "Lunas";
                kasNominalMasuk = (pelunasanVal > 0 && dpVal < nomVal) ? pelunasanVal : nomVal;
              } else if (dpVal > 0) {
                statusBayar = "DP";
                kasNominalMasuk = dpVal;
              } else {
                statusBayar = "Belum";
                kasNominalMasuk = 0;
              }

              const pelName = data.pelanggan || currentPel || "Klien";
              const updatedDesc = statusBayar === "Lunas"
                ? ("Pembayaran Lunas - " + pelName + " (" + newIdVal + ")")
                : (statusBayar === "DP"
                  ? ("Pembayaran DP - " + pelName + " (" + newIdVal + ")")
                  : ("Tagihan Projek - " + pelName + " (" + newIdVal + ")"));

              if (kMap.idProyek !== undefined) kasSheet.getRange(rIdx, kMap.idProyek + 1).setValue(newIdVal);
              if (kMap.keterangan !== undefined) kasSheet.getRange(rIdx, kMap.keterangan + 1).setValue(updatedDesc);
              if (kMap.nominal !== undefined) kasSheet.getRange(rIdx, kMap.nominal + 1).setValue(kasNominalMasuk);
              if (kMap.statusPembayaran !== undefined) kasSheet.getRange(rIdx, kMap.statusPembayaran + 1).setValue(statusBayar);
              if (kMap.metodeBayarDp !== undefined && (data.metodeBayarDp || data.metodePembayaran)) {
                kasSheet.getRange(rIdx, kMap.metodeBayarDp + 1).setValue(data.metodeBayarDp || data.metodePembayaran);
              }
              if (kMap.metodeBayarPelunasan !== undefined && data.metodeBayarPelunasan) {
                kasSheet.getRange(rIdx, kMap.metodeBayarPelunasan + 1).setValue(data.metodeBayarPelunasan);
              }
              if (kMap.dp !== undefined) kasSheet.getRange(rIdx, kMap.dp + 1).setValue(dpVal);
              if (kMap.pelunasan !== undefined) kasSheet.getRange(rIdx, kMap.pelunasan + 1).setValue(pelunasanVal);
              if (kMap.sisa !== undefined) kasSheet.getRange(rIdx, kMap.sisa + 1).setValue(sisaVal);
              if (kMap.totalProyek !== undefined) kasSheet.getRange(rIdx, kMap.totalProyek + 1).setValue(nomVal);
              if (kMap.catatanPelunasan !== undefined && data.catatanPelunasan !== undefined) kasSheet.getRange(rIdx, kMap.catatanPelunasan + 1).setValue(data.catatanPelunasan);
              if (kMap.updatedAt !== undefined) kasSheet.getRange(rIdx, kMap.updatedAt + 1).setValue(nowIso);
              break;
            }
          }
        }
      } catch(syncErr) {
        Logger.log("Peringatan sinkronisasi keuangan saat update proyek: " + syncErr.message);
      }
      
      return createJsonResponse({ success: true, message: "Data projek berhasil diperbarui", idProyek: newIdVal });
    }
  }
  return createJsonResponse({ success: false, message: "ID Projek tidak ditemukan" });
}

function handleDeleteProyek(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Proyek");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet tidak ditemukan" });

  let ids = [];
  try {
    ids = JSON.parse(id);
    if (!Array.isArray(ids)) ids = [String(id)];
  } catch(e) {
    ids = [String(id)];
  }
  ids = ids.map(String);

  const rows = sheet.getDataRange().getValues();
  const hMap = getProyekHeaderMap(rows[0]);
  const linkedTrxToDelete = [];

  for (let i = rows.length - 1; i >= 1; i--) {
    const rowPrjId = String(rows[i][hMap.idProyek] || "");
    if (ids.includes(rowPrjId)) {
      if (hMap.idTransaksi !== undefined && rows[i][hMap.idTransaksi]) {
        linkedTrxToDelete.push(String(rows[i][hMap.idTransaksi]));
      }
      sheet.deleteRow(i + 1);
    }
  }

  // Auto-delete linked keuangan rows by ID Proyek or ID Transaksi
  try {
    const kasSheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
    if (kasSheet && kasSheet.getLastRow() > 1) {
      const kasRows = kasSheet.getDataRange().getValues();
      const kMap = getKeuanganHeaderMap(kasRows[0]);
      for (let r = kasRows.length - 1; r >= 1; r--) {
        const rowTrxId = String(kasRows[r][kMap.idTransaksi] || "");
        const rowIdProyek = String(kasRows[r][kMap.idProyek] || "");
        const rowKet = String(kasRows[r][kMap.keterangan] || "");
        
        const match = ids.some(function(prjId) {
          return rowIdProyek === prjId || rowKet.indexOf(prjId) !== -1;
        }) || linkedTrxToDelete.includes(rowTrxId);

        if (match) {
          kasSheet.deleteRow(r + 1);
        }
      }
    }
  } catch(kErr) {
    Logger.log("Peringatan delete linked keuangan: " + kErr.message);
  }

  return createJsonResponse({ success: true, message: "Projek berhasil dihapus" });
}

function handleGetKeuangan(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const tz = (ss && typeof ss.getSpreadsheetTimeZone === 'function') ? ss.getSpreadsheetTimeZone() : (Session.getScriptTimeZone() || "GMT+7");
  const formatCellDate = function(val) {
    if (!val) return "";
    if (val instanceof Date) {
      return Utilities.formatDate(val, tz, "yyyy-MM-dd");
    }
    const s = String(val).trim();
    if (s.indexOf("T") !== -1) return s.split("T")[0];
    return s;
  };

  const kMap = getKeuanganHeaderMap(rows[0]);
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const trxId = String(row[kMap.idTransaksi] || "");
    if (!trxId) continue;

    const nominalVal = kMap.nominal !== undefined ? Number(row[kMap.nominal] || 0) : 0;
    const dpVal = kMap.dp !== undefined ? Number(row[kMap.dp] || 0) : 0;
    const pelunasanVal = kMap.pelunasan !== undefined ? Number(row[kMap.pelunasan] || 0) : 0;
    const totalPrjVal = kMap.totalProyek !== undefined ? Number(row[kMap.totalProyek] || nominalVal) : nominalVal;
    const dpMethodStr = kMap.metodeBayarDp !== undefined ? String(row[kMap.metodeBayarDp] || "") : "";
    const pelunasanMethodStr = kMap.metodeBayarPelunasan !== undefined ? String(row[kMap.metodeBayarPelunasan] || "") : "";

    data.push({
      id: trxId,
      idTransaksi: trxId,
      userId: kMap.userId !== undefined ? String(row[kMap.userId] || "") : "",
      idProyek: kMap.idProyek !== undefined ? String(row[kMap.idProyek] || "") : "",
      idProjek: kMap.idProyek !== undefined ? String(row[kMap.idProyek] || "") : "",
      tanggal: kMap.createdAt !== undefined ? formatCellDate(row[kMap.createdAt]) : "",
      jenis: kMap.jenis !== undefined ? String(row[kMap.jenis] || "Pemasukan") : "Pemasukan",
      keterangan: kMap.keterangan !== undefined ? String(row[kMap.keterangan] || "") : "",
      nominal: nominalVal,
      statusPembayaran: kMap.statusPembayaran !== undefined ? String(row[kMap.statusPembayaran] || (nominalVal > 0 ? "Lunas" : "Belum")) : (nominalVal > 0 ? "Lunas" : "Belum"),
      metodeBayarDp: dpMethodStr || "Shopee",
      metodeBayarPelunasan: pelunasanMethodStr || dpMethodStr || "Shopee",
      metodePembayaran: dpMethodStr || pelunasanMethodStr || "Shopee",
      dp: dpVal,
      totalDp: dpVal,
      pelunasan: pelunasanVal,
      totalPelunasan: pelunasanVal,
      sisa: kMap.sisa !== undefined ? Number(row[kMap.sisa] || 0) : Math.max(0, totalPrjVal - dpVal - pelunasanVal),
      totalProyek: totalPrjVal,
      totalPembayaran: totalPrjVal,
      catatanPelunasan: kMap.catatanPelunasan !== undefined ? String(row[kMap.catatanPelunasan] || "") : "",
      createdAt: kMap.createdAt !== undefined ? String(row[kMap.createdAt] || "") : "",
      updatedAt: kMap.updatedAt !== undefined ? String(row[kMap.updatedAt] || "") : ""
    });
  }

  const role = (e && e.parameter && e.parameter.role) ? e.parameter.role : "";
  const filterUserId = (e && e.parameter && e.parameter.filterUserId) ? e.parameter.filterUserId : "";
  if (filterUserId) {
    return createJsonResponse({ success: true, data: data.filter(k => (k.userId || "USR-001") === filterUserId) });
  }

  return createJsonResponse({ success: true, data: data });
}

function handleAddKeuangan(data, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = initKeuanganSheet(ss);
  let rows = sheet.getDataRange().getValues();
  let kMap = getKeuanganHeaderMap(rows[0]);

  const idKeuangan = generateUniqueNextId(sheet, "TRX", kMap.idTransaksi);
  const nowIso = new Date().toISOString();
  const dpVal = data.dp !== undefined ? Number(data.dp) : (Number(data.nominal) || 0);
  const nomVal = data.totalProyek !== undefined ? Number(data.totalProyek) : (Number(data.nominal) || 0);
  const pelunasanVal = data.pelunasan !== undefined ? Number(data.pelunasan) : 0;
  const sisaVal = data.sisa !== undefined ? Number(data.sisa) : Math.max(0, nomVal - dpVal - pelunasanVal);
  let statusBayar = data.statusPembayaran || (sisaVal <= 0 && nomVal > 0 ? "Lunas" : (dpVal > 0 ? "DP" : "Belum"));
  const realCash = data.nominal !== undefined ? Number(data.nominal) : (statusBayar === "Lunas" && pelunasanVal > 0 ? pelunasanVal : (statusBayar === "Lunas" && dpVal === nomVal ? nomVal : dpVal));
  const effectiveUserId = userId || data.userId || "USR-001";

  const newRow = new Array(rows[0].length).fill("");
  newRow[kMap.idTransaksi] = idKeuangan;
  if (kMap.userId !== undefined) newRow[kMap.userId] = effectiveUserId;
  if (kMap.idProyek !== undefined) newRow[kMap.idProyek] = data.idProyek || "";
  if (kMap.jenis !== undefined) newRow[kMap.jenis] = data.jenis || "Pemasukan";
  if (kMap.keterangan !== undefined) newRow[kMap.keterangan] = data.keterangan || "";
  if (kMap.metodeBayarDp !== undefined) newRow[kMap.metodeBayarDp] = data.metodeBayarDp || data.metodePembayaran || "Transfer Bank";
  if (kMap.metodeBayarPelunasan !== undefined) newRow[kMap.metodeBayarPelunasan] = data.metodeBayarPelunasan || data.metodePembayaran || "Transfer Bank";
  if (kMap.dp !== undefined) newRow[kMap.dp] = dpVal;
  if (kMap.pelunasan !== undefined) newRow[kMap.pelunasan] = pelunasanVal;
  if (kMap.nominal !== undefined) newRow[kMap.nominal] = realCash;
  if (kMap.totalProyek !== undefined) newRow[kMap.totalProyek] = nomVal;
  if (kMap.statusPembayaran !== undefined) newRow[kMap.statusPembayaran] = statusBayar;
  if (kMap.sisa !== undefined) newRow[kMap.sisa] = sisaVal;
  if (kMap.catatanPelunasan !== undefined) newRow[kMap.catatanPelunasan] = data.catatanPelunasan || "";
  if (kMap.createdAt !== undefined) newRow[kMap.createdAt] = data.tanggal || nowIso;
  if (kMap.updatedAt !== undefined) newRow[kMap.updatedAt] = nowIso;

  sheet.appendRow(newRow);

  return createJsonResponse({ success: true, message: "Data keuangan berhasil ditambahkan", id: idKeuangan });
}

function handleUpdateKeuangan(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Keuangan tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const kMap = getKeuanganHeaderMap(rows[0]);
  const targetId = id || (data && (data.id || data.idTransaksi));
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][kMap.idTransaksi]) === String(targetId)) {
      const rowIdx = i + 1;
      if (data.tanggal !== undefined && kMap.createdAt !== undefined) sheet.getRange(rowIdx, kMap.createdAt + 1).setValue(data.tanggal);
      if (data.jenis !== undefined && kMap.jenis !== undefined) sheet.getRange(rowIdx, kMap.jenis + 1).setValue(data.jenis);
      if (data.keterangan !== undefined && kMap.keterangan !== undefined) sheet.getRange(rowIdx, kMap.keterangan + 1).setValue(data.keterangan);
      if (data.nominal !== undefined && kMap.nominal !== undefined) sheet.getRange(rowIdx, kMap.nominal + 1).setValue(Number(data.nominal));
      if (data.statusPembayaran !== undefined && kMap.statusPembayaran !== undefined) sheet.getRange(rowIdx, kMap.statusPembayaran + 1).setValue(data.statusPembayaran);
      if (data.metodeBayarDp !== undefined && kMap.metodeBayarDp !== undefined) sheet.getRange(rowIdx, kMap.metodeBayarDp + 1).setValue(data.metodeBayarDp);
      if (data.metodeBayarPelunasan !== undefined && kMap.metodeBayarPelunasan !== undefined) sheet.getRange(rowIdx, kMap.metodeBayarPelunasan + 1).setValue(data.metodeBayarPelunasan);
      if (data.metodePembayaran !== undefined && kMap.metodeBayarDp !== undefined) sheet.getRange(rowIdx, kMap.metodeBayarDp + 1).setValue(data.metodePembayaran);
      if (data.idProyek !== undefined && kMap.idProyek !== undefined) sheet.getRange(rowIdx, kMap.idProyek + 1).setValue(data.idProyek);
      if (data.dp !== undefined && kMap.dp !== undefined) sheet.getRange(rowIdx, kMap.dp + 1).setValue(Number(data.dp));
      if (data.pelunasan !== undefined && kMap.pelunasan !== undefined) sheet.getRange(rowIdx, kMap.pelunasan + 1).setValue(Number(data.pelunasan));
      if (data.sisa !== undefined && kMap.sisa !== undefined) sheet.getRange(rowIdx, kMap.sisa + 1).setValue(Number(data.sisa));
      if (data.totalProyek !== undefined && kMap.totalProyek !== undefined) sheet.getRange(rowIdx, kMap.totalProyek + 1).setValue(Number(data.totalProyek));
      if (data.catatanPelunasan !== undefined && kMap.catatanPelunasan !== undefined) sheet.getRange(rowIdx, kMap.catatanPelunasan + 1).setValue(data.catatanPelunasan);
      if (kMap.updatedAt !== undefined) sheet.getRange(rowIdx, kMap.updatedAt + 1).setValue(nowIso);

      // Relasi 2 arah: Sync DP, Pelunasan, dan Sisa ke sheet Proyek
      const idProyekVal = data.idProyek || String(rows[i][kMap.idProyek] || "");
      if (idProyekVal) {
        try {
          const prjSheet = ss.getSheetByName("Proyek");
          if (prjSheet && prjSheet.getLastRow() > 1) {
            const pRows = prjSheet.getDataRange().getValues();
            const pMap = getProyekHeaderMap(pRows[0]);
            for (let p = 1; p < pRows.length; p++) {
              if (String(pRows[p][pMap.idProyek]) === idProyekVal) {
                const pIdx = p + 1;
                const totalNom = Number(pRows[p][pMap.nominal]) || 0;
                const currentDp = Number(pRows[p][pMap.dp]) || 0;
                let newDp = data.dp !== undefined ? Number(data.dp) : currentDp;
                let newPelunasan = data.pelunasan !== undefined ? Number(data.pelunasan) : (Number(pRows[p][pMap.pelunasan]) || 0);
                let newSisa = data.sisa !== undefined ? Number(data.sisa) : Math.max(0, totalNom - newDp - newPelunasan);
                
                if (data.statusPembayaran === "Lunas" || newSisa <= 0) {
                  newSisa = 0;
                  if (newDp < totalNom && newPelunasan === 0) {
                    newPelunasan = Math.max(0, totalNom - newDp);
                  }
                }
                
                if (pMap.dp !== undefined) prjSheet.getRange(pIdx, pMap.dp + 1).setValue(newDp);
                if (pMap.pelunasan !== undefined) prjSheet.getRange(pIdx, pMap.pelunasan + 1).setValue(newPelunasan);
                if (pMap.sisa !== undefined) prjSheet.getRange(pIdx, pMap.sisa + 1).setValue(newSisa);
                if (pMap.updatedAt !== undefined) prjSheet.getRange(pIdx, pMap.updatedAt + 1).setValue(nowIso);
                break;
              }
            }
          }
        } catch(pErr) {
          Logger.log("Peringatan update sheet Proyek dari Keuangan: " + pErr.message);
        }
      }
      
      return createJsonResponse({ success: true, message: "Data keuangan berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Keuangan tidak ditemukan" });
}

function handleDeleteKeuangan(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet tidak ditemukan" });

  let ids = [];
  try {
    ids = JSON.parse(id);
    if (!Array.isArray(ids)) ids = [String(id)];
  } catch(e) {
    ids = [String(id)];
  }
  ids = ids.map(String);

  const rows = sheet.getDataRange().getValues();
  const kMap = getKeuanganHeaderMap(rows[0]);

  for (let i = rows.length - 1; i >= 1; i--) {
    if (ids.includes(String(rows[i][kMap.idTransaksi]))) {
      sheet.deleteRow(i + 1);
    }
  }
  return createJsonResponse({ success: true, message: "Data keuangan berhasil dihapus" });
}

function handleGenerateAI(data) {
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    return createJsonResponse({
      success: false,
      message: "GEMINI_API_KEY belum disetel di Script Properties Google Apps Script."
    });
  }

  try {
    const promptText = data.prompt || data.promptText || "Analisis visual filosofi logo";
    const model = data.model || "gemini-1.5-flash";
    const base64Image = data.image || data.base64Data || "";
    
    let parts = [{ text: promptText }];
    if (base64Image) {
      const cleanBase64 = base64Image.indexOf(",") !== -1 ? base64Image.split(",")[1] : base64Image;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64
        }
      });
    }

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.95,
        topP: 0.95,
        topK: 40
      }
    };

    const response = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiKey,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

    const resJson = JSON.parse(response.getContentText());
    if (resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content && resJson.candidates[0].content.parts[0]) {
      return createJsonResponse({
        success: true,
        result: resJson.candidates[0].content.parts[0].text
      });
    } else {
      return createJsonResponse({
        success: false,
        message: resJson.error ? resJson.error.message : "Gagal generate AI dari Gemini.",
        raw: resJson
      });
    }
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: "Error pemanggilan Gemini AI: " + err.message
    });
  }
}

function handleGetDashboardStats(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let totalProyek = 0;
  let totalPemasukan = 0;
  let totalPengeluaran = 0;

  const proyekSheet = ss.getSheetByName("Proyek");
  if (proyekSheet) {
    const pRows = proyekSheet.getDataRange().getValues();
    if (pRows.length > 1) totalProyek = pRows.length - 1;
  }

  const kasSheet = ss.getSheetByName("keuangan") || ss.getSheetByName("Keuangan");
  if (kasSheet) {
    const kRows = kasSheet.getDataRange().getValues();
    const kMap = getKeuanganHeaderMap(kRows[0]);
    for (let i = 1; i < kRows.length; i++) {
      const jenis = String(kRows[i][kMap.jenis] || "");
      const nominal = Number(kRows[i][kMap.nominal]) || 0;
      if (jenis === "Pemasukan") totalPemasukan += nominal;
      else if (jenis === "Pengeluaran") totalPengeluaran += nominal;
    }
  }

  return createJsonResponse({
    success: true,
    data: {
      totalProyek: totalProyek,
      totalPemasukan: totalPemasukan,
      totalPengeluaran: totalPengeluaran,
      labaBersih: totalPemasukan - totalPengeluaran
    }
  });
}

// ------------------- TOOLS (PROMPTS), SHORTCUTS & REFERENSI -------------------

function getToolsHeaderMap(headerRow) {
  const map = { id: 0, userId: 1, title: 2, prompt: 3, createdAt: 4, updatedAt: 5 };
  if (!headerRow || !Array.isArray(headerRow)) return map;

  headerRow.forEach(function(col, idx) {
    const name = String(col).toLowerCase().replace(/[\_\-\s]/g, "");
    if (name === "idtools" || name === "id") map.id = idx;
    else if (name === "iduser" || name === "userid") map.userId = idx;
    else if (name === "namatools" || name === "title" || name === "judul") map.title = idx;
    else if (name === "prompt") map.prompt = idx;
    else if (name === "createdat") map.createdAt = idx;
    else if (name === "updateat" || name === "updatedat") map.updatedAt = idx;
  });
  return map;
}

function handleGetTools(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tools");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const hMap = getToolsHeaderMap(rows[0]);
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const idVal = String(row[hMap.id] || "");
    if (!idVal) continue;

    data.push({
      id: idVal,
      idTools: idVal,
      userId: hMap.userId !== undefined ? String(row[hMap.userId] || "") : "",
      title: hMap.title !== undefined ? String(row[hMap.title] || "") : "",
      namaTools: hMap.title !== undefined ? String(row[hMap.title] || "") : "",
      prompt: hMap.prompt !== undefined ? String(row[hMap.prompt] || "") : "",
      createdAt: hMap.createdAt !== undefined ? String(row[hMap.createdAt] || "") : "",
      updatedAt: hMap.updatedAt !== undefined ? String(row[hMap.updatedAt] || "") : ""
    });
  }

  const role = (e && e.parameter && e.parameter.role) ? e.parameter.role : "";
  const filterUserId = (e && e.parameter && e.parameter.filterUserId) ? e.parameter.filterUserId : "";
  if (filterUserId) {
    return createJsonResponse({ success: true, data: data.filter(t => (t.userId || "USR-001") === filterUserId) });
  }

  return createJsonResponse({ success: true, data: data });
}

function handleAddTool(data, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Tools");
  const stdHeaders = ["Id_tools", "Id_user", "Nama_Tools", "Prompt", "Created_at", "Update_at"];

  if (!sheet) {
    sheet = ss.insertSheet("Tools");
    sheet.appendRow(stdHeaders);
  }

  const rows = sheet.getDataRange().getValues();
  const hMap = getToolsHeaderMap(rows[0]);
  const idTool = generateUniqueNextId(sheet, "TLS", hMap.id);
  const nowIso = new Date().toISOString();

  const newRow = new Array(rows[0].length).fill("");
  newRow[hMap.id] = idTool;
  if (hMap.userId !== undefined) newRow[hMap.userId] = userId || data.userId || "USR-001";
  if (hMap.title !== undefined) newRow[hMap.title] = data.namaTools || data.title || "";
  if (hMap.prompt !== undefined) newRow[hMap.prompt] = data.prompt || "";
  if (hMap.createdAt !== undefined) newRow[hMap.createdAt] = nowIso;
  if (hMap.updatedAt !== undefined) newRow[hMap.updatedAt] = nowIso;

  sheet.appendRow(newRow);

  return createJsonResponse({ success: true, message: "Prompt berhasil ditambahkan", id: idTool });
}

function handleUpdateTool(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tools");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Tools tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getToolsHeaderMap(rows[0]);
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      const rowIdx = i + 1;
      if ((data.namaTools !== undefined || data.title !== undefined) && hMap.title !== undefined) {
        sheet.getRange(rowIdx, hMap.title + 1).setValue(data.namaTools || data.title);
      }
      if (data.prompt !== undefined && hMap.prompt !== undefined) {
        sheet.getRange(rowIdx, hMap.prompt + 1).setValue(data.prompt);
      }
      if (hMap.updatedAt !== undefined) {
        sheet.getRange(rowIdx, hMap.updatedAt + 1).setValue(nowIso);
      }
      return createJsonResponse({ success: true, message: "Prompt berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Prompt tidak ditemukan" });
}

function handleDeleteTool(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tools");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Tools tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getToolsHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: "Prompt berhasil dihapus" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Prompt tidak ditemukan" });
}

function getShortcutsHeaderMap(headerRow) {
  const map = { id: 0, userId: 1, url: 2, icon: 3, createdAt: 4, updatedAt: 5 };
  if (!headerRow || !Array.isArray(headerRow)) return map;

  headerRow.forEach(function(col, idx) {
    const name = String(col).toLowerCase().replace(/[\_\-\s]/g, "");
    if (name === "idshortcut" || name === "id") map.id = idx;
    else if (name === "iduser" || name === "userid") map.userId = idx;
    else if (name === "urlshortcut" || name === "url") map.url = idx;
    else if (name === "urlicon" || name === "icon") map.icon = idx;
    else if (name === "createdat") map.createdAt = idx;
    else if (name === "updateat" || name === "updatedat") map.updatedAt = idx;
  });
  return map;
}

function handleGetShortcuts(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shortcuts");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const hMap = getShortcutsHeaderMap(rows[0]);
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const idVal = String(row[hMap.id] || "");
    if (!idVal) continue;

    data.push({
      id: idVal,
      idShortcut: idVal,
      userId: hMap.userId !== undefined ? String(row[hMap.userId] || "") : "",
      title: hMap.url !== undefined ? String(row[hMap.url] || "") : "",
      url: hMap.url !== undefined ? String(row[hMap.url] || "") : "",
      urlShortcut: hMap.url !== undefined ? String(row[hMap.url] || "") : "",
      icon: hMap.icon !== undefined ? String(row[hMap.icon] || "") : "",
      urlIcon: hMap.icon !== undefined ? String(row[hMap.icon] || "") : "",
      createdAt: hMap.createdAt !== undefined ? String(row[hMap.createdAt] || "") : "",
      updatedAt: hMap.updatedAt !== undefined ? String(row[hMap.updatedAt] || "") : ""
    });
  }

  const role = (e && e.parameter && e.parameter.role) ? e.parameter.role : "";
  const filterUserId = (e && e.parameter && e.parameter.filterUserId) ? e.parameter.filterUserId : "";
  if (filterUserId) {
    return createJsonResponse({ success: true, data: data.filter(s => (s.userId || "USR-001") === filterUserId) });
  }

  return createJsonResponse({ success: true, data: data });
}

function handleAddShortcut(data, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Shortcuts");
  const stdHeaders = ["Id_shortcut", "Id_user", "Url_shortcut", "Url_icon", "Created_at", "Update_at"];

  if (!sheet) {
    sheet = ss.insertSheet("Shortcuts");
    sheet.appendRow(stdHeaders);
  }

  const rows = sheet.getDataRange().getValues();
  const hMap = getShortcutsHeaderMap(rows[0]);
  const idShortcut = generateUniqueNextId(sheet, "SHC", hMap.id);
  const nowIso = new Date().toISOString();

  const newRow = new Array(rows[0].length).fill("");
  newRow[hMap.id] = idShortcut;
  if (hMap.userId !== undefined) newRow[hMap.userId] = userId || data.userId || "USR-001";
  if (hMap.url !== undefined) newRow[hMap.url] = data.urlShortcut || data.url || "";
  if (hMap.icon !== undefined) newRow[hMap.icon] = data.urlIcon || data.icon || "";
  if (hMap.createdAt !== undefined) newRow[hMap.createdAt] = nowIso;
  if (hMap.updatedAt !== undefined) newRow[hMap.updatedAt] = nowIso;

  sheet.appendRow(newRow);

  return createJsonResponse({ success: true, message: "Shortcut berhasil ditambahkan", id: idShortcut });
}

function handleUpdateShortcut(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shortcuts");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Shortcuts tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getShortcutsHeaderMap(rows[0]);
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      const rowIdx = i + 1;
      if ((data.urlShortcut !== undefined || data.url !== undefined) && hMap.url !== undefined) {
        sheet.getRange(rowIdx, hMap.url + 1).setValue(data.urlShortcut || data.url);
      }
      if ((data.urlIcon !== undefined || data.icon !== undefined) && hMap.icon !== undefined) {
        sheet.getRange(rowIdx, hMap.icon + 1).setValue(data.urlIcon || data.icon);
      }
      if (hMap.updatedAt !== undefined) {
        sheet.getRange(rowIdx, hMap.updatedAt + 1).setValue(nowIso);
      }
      return createJsonResponse({ success: true, message: "Shortcut berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Shortcut tidak ditemukan" });
}

function handleDeleteShortcut(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shortcuts");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Shortcuts tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getShortcutsHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: "Shortcut berhasil dihapus" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Shortcut tidak ditemukan" });
}

function getReferensiHeaderMap(headerRow) {
  const map = { id: 0, userId: 1, title: 2, url: 3, source: 4, createdAt: 5, updatedAt: 6 };
  if (!headerRow || !Array.isArray(headerRow)) return map;

  headerRow.forEach(function(col, idx) {
    const name = String(col).toLowerCase().replace(/[\_\-\s]/g, "");
    if (name === "idrefrensi" || name === "idreferensi" || name === "id") map.id = idx;
    else if (name === "iduser" || name === "userid") map.userId = idx;
    else if (name === "namareferensi" || name === "title" || name === "judul") map.title = idx;
    else if (name === "urlreferensi" || name === "url") map.url = idx;
    else if (name === "sumber" || name === "source") map.source = idx;
    else if (name === "createdat") map.createdAt = idx;
    else if (name === "updateat" || name === "updatedat") map.updatedAt = idx;
  });
  return map;
}

function handleGetReferences(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Referensi") || ss.getSheetByName("References");
  if (!sheet) return createJsonResponse({ success: true, data: [] });

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return createJsonResponse({ success: true, data: [] });

  const hMap = getReferensiHeaderMap(rows[0]);
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const idVal = String(row[hMap.id] || "");
    if (!idVal) continue;

    data.push({
      id: idVal,
      idReferensi: idVal,
      idRefrensi: idVal,
      userId: hMap.userId !== undefined ? String(row[hMap.userId] || "") : "",
      title: hMap.title !== undefined ? String(row[hMap.title] || "") : "",
      namaReferensi: hMap.title !== undefined ? String(row[hMap.title] || "") : "",
      url: hMap.url !== undefined ? String(row[hMap.url] || "") : "",
      urlReferensi: hMap.url !== undefined ? String(row[hMap.url] || "") : "",
      source: hMap.source !== undefined ? String(row[hMap.source] || "") : "",
      sumber: hMap.source !== undefined ? String(row[hMap.source] || "") : "",
      createdAt: hMap.createdAt !== undefined ? String(row[hMap.createdAt] || "") : "",
      updatedAt: hMap.updatedAt !== undefined ? String(row[hMap.updatedAt] || "") : ""
    });
  }

  const role = (e && e.parameter && e.parameter.role) ? e.parameter.role : "";
  const filterUserId = (e && e.parameter && e.parameter.filterUserId) ? e.parameter.filterUserId : "";
  if (filterUserId) {
    return createJsonResponse({ success: true, data: data.filter(r => (r.userId || "USR-001") === filterUserId) });
  }

  return createJsonResponse({ success: true, data: data });
}

function handleAddReference(data, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Referensi") || ss.getSheetByName("References");
  const stdHeaders = ["Id_refrensi", "Id_user", "Nama_referensi", "Url_referensi", "Sumber", "Created_at", "Update_at"];

  if (!sheet) {
    sheet = ss.insertSheet("Referensi");
    sheet.appendRow(stdHeaders);
  }

  const rows = sheet.getDataRange().getValues();
  const hMap = getReferensiHeaderMap(rows[0]);
  const idRef = generateUniqueNextId(sheet, "REF", hMap.id);
  const nowIso = new Date().toISOString();

  const newRow = new Array(rows[0].length).fill("");
  newRow[hMap.id] = idRef;
  if (hMap.userId !== undefined) newRow[hMap.userId] = userId || data.userId || "USR-001";
  if (hMap.title !== undefined) newRow[hMap.title] = data.namaReferensi || data.title || "";
  if (hMap.url !== undefined) newRow[hMap.url] = data.urlReferensi || data.url || "";
  if (hMap.source !== undefined) newRow[hMap.source] = data.sumber || data.source || "";
  if (hMap.createdAt !== undefined) newRow[hMap.createdAt] = nowIso;
  if (hMap.updatedAt !== undefined) newRow[hMap.updatedAt] = nowIso;

  sheet.appendRow(newRow);

  return createJsonResponse({ success: true, message: "Referensi berhasil ditambahkan", id: idRef });
}

function handleUpdateReference(id, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Referensi") || ss.getSheetByName("References");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Referensi tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getReferensiHeaderMap(rows[0]);
  const nowIso = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      const rowIdx = i + 1;
      if ((data.namaReferensi !== undefined || data.title !== undefined) && hMap.title !== undefined) {
        sheet.getRange(rowIdx, hMap.title + 1).setValue(data.namaReferensi || data.title);
      }
      if ((data.urlReferensi !== undefined || data.url !== undefined) && hMap.url !== undefined) {
        sheet.getRange(rowIdx, hMap.url + 1).setValue(data.urlReferensi || data.url);
      }
      if ((data.sumber !== undefined || data.source !== undefined) && hMap.source !== undefined) {
        sheet.getRange(rowIdx, hMap.source + 1).setValue(data.sumber || data.source);
      }
      if (hMap.updatedAt !== undefined) {
        sheet.getRange(rowIdx, hMap.updatedAt + 1).setValue(nowIso);
      }
      return createJsonResponse({ success: true, message: "Referensi berhasil diperbarui" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Referensi tidak ditemukan" });
}

function handleDeleteReference(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Referensi") || ss.getSheetByName("References");
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet Referensi tidak ditemukan" });

  const rows = sheet.getDataRange().getValues();
  const hMap = getReferensiHeaderMap(rows[0]);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][hMap.id]) === String(id)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: "Referensi berhasil dihapus" });
    }
  }
  return createJsonResponse({ success: false, message: "ID Referensi tidak ditemukan" });
}


// =================================================================
// HANDLERS: AKTIVITAS & TUGAS HARIAN ADMIN (ADMIN TASKS)
// =================================================================

function getOrCreateAdminTasksSheet(ss) {
  let sheet = ss.getSheetByName("AdminTasks");
  if (!sheet) {
    sheet = ss.insertSheet("AdminTasks");
    sheet.appendRow([
      "ID", "AdminUser", "AdminName", "TaskName", "ScheduleType",
      "IntervalHours", "SpecificTime", "Status", "Notes", "Link",
      "Total", "Priority", "CreatedAt", "LastResetDate", "UpdatedBy"
    ]);
    sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#e0e7ff");
  }
  return sheet;
}

function handleGetAdminTasks(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateAdminTasksSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({ success: true, data: [] });
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
    const tasks = values.map(function(r) {
      return {
        id: String(r[0] || ""),
        adminUser: String(r[1] || ""),
        adminName: String(r[2] || ""),
        taskName: String(r[3] || ""),
        scheduleType: String(r[4] || "hourly"),
        intervalHours: Number(r[5]) || 1,
        specificTime: String(r[6] || ""),
        status: String(r[7] || "Belum Selesai"),
        notes: String(r[8] || ""),
        link: String(r[9] || ""),
        total: String(r[10] || ""),
        priority: String(r[11] || "medium"),
        createdAt: String(r[12] || ""),
        lastResetDate: String(r[13] || ""),
        updatedBy: String(r[14] || "")
      };
    }).filter(function(t) { return t.id !== ""; });

    return createJsonResponse({ success: true, data: tasks });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.message, data: [] });
  }
}

function handleAddAdminTask(data, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateAdminTasksSheet(ss);
    const newId = generateUniqueNextId(sheet, "TSK", 0);
    const nowStr = new Date().toISOString();
    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");

    const row = [
      newId,
      data.adminUser || "all",
      data.adminName || "Semua Admin",
      data.taskName || "Tugas Tanpa Judul",
      data.scheduleType || "hourly",
      Number(data.intervalHours) || 1,
      data.specificTime || "",
      data.status || "Belum Selesai",
      data.notes || "",
      data.link || "",
      data.total || "",
      data.priority || "medium",
      nowStr,
      todayStr,
      userId || "system"
    ];

    sheet.appendRow(row);
    data.id = newId;
    data.createdAt = nowStr;
    data.lastResetDate = todayStr;

    return createJsonResponse({ success: true, message: "Tugas admin berhasil dibuat", data: data });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal menambah tugas: " + err.message });
  }
}

function handleUpdateAdminTask(id, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateAdminTasksSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return createJsonResponse({ success: false, message: "Data tidak ditemukan" });

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) return createJsonResponse({ success: false, message: "Tugas tidak ditemukan" });

    if (data.adminUser !== undefined) sheet.getRange(rowIndex, 2).setValue(data.adminUser);
    if (data.adminName !== undefined) sheet.getRange(rowIndex, 3).setValue(data.adminName);
    if (data.taskName !== undefined) sheet.getRange(rowIndex, 4).setValue(data.taskName);
    if (data.scheduleType !== undefined) sheet.getRange(rowIndex, 5).setValue(data.scheduleType);
    if (data.intervalHours !== undefined) sheet.getRange(rowIndex, 6).setValue(Number(data.intervalHours));
    if (data.specificTime !== undefined) sheet.getRange(rowIndex, 7).setValue(data.specificTime);
    if (data.status !== undefined) sheet.getRange(rowIndex, 8).setValue(data.status);
    if (data.notes !== undefined) sheet.getRange(rowIndex, 9).setValue(data.notes);
    if (data.link !== undefined) sheet.getRange(rowIndex, 10).setValue(data.link);
    if (data.total !== undefined) sheet.getRange(rowIndex, 11).setValue(data.total);
    if (data.priority !== undefined) sheet.getRange(rowIndex, 12).setValue(data.priority);
    if (data.lastResetDate !== undefined) sheet.getRange(rowIndex, 14).setValue(data.lastResetDate);

    return createJsonResponse({ success: true, message: "Tugas berhasil diperbarui", id: id });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal update tugas: " + err.message });
  }
}

function handleDeleteAdminTask(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateAdminTasksSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return createJsonResponse({ success: false, message: "Data tidak ditemukan" });

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) return createJsonResponse({ success: false, message: "Tugas tidak ditemukan" });

    sheet.deleteRow(rowIndex);
    return createJsonResponse({ success: true, message: "Tugas berhasil dihapus" });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal menghapus tugas: " + err.message });
  }
}

function handleResetAdminTasksStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateAdminTasksSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return createJsonResponse({ success: true, count: 0 });

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    for (let r = 2; r <= lastRow; r++) {
      sheet.getRange(r, 8).setValue("Belum Selesai");
      sheet.getRange(r, 14).setValue(todayStr);
    }
    return createJsonResponse({ success: true, message: "Status tugas hari ini berhasil direset ke Belum Selesai", date: todayStr });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal reset tugas: " + err.message });
  }
}

function handleGetAdminTaskSettings(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("AdminTaskSettings");
    if (!sheet || sheet.getLastRow() <= 1) {
      return createJsonResponse({
        success: true,
        data: {
          defaultIntervalHours: 1,
          soundNotification: true,
          browserNotification: true,
          toastReminder: true,
          autoDailyReset: true,
          resetHour: "00:00"
        }
      });
    }

    const row = sheet.getRange(2, 1, 1, 6).getValues()[0];
    return createJsonResponse({
      success: true,
      data: {
        defaultIntervalHours: Number(row[0]) || 1,
        soundNotification: row[1] === true || row[1] === "TRUE",
        browserNotification: row[2] === true || row[2] === "TRUE",
        toastReminder: row[3] === true || row[3] === "TRUE",
        autoDailyReset: row[4] === true || row[4] === "TRUE",
        resetHour: String(row[5] || "00:00")
      }
    });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.message });
  }
}

function handleSaveAdminTaskSettings(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("AdminTaskSettings");
    if (!sheet) {
      sheet = ss.insertSheet("AdminTaskSettings");
      sheet.appendRow(["DefaultIntervalHours", "SoundNotification", "BrowserNotification", "ToastReminder", "AutoDailyReset", "ResetHour"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e0e7ff");
    }

    if (sheet.getLastRow() <= 1) {
      sheet.appendRow([
        Number(data.defaultIntervalHours) || 1,
        data.soundNotification !== false,
        data.browserNotification !== false,
        data.toastReminder !== false,
        data.autoDailyReset !== false,
        data.resetHour || "00:00"
      ]);
    } else {
      sheet.getRange(2, 1, 1, 6).setValues([[
        Number(data.defaultIntervalHours) || 1,
        data.soundNotification !== false,
        data.browserNotification !== false,
        data.toastReminder !== false,
        data.autoDailyReset !== false,
        data.resetHour || "00:00"
      ]]);
    }

    return createJsonResponse({ success: true, message: "Pengaturan berhasil disimpan" });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal menyimpan pengaturan: " + err.message });
  }
}

// ------------------- INVOICE & HISTORY INVOICE SHEET BACKEND -------------------

function initInvoicesSheet(ss) {
  let sheet = ss.getSheetByName("Invoices") || ss.getSheetByName("Invoice");
  if (!sheet) {
    sheet = ss.insertSheet("Invoices");
  }
  const stdHeaders = [
    "Id_invoice", "Project_ids", "Customer_name", "Customer_phone",
    "Tanggal", "Total", "Dp", "Pelunasan", "Sisa",
    "Doc_type", "Invoice_theme", "Status", "Sign_title", "Sign_name",
    "Catatan", "Items_json", "Created_by", "Created_at", "Update_at"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(stdHeaders);
    sheet.getRange(1, 1, 1, stdHeaders.length).setFontWeight("bold").setBackground("#e0e7ff");
  }
  return sheet;
}

function handleGetInvoices(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = initInvoicesSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({ success: true, data: [] });
    }
    const data = sheet.getRange(2, 1, lastRow - 1, 19).getValues();
    const result = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[2]) continue;

      let items = [];
      try {
        if (row[15]) items = JSON.parse(row[15]);
      } catch(err) { items = []; }

      let projectIds = [];
      if (row[1]) {
        projectIds = String(row[1]).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      }

      result.push({
        id: String(row[0] || ""),
        invoice_id: String(row[0] || ""),
        iDInvoice: String(row[0] || ""),
        project_ids: projectIds,
        project_id: String(row[1] || ""),
        customer_name: String(row[2] || ""),
        namaPelanggan: String(row[2] || ""),
        customer_phone: String(row[3] || ""),
        nomorWA: String(row[3] || ""),
        tanggal: row[4] instanceof Date ? Utilities.formatDate(row[4], "Asia/Jakarta", "yyyy-MM-dd") : String(row[4] || ""),
        total: Number(row[5]) || 0,
        dp: Number(row[6]) || 0,
        pelunasan: Number(row[7]) || 0,
        sisa: Number(row[8]) || 0,
        doc_type: String(row[9] || "invoice"),
        invoice_theme: String(row[10] || "light"),
        status: String(row[11] || "Lunas"),
        sign_title: String(row[12] || "Hormat Kami,"),
        sign_name: String(row[13] || "Premium Designz"),
        catatan: String(row[14] || ""),
        items: items,
        created_by: String(row[16] || ""),
        created_at: String(row[17] || ""),
        updated_at: String(row[18] || "")
      });
    }

    return createJsonResponse({ success: true, data: result.reverse() });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal memuat daftar invoice: " + err.message });
  }
}

function handleSaveInvoice(data, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = initInvoicesSheet(ss);
    const invoiceId = data.invoice_id || data.iDInvoice || data.id || generateUniqueNextId(sheet, "INV", 0);
    const nowIso = new Date().toISOString();

    const projectIdsStr = Array.isArray(data.project_ids) ? data.project_ids.join(", ") : (data.project_id || "");
    const itemsJson = Array.isArray(data.items) ? JSON.stringify(data.items) : (typeof data.items === 'string' ? data.items : "[]");

    const lastRow = sheet.getLastRow();
    let rowIndex = -1;
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === String(invoiceId).trim()) {
          rowIndex = i + 2;
          break;
        }
      }
    }

    const rowData = [
      invoiceId,
      projectIdsStr,
      data.customer_name || data.namaPelanggan || "Pelanggan",
      data.customer_phone || data.nomorWA || "",
      data.tanggal || nowIso.split("T")[0],
      Number(data.total) || 0,
      Number(data.dp) || 0,
      Number(data.pelunasan) || 0,
      Number(data.sisa) || 0,
      data.doc_type || "invoice",
      data.invoice_theme || "light",
      data.status || (Number(data.sisa || 0) <= 0 ? "Lunas" : "Belum Bayar"),
      data.sign_title || "Hormat Kami,",
      data.sign_name || "Premium Designz",
      data.catatan || "",
      itemsJson,
      data.created_by || userId || "USR-001",
      data.created_at || nowIso,
      nowIso
    ];

    if (rowIndex > 0) {
      // Pertahankan created_at lama
      const oldCreatedAt = sheet.getRange(rowIndex, 18).getValue();
      if (oldCreatedAt) rowData[17] = oldCreatedAt;
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    data.invoice_id = invoiceId;
    data.id = invoiceId;
    data.created_at = rowData[17];
    data.updated_at = rowData[18];

    return createJsonResponse({
      success: true,
      message: "Invoice berhasil disimpan",
      data: data
    });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal menyimpan invoice: " + err.message });
  }
}

function handleDeleteInvoice(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = initInvoicesSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return createJsonResponse({ success: false, message: "Invoice tidak ditemukan" });

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 2);
        return createJsonResponse({ success: true, message: "Invoice berhasil dihapus" });
      }
    }
    return createJsonResponse({ success: false, message: "Invoice tidak ditemukan" });
  } catch (err) {
    return createJsonResponse({ success: false, message: "Gagal menghapus invoice: " + err.message });
  }
}

// ------------------- FILE UPLOAD (AVATAR / GOOGLE DRIVE) -------------------

/**
 * Handle upload file (foto profil, attachment, dll.) ke Google Drive
 * Mengubah data base64 menjadi file di Google Drive dan menghasilkan Direct URL
 */
function handleUploadFile(data, e) {
  try {
    if (!data && e && e.parameter && e.parameter.data) {
      try {
        data = JSON.parse(e.parameter.data);
      } catch (pe) {
        data = {};
      }
    }

    const fileName = (data && data.fileName) || (e && e.parameter && e.parameter.fileName) || ("avatar_" + new Date().getTime() + ".jpg");
    let fileType = (data && data.fileType) || (e && e.parameter && e.parameter.fileType) || "image/jpeg";
    let base64Data = (data && data.base64Data) || (e && e.parameter && e.parameter.base64Data) || "";

    if (!base64Data) {
      return createJsonResponse({ success: false, message: "Data gambar kosong atau tidak valid." });
    }

    // Ekstrak tipe dan data jika berformat Data URL (data:image/jpeg;base64,...)
    if (base64Data.indexOf("data:") === 0) {
      const commaIdx = base64Data.indexOf(",");
      if (commaIdx !== -1) {
        const headerPart = base64Data.substring(0, commaIdx);
        const mimeMatch = headerPart.match(/:(.*?);/);
        if (mimeMatch && mimeMatch[1]) {
          fileType = mimeMatch[1];
        }
        base64Data = base64Data.substring(commaIdx + 1);
      }
    }

    if (!base64Data) {
      return createJsonResponse({ success: false, message: "Format Base64 gambar tidak valid." });
    }

    // Decode Base64 ke Byte Array & Buat Blob
    const decodedBytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedBytes, fileType, fileName);

    // Cari / buat target folder di Google Drive
    let targetFolder = null;
    const parentId = getFolderParentId();

    if (parentId && parentId !== "") {
      try {
        targetFolder = DriveApp.getFolderById(parentId);
      } catch (errParent) {
        Logger.log("Folder Parent ID '" + parentId + "' tidak dapat diakses (" + errParent.message + "), beralih ke folder default.");
        targetFolder = null;
      }
    }

    // Fallback: Gunakan atau buat folder 'FPManager_Uploads' di Google Drive utama
    if (!targetFolder) {
      const folderIter = DriveApp.getFoldersByName("FPManager_Uploads");
      if (folderIter.hasNext()) {
        targetFolder = folderIter.next();
      } else {
        targetFolder = DriveApp.createFolder("FPManager_Uploads");
      }
    }

    // Simpan file ke folder Google Drive
    const file = targetFolder.createFile(blob);

    // Set permission agar file dapat dilihat publik (view only)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log("Peringatan saat set sharing publik: " + shareErr.message);
    }

    const fileId = file.getId();
    // Direct URL yang optimal dan stabil untuk tag <img> HTML
    const directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    const driveUrl = file.getUrl();

    return createJsonResponse({
      success: true,
      message: "Foto berhasil diunggah ke Google Drive",
      url: directUrl,
      driveUrl: driveUrl,
      fileId: fileId,
      fileName: fileName
    });
  } catch (err) {
    Logger.log("Error handleUploadFile: " + err.message);
    return createJsonResponse({
      success: false,
      message: "Gagal mengunggah foto ke Google Drive: " + err.message
    });
  }
}

/**
 * Jalankan fungsi ini di Editor Google Apps Script (Klik 'Run' / 'Jalankan')
 * untuk mengotorisasi izin akses Google Drive (DriveApp) jika belum diotorisasi.
 */
function testUploadProfile() {
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const res = handleUploadFile({
    fileName: "test_avatar_authorization.png",
    fileType: "image/png",
    base64Data: dummyBase64
  });
  Logger.log("Hasil tes upload: " + JSON.stringify(res));
  return res;
}


