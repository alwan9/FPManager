let table; // Global table instance
let editModeId = null; // Global flag untuk mode edit
let currentKeuanganList = []; // Menyimpan list untuk referensi cepat

document.addEventListener('DOMContentLoaded', () => {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = isEn ? 'Live API (Google Sheets)' : 'Live API (Google sheets)';
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

  // Live nominal formatting preview
  const nominalInput = document.getElementById('nominal');
  const nominalPreview = document.getElementById('nominalPreview');
  if (nominalInput && nominalPreview) {
    nominalInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      nominalPreview.textContent = e.target.value ? formatRupiah(val) : '';
    });
  }
});

// Load and calculate finance summaries
async function loadKeuanganData() {
  showKeuanganSkeletons();
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  try {
    const listMutasi = await API.getKeuangan();

    currentKeuanganList = listMutasi;
    calculateSummary(listMutasi);
    initTable(listMutasi);
  } catch (error) {
    console.error('Gagal memuat mutasi kas:', error);
    alert(isEn ? 'An error occurred while fetching financial records.' : 'Terjadi kesalahan saat mengambil riwayat keuangan.');
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
// Removed incorrectly placed functions

function initTable(data) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if ($.fn.DataTable.isDataTable('#keuanganTable')) {
    $('#keuanganTable').DataTable().destroy();
  }
  $('#keuanganTable tbody').empty();

  const dtLang = isEn ? {
    search: "Search Transactions:",
    lengthMenu: "Show _MENU_ entries",
    info: "Showing _START_ to _END_ of _TOTAL_ transactions",
    infoEmpty: "Showing 0 to 0 of 0 transactions",
    infoFiltered: "(filtered from _MAX_ total records)",
    paginate: {
      first: "First",
      last: "Last",
      next: "Next",
      previous: "Previous"
    },
    zeroRecords: "No matching transactions found"
  } : {
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
  };

  table = $('#keuanganTable').DataTable({
    autoWidth: false,
    data: data,
    columns: [
      { data: 'id' },
      { data: 'tanggal' },
      {
        data: 'jenis',
        render: function (data) {
          if (data === 'Pemasukan') {
            const labelText = isEn ? 'Income' : 'Pemasukan';
            return `<span class="inline-flex items-center text-xs font-semibold text-emerald-600"><i class="fa-solid fa-arrow-turn-down mr-1"></i> ${labelText}</span>`;
          }
          const labelText = isEn ? 'Expense' : 'Pengeluaran';
          return `<span class="inline-flex items-center text-xs font-semibold text-rose-600"><i class="fa-solid fa-arrow-turn-up mr-1"></i> ${labelText}</span>`;
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
      },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data) {
          const isProjectIncome = data.jenis === 'Pemasukan' && (data.keterangan.toLowerCase().includes('pembayaran dp') || data.keterangan.toLowerCase().includes('pelunasan'));
          
          if (isProjectIncome) {
            return `
              <div class="flex space-x-1.5 justify-center">
                <button disabled class="px-2 py-1 bg-zinc-100 text-zinc-400 rounded-md text-xs font-semibold cursor-not-allowed" title="Transaksi otomatis dari proyek tidak bisa diedit">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button disabled class="px-2 py-1 bg-zinc-100 text-zinc-400 rounded-md text-xs font-semibold cursor-not-allowed" title="Transaksi otomatis dari proyek tidak bisa dihapus">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            `;
          }

          return `
            <div class="flex space-x-1.5 justify-center">
              <button onclick="editTransaksi('${data.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold" title="Edit Transaksi">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteTransaksi('${data.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold" title="Hapus Transaksi">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;
        }
      }
    ],
    order: [[0, 'desc']], // Urutkan transaksi terbaru
    language: dtLang
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
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
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
    alert(isEn ? "Date is required!" : "Tanggal wajib diisi!");
    return;
  }

  if (!payload.jenis) {
    alert(isEn ? "Transaction type is required!" : "Jenis transaksi wajib dipilih!");
    return;
  }

  if (!payload.keterangan) {
    alert(isEn ? "Description is required!" : "Keterangan wajib diisi!");
    return;
  }

  if (!Number.isFinite(payload.nominal) || payload.nominal <= 0) {
    alert(isEn ? "Amount must be greater than 0!" : "Nominal harus lebih dari 0!");
    return;
  }
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = isEn ? 'Saving...' : 'Menyimpan...';

    let res;
    if (editModeId) {
      res = await API.updateKeuangan(editModeId, payload);
    } else {
      res = await API.addKeuangan(payload);
    }

    if (res.success) {
      alert(isEn ? 'Transaction recorded successfully!' : 'Transaksi berhasil dicatat/diupdate!');

      // Reset form kecuali tanggal
      document.getElementById('transaksiForm').reset();
      const nominalPreview = document.getElementById('nominalPreview');
      if (nominalPreview) nominalPreview.textContent = '';
      document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
      
      // Reset edit mode
      editModeId = null;
      submitBtn.textContent = isEn ? 'Save Transaction' : 'Simpan Transaksi';
      const formTitle = document.querySelector('#transaksiForm').previousElementSibling.querySelector('span');
      if (formTitle) formTitle.textContent = isEn ? 'Record New Transaction' : 'Catat Transaksi Baru';

      // Muat ulang data
      await loadKeuanganData();
    } else {
      alert((isEn ? 'Failed to save transaction: ' : 'Gagal menyimpan transaksi: ') + res.message);
      submitBtn.textContent = editModeId ? (isEn ? 'Update Transaction' : 'Update Transaksi') : (isEn ? 'Save Transaction' : 'Simpan Transaksi');
    }
  } catch (error) {
    console.error(error);
    alert(isEn ? 'An error occurred while saving transaction.' : 'Terjadi kesalahan saat menyimpan transaksi.');
    submitBtn.textContent = editModeId ? (isEn ? 'Update Transaction' : 'Update Transaksi') : (isEn ? 'Save Transaction' : 'Simpan Transaksi');
  } finally {
    submitBtn.disabled = false;
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

function editTransaksi(id) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const tx = currentKeuanganList.find(k => k.id === id);
  if (!tx) return;

  editModeId = tx.id;
  document.getElementById('tanggal').value = tx.tanggal;
  document.getElementById('jenis').value = tx.jenis;
  document.getElementById('keterangan').value = tx.keterangan;
  const cleanNominal = String(tx.nominal).replace(/[^0-9]/g, '');
  document.getElementById('nominal').value = cleanNominal;
  
  const nominalPreview = document.getElementById('nominalPreview');
  if (nominalPreview) nominalPreview.textContent = formatRupiah(tx.nominal);

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.textContent = isEn ? 'Update Transaction' : 'Update Transaksi';
  const formTitle = document.querySelector('#transaksiForm').previousElementSibling.querySelector('span');
  if (formTitle) formTitle.textContent = isEn ? 'Edit Transaction' : 'Edit Transaksi';

  // Scroll to form
  document.querySelector('#transaksiForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteTransaksi(id) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (!confirm(isEn ? 'Are you sure you want to delete this transaction?' : 'Yakin ingin menghapus transaksi ini?')) return;
  
  try {
    const res = await API.deleteKeuangan(id);
    if (res.success) {
      showToast({
        title: isEn ? "Success" : "Berhasil",
        message: isEn ? "Transaction deleted successfully." : "Transaksi berhasil dihapus.",
        type: "success"
      });
      await loadKeuanganData();
    } else {
      showToast({
        title: isEn ? "Failed" : "Gagal",
        message: res.message,
        type: "error"
      });
    }
  } catch (error) {
    console.error(error);
    showToast({
        title: isEn ? "Error" : "Error",
        message: isEn ? "Failed to delete transaction." : "Terjadi kesalahan saat menghapus transaksi.",
        type: "error"
    });
  }
}

function showKeuanganSkeletons() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');

  const skeletonText = '<div class="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mt-1"></div>';
  
  document.getElementById('totalPemasukan').innerHTML = skeletonText;
  document.getElementById('totalPengeluaran').innerHTML = skeletonText;
  document.getElementById('saldoBersih').innerHTML = skeletonText;
  
  const tbody = document.querySelector('#keuanganTable tbody');
  if (tbody) {
    tbody.innerHTML = Array(5).fill(`
      <tr class="border-b border-zinc-100 bg-white animate-pulse">
        <td class="p-4"><div class="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div></td>
        <td class="p-4"><div class="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
      </tr>
    `).join('');
  }
}
