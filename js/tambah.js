document.addEventListener('DOMContentLoaded', async () => {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = isEn ? 'Live API (Google Sheets)' : 'Live API (Google sheets)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }

  // Localize Dropdowns
  if (isEn) {
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
      const statusMap = {
        'Menunggu': 'Waiting',
        'Sedang Dikerjakan': 'In Progress',
        'Revisi': 'Revision',
        'Selesai': 'Completed',
        'Belum Pembayaran': 'Unpaid',
        'Dibatalkan': 'Cancelled'
      };
      Array.from(statusSelect.options).forEach(opt => {
        if (statusMap[opt.value]) {
          opt.textContent = statusMap[opt.value];
        }
      });
    }

    const satuanSelect = document.getElementById('satuan');
    if (satuanSelect) {
      const satuanMap = {
        'pcs': 'pcs',
        'lembar': 'sheet',
        'meter': 'meter',
        'dus': 'box',
        'paket': 'package',
        'rim': 'ream',
        'buku': 'book'
      };
      Array.from(satuanSelect.options).forEach(opt => {
        if (satuanMap[opt.value]) {
          opt.textContent = satuanMap[opt.value];
        }
      });
    }
  }
  // Ambil element form
  const form = document.getElementById('proyekForm');
  const namaProyekInput = document.getElementById('namaProyek');
  const pelangganInput = document.getElementById('pelanggan');
  const waInput = document.getElementById('wa');
  const produkInput = document.getElementById('produk');
  const jumlahInput = document.getElementById('jumlah');
  const satuanInput = document.getElementById('satuan');
  const hargaSatuanInput = document.getElementById('hargaSatuan');
  const nominalInput = document.getElementById('nominal');
  const dpInput = document.getElementById('dp');
  const sisaInput = document.getElementById('sisa');
  const deadlineInput = document.getElementById('deadline');
  const todayBtn = document.getElementById('todayBtn');
  const tomorrowBtn = document.getElementById('tomorrowBtn');
  const threeDaysBtn = document.getElementById('threeDaysBtn');
  const statusInput = document.getElementById('status');
  const catatanInput = document.getElementById('catatan');
  const gdriveLinkInput = document.getElementById('gdriveLink');
  const deadlineWarning = document.getElementById('deadlineWarning');
  const submitBtn = document.getElementById('submitBtn');
  // Deteksi mode Edit vs Tambah
  const urlParams = new URLSearchParams(window.location.search);
  const proyekId = urlParams.get('id');
  let isEditMode = false;
  let currentGDriveLink = "";
  if (proyekId) {
    isEditMode = true;
    document.getElementById('pageTitleHeader').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600"></i> <span>${isEn ? 'Edit Project' : 'Edit Projek'} ${proyekId}</span>`;
    document.getElementById('formTitle').textContent = isEn ? `Modify Project Details (${proyekId})` : `Ubah Rincian Projek (${proyekId})`;
    document.title = isEn ? `Edit Project ${proyekId} - FPManager` : `Edit Projek ${proyekId} - FPManager`;
    submitBtn.textContent = isEn ? 'Save Changes' : 'Simpan Perubahan';
    // Ubah sidebar active link ke Data Proyek daripada Tambah Proyek
    const sidebarAddLink = document.getElementById('sidebarAddLink');
    if (sidebarAddLink) {
      sidebarAddLink.className = 'sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100';
      sidebarAddLink.innerHTML = `<i class="fa-solid fa-circle-plus w-5"></i><span>${isEn ? 'Add Project' : 'Tambah Projek'}</span>`;
    }
    // Ambil data proyek untuk diisi ke form
    try {
      const projects = await API.getProyek();
      const proyek = projects.find(p => p.iDProyek === proyekId);
      if (proyek) {
        namaProyekInput.value = proyek.namaProyek;
        pelangganInput.value = proyek.namaPelanggan;
        const nomorWA = String(proyek.nomorWA);
        waInput.value = nomorWA.startsWith("62")
          ? nomorWA.slice(2)
          : nomorWA;
        produkInput.value = proyek.produk;
        jumlahInput.value = proyek.jumlah;
        satuanInput.value = proyek.satuan;
        hargaSatuanInput.value = proyek.hargaSatuan;
        nominalInput.value = proyek.nominalProyek;
        dpInput.value = proyek.dP;
        sisaInput.value = proyek.sisaPembayaran;
        deadlineInput.value = proyek.deadline;
        statusInput.value = proyek.status;
        catatanInput.value = proyek.catatan || "";
        currentGDriveLink = proyek.gdriveLink || "";
        if (gdriveLinkInput) {
          gdriveLinkInput.value = proyek.gdriveLink || "";
        }
        checkDeadline(proyek.deadline);
        kalkulasiNominalDanSisa();
      } else {

        showToast({
          title: isEn ? "Project Data" : "Data Projek",
          message: isEn ? "Project not found." : "Projek tidak ditemukan.",
          type: "warning"
        });

        setTimeout(() => {
          window.location.href = "proyek.html";
        }, 1500);

      }
    } catch (e) {

      console.error(e);

      showToast({
        title: "Error",
        message: isEn ? "Failed to retrieve project details for editing." : "Gagal mengambil data projek untuk diedit.",
        type: "error"
      });

    }
  }
  // Hitung Nominal Proyek & Sisa secara Dinamis
  function kalkulasiNominalDanSisa() {
    const qty = parseFloat(jumlahInput.value) || 0;
    const price = parseFloat(hargaSatuanInput.value) || 0;
    const dp = parseFloat(dpInput.value) || 0;
    const nominal = qty * price;
    const sisa = nominal - dp;
    nominalInput.value = formatRupiah(nominal);
    sisaInput.value = formatRupiah(sisa);

    // Update live previews
    const hargaSatuanPreview = document.getElementById('hargaSatuanPreview');
    const dpPreview = document.getElementById('dpPreview');
    if (hargaSatuanPreview) {
      hargaSatuanPreview.textContent = hargaSatuanInput.value ? formatRupiah(price) : '';
    }
    if (dpPreview) {
      dpPreview.textContent = dpInput.value ? formatRupiah(dp) : '';
    }
  };
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (!isEditMode) {
    const defaultDate = new Date();
    deadlineInput.value = formatDate(defaultDate);
    deadlineInput.min = formatDate(defaultDate);
    checkDeadline(deadlineInput.value);

    // Pre-fill fields from URL query params (useful for Pricelist redirect)
    const produkParam = urlParams.get('produk');
    const hargaParam = urlParams.get('harga');
    if (produkParam) {
      produkInput.value = decodeURIComponent(produkParam);
    }
    if (hargaParam) {
      hargaSatuanInput.value = parseFloat(hargaParam) || 0;
    }
  }

  // Initial calculation and preview setup
  kalkulasiNominalDanSisa();

  jumlahInput.addEventListener('input', kalkulasiNominalDanSisa);
  hargaSatuanInput.addEventListener('input', kalkulasiNominalDanSisa);
  dpInput.addEventListener('input', kalkulasiNominalDanSisa);
  // Cek Tanggal Deadline
  deadlineInput.addEventListener('change', (e) => {
    checkDeadline(e.target.value);
  });
  todayBtn.addEventListener("click", () => {
    const date = new Date();
    deadlineInput.value = formatDate(date);
    checkDeadline(deadlineInput.value);
  });
  tomorrowBtn.addEventListener("click", () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    deadlineInput.value = formatDate(date);
    checkDeadline(deadlineInput.value);
  });
  threeDaysBtn.addEventListener("click", () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    deadlineInput.value = formatDate(date);
    checkDeadline(deadlineInput.value);
  });
  function checkDeadline(dateStr) {
    if (!dateStr) return;
    const deadlineDate = new Date(dateStr);
    const today = new Date();
    // Reset jam agar perbandingan fokus pada tanggal saja
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 3) {
      deadlineWarning.classList.remove('hidden');
    } else {
      deadlineWarning.classList.add('hidden');
    }
  }
  // Format ke Rupiah helper untuk input baca-saja
  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  }
  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Validasi WA
    let cleanWA = waInput.value.replace(/\D/g, ''); // bersihkan non-angka
    if (cleanWA.startsWith('0')) {
      cleanWA = '62' + cleanWA.slice(1);
    } else if (!cleanWA.startsWith('62')) {
      cleanWA = '62' + cleanWA;
    }
    const qty = parseFloat(jumlahInput.value) || 0;
    const price = parseFloat(hargaSatuanInput.value) || 0;
    const dp = parseFloat(dpInput.value) || 0;
    const nominal = qty * price;
    const sisa = nominal - dp;

    if (!isEditMode) {
      const inputDate = new Date(deadlineInput.value);
      inputDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (inputDate < todayDate) {
        alert(isEn ? "Deadline cannot be in the past!" : "Tanggal deadline tidak boleh sebelum hari ini!");
        return;
      }
    }

    const payload = {
      namaProyek: namaProyekInput.value,
      pelanggan: pelangganInput.value,
      wa: cleanWA,
      produk: produkInput.value,
      jumlah: qty,
      satuan: satuanInput.value,
      hargaSatuan: price,
      nominal: nominal,
      dp: dp,
      sisa: sisa,
      deadline: deadlineInput.value,
      status: statusInput.value,
      catatan: catatanInput.value,
      gdriveLink: gdriveLinkInput ? gdriveLinkInput.value.trim() : currentGDriveLink
    };
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = isEn ? 'Saving...' : 'Menyimpan...';
      let result;
      if (isEditMode) {
        result = await API.updateProyek(proyekId, payload);
      } else {
        result = await API.addProyek(payload);
        
        // Auto-insert ke Mutasi Keuangan jika ada DP
        if (result.success && dp > 0) {
          const isLunas = dp >= nominal;
          const txDesc = isLunas 
            ? `Pembayaran Lunas - ${payload.pelanggan}` 
            : `Pembayaran DP - ${payload.pelanggan}`;
            
          const txPayload = {
            tanggal: payload.tanggal || new Date().toISOString().split('T')[0],
            jenis: 'Pemasukan',
            keterangan: txDesc,
            nominal: dp
          };
          
          await API.addKeuangan(txPayload);
        }
      }
      if (result.success) {

        showToast({
          title: isEn ? "Success" : "Berhasil",
          message: isEditMode
            ? (isEn ? "Project updated successfully." : "Projek berhasil diperbarui.")
            : (isEn ? "New project added successfully." : "Projek baru berhasil ditambahkan."),
          type: "success"
        });

        setTimeout(() => {
          window.location.href = "proyek.html";
        }, 1500);

      } else {

        showToast({
          title: isEn ? "Failed" : "Gagal",
          message: result.message,
          type: "error"
        });

      }
    } catch (err) {

      console.error(err);

      showToast({
        title: "Error",
        message: isEn ? "An error occurred while saving project data." : "Terjadi kesalahan saat menyimpan data.",
        type: "error"
      });

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditMode 
        ? (isEn ? 'Save Changes' : 'Simpan Perubahan') 
        : (isEn ? 'Save Project' : 'Simpan Projek');
    }
  });
});


