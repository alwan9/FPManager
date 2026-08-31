let table; // Global table instance
let editModeId = null; // Global flag untuk mode edit
let currentKeuanganList = []; // Menyimpan list untuk referensi cepat

document.addEventListener('DOMContentLoaded', () => {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.textContent = 'Live Google Sheets';
    apiStatusBadge.className = 'hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
  }

  // Set default tanggal hari ini
  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) {
    const todayStr = new Date().toISOString().split('T')[0];
    tanggalInput.value = todayStr;
    tanggalInput.min = todayStr;
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
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('keuangan:read')) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (keuangan:read) untuk melihat modul keuangan.</p>
        </div>
      `;
    }
    return;
  }
  showKeuanganSkeletons();
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  try {
    let listMutasi = await API.getKeuangan();
    currentKeuanganList = listMutasi || [];
    calculateSummary(currentKeuanganList);
    initTable(currentKeuanganList);
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
      {
        data: null,
        orderable: false,
        className: 'text-center',
        width: '40px',
        render: function (data) {
          return `<input type="checkbox" value="${data.id}" class="keuangan-checkbox rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer">`;
        }
      },
      {
        data: 'id',
        className: 'font-mono text-xs',
        render: function (data, type, row) {
          const ket = String(row && row.keterangan || '');
          const match = ket.match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || String(data || '').match(/PRJ-\d+[-a-zA-Z0-9_]*/i);
          if (match) {
            const prjId = match[0];
            return `<a href="tambah-proyek.html?id=${encodeURIComponent(prjId)}" class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors inline-block" title="Buka Detail / Edit Projek">${escapeHtml(prjId)}</a>`;
          }
          const displayId = data || '-';
          return `<span class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">${escapeHtml(displayId)}</span>`;
        }
      },
      {
        data: 'userId',
        defaultContent: 'USR-001',
        render: function (data) {
          const uid = data || 'USR-001';
          return `<span class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">${uid}</span>`;
        }
      },
      { data: 'tanggal' },
      {
        data: 'jenis',
        render: function (data) {
          if (data === 'Pemasukan') {
            const labelText = isEn ? 'Income' : 'Pemasukan';
            return `<span class="inline-flex items-center text-xs font-semibold text-green-600"><i class="fa-solid fa-arrow-turn-down mr-1"></i> ${labelText}</span>`;
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
            return `<span class="text-green-600 font-semibold">+ ${formatted}</span>`;
          }
          return `<span class="text-rose-600 font-semibold">- ${formatted}</span>`;
        }
      },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: function (data) {
          const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
          const isSuperAdmin = currUser && (
            currUser.username === 'wansmin' ||
            (currUser.role || '').toLowerCase().includes('super_admin') ||
            (currUser.role || '').toLowerCase().includes('superadmin') ||
            (currUser.role || '').toLowerCase().includes('admin')
          );

          const isProjectIncome = data.jenis === 'Pemasukan' && (
            data.keterangan.toLowerCase().includes('pembayaran dp') ||
            data.keterangan.toLowerCase().includes('pelunasan')
          );

          const canUpdate = isSuperAdmin || (typeof Auth === 'undefined' || Auth.hasPermission('keuangan:update'));
          const canDelete = isSuperAdmin || (typeof Auth === 'undefined' || Auth.hasPermission('keuangan:delete'));

          // For automated project income:
          // Super Admin CAN delete it to manage and clean transactions.
          // Non-super-admins see disabled button with informative tooltip.
          if (isProjectIncome && !isSuperAdmin) {
            return `
              <div class="flex space-x-1.5 justify-center">
                <button disabled class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-md text-xs font-semibold cursor-not-allowed" title="Transaksi otomatis proyek tidak bisa diedit">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button disabled class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-md text-xs font-semibold cursor-not-allowed" title="Hanya Super Admin yang dapat menghapus transaksi otomatis proyek">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            `;
          }

          return `
            <div class="flex space-x-1.5 justify-center">
              ${canUpdate ? `
              <button onclick="editTransaksi('${data.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors" title="Edit Transaksi">
                <i class="fa-solid fa-pen"></i>
              </button>
              ` : ''}
              ${canDelete ? `
              <button onclick="deleteTransaksi('${data.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors" title="${isProjectIncome ? 'Hapus Transaksi Proyek (Super Admin)' : 'Hapus Transaksi'}">
                <i class="fa-solid fa-trash"></i>
              </button>
              ` : ''}
            </div>
          `;
        }
      }
    ],
    order: [[1, 'desc']], // Urutkan transaksi terbaru berdasarkan ID
    language: dtLang
  });

  // Reset bulk delete button and select-all state on table reload
  const selectAllCb = document.getElementById('selectAllKeuangan');
  if (selectAllCb) selectAllCb.checked = false;
  updateBulkDeleteKeuanganButton();
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
  const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  const isSuperAdmin = currUser && (
    currUser.username === 'wansmin' ||
    (currUser.role || '').toLowerCase().includes('super_admin') ||
    (currUser.role || '').toLowerCase().includes('superadmin') ||
    (currUser.role || '').toLowerCase().includes('admin')
  );

  const requiredPerm = editModeId ? 'keuangan:update' : 'keuangan:create';
  if (!isSuperAdmin && typeof Auth !== 'undefined' && !Auth.hasPermission(requiredPerm)) {
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Access Denied" : "Akses Ditolak", isEn ? "You do not have permission to manage finances." : "Anda tidak memiliki izin untuk mengelola Keuangan.");
    } else {
      alert(isEn ? "Access Denied: You do not have permission to manage finances." : "Akses Ditolak: Anda tidak memiliki izin untuk mengelola Keuangan.");
    }
    return;
  }
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  const origBtnText = submitBtn.textContent;
  submitBtn.textContent = isEn ? 'Saving...' : 'Menyimpan...';

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

  const resetSubmitBtn = () => {
    submitBtn.disabled = false;
    submitBtn.textContent = origBtnText;
  };

  if (!payload.tanggal) {
    alert(isEn ? "Date is required!" : "Tanggal wajib diisi!");
    resetSubmitBtn();
    return;
  }

  const inputDate = new Date(payload.tanggal);
  inputDate.setHours(0,0,0,0);
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  if (!editModeId && inputDate < todayDate) {
    alert(isEn ? "Transaction date cannot be in the past!" : "Tanggal transaksi tidak boleh sebelum hari ini!");
    resetSubmitBtn();
    return;
  }

  if (!payload.jenis) {
    alert(isEn ? "Transaction type is required!" : "Jenis transaksi wajib dipilih!");
    resetSubmitBtn();
    return;
  }

  if (!payload.keterangan) {
    alert(isEn ? "Description is required!" : "Keterangan wajib diisi!");
    resetSubmitBtn();
    return;
  }

  if (!Number.isFinite(payload.nominal) || payload.nominal <= 0) {
    alert(isEn ? "Amount must be greater than 0!" : "Nominal harus lebih dari 0!");
    resetSubmitBtn();
    return;
  }

  if (payload.jenis === 'Pengeluaran') {
    let totalIn = 0;
    let totalOut = 0;
    currentKeuanganList.forEach(item => {
      if (editModeId && item.id === editModeId) return;
      const n = Number(item.nominal) || 0;
      if (item.jenis === 'Pemasukan') totalIn += n;
      else if (item.jenis === 'Pengeluaran') totalOut += n;
    });
    const currentSaldo = totalIn - totalOut;

    if (payload.nominal > currentSaldo) {
      alert(isEn ? `Expense cannot exceed available balance (${formatRupiah(currentSaldo)})!` : `Pengeluaran tidak boleh melebihi saldo yang tersedia (${formatRupiah(currentSaldo)})!`);
      resetSubmitBtn();
      return;
    }
  }

  try {
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
      
      const todayStr = new Date().toISOString().split('T')[0];
      document.getElementById('tanggal').value = todayStr;
      document.getElementById('tanggal').min = todayStr;
      
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
  const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  const isSuperAdmin = currUser && (
    currUser.username === 'wansmin' ||
    (currUser.role || '').toLowerCase().includes('super_admin') ||
    (currUser.role || '').toLowerCase().includes('superadmin') ||
    (currUser.role || '').toLowerCase().includes('admin')
  );

  if (!isSuperAdmin && typeof Auth !== 'undefined' && !Auth.hasPermission('keuangan:update')) {
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Access Denied" : "Akses Ditolak", isEn ? "You do not have permission to edit financial records." : "Anda tidak memiliki izin untuk mengedit data Keuangan.");
    } else {
      alert(isEn ? "Access Denied: You do not have permission to edit financial records." : "Akses Ditolak: Anda tidak memiliki izin untuk mengedit data Keuangan.");
    }
    return;
  }

  const tx = currentKeuanganList.find(k => String(k.id) === String(id));
  if (!tx) return;

  editModeId = tx.id;
  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) {
    tanggalInput.removeAttribute('min');
    tanggalInput.value = tx.tanggal;
  }
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
  const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  const isSuperAdmin = currUser && (
    currUser.username === 'wansmin' ||
    (currUser.role || '').toLowerCase().includes('super_admin') ||
    (currUser.role || '').toLowerCase().includes('superadmin') ||
    (currUser.role || '').toLowerCase().includes('admin')
  );

  if (!isSuperAdmin && typeof Auth !== 'undefined' && !Auth.hasPermission('keuangan:delete')) {
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Access Denied" : "Akses Ditolak", isEn ? "You do not have permission to delete financial records." : "Anda tidak memiliki izin untuk menghapus data Keuangan.");
    } else {
      alert(isEn ? "Access Denied: You do not have permission to delete financial records." : "Akses Ditolak: Anda tidak memiliki izin untuk menghapus data Keuangan.");
    }
    return;
  }

  const tx = currentKeuanganList.find(k => String(k.id) === String(id));
  const desc = tx ? tx.keterangan : id;
  const confirmMsg = isEn
    ? `Are you sure you want to delete transaction "${desc}"?`
    : `Yakin ingin menghapus transaksi "${desc}"?`;

  if (!confirm(confirmMsg)) return;

  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const res = await API.deleteKeuangan(id);
    if (loader) loader.classList.add('hidden');

    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Berhasil" : "Berhasil", isEn ? "Transaction deleted successfully." : "Transaksi berhasil dihapus.");
      } else {
        alert(isEn ? "Transaction deleted successfully." : "Transaksi berhasil dihapus.");
      }
      await loadKeuanganData();
    } else {
      const errMsg = res ? res.message : (isEn ? "Failed to delete transaction." : "Gagal menghapus transaksi.");
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Gagal" : "Gagal", errMsg);
      } else {
        alert(errMsg);
      }
    }
  } catch (error) {
    if (loader) loader.classList.add('hidden');
    console.error('Delete transaction error:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Error" : "Error", isEn ? "Failed to delete transaction." : "Terjadi kesalahan saat menghapus transaksi.");
    } else {
      alert(isEn ? "Failed to delete transaction." : "Terjadi kesalahan saat menghapus transaksi.");
    }
  }
}

// ===================================
// BATCH / BULK DELETE KEUANGAN
// ===================================

// Handle Select/Deselect All Checkbox
$(document).on('change', '#selectAllKeuangan', function () {
  const isChecked = this.checked;
  $('.keuangan-checkbox').prop('checked', isChecked);
  updateBulkDeleteKeuanganButton();
});

// Handle Individual Checkbox
$(document).on('change', '.keuangan-checkbox', function () {
  const total = $('.keuangan-checkbox').length;
  const checked = $('.keuangan-checkbox:checked').length;
  $('#selectAllKeuangan').prop('checked', total > 0 && total === checked);
  updateBulkDeleteKeuanganButton();
});

function updateBulkDeleteKeuanganButton() {
  const checkedBoxes = $('.keuangan-checkbox:checked');
  const count = checkedBoxes.length;
  const btn = document.getElementById('btnBulkDeleteKeuangan');
  const countEl = document.getElementById('selectedKeuanganCount');

  if (btn && countEl) {
    countEl.textContent = count;
    if (count > 0) {
      btn.classList.remove('hidden');
      btn.disabled = false;
    } else {
      btn.classList.add('hidden');
      btn.disabled = true;
    }
  }
}

async function bulkDeleteKeuangan() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  const isSuperAdmin = currUser && (
    currUser.username === 'wansmin' ||
    (currUser.role || '').toLowerCase().includes('super_admin') ||
    (currUser.role || '').toLowerCase().includes('superadmin') ||
    (currUser.role || '').toLowerCase().includes('admin')
  );

  if (!isSuperAdmin && typeof Auth !== 'undefined' && !Auth.hasPermission('keuangan:delete')) {
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Access Denied" : "Akses Ditolak", isEn ? "You do not have permission to delete financial records." : "Anda tidak memiliki izin untuk menghapus data Keuangan.");
    } else {
      alert(isEn ? "Access Denied: You do not have permission to delete financial records." : "Akses Ditolak: Anda tidak memiliki izin untuk menghapus data Keuangan.");
    }
    return;
  }

  const checkedBoxes = $('.keuangan-checkbox:checked');
  const ids = [];
  checkedBoxes.each(function () {
    ids.push($(this).val());
  });

  if (ids.length === 0) return;

  const confirmMsg = isEn
    ? `Are you sure you want to delete ${ids.length} selected financial transactions? This action cannot be undone.`
    : `Apakah Anda yakin ingin menghapus ${ids.length} transaksi keuangan terpilih? Tindakan ini tidak dapat dibatalkan.`;

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnBulkDeleteKeuangan');
  const loader = document.getElementById('globalLoader');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-1.5"></i> ${isEn ? 'Deleting...' : 'Menghapus...'}`;
  }
  if (loader) loader.classList.remove('hidden');

  try {
    const res = await API.deleteKeuangan(ids);
    if (loader) loader.classList.add('hidden');

    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Berhasil" : "Berhasil", isEn ? `${ids.length} transactions deleted successfully.` : `${ids.length} transaksi keuangan berhasil dihapus.`);
      } else {
        alert(isEn ? `${ids.length} transactions deleted successfully.` : `${ids.length} transaksi keuangan berhasil dihapus.`);
      }
      await loadKeuanganData();
    } else {
      const errMsg = res ? res.message : (isEn ? "Failed to delete selected transactions." : "Gagal menghapus transaksi terpilih.");
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Gagal" : "Gagal", errMsg);
      } else {
        alert(errMsg);
      }
    }
  } catch (error) {
    if (loader) loader.classList.add('hidden');
    console.error('Bulk delete keuangan error:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Error" : "Error", isEn ? "Failed to delete selected transactions." : "Terjadi kesalahan saat menghapus transaksi terpilih.");
    } else {
      alert(isEn ? "Failed to delete selected transactions." : "Terjadi kesalahan saat menghapus transaksi terpilih.");
    }
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-trash-can mr-1.5"></i><span>Hapus Terpilih (<span id="selectedKeuanganCount">0</span>)</span>`;
      btn.disabled = true;
      btn.classList.add('hidden');
    }
    const selectAllCb = document.getElementById('selectAllKeuangan');
    if (selectAllCb) selectAllCb.checked = false;
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
      <tr class="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
        <td class="p-4 text-center"><div class="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
        <td class="p-4"><div class="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div></td>
        <td class="p-4"><div class="h-4 w-36 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-6 w-14 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
      </tr>
    `).join('');
  }
}
