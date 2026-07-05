let table; // Global table instance

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }

  // Set default tanggal hari ini
  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) {
    tanggalInput.value = new Date().toISOString().split('T')[0];
  }

  // Load Keuangan Data
  loadKeuanganData();

  // Form submit listener
  const form = document.getElementById('transaksiForm');
  if (form) {
    form.addEventListener('submit', handleAddTransaksi);
  }
});

// Load and calculate finance summaries
async function loadKeuanganData() {
  try {
    const listMutasi = await API.getKeuangan();

    calculateSummary(listMutasi);
    initTable(listMutasi);
  } catch (error) {
    console.error('Gagal memuat mutasi kas:', error);
    alert('Terjadi kesalahan saat mengambil riwayat keuangan.');
  }
}
// Compute total income, expenses, and current cash balance
function calculateSummary(mutasiList) {
  let totalIn = 0;
  let totalOut = 0;

  mutasiList.forEach(item => {
    const nominal = Number(item.nominal) || 0;
    if (item.jenis === 'Pemasukan') {
      totalIn += nominal;
    } else if (item.jenis === 'Pengeluaran') {
      totalOut += nominal;
    }
  });

  const saldo = totalIn - totalOut;

  document.getElementById('totalPemasukan').textContent = formatRupiah(totalIn);
  document.getElementById('totalPengeluaran').textContent = formatRupiah(totalOut);

  const saldoEl = document.getElementById('saldoBersih');
  saldoEl.textContent = formatRupiah(saldo);
  if (saldo < 0) {
    saldoEl.className = 'text-2xl font-bold text-rose-600 mt-1 block';
  } else {
    saldoEl.className = 'text-2xl font-bold text-indigo-600 mt-1 block';
  }
}

// Initialize DataTable for mutation ledger
function initTable(data) {
  if ($.fn.DataTable.isDataTable('#keuanganTable')) {
    $('#keuanganTable').DataTable().destroy();
  }

  table = $('#keuanganTable').DataTable({
    data: data,
    columns: [
      { data: 'id' },
      { data: 'tanggal' },
      {
        data: 'jenis',
        render: function (data) {
          if (data === 'Pemasukan') {
            return `<span class="inline-flex items-center text-xs font-semibold text-emerald-600"><i class="fa-solid fa-arrow-turn-down mr-1"></i> Pemasukan</span>`;
          }
          return `<span class="inline-flex items-center text-xs font-semibold text-rose-600"><i class="fa-solid fa-arrow-turn-up mr-1"></i> Pengeluaran</span>`;
        }
      },
      { data: 'keterangan' },
      {
        data: 'nominal',
        render: function (data, type, row) {
          const formatted = formatRupiah(Number(data) || 0);
          if (row.jenis === 'Pemasukan') {
            return `<span class="text-emerald-600 font-semibold">+ ${formatted}</span>`;
          }
          return `<span class="text-rose-600 font-semibold">- ${formatted}</span>`;
        }
      }
    ],
    order: [[0, 'desc']], // Urutkan transaksi terbaru
    language: {
      search: "Cari Transaksi:",
      lengthMenu: "Tampilkan _MENU_ baris",
      info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ transaksi",
      infoEmpty: "Menampilkan 0 sampai 0 dari 0 transaksi",
      infoFiltered: "(disaring dari _MAX_ total data)",
      paginate: {
        first: "Pertama",
        last: "Terakhir",
        next: "Lanjut",
        previous: "Sebelum"
      },
      zeroRecords: "Tidak ada riwayat transaksi"
    }
  });
}

function sanitize(text) {
  return String(text)
    .replace(/[<>]/g, "")
    .trim();
}

// Add transaction callback
async function handleAddTransaksi(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn.disabled) return;
  const tanggal = document.getElementById('tanggal').value;
  const jenis = document.getElementById('jenis').value;
  const keterangan = document.getElementById('keterangan').value;
  const nominal = Number(document.getElementById('nominal').value);

  const payload = {
    tanggal: tanggal.trim(),
    jenis: jenis.trim(),
    keterangan: sanitize(keterangan),
    nominal: Number(nominal)
  };

  if (!payload.tanggal) {
    alert("Tanggal wajib diisi!");
    return;
  }

  if (!payload.jenis) {
    alert("Jenis transaksi wajib dipilih!");
    return;
  }

  if (!payload.keterangan) {
    alert("Keterangan wajib diisi!");
    return;
  }

  if (!Number.isFinite(payload.nominal) || payload.nominal <= 0) {
    alert("Nominal harus lebih dari 0!");
    return;
  }
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    const res = await API.addKeuangan(payload);
    if (res.success) {
      alert('Transaksi berhasil dicatat!');

      // Reset form kecuali tanggal
      document.getElementById('transaksiForm').reset();
      document.getElementById('tanggal').value =
        new Date().toISOString().split('T')[0];

      // Muat ulang data
      await loadKeuanganData();
    } else {
      alert('Gagal menyimpan transaksi: ' + res.message);
    }
  } catch (error) {
    console.error(error);
    alert('Terjadi kesalahan saat menyimpan transaksi.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Transaksi';
  }
}

// Format Rupiah Helper
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}


