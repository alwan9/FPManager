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
  
  // Ambil semua data proyek (mendukung pagination dan pencarian)
  // Ambil semua data proyek (mendukung pagination dan pencarian)
  getProyek: async (params = {}) => {
    const { page = 0, limit = 0, search = "" } = params;
    try {
      const currUser = API.getCurrentUser();
      let url = `${CONFIG.API_URL}?action=getProyek&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}&role=${currUser.role}&userId=${currUser.id}`;
      if (page) url += `&page=${page}`;
      if (limit) url += `&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      url += `&_t=${Date.now()}`;

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
    try {
      const body = new URLSearchParams();
      body.append("action", "addProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
      body.append("data", JSON.stringify(proyekData));
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  // Edit Proyek
  updateProyek: async (id, proyekData) => {
    APICache.clear();
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "updateProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
      body.append("id", id);
      body.append("data", JSON.stringify(proyekData));
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

  // Hapus Proyek
  deleteProyek: async (id) => {
    APICache.clear();
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
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
      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menghubungi server."
      };
    }
  },

  // Ambil semua data keuangan
  getKeuangan: async () => {
    const currUser = API.getCurrentUser();
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getKeuangan&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}&role=${currUser.role}&userId=${currUser.id}&_t=${Date.now()}`
      );
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
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "addKeuangan");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
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
    const currUser = API.getCurrentUser();
    try {
      const payload = { id, ...transaksiData };
      const body = new URLSearchParams();
      body.append("action", "updateKeuangan");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
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
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteKeuangan");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
      body.append("id", id);
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
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getTools&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}&userId=${currUser.id}`);
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
      body.append("action", "addTool");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("userId", currUser.id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateTool: async (id, data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "updateTool");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("userId", currUser.id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteTool: async (id) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteTool");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  // ===================================
  // API WEB SHORTCUTS
  // ===================================
  getShortcuts: async () => {
    const currUser = API.getCurrentUser();
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getShortcuts&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}&userId=${currUser.id}`);
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
      body.append("action", "addShortcut");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("userId", currUser.id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateShortcut: async (id, data) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "updateShortcut");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("userId", currUser.id);
      body.append("data", JSON.stringify({ ...data, userId: currUser.id }));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteShortcut: async (id) => {
    const currUser = API.getCurrentUser();
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteShortcut");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", currUser.role);
      body.append("userId", currUser.id);
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
    const currUser = API.getCurrentUser();
    const role = currUser.role || "super_admin";
    const userId = currUser.id || "USR-001";
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getUsers&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}&role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId)}&_t=${Date.now()}`);
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
    const currUser = API.getCurrentUser();
    const role = currUser.role || "super_admin";
    const userId = currUser.id || "USR-001";
    try {
      const body = new URLSearchParams();
      body.append("action", "addUser");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", role);
      body.append("userId", userId);
      body.append("data", JSON.stringify(userData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  updateUser: async (id, userData) => {
    const currUser = API.getCurrentUser();
    const role = currUser.role || "super_admin";
    const userId = currUser.id || "USR-001";
    try {
      const body = new URLSearchParams();
      body.append("action", "updateUser");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", role);
      body.append("userId", userId);
      body.append("data", JSON.stringify(userData));
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  deleteUser: async (id) => {
    const currUser = API.getCurrentUser();
    const role = currUser.role || "super_admin";
    const userId = currUser.id || "USR-001";
    try {
      const body = new URLSearchParams();
      body.append("action", "deleteUser");
      body.append("id", id);
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("role", role);
      body.append("userId", userId);
      const res = await fetch(CONFIG.API_URL, { method: "POST", body });
      return await res.json();
    } catch (e) { return { success: false, message: e.message }; }
  },

  // Synchronize offline queue to server/mock
  syncOfflineData: async () => {
    if (!navigator.onLine) return { success: false, message: "Masih offline" };
    const queue = await FPManagerDB.getQueue();
    if (!queue || queue.length === 0) return { success: true, count: 0 };
    
    let successCount = 0;
    for (const item of queue) {
      try {
        if (item.action === 'addProyek') {
          await API.addProyek(item.data);
          successCount++;
        } else if (item.action === 'updateProyek') {
          await API.updateProyek(item.data.id, item.data.proyekData);
          successCount++;
        } else if (item.action === 'deleteProyek') {
          await API.deleteProyek(item.data.id);
          successCount++;
        } else if (item.action === 'addKeuangan') {
          await API.addKeuangan(item.data);
          successCount++;
        }
      } catch (err) {
        console.error('Failed to sync queue item:', item, err);
      }
    }
    await FPManagerDB.clearQueue();
    if (typeof Toast !== 'undefined' && successCount > 0) {
      Toast.success('Sinkronisasi Otomatis', `${successCount} perubahan data offline telah tersinkronisasi ke server.`);
    }
    return { success: true, count: successCount };
  }
};

