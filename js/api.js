// Safely handle JSON parsing issues (e.g. offline, timeout, non-JSON response crash prevention)
(function() {
  const originalJson = Response.prototype.json;
  Response.prototype.json = async function() {
    if (!this.ok) {
      throw new Error(`HTTP Error: ${this.status} ${this.statusText}`);
    }
    const contentType = this.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().includes("application/json")) {
      const textVal = await this.text();
      console.error("Non-JSON Response received:", textVal);
      throw new Error("Format respon server tidak valid (Bukan JSON).");
    }
    return originalJson.apply(this);
  };
})();

// Helper HTML Escaper for XSS Prevention
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Helper URL Sanitizer to prevent javascript: or data: URL injection (XSS)
const sanitizeUrl = (url) => {
  if (!url) return '#';
  const clean = String(url).trim();
  if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
    return '#';
  }
  return clean;
};

// Helper Clipboard Copier for UX Convenience
const copyTextToClipboard = async (text, label = "Teks") => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Disalin!', `${label} "${text}" telah disalin ke clipboard.`);
    }
  } catch (err) {
    console.error("Gagal menyalin:", err);
    // Fallback using execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      if (typeof Toast !== 'undefined') {
        Toast.success('Berhasil Disalin!', `${label} "${text}" telah disalin ke clipboard.`);
      }
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.error('Gagal Menyalin', 'Perangkat tidak mendukung penyalinan otomatis.');
    }
    document.body.removeChild(textarea);
  }
};

// Helper Unauthorized
const handleUnauthorized = (result) => {
  if (result.message === "Error: Unauthorized") {
    sessionStorage.removeItem("token");
    window.location.href = "login.html";
    return true;
  }
  return false;
};

// Cache object for API calls (expires in 15 seconds)
const APICache = {
  proyek: null,
  proyekTime: 0,
  keuangan: null,
  keuanganTime: 0,
  
  clear: () => {
    APICache.proyek = null;
    APICache.proyekTime = 0;
    APICache.keuangan = null;
    APICache.keuanganTime = 0;
  }
};

// IndexedDB Helper for Offline Storage & Sync Queue
const FPManagerDB = {
  dbName: 'FPManagerDB',
  dbVersion: 1,
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB tidak didukung pada browser ini.');
        resolve(null);
        return;
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve(null);
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('proyek')) {
          db.createObjectStore('proyek', { keyPath: 'iDProyek' });
        }
        if (!db.objectStoreNames.contains('keuangan')) {
          db.createObjectStore('keuangan', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'queueId', autoIncrement: true });
        }
      };
    });
  },

  async getAll(storeName) {
    const db = await this.init();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  async saveAll(storeName, items) {
    const db = await this.init();
    if (!db || !Array.isArray(items)) return;
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach(item => {
        if (item && (item.iDProyek || item.id)) store.put(item);
      });
    } catch (e) {
      console.error('Save to IndexedDB error:', e);
    }
  },

  async saveOne(storeName, item) {
    const db = await this.init();
    if (!db || !item) return;
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);
    } catch (e) {
      console.error('Save item error:', e);
    }
  },

  async removeOne(storeName, key) {
    const db = await this.init();
    if (!db) return;
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
    } catch (e) {
      console.error('Remove item error:', e);
    }
  },

  async addToQueue(action, data) {
    const db = await this.init();
    const item = { action, data, timestamp: Date.now() };
    if (db) {
      try {
        const tx = db.transaction('offline_queue', 'readwrite');
        tx.objectStore('offline_queue').add(item);
      } catch (e) {
        console.error('Queue error:', e);
      }
    } else {
      const q = JSON.parse(localStorage.getItem('fpm_offline_queue') || '[]');
      q.push(item);
      localStorage.setItem('fpm_offline_queue', JSON.stringify(q));
    }
  },

  async getQueue() {
    const db = await this.init();
    if (db) {
      return await this.getAll('offline_queue');
    }
    return JSON.parse(localStorage.getItem('fpm_offline_queue') || '[]');
  },

  async clearQueue() {
    const db = await this.init();
    if (db) {
      try {
        const tx = db.transaction('offline_queue', 'readwrite');
        tx.objectStore('offline_queue').clear();
      } catch (e) {}
    }
    localStorage.removeItem('fpm_offline_queue');
  },

  async clearAllStores() {
    const db = await this.init();
    if (db) {
      try {
        const stores = ['proyek', 'keuangan', 'offline_queue'];
        stores.forEach(s => {
          if (db.objectStoreNames.contains(s)) {
            const tx = db.transaction(s, 'readwrite');
            tx.objectStore(s).clear();
          }
        });
      } catch (e) {}
    }
    localStorage.removeItem('fpm_offline_queue');
  }
};

// Wrapper API Helper
const API = {
  // Ambil token login
  getToken: () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  },

  // Helper untuk membuat URL dengan otentikasi lengkap (termasuk permissions & role)
  getAuthUrl: (action, extraParams = {}) => {
    const currUser = API.getCurrentUser();
    const perms = Array.isArray(currUser.permissions) ? JSON.stringify(currUser.permissions) : (typeof currUser.permissions === 'object' && currUser.permissions ? JSON.stringify(currUser.permissions) : "[]");
    let url = `${CONFIG.API_URL}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(API.getToken())}&apiKey=${encodeURIComponent(CONFIG.API_KEY)}&role=${encodeURIComponent(currUser.role || '')}&userId=${encodeURIComponent(currUser.id || '')}&permissions=${encodeURIComponent(perms)}`;
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      }
    }
    url += `&_t=${Date.now()}`;
    return url;
  },

  // Helper untuk mengisi body POST dengan otentikasi lengkap
  appendAuthBody: (body, action) => {
    const currUser = API.getCurrentUser();
    body.append("action", action);
    body.append("token", API.getToken());
    body.append("apiKey", CONFIG.API_KEY);
    body.append("role", currUser.role || "");
    body.append("userId", currUser.id || "");
    const perms = Array.isArray(currUser.permissions) ? JSON.stringify(currUser.permissions) : (typeof currUser.permissions === 'object' && currUser.permissions ? JSON.stringify(currUser.permissions) : "[]");
    body.append("permissions", perms);
  },
  
  // Ambil semua data proyek (mendukung pagination dan pencarian)
  getProyek: async (params = {}) => {
    const { page = 0, limit = 0, search = "" } = params;
    
    // Return cached data if valid (within 15 seconds) to boost page performance
    if (!page && !limit && !search && APICache.proyek && (Date.now() - APICache.proyekTime < 15000)) {
      return APICache.proyek;
    }

    try {
      const url = API.getAuthUrl("getProyek", { page: page || undefined, limit: limit || undefined, search: search || undefined });

      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return [];
      }
      
      if (!page && !limit && !search) {
        APICache.proyek = result.data;
        APICache.proyekTime = Date.now();
      }
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return [];
    }
  },

  // Tambah Proyek Baru
  addProyek: async (proyekData) => {
    APICache.clear();
    const currUser = API.getCurrentUser();

    // Check if offline
    if (!navigator.onLine) {
      const offlineId = "OFFLINE-PRJ-" + Date.now();
      const localProyek = {
        iDProyek: offlineId,
        tanggal: new Date().toISOString().split('T')[0],
        namaProyek: proyekData.namaProyek || "",
        namaPelanggan: proyekData.pelanggan || "",
        nomorWA: proyekData.wa || "",
        produk: proyekData.produk || "",
        jumlah: Number(proyekData.jumlah) || 1,
        satuan: proyekData.satuan || "pcs",
        hargaSatuan: Number(proyekData.hargaSatuan) || 0,
        nominalProyek: Number(proyekData.nominal) || 0,
        dP: Number(proyekData.dp) || 0,
        sisaPembayaran: Number(proyekData.sisa) || 0,
        deadline: proyekData.deadline || "",
        status: proyekData.status || "Menunggu",
        catatan: proyekData.catatan || "",
        gdriveLink: proyekData.gdriveLink || "",
        userId: currUser ? currUser.id : "USR-001",
        lastUpdated: Date.now(),
        isOfflineCreated: true
      };

      await FPManagerDB.saveOne('proyek', localProyek);
      await FPManagerDB.addToQueue('addProyek', { offlineId, proyekData });

      return {
        success: true,
        isOffline: true,
        message: "Projek disimpan secara lokal karena koneksi luring.",
        idProyek: offlineId
      };
    }

    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addProyek");
      body.append("data", JSON.stringify(proyekData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await response.json();
      if (result.success) {
        const addedProyek = {
          iDProyek: result.idProyek,
          tanggal: new Date().toISOString().split('T')[0],
          namaProyek: proyekData.namaProyek,
          namaPelanggan: proyekData.pelanggan,
          nomorWA: proyekData.wa,
          produk: proyekData.produk,
          jumlah: proyekData.jumlah,
          satuan: proyekData.satuan,
          hargaSatuan: proyekData.hargaSatuan,
          nominalProyek: proyekData.nominal,
          dP: proyekData.dp,
          sisaPembayaran: proyekData.sisa,
          deadline: proyekData.deadline,
          status: proyekData.status,
          catatan: proyekData.catatan,
          gdriveLink: result.gdriveLink || proyekData.gdriveLink,
          userId: currUser ? currUser.id : "USR-001",
          lastUpdated: Date.now()
        };
        await FPManagerDB.saveOne('proyek', addedProyek);
      }
      return result;
    } catch (error) {
      console.error(error);
      const offlineId = "OFFLINE-PRJ-" + Date.now();
      const localProyek = {
        iDProyek: offlineId,
        tanggal: new Date().toISOString().split('T')[0],
        namaProyek: proyekData.namaProyek,
        namaPelanggan: proyekData.pelanggan,
        nomorWA: proyekData.wa,
        produk: proyekData.produk,
        jumlah: proyekData.jumlah,
        satuan: proyekData.satuan,
        hargaSatuan: proyekData.hargaSatuan,
        nominalProyek: proyekData.nominal,
        dP: proyekData.dp,
        sisaPembayaran: proyekData.sisa,
        deadline: proyekData.deadline,
        status: proyekData.status,
        catatan: proyekData.catatan,
        gdriveLink: proyekData.gdriveLink,
        userId: currUser ? currUser.id : "USR-001",
        lastUpdated: Date.now(),
        isOfflineCreated: true
      };
      await FPManagerDB.saveOne('proyek', localProyek);
      await FPManagerDB.addToQueue('addProyek', { offlineId, proyekData });
      return {
        success: true,
        isOffline: true,
        message: "Terjadi gangguan jaringan. Projek disimpan offline.",
        idProyek: offlineId
      };
    }
  },

  // Edit Proyek
  updateProyek: async (id, proyekData) => {
    APICache.clear();
    const currUser = API.getCurrentUser();
    const isTempId = String(id).startsWith("OFFLINE-PRJ-");

    if (!navigator.onLine || isTempId) {
      const allLocal = await FPManagerDB.getAll('proyek');
      const oldLocal = allLocal.find(p => String(p.iDProyek) === String(id));

      const localUpdated = {
        ...(oldLocal || {}),
        iDProyek: id,
        namaProyek: proyekData.namaProyek !== undefined ? proyekData.namaProyek : (oldLocal ? oldLocal.namaProyek : ""),
        namaPelanggan: proyekData.pelanggan !== undefined ? proyekData.pelanggan : (oldLocal ? oldLocal.namaPelanggan : ""),
        nomorWA: proyekData.wa !== undefined ? proyekData.wa : (oldLocal ? oldLocal.nomorWA : ""),
        produk: proyekData.produk !== undefined ? proyekData.produk : (oldLocal ? oldLocal.produk : ""),
        jumlah: proyekData.jumlah !== undefined ? Number(proyekData.jumlah) : (oldLocal ? oldLocal.jumlah : 1),
        satuan: proyekData.satuan !== undefined ? proyekData.satuan : (oldLocal ? oldLocal.satuan : "pcs"),
        hargaSatuan: proyekData.hargaSatuan !== undefined ? Number(proyekData.hargaSatuan) : (oldLocal ? oldLocal.hargaSatuan : 0),
        nominalProyek: proyekData.nominal !== undefined ? Number(proyekData.nominal) : (oldLocal ? oldLocal.nominalProyek : 0),
        dP: proyekData.dp !== undefined ? Number(proyekData.dp) : (oldLocal ? oldLocal.dP : 0),
        sisaPembayaran: proyekData.sisa !== undefined ? Number(proyekData.sisa) : (oldLocal ? oldLocal.sisaPembayaran : 0),
        deadline: proyekData.deadline !== undefined ? proyekData.deadline : (oldLocal ? oldLocal.deadline : ""),
        status: proyekData.status !== undefined ? proyekData.status : (oldLocal ? oldLocal.status : "Menunggu"),
        catatan: proyekData.catatan !== undefined ? proyekData.catatan : (oldLocal ? oldLocal.catatan : ""),
        gdriveLink: proyekData.gdriveLink !== undefined ? proyekData.gdriveLink : (oldLocal ? oldLocal.gdriveLink : ""),
        userId: currUser ? currUser.id : "USR-001",
        lastUpdated: Date.now()
      };

      await FPManagerDB.saveOne('proyek', localUpdated);
      await FPManagerDB.addToQueue('updateProyek', { id, proyekData, lastUpdated: localUpdated.lastUpdated });

      return {
        success: true,
        isOffline: true,
        message: "Perubahan projek disimpan secara lokal.",
        idProyek: id
      };
    }

    try {
      const allLocal = await FPManagerDB.getAll('proyek');
      const oldLocal = allLocal.find(p => String(p.iDProyek) === String(id));
      const clientLastUpdated = oldLocal ? (oldLocal.lastUpdated || 0) : 0;

      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateProyek");
      body.append("id", id);

      const payload = { ...proyekData, lastUpdated: clientLastUpdated };
      body.append("data", JSON.stringify(payload));

      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await response.json();
      if (result.success) {
        const newId = result.idProyek || id;
        if (newId !== id) {
          await FPManagerDB.removeOne('proyek', id);
        }

        const localUpdated = {
          ...(oldLocal || {}),
          iDProyek: newId,
          namaProyek: proyekData.namaProyek || (oldLocal ? oldLocal.namaProyek : ""),
          namaPelanggan: proyekData.pelanggan || (oldLocal ? oldLocal.namaPelanggan : ""),
          nomorWA: proyekData.wa || (oldLocal ? oldLocal.nomorWA : ""),
          produk: proyekData.produk || (oldLocal ? oldLocal.produk : ""),
          jumlah: proyekData.jumlah !== undefined ? proyekData.jumlah : (oldLocal ? oldLocal.jumlah : 1),
          satuan: proyekData.satuan || (oldLocal ? oldLocal.satuan : "pcs"),
          hargaSatuan: proyekData.hargaSatuan !== undefined ? proyekData.hargaSatuan : (oldLocal ? oldLocal.hargaSatuan : 0),
          nominalProyek: proyekData.nominal !== undefined ? proyekData.nominal : (oldLocal ? oldLocal.nominalProyek : 0),
          dP: proyekData.dp !== undefined ? proyekData.dp : (oldLocal ? oldLocal.dP : 0),
          sisaPembayaran: proyekData.sisa !== undefined ? proyekData.sisa : (oldLocal ? oldLocal.sisaPembayaran : 0),
          deadline: proyekData.deadline || (oldLocal ? oldLocal.deadline : ""),
          status: proyekData.status || (oldLocal ? oldLocal.status : "Menunggu"),
          catatan: proyekData.catatan || (oldLocal ? oldLocal.catatan : ""),
          gdriveLink: proyekData.gdriveLink || (oldLocal ? oldLocal.gdriveLink : ""),
          lastUpdated: Date.now()
        };
        await FPManagerDB.saveOne('proyek', localUpdated);
      }
      return result;
    } catch (error) {
      console.error(error);
      const allLocal = await FPManagerDB.getAll('proyek');
      const oldLocal = allLocal.find(p => String(p.iDProyek) === String(id));
      const localUpdated = {
        ...(oldLocal || {}),
        iDProyek: id,
        lastUpdated: Date.now()
      };
      await FPManagerDB.saveOne('proyek', localUpdated);
      await FPManagerDB.addToQueue('updateProyek', { id, proyekData, lastUpdated: localUpdated.lastUpdated });
      return {
        success: true,
        isOffline: true,
        message: "Gangguan jaringan. Perubahan disimpan offline.",
        idProyek: id
      };
    }
  },

  // Hapus Proyek
  deleteProyek: async (id) => {
    APICache.clear();
    const currUser = API.getCurrentUser();

    if (!navigator.onLine) {
      const idsToDelete = Array.isArray(id) ? id : [id];
      for (const singleId of idsToDelete) {
        await FPManagerDB.removeOne('proyek', singleId);
        await FPManagerDB.addToQueue('deleteProyek', { id: singleId });
      }
      return {
        success: true,
        isOffline: true,
        message: "Data dihapus secara lokal."
      };
    }

    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteProyek");
      body.append("id", Array.isArray(id) ? JSON.stringify(id) : id);
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      if (!response.ok) {
        throw new Error("HTTP Error");
      }
      const result = await response.json();
      if (handleUnauthorized(result)) return result;
      if (result.success) {
        const idsToDelete = Array.isArray(id) ? id : [id];
        for (const singleId of idsToDelete) {
          await FPManagerDB.removeOne('proyek', singleId);
        }
      }
      return result;
    } catch (error) {
      console.error(error);
      const idsToDelete = Array.isArray(id) ? id : [id];
      for (const singleId of idsToDelete) {
        await FPManagerDB.removeOne('proyek', singleId);
        await FPManagerDB.addToQueue('deleteProyek', { id: singleId });
      }
      return {
        success: true,
        isOffline: true,
        message: "Gangguan jaringan. Penghapusan disimpan offline."
      };
    }
  },

  // Ambil semua data keuangan
  getKeuangan: async () => {
    // Return cached data if valid (within 15 seconds) to boost page performance
    if (APICache.keuangan && (Date.now() - APICache.keuanganTime < 15000)) {
      return APICache.keuangan;
    }

    try {
      const url = API.getAuthUrl("getKeuangan");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("HTTP Error");
      }
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return [];
      }
      
      APICache.keuangan = result.data;
      APICache.keuanganTime = Date.now();
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return [];
    }
  },

  // Tambah Transaksi Keuangan
  addKeuangan: async (transaksiData) => {
    APICache.clear();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addKeuangan");
      body.append("data", JSON.stringify(transaksiData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      return await response.json();
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },

  // Update Transaksi Keuangan
  updateKeuangan: async (id, transaksiData) => {
    APICache.clear();
    try {
      const payload = { id, ...transaksiData };
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateKeuangan");
      body.append("id", id);
      body.append("data", JSON.stringify(payload));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      return await response.json();
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },

  // Hapus Transaksi Keuangan
  deleteKeuangan: async (id) => {
    APICache.clear();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteKeuangan");
      body.append("id", Array.isArray(id) ? JSON.stringify(id) : id);
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      return await response.json();
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },

  // Generate AI
  generateAI: async (data) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "generateAI");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify(data));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await response.json();
      if (handleUnauthorized(result)) return result;
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Gagal menghubungi AI."
      };
    }
  },

  // Get pre-calculated dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getDashboardStats&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
      );
      const result = await response.json();
      if (handleUnauthorized(result)) return null;
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return null;
      }
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return null;
    }
  },

  getDashboard: async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getDashboard&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
      );
      const result = await response.json();
      if (handleUnauthorized(result)) return null;
      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.warn("Backend getDashboard failed, computing locally:", error);
    }

    // Fallback: Build complete Dashboard data client-side from Proyek & Keuangan APIs
    try {
      const projects = (await API.getProyek()) || [];
      const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
      const canKeuangan = user && (user.username === "wansmin" || (user.role && user.role.includes("admin")) || Auth.hasPermission("keuangan:read"));
      const keuanganList = canKeuangan ? ((await API.getKeuangan()) || []) : [];

      return API.buildDashboardData(projects, keuanganList);
    } catch (err) {
      console.error("Local dashboard calculation error:", err);
      return null;
    }
  },

  buildDashboardData: (projects, keuanganList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Stats calculation
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let dikerjakanCount = 0;
    let revisiCount = 0;
    let selesaiCount = 0;

    (projects || []).forEach(p => {
      totalPemasukan += (Number(p.pembayaranAwal) || 0);
      const st = String(p.status || '').toLowerCase();
      if (st.includes('dikerjakan')) dikerjakanCount++;
      else if (st.includes('revisi')) revisiCount++;
      else if (st.includes('selesai')) selesaiCount++;
    });

    (keuanganList || []).forEach(k => {
      const jenis = String(k.jenis || '').toLowerCase();
      const nominal = Number(k.nominal) || 0;
      if (jenis.includes('masuk') || jenis === 'pemasukan') {
        totalPemasukan += nominal;
      } else if (jenis.includes('keluar') || jenis === 'pengeluaran') {
        totalPengeluaran += nominal;
      }
    });

    const labaBersih = totalPemasukan - totalPengeluaran;

    // 2. Deadline Alerts (<= 3 days)
    const deadlineAlerts = [];
    (projects || []).forEach(p => {
      if (p.deadline) {
        const dlDate = new Date(p.deadline);
        dlDate.setHours(0, 0, 0, 0);
        const diffMs = dlDate - today;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const st = String(p.status || '').toLowerCase();
        if (diffDays >= 0 && diffDays <= 3 && !st.includes('selesai') && !st.includes('batal')) {
          deadlineAlerts.push({
            iDProyek: p.iDProyek,
            namaProyek: p.namaProyek,
            namaPelanggan: p.namaPelanggan,
            deadline: p.deadline,
            diffDays: diffDays
          });
        }
      }
    });

    // 3. Recent Projects (Top 5)
    const recentProjects = [...(projects || [])].slice(-5).reverse();

    // 4. Monthly Financial Chart Data (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const labels = [];
    const pemasukanArr = [];
    const pengeluaranArr = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      labels.push(`${monthNames[mIdx]} ${yr.toString().slice(-2)}`);

      let mIn = 0;
      let mOut = 0;

      (projects || []).forEach(p => {
        if (p.tanggal) {
          const pDate = new Date(p.tanggal);
          if (pDate.getMonth() === mIdx && pDate.getFullYear() === yr) {
            mIn += (Number(p.pembayaranAwal) || 0);
          }
        }
      });

      (keuanganList || []).forEach(k => {
        if (k.tanggal) {
          const kDate = new Date(k.tanggal);
          if (kDate.getMonth() === mIdx && kDate.getFullYear() === yr) {
            const jenis = String(k.jenis || '').toLowerCase();
            const nominal = Number(k.nominal) || 0;
            if (jenis.includes('masuk') || jenis === 'pemasukan') mIn += nominal;
            else if (jenis.includes('keluar') || jenis === 'pengeluaran') mOut += nominal;
          }
        }
      });

      pemasukanArr.push(mIn);
      pengeluaranArr.push(mOut);
    }

    // 5. Revision Projects for Calendar
    const revisiProjects = (projects || []).filter(p => String(p.status || '').toLowerCase().includes('revisi'));

    return {
      stats: {
        totalProyek: (projects || []).length,
        totalPemasukan,
        totalPengeluaran,
        labaBersih,
        dikerjakanCount,
        revisiCount,
        selesaiCount
      },
      deadlineAlerts,
      recentProjects,
      chartData: {
        labels,
        pemasukan: pemasukanArr,
        pengeluaran: pengeluaranArr
      },
      revisiProjects
    };
  },

  // ===================================
  // API TOOLS (PROMPTS)
  // ===================================
  getTools: async () => {
    const currUser = API.getCurrentUser();
  getTools: async () => {
    try {
      const url = API.getAuthUrl("getTools");
      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      return result.success ? result.data : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addTool: async (data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addTool");
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateTool: async (id, data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateTool");
      body.append("id", id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteTool: async (id) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteTool");
      body.append("id", id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  // ===================================
  // API DESIGN REFERENCES
  // ===================================
  getReferences: async () => {
    try {
      const url = API.getAuthUrl("getReferences");
      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      return result.success ? result.data : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addReference: async (data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addReference");
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateReference: async (id, data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateReference");
      body.append("id", id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteReference: async (id) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteReference");
      body.append("id", id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  // ===================================
  // API WEB SHORTCUTS
  // ===================================
  getShortcuts: async () => {
    try {
      const url = API.getAuthUrl("getShortcuts");
      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      return result.success ? result.data : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addShortcut: async (data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addShortcut");
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateShortcut: async (id, data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateShortcut");
      body.append("id", id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteShortcut: async (id) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteShortcut");
      body.append("id", id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  getCurrentUser: () => {
    let u = null;
    if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
      u = Auth.getUser();
    }
    if (!u) {
      try {
        const uStr = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (uStr) u = JSON.parse(uStr);
      } catch(e) {}
    }
    if (!u) u = { id: "USR-001", role: "super_admin", username: "wansmin" };
    if (!u.role) u.role = "super_admin";
    if (!u.id) u.id = "USR-001";
    return u;
  },

  // ===================================
  // API MANAJEMEN USER (SUPER ADMIN ONLY)
  // ===================================
  getUsers: async () => {
    try {
      const url = API.getAuthUrl("getUsers");
      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR (getUsers):", result.message);
        if (typeof Toast !== 'undefined' && result.message) {
          Toast.error("API Error", result.message);
        }
        return [];
      }
      return result.data || [];
    } catch (e) {
      console.error(e);
      if (typeof Toast !== 'undefined') {
        Toast.error("Koneksi Gagal", "Gagal menghubungi server Google Sheets API.");
      }
      return [];
    }
  },

  addUser: async (userData) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addUser");
      body.append("data", JSON.stringify(userData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateUser: async (id, userData) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateUser");
      body.append("id", id);
      body.append("data", JSON.stringify(userData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteUser: async (id) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteUser");
      body.append("id", id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  // Upload file to Google Drive folder parent (stores link in cell instead of massive base64)
  uploadFile: async (fileName, fileType, base64Data) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "uploadFile");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify({ fileName, fileType, base64Data }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Synchronize offline queue to server/mock with conflict detection and temporary ID mapping
  syncOfflineData: async () => {
    if (!navigator.onLine) return { success: false, message: "Masih offline" };
    const queue = await FPManagerDB.getQueue();
    if (!queue || queue.length === 0) return { success: true, count: 0 };
    
    let successCount = 0;
    const idMap = {};

    for (const item of queue) {
      try {
        let actionSuccess = false;

        if (item.action === 'addProyek') {
          const res = await API.addProyek(item.data.proyekData);
          if (res && res.success) {
            actionSuccess = true;
            if (item.data.offlineId && res.idProyek) {
              idMap[item.data.offlineId] = res.idProyek;
              await FPManagerDB.removeOne('proyek', item.data.offlineId);
            }
          }
        } 
        else if (item.action === 'updateProyek') {
          let targetId = item.data.id;
          if (idMap[targetId]) {
            targetId = idMap[targetId];
          }

          const res = await API.updateProyek(targetId, item.data.proyekData);
          if (res && res.success) {
            actionSuccess = true;
            if (res.idProyek && res.idProyek !== targetId) {
              if (idMap[item.data.id]) {
                idMap[item.data.id] = res.idProyek;
              }
            }
          } else if (res && res.message && res.message.includes("Konflik Sinkronisasi")) {
            console.warn("Conflict detected for offline update. Client data skipped:", item, res.message);
            actionSuccess = true; // Mark as success to clear it from queue so it does not block subsequent actions
            if (typeof Toast !== 'undefined') {
              Toast.warning('Konflik Sinkronisasi', `Perubahan proyek diabaikan karena data di server telah diperbarui.`);
            }
          }
        } 
        else if (item.action === 'deleteProyek') {
          let targetId = item.data.id;
          if (idMap[targetId]) {
            targetId = idMap[targetId];
          }
          const res = await API.deleteProyek(targetId);
          if (res && res.success) {
            actionSuccess = true;
          }
        }
        else if (item.action === 'addKeuangan') {
          const res = await API.addKeuangan(item.data);
          if (res && res.success) {
            actionSuccess = true;
          }
        }

        if (actionSuccess) {
          if (item.queueId) {
            await FPManagerDB.removeOne('offline_queue', item.queueId);
          }
          successCount++;
        } else {
          // Connection dropped or other fetch failure, break loop to preserve queue
          break;
        }
      } catch (err) {
        console.error('Failed to sync queue item:', item, err);
        break;
      }
    }

    if (successCount > 0) {
      if (typeof Toast !== 'undefined') {
        Toast.success('Sinkronisasi Otomatis', `${successCount} perubahan data offline telah tersinkronisasi ke server.`);
      }
    }
  },

  // ===================================
  // API AKTIVITAS & TUGAS ADMIN (ADMIN TASKS)
  // ===================================
  getAdminTasks: async () => {
    try {
      const url = API.getAuthUrl("getAdminTasks");
      const response = await fetch(url);
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (result.success && Array.isArray(result.data)) {
        localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(result.data));
        return result.data;
      }
    } catch (e) {
      console.warn("getAdminTasks fetch failed, using local cache:", e);
    }
    // Fallback Local Storage
    try {
      const local = localStorage.getItem("fpmanager_admin_tasks");
      if (local) return JSON.parse(local);
    } catch(e) {}
    
    // Default initial seed data if totally empty
    const initialTasks = [
      {
        id: "TSK-001",
        adminUser: "wansmin",
        adminName: "Super Admin",
        taskName: "Cek & Follow-up Chat WhatsApp Klien",
        scheduleType: "hourly",
        intervalHours: 1,
        specificTime: "09:00",
        status: "Belum Selesai",
        notes: "Pastikan semua pertanyaan klien mengenai estimasi biaya dan portofolio dibalas dengan ramah.",
        link: "https://web.whatsapp.com",
        total: "15 Chat",
        priority: "high",
        createdAt: new Date().toISOString(),
        lastResetDate: new Date().toISOString().split("T")[0]
      },
      {
        id: "TSK-002",
        adminUser: "service",
        adminName: "Admin Service",
        taskName: "Rekap Pembayaran DP & Kirim Invoice",
        scheduleType: "hourly",
        intervalHours: 2,
        specificTime: "11:00",
        status: "Belum Selesai",
        notes: "Cek mutasi bank dan input transaksi pemasukan ke menu Keuangan serta kirim invoice PDF ke klien.",
        link: "invoice.html",
        total: "Rp 2.500.000",
        priority: "high",
        createdAt: new Date().toISOString(),
        lastResetDate: new Date().toISOString().split("T")[0]
      },
      {
        id: "TSK-003",
        adminUser: "desainer",
        adminName: "Tim Desainer",
        taskName: "Review Revisi & Serah Terima File Desain Final",
        scheduleType: "hourly",
        intervalHours: 3,
        specificTime: "15:00",
        status: "Belum Selesai",
        notes: "Periksa watermark dan resolusi file export sebelum dikirimkan ke link Google Drive klien.",
        link: "tools.html",
        total: "5 Projek",
        priority: "medium",
        createdAt: new Date().toISOString(),
        lastResetDate: new Date().toISOString().split("T")[0]
      },
      {
        id: "TSK-004",
        adminUser: "all",
        adminName: "Semua Admin",
        taskName: "Laporan Harian & Evaluasi Sore",
        scheduleType: "daily",
        intervalHours: 24,
        specificTime: "17:00",
        status: "Belum Selesai",
        notes: "Pastikan seluruh status projek hari ini ter-update dan catat kendala operasional.",
        link: "laporan.html",
        total: "100%",
        priority: "medium",
        createdAt: new Date().toISOString(),
        lastResetDate: new Date().toISOString().split("T")[0]
      }
    ];
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(initialTasks));
    return initialTasks;
  },

  addAdminTask: async (taskData) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "addAdminTask");
      body.append("data", JSON.stringify(taskData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      const result = await res.json();
      if (result && result.success) {
        // Also update local cache
        const local = await API.getAdminTasks();
        local.unshift(result.data || taskData);
        localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
        return result;
      }
    } catch (e) {
      console.warn("addAdminTask remote failed, using local save:", e);
    }
    
    // Local fallback creation
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem("fpmanager_admin_tasks") || "[]");
    } catch(e) {}
    const newId = "TSK-" + String(Date.now()).slice(-5);
    const newTask = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString(),
      lastResetDate: new Date().toISOString().split("T")[0]
    };
    local.unshift(newTask);
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
    return { success: true, message: "Tugas admin berhasil ditambahkan.", data: newTask };
  },

  updateAdminTask: async (id, taskData) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "updateAdminTask");
      body.append("id", id);
      body.append("data", JSON.stringify(taskData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      const result = await res.json();
      if (result && result.success) {
        let local = await API.getAdminTasks();
        local = local.map(t => (t.id === id ? { ...t, ...taskData } : t));
        localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
        return result;
      }
    } catch (e) {
      console.warn("updateAdminTask remote failed, updating local:", e);
    }

    // Local fallback update
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem("fpmanager_admin_tasks") || "[]");
    } catch(e) {}
    local = local.map(t => (t.id === id ? { ...t, ...taskData } : t));
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
    return { success: true, message: "Tugas admin berhasil diperbarui.", id };
  },

  deleteAdminTask: async (id) => {
    try {
      const body = new URLSearchParams();
      API.appendAuthBody(body, "deleteAdminTask");
      body.append("id", id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      const result = await res.json();
      if (result && result.success) {
        let local = await API.getAdminTasks();
        local = local.filter(t => t.id !== id);
        localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
        return result;
      }
    } catch (e) {
      console.warn("deleteAdminTask remote failed, deleting local:", e);
    }

    // Local fallback delete
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem("fpmanager_admin_tasks") || "[]");
    } catch(e) {}
    local = local.filter(t => t.id !== id);
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(local));
    return { success: true, message: "Tugas admin berhasil dihapus." };
  },

  getAdminTaskSettings: async () => {
    try {
      const url = API.getAuthUrl("getAdminTaskSettings");
      const response = await fetch(url);
      const result = await response.json();
      if (result && result.success && result.data) {
        localStorage.setItem("fpmanager_admin_task_settings", JSON.stringify(result.data));
        return result.data;
      }
    } catch(e) {}

    try {
      const local = localStorage.getItem("fpmanager_admin_task_settings");
      if (local) return JSON.parse(local);
    } catch(e) {}

    return {
      defaultIntervalHours: 1,
      soundNotification: true,
      browserNotification: true,
      toastReminder: true,
      autoDailyReset: true,
      resetHour: "00:00",
      lastResetDate: new Date().toISOString().split("T")[0]
    };
  },

  saveAdminTaskSettings: async (settingsData) => {
    const currUser = API.getCurrentUser();
    const role = currUser.role || "super_admin";
    const userId = currUser.id || "USR-001";
    try {
      const body = new URLSearchParams();
      body.append("action", "saveAdminTaskSettings");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", role);
      body.append("userId", userId);
      body.append("data", JSON.stringify(settingsData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      const result = await res.json();
      if (result && result.success) {
        localStorage.setItem("fpmanager_admin_task_settings", JSON.stringify(settingsData));
        return result;
      }
    } catch(e) {}

    localStorage.setItem("fpmanager_admin_task_settings", JSON.stringify(settingsData));
    return { success: true, message: "Pengaturan pengingat tugas berhasil disimpan." };
  }
};


