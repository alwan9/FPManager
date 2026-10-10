let rawKeuanganData = [];
let rawProyekData = [];
let consolidatedKeuanganData = [];
let currentFilteredData = [];
let barChartInstance = null;
let pieChartInstance = null;

// Filter states
let currentPeriodFilter = 'all';
let currentWalletFilter = 'all';
let currentTypeFilter = 'all';
let currentSearchQuery = '';
let customStartDate = '';
let customEndDate = '';

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-800 shadow-sm shadow-emerald-500/50 animate-pulse"></span>';
    apiStatusBadge.className = 'absolute bottom-0 right-0 z-20 flex items-center justify-center pointer-events-none';
    apiStatusBadge.title = 'Live Google Sheets Connected';
  }

  // Set default custom date pickers
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const formatDateForInput = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  if (startInput) startInput.value = formatDateForInput(firstDay);
  if (endInput) endInput.value = formatDateForInput(today);

  // Set default print date
  updatePrintDate();

  // Load Laporan Data
  loadLaporanData();
});

function updatePrintDate() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const printDateEl = document.getElementById('printDate');
  if (printDateEl) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
    const localeCode = isEn ? 'en-US' : 'id-ID';
    const formatter = new Intl.DateTimeFormat(localeCode, options);
    printDateEl.textContent = formatter.format(new Date());
  }
}

// Load all project and financial data and compile reports
async function loadLaporanData() {

  showLaporanSkeletons();
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  try {
    const [keuangan, proyek] = await Promise.all([
      API.getKeuangan(),
      API.getProyek()
    ]);

    rawKeuanganData = Array.isArray(keuangan) ? keuangan : [];
    rawProyekData = Array.isArray(proyek) ? proyek : [];

    // Consolidate raw transactions matching Keuangan Module (1 project = 1 consolidated row)
    consolidatedKeuanganData = (typeof consolidateKeuanganList === 'function')
      ? consolidateKeuanganList(rawKeuanganData)
      : rawKeuanganData;

    // Apply active filter and render complete report
    applyReportFilters();

  } catch (error) {
    console.error('Error loading laporan data:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? 'Error' : 'Gagal', isEn ? 'An error occurred while compiling financial report.' : 'Terjadi kesalahan saat memproses laporan bisnis & keuangan.');
    }
  }
}

// Helper: Format tanggal & waktu dari timestamp ISO / Date (menggunakan created_at yang sudah ada)
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return String(dateStr);
    }
    const day = d.getDate();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (e) {
    return String(dateStr);
  }
}

// Helper: Normalisasi nama akun pembayaran
function normalizePaymentMethod(rawMetode, fallbackSumber) {
  const m = String(rawMetode || '').trim().toLowerCase();
  const s = String(fallbackSumber || '').trim().toLowerCase();

  if (m.includes('bsi') || s.includes('bsi') || m.includes('syariah')) return 'BSI';
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

// Helper: Render Badge Metode Pembayaran
function renderPaymentMethodBadge(rawMethod, fallbackSumber) {
  const m = normalizePaymentMethod(rawMethod, fallbackSumber);
  if (m === 'Shopee') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-800" title="Metode: Shopee"><i class="fa-solid fa-bag-shopping text-orange-500 text-[10px]"></i> Shopee</span>`;
  } else if (m === 'QRIS') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="Metode: QRIS"><i class="fa-solid fa-qrcode text-indigo-500 text-[10px]"></i> QRIS</span>`;
  } else if (m === 'BSI') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Metode: BSI"><i class="fa-solid fa-building-columns text-emerald-500 text-[10px]"></i> BSI</span>`;
  } else if (m === 'Fiverr') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Metode: Fiverr"><i class="fa-solid fa-bolt text-emerald-500 text-[10px]"></i> Fiverr</span>`;
  } else if (m === 'Transfer Bank') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800" title="Metode: Transfer Bank"><i class="fa-solid fa-building-columns text-blue-500 text-[10px]"></i> Bank</span>`;
  } else if (m === 'Tunai') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800" title="Metode: Tunai"><i class="fa-solid fa-money-bill-wave text-teal-500 text-[10px]"></i> Tunai</span>`;
  }
  const cleanName = escapeHtml(rawMethod || 'QRIS');
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700" title="Metode: ${cleanName}"><i class="fa-solid fa-credit-card text-zinc-500 text-[10px]"></i> ${cleanName}</span>`;
}

// Period Change Handler
function handlePeriodChange(val) {
  currentPeriodFilter = val;
  const customContainer = document.getElementById('customDateRangeContainer');
  if (customContainer) {
    if (val === 'custom') {
      customContainer.classList.remove('hidden');
      customContainer.classList.add('flex');
    } else {
      customContainer.classList.add('hidden');
      customContainer.classList.remove('flex');
    }
  }
  applyReportFilters();
}
window.handlePeriodChange = handlePeriodChange;

// Reset Filters
function resetReportFilters() {
  currentPeriodFilter = 'all';
  currentWalletFilter = 'all';
  currentTypeFilter = 'all';
  currentSearchQuery = '';

  const periodSelect = document.getElementById('filterPeriodSelect');
  if (periodSelect) periodSelect.value = 'all';

  const walletSelect = document.getElementById('filterWalletSelect');
  if (walletSelect) walletSelect.value = 'all';

  const typeSelect = document.getElementById('filterTypeSelect');
  if (typeSelect) typeSelect.value = 'all';

  const searchInput = document.getElementById('filterSearchInput');
  if (searchInput) searchInput.value = '';

  const customContainer = document.getElementById('customDateRangeContainer');
  if (customContainer) {
    customContainer.classList.add('hidden');
    customContainer.classList.remove('flex');
  }

  applyReportFilters();
}
window.resetReportFilters = resetReportFilters;

// Filter evaluation helper
function isDateInPeriod(dateStr, period, customStart, customEnd) {
  if (period === 'all') return true;
  if (!dateStr) return true;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (period === 'today') {
    return d >= todayStart && d <= todayEnd;
  }

  if (period === 'this_week') {
    const dayOfWeek = now.getDay(); // 0 = Sun
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= todayEnd;
  }

  if (period === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return d >= startOfMonth && d <= endOfMonth;
  }

  if (period === 'last_month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  }

  if (period === 'custom') {
    if (!customStart && !customEnd) return true;
    const s = customStart ? new Date(customStart + 'T00:00:00') : new Date('2000-01-01');
    const e = customEnd ? new Date(customEnd + 'T23:59:59') : new Date('2099-12-31');
    return d >= s && d <= e;
  }

  return true;
}

// Apply Filters & Re-calculate
function applyReportFilters() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  
  const walletSelect = document.getElementById('filterWalletSelect');
  if (walletSelect) {
    currentWalletFilter = walletSelect.value;
  }

  const typeSelect = document.getElementById('filterTypeSelect');
  if (typeSelect) {
    currentTypeFilter = typeSelect.value;
  }

  const searchInput = document.getElementById('filterSearchInput');
  if (searchInput) {
    currentSearchQuery = (searchInput.value || '').trim().toLowerCase();
  }

  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');
  customStartDate = startInput ? startInput.value : '';
  customEndDate = endInput ? endInput.value : '';

  // Update period badge text & print period
  let periodText = 'Bulan Ini';
  if (currentPeriodFilter === 'all') periodText = isEn ? 'All Time' : 'Semua Waktu';
  else if (currentPeriodFilter === 'today') periodText = isEn ? 'Today' : 'Hari Ini';
  else if (currentPeriodFilter === 'this_week') periodText = isEn ? 'This Week' : 'Minggu Ini';
  else if (currentPeriodFilter === 'this_month') periodText = isEn ? 'This Month' : 'Bulan Ini';
  else if (currentPeriodFilter === 'last_month') periodText = isEn ? 'Last Month' : 'Bulan Lalu';
  else if (currentPeriodFilter === 'custom') {
    periodText = `${customStartDate || '...'} s/d ${customEndDate || '...'}`;
  }

  const activePeriodBadge = document.getElementById('activePeriodBadge');
  if (activePeriodBadge) {
    activePeriodBadge.textContent = `${isEn ? 'Period' : 'Periode'}: ${periodText}`;
  }
  const printPeriodText = document.getElementById('printPeriodText');
  if (printPeriodText) {
    printPeriodText.textContent = periodText;
  }

  // Filter transactions
  currentFilteredData = consolidatedKeuanganData.filter(item => {
    // 1. Filter Periode
    const rawDate = item.createdAt || item.tanggal || '';
    const passPeriod = isDateInPeriod(rawDate, currentPeriodFilter, customStartDate, customEndDate);
    if (!passPeriod) return false;

    // 2. Filter Jenis Transaksi
    if (currentTypeFilter !== 'all') {
      if (currentTypeFilter === 'Pemasukan' && item.jenis !== 'Pemasukan') return false;
      if (currentTypeFilter === 'Pengeluaran' && item.jenis !== 'Pengeluaran') return false;
      if (currentTypeFilter === 'Mutasi' && (item.jenis !== 'Mutasi' && item.jenis !== 'Pindah Saldo')) return false;
    }

    // 3. Filter Metode Pembayaran
    if (currentWalletFilter !== 'all') {
      const targetMethod = currentWalletFilter.toLowerCase();
      const mDp = String(item.metodeBayarDp || '').toLowerCase();
      const mPel = String(item.metodeBayarPelunasan || '').toLowerCase();
      const mMain = String(item.metodePembayaran || item.metode || '').toLowerCase();
      const mAsal = String(item.metodeAsal || '').toLowerCase();
      const mTujuan = String(item.metodeTujuan || item.tujuan || '').toLowerCase();
      const sumber = String(item.sumber || '').toLowerCase();

      const matches = mDp.includes(targetMethod) ||
                      mPel.includes(targetMethod) ||
                      mMain.includes(targetMethod) ||
                      mAsal.includes(targetMethod) ||
                      mTujuan.includes(targetMethod) ||
                      sumber.includes(targetMethod);
      if (!matches) return false;
    }

    // 4. Filter Pencarian Teks
    if (currentSearchQuery) {
      const prjId = String(item.idProyek || item.id || '').toLowerCase();
      const ket = String(item.keterangan || item.namaProyek || '').toLowerCase();
      const catatan = String(item.catatanPelunasan || '').toLowerCase();
      const user = String(item.userId || '').toLowerCase();
      const nominalStr = String(item.nominal || item.totalProyek || '').toLowerCase();

      const passSearch = prjId.includes(currentSearchQuery) ||
                         ket.includes(currentSearchQuery) ||
                         catatan.includes(currentSearchQuery) ||
                         user.includes(currentSearchQuery) ||
                         nominalStr.includes(currentSearchQuery);
      if (!passSearch) return false;
    }

    return true;
  });

  // Calculate Financial Summary using Source of Truth function
  const summary = (typeof calculateKeuanganSummary === 'function')
    ? calculateKeuanganSummary(currentFilteredData)
    : { totalIn: 0, totalOut: 0, saldo: 0, accountsMap: {} };

  // 1. Render Top Overview Cards
  renderOverviewCards(summary, currentFilteredData);

  // 2. Render Payment Method Balances
  renderWalletBalances(summary.accountsMap || {});

  // 3. Render Visual Diagrams (Bar Chart & Pie Chart)
  const monthlySummary = compileMonthlyData(currentFilteredData);
  renderBarChart(monthlySummary);
  renderPieChart(summary.accountsMap || {});
  renderMonthlySummaryList(monthlySummary);

  // 4. Render Detail Tables (Pendapatan, Pengeluaran, Mutasi)
  renderDetailTables(currentFilteredData);
}
window.applyReportFilters = applyReportFilters;

// 1. Populate Overview Cards
function renderOverviewCards(summary, filteredList) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const totalIn = summary.totalIn || 0;
  const totalOut = summary.totalOut || 0;
  const saldo = summary.saldo !== undefined ? summary.saldo : (totalIn - totalOut);
  const totalTx = filteredList.length;

  let inCount = 0;
  let outCount = 0;
  let mutasiCount = 0;

  filteredList.forEach(item => {
    if (item.jenis === 'Pemasukan') inCount++;
    else if (item.jenis === 'Pengeluaran') outCount++;
    else if (item.jenis === 'Mutasi' || item.jenis === 'Pindah Saldo') mutasiCount++;
  });

  // Total Pendapatan
  const inEl = document.getElementById('repTotalIncome');
  if (inEl) inEl.textContent = formatRupiah(totalIn);
  const inSub = document.getElementById('repIncomeSubtitle');
  if (inSub) inSub.textContent = `${inCount} ${isEn ? 'Income Transactions' : 'Transaksi Masuk'}`;

  // Total Pengeluaran
  const outEl = document.getElementById('repTotalExpense');
  if (outEl) outEl.textContent = formatRupiah(totalOut);
  const outSub = document.getElementById('repExpenseSubtitle');
  if (outSub) outSub.textContent = `${outCount} ${isEn ? 'Operating Expenses' : 'Beban Operasional'}`;

  // Saldo Bersih
  const balEl = document.getElementById('repNetBalance');
  if (balEl) {
    balEl.textContent = formatRupiah(saldo);
    if (saldo < 0) {
      balEl.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block truncate';
    } else {
      balEl.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block truncate';
    }
  }

  // Total Transaksi
  const txEl = document.getElementById('repTotalTxCount');
  if (txEl) txEl.textContent = totalTx;
  const txSub = document.getElementById('repTxSubtitle');
  if (txSub) txSub.textContent = `${inCount} Masuk · ${outCount} Keluar · ${mutasiCount} Mutasi`;
}

// 2. Render Payment Method Balances (QRIS, Shopee, BSI, etc.)
function renderWalletBalances(accountsMap) {
  // QRIS
  const qrisAcc = accountsMap['QRIS'] || { totalIn: 0, totalOut: 0, txCount: 0 };
  const qrisSaldo = (qrisAcc.totalIn || 0) - (qrisAcc.totalOut || 0);
  const qrisSaldoEl = document.getElementById('repQrisSaldo');
  if (qrisSaldoEl) qrisSaldoEl.textContent = formatRupiah(qrisSaldo);
  const qrisInEl = document.getElementById('repQrisIn');
  if (qrisInEl) qrisInEl.textContent = formatRupiah(qrisAcc.totalIn || 0);
  const qrisOutEl = document.getElementById('repQrisOut');
  if (qrisOutEl) qrisOutEl.textContent = formatRupiah(qrisAcc.totalOut || 0);
  const qrisTxEl = document.getElementById('repQrisTxCount');
  if (qrisTxEl) qrisTxEl.textContent = `${qrisAcc.txCount || 0} Tx`;

  // Shopee
  const shopeeAcc = accountsMap['Shopee'] || { totalIn: 0, totalOut: 0, txCount: 0 };
  const shopeeSaldo = (shopeeAcc.totalIn || 0) - (shopeeAcc.totalOut || 0);
  const shopeeSaldoEl = document.getElementById('repShopeeSaldo');
  if (shopeeSaldoEl) shopeeSaldoEl.textContent = formatRupiah(shopeeSaldo);
  const shopeeInEl = document.getElementById('repShopeeIn');
  if (shopeeInEl) shopeeInEl.textContent = formatRupiah(shopeeAcc.totalIn || 0);
  const shopeeOutEl = document.getElementById('repShopeeOut');
  if (shopeeOutEl) shopeeOutEl.textContent = formatRupiah(shopeeAcc.totalOut || 0);
  const shopeeTxEl = document.getElementById('repShopeeTxCount');
  if (shopeeTxEl) shopeeTxEl.textContent = `${shopeeAcc.txCount || 0} Tx`;

  // BSI
  const bsiAcc = accountsMap['BSI'] || { totalIn: 0, totalOut: 0, txCount: 0 };
  const bsiSaldo = (bsiAcc.totalIn || 0) - (bsiAcc.totalOut || 0);
  const bsiSaldoEl = document.getElementById('repBsiSaldo');
  if (bsiSaldoEl) bsiSaldoEl.textContent = formatRupiah(bsiSaldo);
  const bsiInEl = document.getElementById('repBsiIn');
  if (bsiInEl) bsiInEl.textContent = formatRupiah(bsiAcc.totalIn || 0);
  const bsiOutEl = document.getElementById('repBsiOut');
  if (bsiOutEl) bsiOutEl.textContent = formatRupiah(bsiAcc.totalOut || 0);
  const bsiTxEl = document.getElementById('repBsiTxCount');
  if (bsiTxEl) bsiTxEl.textContent = `${bsiAcc.txCount || 0} Tx`;
}

// 3. Render Detail Tables (Pendapatan, Pengeluaran, Mutasi Saldo)
function renderDetailTables(filteredList) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  const incomeItems = [];
  const expenseItems = [];
  const mutasiItems = [];

  filteredList.forEach(item => {
    if (item.jenis === 'Pemasukan') {
      incomeItems.push(item);
    } else if (item.jenis === 'Pengeluaran') {
      expenseItems.push(item);
    } else if (item.jenis === 'Mutasi' || item.jenis === 'Pindah Saldo') {
      mutasiItems.push(item);
    }
  });

  // A. Tabel Pendapatan
  const incomeCountBadge = document.getElementById('incomeCountBadge');
  if (incomeCountBadge) incomeCountBadge.textContent = `${incomeItems.length} Data`;

  const incomeTbody = document.getElementById('incomeTableBody');
  if (incomeTbody) {
    if (incomeItems.length === 0) {
      incomeTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No income records found.' : 'Tidak ada data transaksi pendapatan untuk filter ini.'}</td></tr>`;
    } else {
      incomeTbody.innerHTML = incomeItems.map(item => {
        const rawDate = item.createdAt || item.tanggal || '';
        const st = String(item.statusPembayaran || '').toLowerCase();
        const isLunas = st.includes('lunas');
        const isUnpaid = st === 'belum';
        const total = Number(item.totalProyek) || Number(item.nominal) || 0;
        const dpVal = Number(item.dp !== undefined ? item.dp : (isUnpaid ? 0 : item.nominal)) || 0;
        const pelunasanVal = Number(item.pelunasan) || 0;
        const nominal = Number(item.nominal) || 0;

        let realIncome = 0;
        if (isLunas) {
          realIncome = (pelunasanVal > 0 && dpVal < total ? (dpVal + pelunasanVal) : (total > 0 ? total : nominal));
        } else if (!isUnpaid) {
          realIncome = (dpVal > 0 ? dpVal : nominal);
        }

        const prjId = item.idProyek || item.id || '';
        const title = item.keterangan || item.namaProyek || 'Projek';
        const method = item.metodeBayarPelunasan || item.metodeBayarDp || item.metodePembayaran || item.sumber || 'QRIS';
        const badgeMethod = renderPaymentMethodBadge(method, item.sumber);

        let typeBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800">Lunas</span>`;
        if (st === 'dp') {
          typeBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">DP (Uang Muka)</span>`;
        } else if (st === 'belum') {
          typeBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Belum Bayar</span>`;
        }

        return `
          <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
            <td class="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">${formatDateTime(rawDate)}</td>
            <td class="py-2.5 px-3">
              <div class="font-semibold text-zinc-900 dark:text-zinc-100">${escapeHtml(title)}</div>
              ${prjId ? `<div class="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">${escapeHtml(prjId)}</div>` : ''}
            </td>
            <td class="py-2.5 px-3">${typeBadge}</td>
            <td class="py-2.5 px-3">${badgeMethod}</td>
            <td class="py-2.5 px-3 text-right font-mono font-bold text-green-600 dark:text-green-400">${formatRupiah(realIncome)}</td>
            <td class="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 text-[11px]">${escapeHtml(item.catatanPelunasan || '-')}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // B. Tabel Pengeluaran
  const expenseCountBadge = document.getElementById('expenseCountBadge');
  if (expenseCountBadge) expenseCountBadge.textContent = `${expenseItems.length} Data`;

  const expenseTbody = document.getElementById('expenseTableBody');
  if (expenseTbody) {
    if (expenseItems.length === 0) {
      expenseTbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No expense records found.' : 'Tidak ada data transaksi pengeluaran untuk filter ini.'}</td></tr>`;
    } else {
      expenseTbody.innerHTML = expenseItems.map(item => {
        const rawDate = item.createdAt || item.tanggal || '';
        const method = item.metodePembayaran || item.metode || 'QRIS';
        const badgeMethod = renderPaymentMethodBadge(method, item.sumber);

        return `
          <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
            <td class="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">${formatDateTime(rawDate)}</td>
            <td class="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">${escapeHtml(item.keterangan || 'Pengeluaran')}</td>
            <td class="py-2.5 px-3">${badgeMethod}</td>
            <td class="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">- ${formatRupiah(Number(item.nominal) || 0)}</td>
            <td class="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 text-[11px] font-mono">${escapeHtml(item.userId || 'USR-001')}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // C. Tabel Mutasi Saldo
  const mutasiCountBadge = document.getElementById('mutasiCountBadge');
  if (mutasiCountBadge) mutasiCountBadge.textContent = `${mutasiItems.length} Data`;

  const mutasiTbody = document.getElementById('mutasiTableBody');
  if (mutasiTbody) {
    if (mutasiItems.length === 0) {
      mutasiTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No balance transfer records found.' : 'Tidak ada riwayat mutasi saldo untuk filter ini.'}</td></tr>`;
    } else {
      mutasiTbody.innerHTML = mutasiItems.map(item => {
        const rawDate = item.createdAt || item.tanggal || '';
        const asalMethod = item.metodeBayarDp || item.metodeAsal || item.sumber || 'QRIS';
        const tujuanMethod = item.metodeBayarPelunasan || item.metodeTujuan || item.tujuan || 'BSI';

        const badgeAsal = renderPaymentMethodBadge(asalMethod, item.sumber);
        const badgeTujuan = renderPaymentMethodBadge(tujuanMethod, item.sumber);

        return `
          <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
            <td class="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">${formatDateTime(rawDate)}</td>
            <td class="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">${escapeHtml(item.keterangan || 'Mutasi Saldo')}</td>
            <td class="py-2.5 px-3">
              <div class="space-y-0.5">
                ${badgeAsal}
                <div class="text-[10px] font-mono text-rose-500 font-bold">- ${formatRupiah(Number(item.nominal) || 0)}</div>
              </div>
            </td>
            <td class="py-2.5 px-3">
              <div class="space-y-0.5">
                ${badgeTujuan}
                <div class="text-[10px] font-mono text-emerald-500 font-bold">+ ${formatRupiah(Number(item.nominal) || 0)}</div>
              </div>
            </td>
            <td class="py-2.5 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">${formatRupiah(Number(item.nominal) || 0)}</td>
            <td class="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 text-[11px] font-mono">${escapeHtml(item.userId || 'USR-001')}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

// Helper to group transactions by Month-Year for Charts
function compileMonthlyData(keuanganList) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const langCode = isEn ? 'en-US' : 'id-ID';
  const monthlyData = {};

  keuanganList.forEach(k => {
    const rawDate = k.createdAt || k.tanggal;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return;

    const monthName = date.toLocaleString(langCode, { month: 'short' });
    const year = date.getFullYear();
    const key = `${monthName} ${year}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        monthLabel: key,
        sortKey: date.getFullYear() * 100 + (date.getMonth() + 1),
        pemasukan: 0,
        pengeluaran: 0
      };
    }

    if (k.jenis === 'Pemasukan') {
      const st = String(k.statusPembayaran || '').toLowerCase();
      const isLunas = st.includes('lunas');
      const isUnpaid = st === 'belum';
      const total = (typeof parseCleanNumber === 'function') ? parseCleanNumber(k.totalProyek, parseCleanNumber(k.nominal, 0)) : (Number(k.totalProyek) || Number(k.nominal) || 0);
      const dpVal = (typeof parseCleanNumber === 'function') ? parseCleanNumber(k.dp !== undefined ? k.dp : (isUnpaid ? 0 : k.nominal), 0) : (Number(k.dp !== undefined ? k.dp : (isUnpaid ? 0 : k.nominal)) || 0);
      const pelunasanVal = (typeof parseCleanNumber === 'function') ? parseCleanNumber(k.pelunasan, 0) : (Number(k.pelunasan) || 0);
      const nominal = (typeof parseCleanNumber === 'function') ? parseCleanNumber(k.nominal, 0) : (Number(k.nominal) || 0);

      let realIn = 0;
      if (isLunas) {
        if (dpVal > 0 && pelunasanVal > 0) {
          realIn = dpVal + pelunasanVal;
        } else if (dpVal > 0 && pelunasanVal === 0) {
          realIn = Math.max(total, dpVal);
        } else if (dpVal === 0 && pelunasanVal > 0) {
          realIn = pelunasanVal;
        } else {
          realIn = total > 0 ? total : nominal;
        }
      } else if (!isUnpaid) {
        realIn = (dpVal > 0 ? dpVal : nominal);
      }
      monthlyData[key].pemasukan += realIn;

    } else if (k.jenis === 'Pengeluaran') {
      monthlyData[key].pengeluaran += ((typeof parseCleanNumber === 'function') ? parseCleanNumber(k.nominal, 0) : (Number(k.nominal) || 0));
    }
  });

  return Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey);
}

// Render the sidebar monthly listing
function renderMonthlySummaryList(monthlyList) {
  const container = document.getElementById('monthlySummaryContainer');
  if (!container) return;
  container.innerHTML = '';
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  if (monthlyList.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-zinc-400 text-xs col-span-full">${isEn ? 'No financial history in selected filter.' : 'Belum ada data pada periode ini.'}</div>`;
    return;
  }

  // Tampilkan dari bulan terbaru
  const reversedList = [...monthlyList].reverse();

  reversedList.forEach(item => {
    const profit = item.pemasukan - item.pengeluaran;
    const itemEl = document.createElement('div');
    itemEl.className = 'p-3.5 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs';
    itemEl.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">${item.monthLabel}</span>
        <span class="text-xs font-bold font-mono ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}">
          ${formatRupiah(profit)}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono border-t border-zinc-100 dark:border-zinc-800/60 pt-1.5">
        <div>${isEn ? 'In' : 'Masuk'}: <span class="text-green-600 dark:text-green-400 font-semibold">${formatRupiah(item.pemasukan)}</span></div>
        <div class="text-right">${isEn ? 'Out' : 'Keluar'}: <span class="text-rose-600 dark:text-rose-400 font-semibold">${formatRupiah(item.pengeluaran)}</span></div>
      </div>
    `;
    container.appendChild(itemEl);
  });
}

// 4.A Render Bar Chart (Diagram Batang: Pendapatan vs Pengeluaran)
function renderBarChart(monthlyList) {
  const canvas = document.getElementById('laporanBarChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  const labels = monthlyList.length > 0 ? monthlyList.map(item => item.monthLabel) : [isEn ? 'No Data' : 'Tidak Ada Data'];
  const pemasukanData = monthlyList.length > 0 ? monthlyList.map(item => item.pemasukan) : [0];
  const pengeluaranData = monthlyList.length > 0 ? monthlyList.map(item => item.pengeluaran) : [0];

  const isDark = document.documentElement.classList.contains('dark');
  Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
  Chart.defaults.borderColor = isDark ? '#27272a' : '#f4f4f5';

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'Income (Rp)' : 'Pendapatan (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(34, 197, 94, 0.85)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: isEn ? 'Expense (Rp)' : 'Pengeluaran (Rp)',
          data: pengeluaranData,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              return `${context.dataset.label}: ${formatRupiah(val)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            font: { family: 'Inter', size: 10 },
            callback: function (value) {
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions : millions.toFixed(1).replace('.', ',')) + (isEn ? 'M' : ' jt');
              }
              if (value >= 1000) {
                return (value / 1000) + (isEn ? 'K' : ' rb');
              }
              return value;
            }
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

// 4.B Render Pie / Donut Chart (Diagram Pie: Distribusi Saldo per Metode Pembayaran)
function renderPieChart(accountsMap) {
  const canvas = document.getElementById('laporanPieChart');
  const legendContainer = document.getElementById('pieSummaryLegend');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  const accountKeys = Object.keys(accountsMap);
  const labels = [];
  const dataValues = [];
  const backgroundColors = [];
  const borderColors = [];

  const colorPalette = {
    'QRIS': { bg: 'rgba(99, 102, 241, 0.85)', border: '#6366f1', textClass: 'text-indigo-600 dark:text-indigo-400' },
    'Shopee': { bg: 'rgba(249, 115, 22, 0.85)', border: '#f97316', textClass: 'text-orange-600 dark:text-orange-400' },
    'BSI': { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981', textClass: 'text-emerald-600 dark:text-emerald-400' },
    'Transfer Bank': { bg: 'rgba(59, 130, 246, 0.85)', border: '#3b82f6', textClass: 'text-blue-600 dark:text-blue-400' },
    'Tunai': { bg: 'rgba(20, 184, 166, 0.85)', border: '#14b8a6', textClass: 'text-teal-600 dark:text-teal-400' },
    'Default': { bg: 'rgba(168, 85, 247, 0.85)', border: '#a855f7', textClass: 'text-purple-600 dark:text-purple-400' }
  };

  let totalPositiveBalance = 0;
  const breakdownList = [];

  accountKeys.forEach(key => {
    const acc = accountsMap[key];
    const netSaldo = (acc.totalIn || 0) - (acc.totalOut || 0);
    const colorInfo = colorPalette[key] || colorPalette['Default'];

    breakdownList.push({
      key,
      name: acc.name || key,
      netSaldo,
      colorInfo
    });

    if (netSaldo > 0) {
      totalPositiveBalance += netSaldo;
    }
  });

  breakdownList.forEach(item => {
    labels.push(item.name);
    // Untuk tampilan visual lingkaran pie chart, gunakan saldo positif (min 0)
    dataValues.push(Math.max(0, item.netSaldo));
    backgroundColors.push(item.colorInfo.bg);
    borderColors.push(item.colorInfo.border);
  });

  const hasAnyPositive = dataValues.some(v => v > 0);

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: hasAnyPositive ? labels : [isEn ? 'No Balance' : 'Belum Ada Saldo'],
      datasets: [
        {
          data: hasAnyPositive ? dataValues : [1],
          backgroundColor: hasAnyPositive ? backgroundColors : ['rgba(200, 200, 200, 0.3)'],
          borderColor: hasAnyPositive ? borderColors : ['rgba(200, 200, 200, 0.5)'],
          borderWidth: 2,
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (!hasAnyPositive) return ' Saldo Rp0';
              const val = context.raw || 0;
              const pct = totalPositiveBalance > 0 ? ((val / totalPositiveBalance) * 100).toFixed(1) : '0';
              return ` ${context.label}: ${formatRupiah(val)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '62%'
    }
  });

  // Render Legend List under Pie Chart
  if (legendContainer) {
    if (breakdownList.length === 0) {
      legendContainer.innerHTML = `<div class="text-center py-2 text-zinc-400 text-xs">${isEn ? 'No accounts data.' : 'Belum ada data akun.'}</div>`;
    } else {
      legendContainer.innerHTML = breakdownList.map(item => {
        const pct = totalPositiveBalance > 0 && item.netSaldo > 0 ? ((item.netSaldo / totalPositiveBalance) * 100).toFixed(1) : '0';
        return `
          <div class="flex items-center justify-between text-xs py-0.5">
            <span class="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${item.colorInfo.border}"></span>
              <span>${escapeHtml(item.name)}</span>
            </span>
            <span class="font-mono font-bold ${item.colorInfo.textClass}">
              ${formatRupiah(item.netSaldo)} <span class="text-[10px] text-zinc-400 font-normal">(${pct}%)</span>
            </span>
          </div>
        `;
      }).join('');
    }
  }
}

/**
 * Client-side Structured Multi-Sheet Excel Export using SheetJS
 * Sheets:
 * 1. Ringkasan Finansial & Posisi Saldo
 * 2. Transaksi Masuk (Pendapatan)
 * 3. Transaksi Keluar (Pengeluaran)
 * 4. Riwayat Mutasi Saldo
 */
async function exportToExcel() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  try {
    if (typeof Toast !== 'undefined') {
      Toast.info(isEn ? 'Exporting' : 'Mengekspor', isEn ? 'Generating Excel report...' : 'Menyiapkan file Excel laporan...');
    }

    const summary = (typeof calculateKeuanganSummary === 'function')
      ? calculateKeuanganSummary(currentFilteredData)
      : { totalIn: 0, totalOut: 0, saldo: 0, accountsMap: {} };

    const accountsMap = summary.accountsMap || {};
    const currUser = (typeof Auth !== 'undefined') ? Auth.getUser() : null;

    // 1. Sheet 1: Ringkasan Finansial & Posisi Saldo
    const wsRingkasanData = [
      { 'Laporan': 'LAPORAN BISNIS & KEUANGAN - FPMANAGER', 'Nilai': '' },
      { 'Laporan': 'Tanggal Ekspor', 'Nilai': new Date().toLocaleString('id-ID') },
      { 'Laporan': 'Filter Periode', 'Nilai': document.getElementById('activePeriodBadge')?.textContent || 'Bulan Ini' },
      { 'Laporan': 'Diekspor Oleh', 'Nilai': currUser?.name || 'Super Admin' },
      { 'Laporan': '', 'Nilai': '' },
      { 'Laporan': '--- RINGKASAN FINANSIAL ---', 'Nilai': '' },
      { 'Laporan': 'Total Pendapatan (Rp)', 'Nilai': summary.totalIn || 0 },
      { 'Laporan': 'Total Pengeluaran (Rp)', 'Nilai': summary.totalOut || 0 },
      { 'Laporan': 'Saldo Bersih / Kas (Rp)', 'Nilai': summary.saldo || 0 },
      { 'Laporan': 'Total Transaksi Tercatat', 'Nilai': currentFilteredData.length },
      { 'Laporan': '', 'Nilai': '' },
      { 'Laporan': '--- POSISI SALDO PER METODE PEMBAYARAN ---', 'Nilai': '' }
    ];

    Object.keys(accountsMap).forEach(key => {
      const acc = accountsMap[key];
      const net = (acc.totalIn || 0) - (acc.totalOut || 0);
      wsRingkasanData.push({
        'Laporan': `${acc.name} (${acc.type || 'Akun'}) - Saldo (Rp)`,
        'Nilai': net
      });
      wsRingkasanData.push({
        'Laporan': `  > Total Masuk ${acc.name} (Rp)`,
        'Nilai': acc.totalIn || 0
      });
      wsRingkasanData.push({
        'Laporan': `  > Total Keluar ${acc.name} (Rp)`,
        'Nilai': acc.totalOut || 0
      });
    });

    // 2. Sheet 2: Transaksi Masuk (Pendapatan)
    const incomeItems = currentFilteredData.filter(k => k.jenis === 'Pemasukan');
    const wsPendapatanData = incomeItems.map((item, idx) => {
      const rawDate = item.createdAt || item.tanggal || '';
      const st = String(item.statusPembayaran || '').toLowerCase();
      const isLunas = st.includes('lunas');
      const isUnpaid = st === 'belum';
      const total = Number(item.totalProyek) || Number(item.nominal) || 0;
      const dpVal = Number(item.dp !== undefined ? item.dp : (isUnpaid ? 0 : item.nominal)) || 0;
      const pelunasanVal = Number(item.pelunasan) || 0;
      const nominal = Number(item.nominal) || 0;

      let realIncome = 0;
      if (isLunas) {
        realIncome = (pelunasanVal > 0 && dpVal < total ? (dpVal + pelunasanVal) : (total > 0 ? total : nominal));
      } else if (!isUnpaid) {
        realIncome = (dpVal > 0 ? dpVal : nominal);
      }

      return {
        'No': idx + 1,
        'Tanggal & Waktu': formatDateTime(rawDate),
        'ID Projek': item.idProyek || item.id || '-',
        'Nama Projek / Pelanggan': item.keterangan || item.namaProyek || '-',
        'Status Bayar': item.statusPembayaran || (isLunas ? 'Lunas' : 'DP'),
        'Metode Bayar DP': item.metodeBayarDp || item.metodePembayaran || item.sumber || '',
        'Metode Bayar Pelunasan': item.metodeBayarPelunasan || item.metodePembayaran || '',
        'Nominal Masuk (Rp)': realIncome,
        'Catatan': item.catatanPelunasan || ''
      };
    });

    // 3. Sheet 3: Transaksi Keluar (Pengeluaran)
    const expenseItems = currentFilteredData.filter(k => k.jenis === 'Pengeluaran');
    const wsPengeluaranData = expenseItems.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal & Waktu': formatDateTime(item.createdAt || item.tanggal || ''),
      'ID Transaksi': item.id || '-',
      'Keterangan Beban': item.keterangan || 'Pengeluaran',
      'Metode Bayar': item.metodePembayaran || item.metode || 'QRIS',
      'Nominal Keluar (Rp)': Number(item.nominal) || 0,
      'User PIC': item.userId || 'USR-001'
    }));

    // 4. Sheet 4: Riwayat Mutasi Saldo
    const mutasiItems = currentFilteredData.filter(k => k.jenis === 'Mutasi' || k.jenis === 'Pindah Saldo');
    const wsMutasiData = mutasiItems.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal & Waktu': formatDateTime(item.createdAt || item.tanggal || ''),
      'ID Mutasi': item.id || '-',
      'Keterangan': item.keterangan || 'Mutasi Saldo',
      'Rekening Asal': item.metodeBayarDp || item.metodeAsal || item.sumber || 'QRIS',
      'Rekening Tujuan': item.metodeBayarPelunasan || item.metodeTujuan || item.tujuan || 'BSI',
      'Jumlah Mutasi (Rp)': Number(item.nominal) || 0,
      'User PIC': item.userId || 'USR-001'
    }));

    // Build Workbook
    const wb = XLSX.utils.book_new();

    const wsRingkasan = XLSX.utils.json_to_sheet(wsRingkasanData);
    const wsPendapatan = XLSX.utils.json_to_sheet(wsPendapatanData.length > 0 ? wsPendapatanData : [{ 'Info': 'Tidak ada data pendapatan' }]);
    const wsPengeluaran = XLSX.utils.json_to_sheet(wsPengeluaranData.length > 0 ? wsPengeluaranData : [{ 'Info': 'Tidak ada data pengeluaran' }]);
    const wsMutasi = XLSX.utils.json_to_sheet(wsMutasiData.length > 0 ? wsMutasiData : [{ 'Info': 'Tidak ada data mutasi saldo' }]);

    XLSX.utils.book_append_sheet(wb, wsRingkasan, '1. Ringkasan Finansial');
    XLSX.utils.book_append_sheet(wb, wsPendapatan, '2. Transaksi Masuk');
    XLSX.utils.book_append_sheet(wb, wsPengeluaran, '3. Transaksi Keluar');
    XLSX.utils.book_append_sheet(wb, wsMutasi, '4. Mutasi Saldo');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Laporan_Keuangan_FPManager_${todayStr}.xlsx`);

    if (typeof Toast !== 'undefined') {
      Toast.success(isEn ? 'Success' : 'Berhasil Ekspor', isEn ? 'Excel file generated successfully.' : 'File Excel laporan berhasil diunduh.');
    }

  } catch (error) {
    console.error('Error exportToExcel:', error);
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? 'Error' : 'Gagal Ekspor', isEn ? 'An error occurred while exporting data to Excel.' : 'Terjadi kesalahan saat mengekspor data ke Excel.');
    }
  }
}
window.exportToExcel = exportToExcel;

// Export PDF Trigger (Print Optimized)
function exportToPdf() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  updatePrintDate();
  window.print();
}
window.exportToPdf = exportToPdf;

function showLaporanSkeletons() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');

  const skeletonText = '<div class="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mt-1"></div>';
  const stats = ['repTotalIncome', 'repTotalExpense', 'repNetBalance', 'repTotalTxCount', 'repQrisSaldo', 'repShopeeSaldo', 'repBsiSaldo'];

  stats.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = skeletonText;
  });
}

// Export Dropdown Handlers
function toggleExportDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('exportDropdownMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function closeExportDropdown() {
  const menu = document.getElementById('exportDropdownMenu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  const group = document.getElementById('exportDropdownGroup');
  if (group && !group.contains(e.target)) {
    closeExportDropdown();
  }
});

window.toggleExportDropdown = toggleExportDropdown;
window.closeExportDropdown = closeExportDropdown;
