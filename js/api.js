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
  }
};
