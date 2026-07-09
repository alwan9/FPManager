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

// Wrapper API Helper
const API = {
  // Ambil token login
  getToken: () => {
    return sessionStorage.getItem("token") || "mock-token";
  },
  
  // Ambil semua data proyek
  getProyek: async () => {
    if (CONFIG.MOCK_MODE) {
      let mockData = localStorage.getItem('mock_proyek');
      if (!mockData) {
        // Initialize with some default mock projects
        const defaultMock = [
          {
            iDProyek: "PRJ-001",
            tanggal: "2026-07-01",
            namaProyek: "Desain Logo Brand",
            namaPelanggan: "Budi Santoso",
            nomorWA: "6281234567890",
            produk: "Logo",
            jumlah: 1,
            satuan: "pcs",
            hargaSatuan: 1500000,
            nominalProyek: 1500000,
            dP: 500000,
            sisaPembayaran: 1000000,
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // H+1
            status: "Sedang Dikerjakan",
            catatan: "Desain minimalis, warna biru dominan.",
            gdriveLink: "https://drive.google.com"
          },
          {
            iDProyek: "PRJ-002",
            tanggal: "2026-07-03",
            namaProyek: "Desain Brosur Kuliner",
            namaPelanggan: "Siti Rahma",
            nomorWA: "6289876543210",
            produk: "Brosur",
            jumlah: 500,
            satuan: "pcs",
            hargaSatuan: 2000,
            nominalProyek: 1000000,
            dP: 1000000,
            sisaPembayaran: 0,
            deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // H-1
            status: "Selesai",
            catatan: "Brosur lipat 3.",
            gdriveLink: ""
          },
          {
            iDProyek: "PRJ-003",
            tanggal: "2026-07-05",
            namaProyek: "Poster Event Konser",
            namaPelanggan: "Andi Wijaya",
            nomorWA: "628111222333",
            produk: "Poster",
            jumlah: 1,
            satuan: "pcs",
            hargaSatuan: 800000,
            nominalProyek: 800000,
            dP: 0,
            sisaPembayaran: 800000,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // H+2
            status: "Menunggu",
            catatan: "Tema retro rock.",
            gdriveLink: ""
          }
        ];
        localStorage.setItem('mock_proyek', JSON.stringify(defaultMock));
        mockData = JSON.stringify(defaultMock);
      }
      return JSON.parse(mockData);
    }

    const now = Date.now();
    if (APICache.proyek && (now - APICache.proyekTime < 15000)) {
      return APICache.proyek;
    }

    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getProyek&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
      );
      const result = await response.json();
      if (handleUnauthorized(result)) return [];
      if (!result.success) {
        console.error("API ERROR :", result.message);
        return [];
      }
      
      APICache.proyek = result.data;
      APICache.proyekTime = Date.now();
      return result.data;
    } catch (error) {
      console.error("FETCH ERROR :", error);
      return [];
    }
  },

  // Tambah Proyek Baru
  addProyek: async (proyekData) => {
    APICache.clear();
    if (CONFIG.MOCK_MODE) {
      const list = await API.getProyek();
      const nextId = "PRJ-" + String(list.length + 1).padStart(3, "0");
      const newProyek = {
        iDProyek: nextId,
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
        gdriveLink: proyekData.gdriveLink || ""
      };
      list.push(newProyek);
      localStorage.setItem('mock_proyek', JSON.stringify(list));
      return { success: true, message: "Data berhasil disimpan (Mock)" };
    }

    try {
      console.table(proyekData);
      const body = new URLSearchParams();
      body.append("action", "addProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
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
    if (CONFIG.MOCK_MODE) {
      const list = await API.getProyek();
      const idx = list.findIndex(p => p.iDProyek === id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
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
          gdriveLink: proyekData.gdriveLink || list[idx].gdriveLink || ""
        };
        localStorage.setItem('mock_proyek', JSON.stringify(list));
        return { success: true, message: "Data berhasil diupdate (Mock)" };
      }
      return { success: false, message: "ID tidak ditemukan (Mock)" };
    }

    try {
      const body = new URLSearchParams();
      body.append("action", "updateProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
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
    if (CONFIG.MOCK_MODE) {
      let list = await API.getProyek();
      const targetIds = Array.isArray(id) ? id : [id];
      list = list.filter(p => !targetIds.includes(p.iDProyek));
      localStorage.setItem('mock_proyek', JSON.stringify(list));
      return { success: true, message: "Data berhasil dihapus (Mock)" };
    }

    try {
      const body = new URLSearchParams();
      body.append("action", "deleteProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
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
    if (CONFIG.MOCK_MODE) {
      let mockData = localStorage.getItem('mock_keuangan');
      if (!mockData) {
        const defaultMock = [
          { id: "KAS-001", tanggal: "2026-07-01", jenis: "Pemasukan", keterangan: "DP Proyek PRJ-001", nominal: 500000 },
          { id: "KAS-002", tanggal: "2026-07-03", jenis: "Pemasukan", keterangan: "Pelunasan Proyek PRJ-002", nominal: 1000000 },
          { id: "KAS-003", tanggal: "2026-07-04", jenis: "Pengeluaran", keterangan: "Pembelian Kertas A4", nominal: 150000 }
        ];
        localStorage.setItem('mock_keuangan', JSON.stringify(defaultMock));
        mockData = JSON.stringify(defaultMock);
      }
      return JSON.parse(mockData);
    }

    const now = Date.now();
    if (APICache.keuangan && (now - APICache.keuanganTime < 15000)) {
      return APICache.keuangan;
    }

    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getKeuangan&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
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
    if (CONFIG.MOCK_MODE) {
      const list = await API.getKeuangan();
      const nextId = "KAS-" + String(list.length + 1).padStart(3, "0");
      const newTx = {
        id: nextId,
        tanggal: transaksiData.tanggal || new Date().toISOString().split('T')[0],
        jenis: transaksiData.jenis,
        keterangan: transaksiData.keterangan,
        nominal: Number(transaksiData.nominal)
      };
      list.push(newTx);
      localStorage.setItem('mock_keuangan', JSON.stringify(list));
      return { success: true, message: "Transaksi berhasil disimpan (Mock)" };
    }

    try {
      const body = new URLSearchParams();
      body.append("action", "addKeuangan");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
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
    if (CONFIG.MOCK_MODE) {
      const proyekList = await API.getProyek();
      const keuanganList = await API.getKeuangan();
      let totalPemasukan = 0;
      let totalPengeluaran = 0;
      keuanganList.forEach(k => {
        const nominal = Number(k.nominal) || 0;
        if (k.jenis === 'Pemasukan') totalPemasukan += nominal;
        else if (k.jenis === 'Pengeluaran') totalPengeluaran += nominal;
      });
      return {
        totalProyek: proyekList.length,
        totalPemasukan,
        totalPengeluaran,
        labaBersih: totalPemasukan - totalPengeluaran
      };
    }

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

  // Batch update multiple projects in a single network request
  batchUpdateProyek: async (updates) => {
    APICache.clear();
    if (CONFIG.MOCK_MODE) {
      const list = await API.getProyek();
      let count = 0;
      updates.forEach(update => {
        const projId = update.id || update.iDProyek;
        const target = list.find(p => p.iDProyek === projId);
        if (target) {
          Object.keys(update).forEach(key => {
            if (key === "id") return;
            let targetKey = key;
            if (key === "dp") targetKey = "dP";
            else if (key === "wa") targetKey = "nomorWA";
            else if (key === "pelanggan") targetKey = "namaPelanggan";
            else if (key === "nominal") targetKey = "nominalProyek";
            else if (key === "sisa") targetKey = "sisaPembayaran";
            
            target[targetKey] = update[key];
          });
          count++;
        }
      });
      localStorage.setItem('mock_proyek', JSON.stringify(list));
      return { success: true, message: `${count} data proyek berhasil diupdate (Mock)` };
    }

    try {
      const body = new URLSearchParams();
      body.append("action", "batchUpdateProyek");
      body.append("token", API.getToken());
      body.append("apiKey", CONFIG.API_KEY);
      body.append("data", JSON.stringify(updates));
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

  // Get consolidated dashboard data (stats, recent projects, alerts, chart, calendar)
  getDashboard: async () => {
    if (CONFIG.MOCK_MODE) {
      const proyekList = await API.getProyek();
      const keuanganList = await API.getKeuangan();
      const stats = await API.getDashboardStats();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentProjects = [...proyekList].reverse().slice(0, 5);

      const deadlineAlerts = [];
      const revisiProjects = [];

      proyekList.forEach(p => {
        const statusLower = (p.status || '').toLowerCase();
        if (statusLower === 'revisi') {
          revisiProjects.push(p);
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
      keuanganList.forEach(k => {
        if (!k.tanggal) return;
        const date = new Date(k.tanggal);
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const langCode = isEn ? 'en-US' : 'id-ID';
        const monthName = date.toLocaleString(langCode, { month: 'short' });
        const key = `${monthName} ${date.getFullYear()}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            monthLabel: key,
            sortKey: date.getFullYear() * 100 + (date.getMonth() + 1),
            pemasukan: 0,
            pengeluaran: 0
          };
        }
        const nominal = Number(k.nominal) || 0;
        if (k.jenis === 'Pemasukan') {
          monthlyData[key].pemasukan += nominal;
        } else if (k.jenis === 'Pengeluaran') {
          monthlyData[key].pengeluaran += nominal;
        }
      });
      const sortedMonths = Object.values(monthlyData)
        .sort((a, b) => a.sortKey - b.sortKey)
        .slice(-6);

      const chartData = {
        labels: sortedMonths.map(item => item.monthLabel),
        pemasukan: sortedMonths.map(item => item.pemasukan),
        pengeluaran: sortedMonths.map(item => item.pengeluaran)
      };

      return {
        stats,
        recentProjects,
        deadlineAlerts,
        revisiProjects,
        chartData
      };
    }

    try {
      const response = await fetch(
        `${CONFIG.API_URL}?action=getDashboard&token=${API.getToken()}&apiKey=${CONFIG.API_KEY}`
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
  }
};
