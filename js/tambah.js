document.addEventListener('DOMContentLoaded', async () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
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
  const deadlineWarning = document.getElementById('deadlineWarning');
  const submitBtn = document.getElementById('submitBtn');
  // Deteksi mode Edit vs Tambah
  const urlParams = new URLSearchParams(window.location.search);
  const proyekId = urlParams.get('id');
  let isEditMode = false;
  if (proyekId) {
    isEditMode = true;
    document.getElementById('pageTitleHeader').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600"></i> <span>Edit Proyek ${proyekId}</span>`;
    document.getElementById('formTitle').textContent = `Ubah Rincian Proyek (${proyekId})`;
    document.title = `Edit Proyek ${proyekId} - Kelola ProjekBareng`;
    submitBtn.textContent = 'Simpan Perubahan';
    // Ubah sidebar active link ke Data Proyek daripada Tambah Proyek
    const sidebarAddLink = document.getElementById('sidebarAddLink');
    if (sidebarAddLink) {
      sidebarAddLink.className = 'sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100';
      sidebarAddLink.innerHTML = `<i class="fa-solid fa-circle-plus w-5"></i><span>Tambah Proyek</span>`;
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
        checkDeadline(proyek.deadline);
      } else {
        alert('Proyek tidak ditemukan!');
        window.location.href = 'proyek.html';
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengambil data proyek untuk edit');
    }
  }
  // Hitung Nominal Proyek & Sisa secara Dinamis
  const kalkulasiNominalDanSisa = () => {
    const qty = parseFloat(jumlahInput.value) || 0;
    const price = parseFloat(hargaSatuanInput.value) || 0;
    const dp = parseFloat(dpInput.value) || 0;
    const nominal = qty * price;
    const sisa = nominal - dp;
    nominalInput.value = formatRupiah(nominal);
    sisaInput.value = formatRupiah(sisa);
  };
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
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
      catatan: catatanInput.value
    };
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
      let result;
      if (isEditMode) {
        result = await API.updateProyek(proyekId, payload);
      } else {
        result = await API.addProyek(payload);
      }
      if (result.success) {
        alert(isEditMode ? 'Proyek berhasil diperbarui!' : 'Proyek baru berhasil didaftarkan!');
        window.location.href = 'proyek.html';
      } else {
        alert('Gagal menyimpan: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Proyek';
    }
  });
});
