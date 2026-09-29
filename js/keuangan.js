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
    currentKeuanganList = consolidateKeuanganList(listMutasi || []);
    calculateSummary(currentKeuanganList);
    initTable(currentKeuanganList);
  } catch (error) {
    console.error('Gagal memuat mutasi kas:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? 'Error' : 'Gagal', isEn ? 'An error occurred while fetching financial records.' : 'Terjadi kesalahan saat mengambil riwayat keuangan.');
    }
  }
}

// Helper: Normalisasi nama akun pembayaran
function normalizePaymentMethod(rawMetode, fallbackSumber) {
  const m = String(rawMetode || '').trim().toLowerCase();
  const s = String(fallbackSumber || '').trim().toLowerCase();

  if (m.includes('shopee') || s.includes('shopee')) return 'Shopee';
  if (m.includes('qris')) return 'QRIS';
  if (m.includes('fiverr') || s.includes('fiverr')) return 'Fiverr';
  if (m.includes('paypal') || s.includes('paypal')) return 'PayPal';
  if (m.includes('bca') || m.includes('bank') || m.includes('transfer') || m.includes('mandiri') || m.includes('bri') || m.includes('bni')) return 'Transfer Bank';
  if (m.includes('tunai') || m.includes('cash')) return 'Tunai';
  if (rawMetode && String(rawMetode).trim()) return String(rawMetode).trim();
  if (s.includes('shopee')) return 'Shopee';
  if (s.includes('fiverr')) return 'Fiverr';
  return 'QRIS';
}

// Mengelompokkan transaksi berbasis ID Projek sehingga 1 projek = 1 baris
function consolidateKeuanganList(list) {
  if (!Array.isArray(list)) return [];
  const projectMap = new Map();
  const result = [];

  list.forEach(item => {
    if (!item) return;
    const ket = String(item.keterangan || '');
    const match = ket.match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || String(item.id || '').match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || (item.idProyek ? String(item.idProyek).match(/PRJ-\d+[-a-zA-Z0-9_]*/i) : null);
    const prjId = match ? match[0] : (item.idProyek ? String(item.idProyek) : '');

    // Jika tertaut ke ID Projek dan bertipe Pemasukan
    if (prjId && item.jenis === 'Pemasukan') {
      if (projectMap.has(prjId)) {
        const existing = projectMap.get(prjId);
        const exTotal = Number(existing.totalProyek) || Number(existing.nominal) || 0;
        const curTotal = Number(item.totalProyek) || Number(item.nominal) || 0;
        const finalTotal = Math.max(exTotal, curTotal);

        const exDp = Number(existing.dp) || 0;
        const curDp = Number(item.dp) || 0;
        const finalDp = Math.max(exDp, curDp);

        const exPelunasan = Number(existing.pelunasan) || 0;
        const curPelunasan = Number(item.pelunasan) || 0;
        const finalPelunasan = Math.max(exPelunasan, curPelunasan);

        const isLunas = String(item.statusPembayaran || '').toLowerCase().includes('lunas') || String(existing.statusPembayaran || '').toLowerCase().includes('lunas') || (finalDp + finalPelunasan >= finalTotal && finalTotal > 0);
        const finalSisa = isLunas ? 0 : Math.max(0, finalTotal - finalDp - finalPelunasan);
        const finalStatus = isLunas ? 'Lunas' : (finalDp > 0 ? 'DP' : 'Belum');

        existing.totalProyek = finalTotal;
        existing.dp = finalDp;
        existing.pelunasan = finalPelunasan;
        existing.sisa = finalSisa;
        existing.statusPembayaran = finalStatus;
        existing.nominal = isLunas ? (finalPelunasan > 0 && finalDp < finalTotal ? finalPelunasan : finalTotal) : finalDp;
        if (item.catatanPelunasan) existing.catatanPelunasan = item.catatanPelunasan;
        if (item.metodeBayarDp) existing.metodeBayarDp = item.metodeBayarDp;
        if (item.metodeBayarPelunasan) existing.metodeBayarPelunasan = item.metodeBayarPelunasan;
        if (item.metodePembayaran) existing.metodePembayaran = item.metodePembayaran;
        if (item.sumber) existing.sumber = item.sumber;
        if (item.tanggal) existing.tanggal = item.tanggal;
      } else {
        const total = Number(item.totalProyek) || Number(item.nominal) || 0;
        const dp = Number(item.dp !== undefined ? item.dp : (String(item.statusPembayaran || '').toLowerCase() === 'belum' ? 0 : item.nominal)) || 0;
        const pelunasan = Number(item.pelunasan) || 0;
        const isLunas = String(item.statusPembayaran || '').toLowerCase().includes('lunas') || ((dp + pelunasan) >= total && total > 0);
        const sisa = isLunas ? 0 : (item.sisa !== undefined ? Number(item.sisa) : Math.max(0, total - dp - pelunasan));
        const status = isLunas ? 'Lunas' : (dp > 0 ? 'DP' : 'Belum');

        const consolidated = {
          ...item,
          idProyek: prjId,
          totalProyek: total,
          dp: dp,
          pelunasan: pelunasan,
          sisa: sisa,
          statusPembayaran: status,
          nominal: isLunas ? (pelunasan > 0 && dp < total ? pelunasan : total) : dp,
          catatanPelunasan: item.catatanPelunasan || '',
          metodeBayarDp: item.metodeBayarDp || item.metodePembayaran || '',
          metodeBayarPelunasan: item.metodeBayarPelunasan || item.metodePembayaran || '',
          sumber: item.sumber || ''
        };
        projectMap.set(prjId, consolidated);
        result.push(consolidated);
      }
    } else {
      result.push(item);
    }
  });

  return result;
}

// Compute total income, expenses, current cash balance, and account group breakdowns
function calculateSummary(mutasiList) {
  let totalIn = 0;
  let totalOut = 0;

  // Pre-configured payment accounts map
  const accountsMap = {
    'Shopee': { name: 'Shopee', group: 'market', groupName: 'Marketplace', type: 'Marketplace', number: '@premium_dz', holder: 'Toko Shopee', icon: 'fa-solid fa-bag-shopping text-orange-500', bgClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800', totalIn: 0, totalOut: 0, txCount: 0 },
    'QRIS': { name: 'QRIS', group: 'ewallet', groupName: 'QRIS & E-Wallet', type: 'QRIS', number: 'All Payment', holder: 'Hafiz Alwan', icon: 'fa-solid fa-qrcode text-indigo-500', bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', totalIn: 0, totalOut: 0, txCount: 0 }
  };

  function ensureAccountExists(key) {
    if (!accountsMap[key]) {
      const kLower = key.toLowerCase();
      const isMarket = kLower.includes('shopee') || kLower.includes('fiverr') || kLower.includes('paypal');
      accountsMap[key] = {
        name: key,
        group: isMarket ? 'market' : 'ewallet',
        groupName: isMarket ? 'Marketplace' : 'QRIS & Bank',
        type: isMarket ? 'Platform' : 'Rekening',
        number: '-',
        holder: 'Hafiz Alwan',
        icon: isMarket ? 'fa-solid fa-globe text-orange-500' : 'fa-solid fa-credit-card text-indigo-500',
        bgClass: isMarket ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        totalIn: 0,
        totalOut: 0,
        txCount: 0
      };
    }
    return accountsMap[key];
  }

  mutasiList.forEach(item => {
    if (!item) return;

    if (item.jenis === 'Pemasukan') {
      const st = String(item.statusPembayaran || '').toLowerCase();
      const isLunas = st.includes('lunas');
      const isUnpaid = st === 'belum';
      const total = Number(item.totalProyek) || Number(item.nominal) || 0;
      const dpVal = Number(item.dp !== undefined ? item.dp : (isUnpaid ? 0 : item.nominal)) || 0;
      const pelunasanVal = Number(item.pelunasan) || 0;
      const nominal = Number(item.nominal) || 0;

      let dpIn = 0;
      let pelunasanIn = 0;

      if (isLunas) {
        if (dpVal > 0 && pelunasanVal > 0) {
          dpIn = dpVal;
          pelunasanIn = pelunasanVal;
        } else if (dpVal > 0 && pelunasanVal === 0) {
          dpIn = dpVal;
          pelunasanIn = Math.max(0, total - dpVal);
        } else {
          dpIn = total > 0 ? total : nominal;
          pelunasanIn = 0;
        }
      } else if (!isUnpaid) {
        dpIn = dpVal > 0 ? dpVal : nominal;
        pelunasanIn = 0;
      }

      // 1. Alokasi DP ke akun metode pembayaran DP yang sesuai (Shopee, QRIS, dll)
      if (dpIn > 0) {
        const dpMethodKey = normalizePaymentMethod(item.metodeBayarDp || item.metodePembayaran, item.sumber);
        const acc = ensureAccountExists(dpMethodKey);
        acc.totalIn += dpIn;
        acc.txCount += 1;
        totalIn += dpIn;
      }

      // 2. Alokasi Pelunasan ke akun metode pembayaran Pelunasan yang sesuai
      if (pelunasanIn > 0) {
        const pelMethodKey = normalizePaymentMethod(item.metodeBayarPelunasan || item.metodePembayaran || item.metodeBayarDp, item.sumber);
        const acc = ensureAccountExists(pelMethodKey);
        acc.totalIn += pelunasanIn;
        acc.txCount += 1;
        totalIn += pelunasanIn;
      }

    } else if (item.jenis === 'Pengeluaran') {
      const outVal = Number(item.nominal) || 0;
      const outMethodKey = normalizePaymentMethod(item.metodePembayaran || item.metode, item.sumber);
      const acc = ensureAccountExists(outMethodKey);
      acc.totalOut += outVal;
      acc.txCount += 1;
      totalOut += outVal;
    }
  });

  const saldo = totalIn - totalOut;

  document.getElementById('totalPemasukan').textContent = formatRupiah(totalIn);
  document.getElementById('totalPengeluaran').textContent = formatRupiah(totalOut);

  const saldoEl = document.getElementById('saldoBersih');
  saldoEl.textContent = formatRupiah(saldo);
  if (saldo < 0) {
    saldoEl.className = 'text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block';
  } else {
    saldoEl.className = 'text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block';
  }

  // Render Category Groups and Account Breakdown
  renderWalletBreakdown(accountsMap);
}

// Render dynamic group distribution (Simple & Compact Overview)
function renderWalletBreakdown(accountsMap) {
  const accountKeys = Object.keys(accountsMap);
  let groupTotals = {
    ewallet: { totalSaldo: 0, totalIn: 0, totalOut: 0, count: 0, accounts: [] },
    market: { totalSaldo: 0, totalIn: 0, totalOut: 0, count: 0, accounts: [] }
  };

  accountKeys.forEach(key => {
    const acc = accountsMap[key];
    const netSaldo = acc.totalIn - acc.totalOut;
    const grp = (acc.group === 'market' || key === 'Shopee') ? 'market' : 'ewallet';
    const hasActivityOrBalance = netSaldo !== 0 || acc.totalIn > 0 || acc.totalOut > 0 || acc.txCount > 0;

    if (groupTotals[grp]) {
      groupTotals[grp].totalSaldo += netSaldo;
      groupTotals[grp].totalIn += acc.totalIn;
      groupTotals[grp].totalOut += acc.totalOut;
      if (hasActivityOrBalance) {
        groupTotals[grp].count += 1;
        groupTotals[grp].accounts.push({ key, ...acc, netSaldo });
      }
    }
  });

  // Update Group 1: QRIS
  const ewalletEl = document.getElementById('totalSaldoEwallet');
  if (ewalletEl) ewalletEl.textContent = formatRupiah(groupTotals.ewallet.totalSaldo);
  const ewalletBadge = document.getElementById('ewalletCountBadge');
  if (ewalletBadge) {
    const qrisAcc = accountsMap['QRIS'];
    ewalletBadge.textContent = `${qrisAcc ? qrisAcc.txCount : 0} Transaksi`;
  }
  const ewalletList = document.getElementById('ewalletMiniList');
  if (ewalletList) {
    if (groupTotals.ewallet.accounts.length > 0) {
      ewalletList.innerHTML = groupTotals.ewallet.accounts.map(acc => `
        <div class="flex items-center justify-between py-1 px-1.5 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 transition ${currentWalletFilter === acc.key ? 'bg-indigo-100 dark:bg-indigo-900/60 font-semibold' : ''}" onclick="filterTableByWallet('${escapeHtml(acc.key)}')" title="Klik untuk filter transaksi ${escapeHtml(acc.name)}">
          <span class="flex items-center gap-1.5 truncate">
            <i class="${acc.icon} text-[10px]"></i>
            <span class="truncate">${escapeHtml(acc.name)}</span>
          </span>
          <span class="font-bold font-mono ${acc.netSaldo < 0 ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'}">${formatRupiah(acc.netSaldo)}</span>
        </div>
      `).join('');
    } else {
      ewalletList.innerHTML = `<div class="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-1">Belum ada saldo</div>`;
    }
  }

  // Update Group 2: Shopee (Marketplace)
  const marketEl = document.getElementById('totalSaldoMarket');
  if (marketEl) marketEl.textContent = formatRupiah(groupTotals.market.totalSaldo);
  const marketBadge = document.getElementById('marketCountBadge');
  if (marketBadge) {
    const shopeeAcc = accountsMap['Shopee'];
    marketBadge.textContent = `${shopeeAcc ? shopeeAcc.txCount : 0} Transaksi`;
  }
  const marketList = document.getElementById('marketMiniList');
  if (marketList) {
    if (groupTotals.market.accounts.length > 0) {
      marketList.innerHTML = groupTotals.market.accounts.map(acc => `
        <div class="flex items-center justify-between py-1 px-1.5 rounded-lg cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/40 text-zinc-700 dark:text-zinc-300 transition ${currentWalletFilter === acc.key ? 'bg-orange-100 dark:bg-orange-900/60 font-semibold' : ''}" onclick="filterTableByWallet('${escapeHtml(acc.key)}')" title="Klik untuk filter transaksi ${escapeHtml(acc.name)}">
          <span class="flex items-center gap-1.5 truncate">
            <i class="${acc.icon} text-[10px]"></i>
            <span class="truncate">${escapeHtml(acc.name)}</span>
          </span>
          <span class="font-bold font-mono ${acc.netSaldo < 0 ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'}">${formatRupiah(acc.netSaldo)}</span>
        </div>
      `).join('');
    } else {
      marketList.innerHTML = `<div class="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-1">Belum ada saldo</div>`;
    }
  }
}

// Global Wallet Filter State
let currentWalletFilter = null;

function filterTableByWallet(walletKey) {
  if (!table) return;
  if (currentWalletFilter === walletKey) {
    clearWalletFilter();
    return;
  }
  currentWalletFilter = walletKey;

  // Column index 6 is 'Metode Pembayaran'
  table.column(6).search(walletKey).draw();

  const filterBadge = document.getElementById('activeWalletFilterBadge');
  const filterName = document.getElementById('activeWalletFilterName');
  if (filterBadge && filterName) {
    filterName.textContent = walletKey;
    filterBadge.classList.remove('hidden');
    filterBadge.classList.add('flex');
  }

  document.querySelectorAll('.wallet-card-item').forEach(card => {
    if (card.dataset.walletKey === walletKey) {
      card.classList.add('ring-2', 'ring-indigo-500', 'shadow-md');
    } else {
      card.classList.remove('ring-2', 'ring-indigo-500', 'shadow-md');
    }
  });

  if (typeof Toast !== 'undefined') {
    Toast.info('Filter Akun', `Menampilkan mutasi untuk: ${walletKey}`);
  }

  const tblContainer = document.getElementById('keuanganTable');
  if (tblContainer) {
    tblContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearWalletFilter() {
  currentWalletFilter = null;
  if (table) {
    table.column(6).search('').draw();
  }
  const filterBadge = document.getElementById('activeWalletFilterBadge');
  if (filterBadge) {
    filterBadge.classList.add('hidden');
    filterBadge.classList.remove('flex');
  }
  document.querySelectorAll('.wallet-card-item').forEach(card => {
    card.classList.remove('ring-2', 'ring-indigo-500', 'shadow-md');
  });

  if (typeof Toast !== 'undefined') {
    Toast.info('Filter Direset', 'Menampilkan seluruh riwayat transaksi.');
  }
}
window.filterTableByWallet = filterTableByWallet;
window.clearWalletFilter = clearWalletFilter;

// Initialize DataTable for mutation ledger
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
          const match = ket.match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || String(data || '').match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || (row && row.idProyek ? String(row.idProyek).match(/PRJ-\d+[-a-zA-Z0-9_]*/i) : null);
          const prjId = match ? match[0] : (row && row.idProyek ? row.idProyek : '');
          const uid = (row && row.userId) || 'USR-001';

          let prjBadge = '';
          if (prjId) {
            prjBadge = `<a href="tambah-proyek.html?id=${encodeURIComponent(prjId)}" class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors inline-block" title="Buka Detail / Edit Projek">${escapeHtml(prjId)}</a>`;
          } else {
            prjBadge = `<span class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">${escapeHtml(data || '-')}</span>`;
          }

          const userBadge = `<div class="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 font-mono"><i class="fa-solid fa-user-circle text-[10px]"></i><span>${escapeHtml(uid)}</span></div>`;

          return `<div>${prjBadge}${userBadge}</div>`;
        }
      },
      { data: 'tanggal' },
      {
        data: 'keterangan',
        render: function (data, type, row) {
          const isExpense = row.jenis === 'Pengeluaran';
          const icon = isExpense ? '<i class="fa-solid fa-arrow-turn-up text-rose-500 mr-1.5"></i>' : '<i class="fa-solid fa-arrow-turn-down text-emerald-500 mr-1.5"></i>';
          const noteHtml = row.catatanPelunasan ? `<div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 font-medium"><i class="fa-solid fa-receipt text-[10px] text-indigo-500"></i><span>${escapeHtml(row.catatanPelunasan)}</span></div>` : '';
          return `<div><div class="font-medium text-zinc-800 dark:text-zinc-200">${icon}${escapeHtml(data || '')}</div>${noteHtml}</div>`;
        }
      },
      {
        data: null,
        render: function (data, type, row) {
          if (row.jenis === 'Pengeluaran') {
            return `
              <div>
                <div class="font-bold text-rose-600 dark:text-rose-400">- ${formatRupiah(Number(row.nominal) || 0)}</div>
                <div class="text-[11px] text-zinc-400 font-medium">Kas Keluar</div>
              </div>
            `;
          }

          const total = Number(row.totalProyek) || Number(row.nominal) || 0;
          const st = String(row.statusPembayaran || '').toLowerCase();
          const dpVal = Number(row.dp !== undefined ? row.dp : (st === 'belum' ? 0 : row.nominal)) || 0;
          const isDpPaid = dpVal > 0;

          return `
            <div class="flex items-center gap-2 whitespace-nowrap">
              <span class="font-semibold text-xs min-w-[70px] ${isDpPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}">
                ${formatRupiah(dpVal)}
              </span>
              <select onchange="quickUpdateDp('${row.id}', this.value)" class="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500">
                <option value="belum" ${dpVal <= 0 ? 'selected' : ''}>🔴 Belum DP</option>
                <option value="dp_custom" ${dpVal > 0 ? 'selected' : ''}>🟡 Sudah DP</option>
              </select>
            </div>
          `;
        }
      },
      {
        data: null,
        render: function (data, type, row) {
          if (row.jenis === 'Pengeluaran') {
            return `<span class="text-zinc-400 text-xs italic">-</span>`;
          }

          const total = Number(row.totalProyek) || Number(row.nominal) || 0;
          const st = String(row.statusPembayaran || '').toLowerCase();
          const dpVal = Number(row.dp !== undefined ? row.dp : (st === 'belum' ? 0 : row.nominal)) || 0;
          const sisa = row.sisa !== undefined ? Number(row.sisa) : Math.max(0, total - dpVal);
          const isLunas = st.includes('lunas') || sisa <= 0;

          return `
            <div class="  items-center gap-2 whitespace-nowrap">
              <span class="font-semibold text-xs min-w-[70px] ${isLunas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                ${isLunas ? 'Rp0' : formatRupiah(sisa)}
              </span>
              <select onchange="quickUpdatePelunasan('${row.id}', this.value)" class="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500">
                <option value="belum_lunas" ${!isLunas ? 'selected' : ''}>🔴 Belum Lunas</option>
                <option value="lunas" ${isLunas ? 'selected' : ''}>🟢 Sudah Lunas (Rp0)</option>
                <option value="edit_sisa">📝 Ubah Sisa / Catatan...</option>
              </select>
            </div>
          `;
        }
      },
      {
        data: 'metodePembayaran',
        render: function (data, type, row) {
          const rawMetode = String(data || '').trim();
          let metode = 'Shopee';
          if (rawMetode.toLowerCase().includes('qris')) metode = 'QRIS';
          else if (rawMetode.toLowerCase().includes('shopee')) metode = 'Shopee';
          else if (rawMetode) metode = rawMetode;

          const isOther = (metode !== 'Shopee' && metode !== 'QRIS');

          return `
            <div class="flex items-center gap-1">
              <select onchange="quickUpdatePaymentMethod('${row.id}', this.value)" class="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500">
                ${isOther ? `<option value="${escapeHtml(metode)}" selected>${escapeHtml(metode)}</option>` : ''}
                <option value="Shopee" ${metode === 'Shopee' ? 'selected' : ''}>Shopee</option>
                <option value="QRIS" ${metode === 'QRIS' ? 'selected' : ''}>QRIS</option>
              </select>
              <button onclick="showPaymentAccountsModal('${metode}')" class="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition" title="Lihat & salin detail nomor rekening/e-wallet">
                <i class="fa-solid fa-circle-info"></i>
              </button>
            </div>
          `;
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
          const canUpdate = isSuperAdmin || (typeof Auth === 'undefined' || Auth.hasPermission('keuangan:update'));
          const canDelete = isSuperAdmin || (typeof Auth === 'undefined' || Auth.hasPermission('keuangan:delete'));

          return `
            <div class="flex space-x-1.5 justify-center">
              ${canUpdate ? `
              <button onclick="editTransaksi('${data.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors" title="Edit Transaksi">
                <i class="fa-solid fa-pen"></i>
              </button>
              ` : ''}
              ${canDelete ? `
              <button onclick="deleteTransaksi('${data.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors" title="Hapus Transaksi">
                <i class="fa-solid fa-trash"></i>
              </button>
              ` : ''}
            </div>
          `;
        }
      }
    ],
    order: [[2, 'desc']], // Urutkan tanggal terbaru
    language: dtLang
  });

  // Reset bulk delete button and select-all state on table reload
  const selectAllCb = document.getElementById('selectAllKeuangan');
  if (selectAllCb) selectAllCb.checked = false;
  updateBulkDeleteKeuanganButton();
}

// Quick Update DP (Inline dari Dropdown Kolom DP)
async function quickUpdateDp(id, action) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const tx = currentKeuanganList.find(k => String(k.id) === String(id));
  if (!tx) return;

  const totalNom = Number(tx.totalProyek) || Number(tx.nominal) || 0;
  const currentDp = Number(tx.dp) || 0;

  let newDp = 0;
  let newSisa = totalNom;
  let newStatus = 'Belum';

  if (action === 'belum') {
    newDp = 0;
    newSisa = totalNom;
    newStatus = 'Belum';
  } else if (action === 'dp_custom') {
    newDp = (currentDp > 0 && currentDp < totalNom) ? currentDp : Math.round(totalNom / 2);
    newSisa = Math.max(0, totalNom - newDp);
    newStatus = newDp > 0 ? 'DP' : 'Belum';
  }

  try {
    if (typeof Toast !== 'undefined') {
      Toast.info(isEn ? "Updating" : "Memperbarui", isEn ? "Updating DP..." : "Memperbarui data DP...");
    }

    const isLunas = newStatus === 'Lunas' || newSisa <= 0;
    const realCash = isLunas ? totalNom : newDp;

    const payload = {
      statusPembayaran: newStatus,
      nominal: realCash,
      dp: newDp,
      sisa: newSisa,
      totalProyek: totalNom,
      catatanPelunasan: tx.catatanPelunasan || ''
    };

    const res = await API.updateKeuangan(id, payload);
    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Success" : "Berhasil", isEn ? `DP updated to ${formatRupiah(newDp)}.` : `DP berhasil diperbarui menjadi ${formatRupiah(newDp)}.`);
      }
      await loadKeuanganData();
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Failed" : "Gagal", res ? res.message : "Gagal memperbarui DP.");
      }
      await loadKeuanganData();
    }
  } catch (err) {
    console.error("quickUpdateDp error:", err);
    await loadKeuanganData();
  }
}

// Quick Update Pelunasan (Inline dari Dropdown Kolom Pelunasan)
async function quickUpdatePelunasan(id, action) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const tx = currentKeuanganList.find(k => String(k.id) === String(id));
  if (!tx) return;

  const totalNom = Number(tx.totalProyek) || Number(tx.nominal) || 0;
  const currentDp = Number(tx.dp) || 0;
  const currentPelunasan = Number(tx.pelunasan) || 0;
  const currentSisa = tx.sisa !== undefined ? Number(tx.sisa) : Math.max(0, totalNom - currentDp - currentPelunasan);

  let newDp = currentDp;
  let newPelunasan = currentPelunasan;
  let newSisa = currentSisa;
  let newStatus = String(tx.statusPembayaran || 'Belum');
  let newCatatanPelunasan = tx.catatanPelunasan || '';

  if (action === 'lunas') {
    newPelunasan = currentPelunasan + currentSisa;
    newSisa = 0;
    newStatus = 'Lunas';

    const defaultNote = tx.catatanPelunasan || `Lunas via ${tx.metodePembayaran || 'Transfer'} tgl ${new Date().toLocaleDateString('id-ID')}`;
    const notePrompt = prompt(
      isEn
        ? `Settlement note / payment details (Optional):`
        : `Catatan pelunasan / keterangan pembayaran (Opsional):`,
      defaultNote
    );
    if (notePrompt !== null) {
      newCatatanPelunasan = notePrompt.trim();
    }
  } else if (action === 'belum_lunas') {
    if (newStatus.toLowerCase().includes('lunas') || newSisa <= 0) {
      newPelunasan = 0;
      newSisa = Math.max(0, totalNom - newDp);
      newStatus = newDp > 0 ? 'DP' : 'Belum';
    }
  } else if (action === 'edit_sisa') {
    const inputVal = prompt(
      isEn
        ? `Enter remaining settlement balance (Total: ${formatRupiah(totalNom)}):`
        : `Masukkan sisa pelunasan (Total: ${formatRupiah(totalNom)}):`,
      currentSisa
    );
    if (inputVal === null) {
      await loadKeuanganData();
      return;
    }
    newSisa = Math.min(totalNom, Math.max(0, parseFloat(inputVal) || 0));
    newPelunasan = Math.max(0, totalNom - newDp - newSisa);
    newStatus = newSisa <= 0 ? 'Lunas' : (newDp > 0 ? 'DP' : 'Belum');

    const notePrompt = prompt(
      isEn ? `Settlement note (Optional):` : `Catatan pelunasan (Opsional):`,
      newCatatanPelunasan
    );
    if (notePrompt !== null) {
      newCatatanPelunasan = notePrompt.trim();
    }
  }

  try {
    if (typeof Toast !== 'undefined') {
      Toast.info(isEn ? "Updating" : "Memperbarui", isEn ? "Updating payment status..." : "Memperbarui status pelunasan...");
    }

    const isLunas = newStatus === 'Lunas' || newSisa <= 0;
    const realCash = isLunas ? (newPelunasan > 0 && newDp < totalNom ? newPelunasan : totalNom) : newDp;

    const payload = {
      statusPembayaran: newStatus,
      nominal: realCash,
      dp: newDp,
      pelunasan: newPelunasan,
      sisa: newSisa,
      totalProyek: totalNom,
      catatanPelunasan: newCatatanPelunasan
    };

    const res = await API.updateKeuangan(id, payload);
    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Success" : "Berhasil", isEn ? `Payment status updated to ${newStatus}.` : `Status pelunasan berhasil diperbarui menjadi ${newStatus}.`);
      }
      await loadKeuanganData();
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Failed" : "Gagal", res ? res.message : "Gagal memperbarui pelunasan.");
      }
      await loadKeuanganData();
    }
  } catch (err) {
    console.error("quickUpdatePelunasan error:", err);
    await loadKeuanganData();
  }
}

// Quick Update Metode Pembayaran (Inline dari Dropdown Tabel)
async function quickUpdatePaymentMethod(id, newMethod) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  try {
    const res = await API.updateKeuangan(id, { metodePembayaran: newMethod });
    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Success" : "Berhasil", isEn ? "Payment method updated." : `Metode pembayaran diubah menjadi ${newMethod}.`);
      }
      const tx = currentKeuanganList.find(k => String(k.id) === String(id));
      if (tx) tx.metodePembayaran = newMethod;
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Failed" : "Gagal", res ? res.message : "Gagal memperbarui metode.");
      }
      await loadKeuanganData();
    }
  } catch (err) {
    console.error("quickUpdatePaymentMethod error:", err);
  }
}

function sanitize(text) {
  return String(text)
    .replace(/[<>]/g, "")
    .trim();
}

// Add transaction callback
let isKeuanganSubmitting = false;
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
      Toast.error(isEn ? "Access Denied" : "Akses Ditolak", isEn ? `You do not have permission (${requiredPerm}) to save transaction.` : `Anda tidak memiliki izin (${requiredPerm}) untuk menyimpan transaksi.`);
    }
    return;
  }
  const submitBtn = document.getElementById('submitBtn');
  if (isKeuanganSubmitting || (submitBtn && submitBtn.disabled)) return;
  isKeuanganSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
  }
  const origBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>${isEn ? 'Saving...' : 'Menyimpan...'}</span>`;
  }

  const tanggal = document.getElementById('tanggal').value;
  const jenis = document.getElementById('jenis').value;
  const keterangan = document.getElementById('keterangan').value;
  const nominal = Number(document.getElementById('nominal').value);
  const metodeElem = document.getElementById('metodePembayaran');
  const metodePembayaran = metodeElem ? metodeElem.value : 'Shopee';
  const catatanPelunasanElem = document.getElementById('catatanPelunasan');
  const catatanPelunasan = catatanPelunasanElem ? catatanPelunasanElem.value.trim() : '';

  const payload = {
    tanggal: tanggal.trim(),
    jenis: jenis.trim(),
    keterangan: sanitize(keterangan),
    nominal: Number(nominal),
    metodePembayaran: metodePembayaran,
    statusPembayaran: 'Lunas',
    dp: Number(nominal),
    sisa: 0,
    totalProyek: Number(nominal),
    catatanPelunasan: catatanPelunasan
  };

  const resetSubmitBtn = () => {
    isKeuanganSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      submitBtn.innerHTML = origBtnText;
    }
  };

  if (!payload.tanggal) {
    if (typeof Toast !== 'undefined') Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Date is required!" : "Tanggal wajib diisi!");
    resetSubmitBtn();
    return;
  }

  const inputDate = new Date(payload.tanggal);
  inputDate.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  if (!editModeId && inputDate < todayDate) {
    if (typeof Toast !== 'undefined') Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Transaction date cannot be in the past!" : "Tanggal transaksi tidak boleh sebelum hari ini!");
    resetSubmitBtn();
    return;
  }

  if (!payload.jenis) {
    if (typeof Toast !== 'undefined') Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Transaction type is required!" : "Jenis transaksi wajib dipilih!");
    resetSubmitBtn();
    return;
  }

  if (!payload.keterangan) {
    if (typeof Toast !== 'undefined') Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Description is required!" : "Keterangan wajib diisi!");
    resetSubmitBtn();
    return;
  }

  if (!Number.isFinite(payload.nominal) || payload.nominal <= 0) {
    if (typeof Toast !== 'undefined') Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Amount must be greater than 0!" : "Nominal harus lebih dari 0!");
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
      if (typeof Toast !== 'undefined') {
        Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? `Expense cannot exceed available balance (${formatRupiah(currentSaldo)})!` : `Pengeluaran tidak boleh melebihi saldo yang tersedia (${formatRupiah(currentSaldo)})!`);
      }
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
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? 'Berhasil' : 'Berhasil', isEn ? 'Transaction recorded successfully!' : 'Transaksi berhasil dicatat/diupdate!');
      }

      // Reset form kecuali tanggal
      document.getElementById('transaksiForm').reset();
      const nominalPreview = document.getElementById('nominalPreview');
      if (nominalPreview) nominalPreview.textContent = '';

      const todayStr = new Date().toISOString().split('T')[0];
      document.getElementById('tanggal').value = todayStr;
      document.getElementById('tanggal').min = todayStr;

      // Reset edit mode
      editModeId = null;
      if (submitBtn) {
        submitBtn.innerHTML = isEn ? 'Save Transaction' : 'Simpan Transaksi';
      }
      const formTitle = document.querySelector('#transaksiForm').previousElementSibling.querySelector('span');
      if (formTitle) formTitle.textContent = isEn ? 'Record New Transaction' : 'Catat Transaksi Baru';

      // Muat ulang data
      await loadKeuanganData();
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? 'Gagal' : 'Gagal', (isEn ? 'Failed to save transaction: ' : 'Gagal menyimpan transaksi: ') + res.message);
      }
      if (submitBtn) {
        submitBtn.innerHTML = editModeId ? (isEn ? 'Update Transaction' : 'Update Transaksi') : (isEn ? 'Save Transaction' : 'Simpan Transaksi');
      }
    }
  } catch (error) {
    console.error(error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? 'Error' : 'Error', isEn ? 'An error occurred while saving transaction.' : 'Terjadi kesalahan saat menyimpan transaksi.');
    }
    if (submitBtn) {
      submitBtn.innerHTML = editModeId ? (isEn ? 'Update Transaction' : 'Update Transaksi') : (isEn ? 'Save Transaction' : 'Simpan Transaksi');
    }
  } finally {
    isKeuanganSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    }
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

  const metodeElem = document.getElementById('metodePembayaran');
  if (metodeElem && tx.metodePembayaran) {
    metodeElem.value = tx.metodePembayaran;
  }

  const catatanPelunasanElem = document.getElementById('catatanPelunasan');
  if (catatanPelunasanElem) {
    catatanPelunasanElem.value = tx.catatanPelunasan || '';
  }

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
    }
    return;
  }

  const tx = currentKeuanganList.find(k => String(k.id) === String(id));
  const desc = tx ? tx.keterangan : id;
  const confirmMsg = isEn
    ? `Are you sure you want to delete transaction "${desc}"?`
    : `Yakin ingin menghapus transaksi "${desc}"?`;

  const isConfirmed = await showConfirmModal({
    title: isEn ? "Delete Transaction" : "Hapus Transaksi",
    message: confirmMsg,
    type: "danger",
    confirmText: isEn ? "Delete" : "Hapus"
  });
  if (!isConfirmed) return;

  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const res = await API.deleteKeuangan(id);
    if (loader) loader.classList.add('hidden');

    if (res && res.success) {
      if (typeof Toast !== 'undefined') {
        Toast.success(isEn ? "Berhasil" : "Berhasil", isEn ? "Transaction deleted successfully." : "Transaksi berhasil dihapus.");
      }
      await loadKeuanganData();
    } else {
      const errMsg = res ? res.message : (isEn ? "Failed to delete transaction." : "Gagal menghapus transaksi.");
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Gagal" : "Gagal", errMsg);
      }
    }
  } catch (error) {
    if (loader) loader.classList.add('hidden');
    console.error('Delete transaction error:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Error" : "Error", isEn ? "Failed to delete transaction." : "Terjadi kesalahan saat menghapus transaksi.");
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

  const isConfirmed = await showConfirmModal({
    title: isEn ? "Delete Selected Transactions" : "Hapus Transaksi Terpilih",
    message: confirmMsg,
    type: "danger",
    confirmText: isEn ? "Delete All" : "Hapus Semua"
  });
  if (!isConfirmed) return;

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
      }
      await loadKeuanganData();
    } else {
      const errMsg = res ? res.message : (isEn ? "Failed to delete selected transactions." : "Gagal menghapus transaksi terpilih.");
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Gagal" : "Gagal", errMsg);
      }
    }
  } catch (error) {
    if (loader) loader.classList.add('hidden');
    console.error('Bulk delete keuangan error:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Error" : "Error", isEn ? "Failed to delete selected transactions." : "Terjadi kesalahan saat menghapus transaksi terpilih.");
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

  const inEl = document.getElementById('totalPemasukan');
  if (inEl) inEl.innerHTML = skeletonText;
  const outEl = document.getElementById('totalPengeluaran');
  if (outEl) outEl.innerHTML = skeletonText;
  const saldoEl = document.getElementById('saldoBersih');
  if (saldoEl) saldoEl.innerHTML = skeletonText;

  const ewEl = document.getElementById('totalSaldoEwallet');
  if (ewEl) ewEl.innerHTML = skeletonText;
  const mkEl = document.getElementById('totalSaldoMarket');
  if (mkEl) mkEl.innerHTML = skeletonText;

  const grid = document.getElementById('walletAccountsGrid');
  if (grid) {
    grid.innerHTML = Array(4).fill(`
      <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 animate-pulse shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 rounded-xl"></div>
            <div>
              <div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded mb-1"></div>
              <div class="h-3 w-28 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            </div>
          </div>
          <div class="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
        </div>
        <div class="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5 mt-3"></div>
        <div class="h-6 w-28 bg-zinc-200 dark:bg-zinc-700 rounded mb-2.5"></div>
        <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
          <div class="h-3 w-14 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          <div class="h-3 w-14 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        </div>
      </div>
    `).join('');
  }

  const tbody = document.querySelector('#keuanganTable tbody');
  if (tbody) {
    tbody.innerHTML = Array(5).fill(`
      <tr class="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
        <td class="p-4 text-center"><div class="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
        <td class="p-4"><div class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div></td>
        <td class="p-4"><div class="h-6 w-14 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
      </tr>
    `).join('');
  }
}
