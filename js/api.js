// Inisialisasi Mock Data jika belum ada di LocalStorage
const initMockData = () => {
  if (!localStorage.getItem('proyek_db')) {
    const defaultProyek = [
      {
        id: 'PRJ-001',
        tanggal: '2026-06-20',
        namaProyek: 'Brosur Grand Opening',
        pelanggan: 'Budi Santoso',
        wa: '628123456789',
        jumlah: 500,
        satuan: 'pcs',
        nominal: 750000,
        dp: 300000,
        sisa: 450000,
        deadline: '2026-07-02',
        status: 'Sedang Dikerjakan',
        catatan: 'Desain minimalis modern warna biru.'
      },
      {
        id: 'PRJ-002',
        tanggal: '2026-06-22',
        namaProyek: 'Banner Bakso Solo',
        pelanggan: 'Warung Bu Sri',
        wa: '628987654321',
        jumlah: 2,
        satuan: 'meter',
        nominal: 120000,
        dp: 120000,
        sisa: 0,
        deadline: '2026-06-25',
        status: 'Sudah Diambil',
        catatan: 'Bahan flexy 280gr.'
      },
      {
        id: 'PRJ-003',
        tanggal: '2026-06-25',
        namaProyek: 'Desain Logo & Branding',
        pelanggan: 'Kedai Kopi Keren',
        wa: '628555555555',
        jumlah: 1,
        satuan: 'paket',
        nominal: 1500000,
        dp: 500000,
        sisa: 1000000,
        deadline: '2026-07-10',
        status: 'Menunggu',
        catatan: 'Referensi logo seperti Starbucks tapi lokal.'
      }
    ];
    localStorage.setItem('proyek_db', JSON.stringify(defaultProyek));
  }

  if (!localStorage.getItem('keuangan_db')) {
    const defaultKeuangan = [
      {
        id: 'KAS-001',
        tanggal: '2026-06-20',
        jenis: 'Pemasukan',
        keterangan: 'DP Proyek Brosur Grand Opening - Budi',
        nominal: 300000
      },
      {
        id: 'KAS-002',
        tanggal: '2026-06-22',
        jenis: 'Pemasukan',
        keterangan: 'Pembayaran Lunas Banner - Bu Sri',
        nominal: 120000
      },
      {
        id: 'KAS-003',
        tanggal: '2026-06-23',
        jenis: 'Pengeluaran',
        keterangan: 'Pembelian Bahan Banner & Tinta',
        nominal: 80000
      },
      {
        id: 'KAS-004',
        tanggal: '2026-06-25',
        jenis: 'Pemasukan',
        keterangan: 'DP Proyek Desain Logo - Kedai Kopi',
        nominal: 500000
      }
    ];
    localStorage.setItem('keuangan_db', JSON.stringify(defaultKeuangan));
  }
};

// Panggil inisialisasi jika mode Mock aktif
if (CONFIG.MOCK_MODE) {
  initMockData();
}

// Wrapper API Helper
const API = {
  // Ambil semua data proyek
  getProyek: async () => {
    if (CONFIG.MOCK_MODE) {
      return JSON.parse(localStorage.getItem('proyek_db')) || [];
    }
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getProyek`);
      const res = await response.json();
      return res.data || [];
    } catch (error) {
      console.error('Error fetching proyek:', error);
      throw error;
    }
  },

  // Tambah Proyek Baru
  addProyek: async (proyekData) => {
    if (CONFIG.MOCK_MODE) {
      const db = JSON.parse(localStorage.getItem('proyek_db')) || [];
      const newId = `PRJ-${String(db.length + 1).padStart(3, '0')}`;
      const newProyek = {
        id: newId,
        tanggal: new Date().toISOString().split('T')[0],
        ...proyekData,
        nominal: Number(proyekData.nominal),
        dp: Number(proyekData.dp),
        sisa: Number(proyekData.sisa),
        jumlah: Number(proyekData.jumlah),
        hargaSatuan: Number(proyekData.hargaSatuan)
      };
      db.push(newProyek);
      localStorage.setItem('proyek_db', JSON.stringify(db));

      // Jika ada DP, masukkan ke kas masuk keuangan secara otomatis
      if (newProyek.dp > 0) {
        await API.addKeuangan({
          tanggal: newProyek.tanggal,
          jenis: 'Pemasukan',
          keterangan: `DP Proyek ${newProyek.namaProyek} - ${newProyek.pelanggan}`,
          nominal: newProyek.dp
        });
      }
      return { success: true, data: newProyek };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addProyek',
          data: JSON.stringify(proyekData)
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding proyek:', error);
      throw error;
    }
  },

  // Edit Proyek
  updateProyek: async (id, proyekData) => {
    if (CONFIG.MOCK_MODE) {
      const db = JSON.parse(localStorage.getItem('proyek_db')) || [];
      const index = db.findIndex((p) => p.id === id);
      if (index === -1) return { success: false, message: 'Proyek tidak ditemukan' };

      const oldProyek = db[index];
      const updatedProyek = {
        ...oldProyek,
        ...proyekData,
        nominal: Number(proyekData.nominal),
        dp: Number(proyekData.dp),
        sisa: Number(proyekData.sisa),
        jumlah: Number(proyekData.jumlah),
        hargaSatuan: Number(proyekData.hargaSatuan)
      };

      // Catat jika ada pelunasan / tambahan pembayaran DP
      const selisihDP = updatedProyek.dp - oldProyek.dp;
      if (selisihDP > 0) {
        await API.addKeuangan({
          tanggal: new Date().toISOString().split('T')[0],
          jenis: 'Pemasukan',
          keterangan: `Pembayaran Tambahan/Pelunasan Proyek ${updatedProyek.namaProyek} - ${updatedProyek.pelanggan}`,
          nominal: selisihDP
        });
      }

      db[index] = updatedProyek;
      localStorage.setItem('proyek_db', JSON.stringify(db));
      return { success: true, data: updatedProyek };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateProyek',
          id: id,
          data: JSON.stringify(proyekData)
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating proyek:', error);
      throw error;
    }
  },

  // Hapus Proyek
  deleteProyek: async (id) => {
    if (CONFIG.MOCK_MODE) {
      let db = JSON.parse(localStorage.getItem('proyek_db')) || [];
      db = db.filter((p) => p.id !== id);
      localStorage.setItem('proyek_db', JSON.stringify(db));
      return { success: true };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'deleteProyek',
          id: id
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting proyek:', error);
      throw error;
    }
  },

  // Ambil semua data keuangan
  getKeuangan: async () => {
    if (CONFIG.MOCK_MODE) {
      return JSON.parse(localStorage.getItem('keuangan_db')) || [];
    }
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getKeuangan`);
      const res = await response.json();
      return res.data || [];
    } catch (error) {
      console.error('Error fetching keuangan:', error);
      throw error;
    }
  },

  // Tambah Transaksi Keuangan
  addKeuangan: async (transaksiData) => {
    if (CONFIG.MOCK_MODE) {
      const db = JSON.parse(localStorage.getItem('keuangan_db')) || [];
      const newId = `KAS-${String(db.length + 1).padStart(3, '0')}`;
      const newTransaksi = {
        id: newId,
        tanggal: transaksiData.tanggal || new Date().toISOString().split('T')[0],
        ...transaksiData,
        nominal: Number(transaksiData.nominal)
      };
      db.push(newTransaksi);
      localStorage.setItem('keuangan_db', JSON.stringify(db));
      return { success: true, data: newTransaksi };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addKeuangan',
          data: JSON.stringify(transaksiData)
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding keuangan:', error);
      throw error;
    }
  }
};
