let rawKeuanganData = [];
let rawProyekData = [];
let consolidatedKeuanganData = [];
let currentFilteredData = [];
let chartInstance = null;

// Filter states
let currentPeriodFilter = 'this_month';
let currentWalletFilter = 'all';
let customStartDate = '';
let customEndDate = '';

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.textContent = 'Live Google Sheets';
    apiStatusBadge.className = 'hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
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
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('laporan:read')) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (laporan:read) untuk melihat laporan bisnis & keuangan.</p>
        </div>
      `;
    }
    return;
  }

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
  currentPeriodFilter = 'this_month';
  currentWalletFilter = 'all';

  const periodSelect = document.getElementById('filterPeriodSelect');
  if (periodSelect) periodSelect.value = 'this_month';

  const walletSelect = document.getElementById('filterWalletSelect');
  if (walletSelect) walletSelect.value = 'all';

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
    const rawDate = item.createdAt || item.tanggal || '';
    const passPeriod = isDateInPeriod(rawDate, currentPeriodFilter, customStartDate, customEndDate);
    if (!passPeriod) return false;

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

  // 3. Render Detail Tables (Pendapatan, Pengeluaran, Mutasi)
  renderDetailTables(currentFilteredData);

  // 4. Render Monthly Charts & Summary
  const monthlySummary = compileMonthlyData(currentFilteredData);
  renderMonthlySummaryList(monthlySummary);
  renderChart(monthlySummary);
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

  // Pendapatan
  const inEl = document.getElementById('repTotalIncome');
  if (inEl) inEl.textContent = formatRupiah(totalIn);
  const inSub = document.getElementById('repIncomeSubtitle');
  if (inSub) inSub.textContent = `${inCount} ${isEn ? 'Income Transactions' : 'Transaksi Masuk'}`;

  // Pengeluaran
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
  if (txSub) txSub.textContent = `${inCount} In · ${outCount} Out · ${mutasiCount} Mutasi`;
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
      incomeTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No income records found.' : 'Tidak ada data transaksi pendapatan.'}</td></tr>`;
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

        const prjId = item.idProyek || item.id || '-';
        const title = item.keterangan || item.namaProyek || '-';
        const method = item.metodeBayarPelunasan || item.metodeBayarDp || item.metodePembayaran || item.sumber || 'QRIS';
        const badgeMethod = (typeof renderPaymentMethodBadge === 'function')
          ? renderPaymentMethodBadge(method, item.sumber)
          : `<span class="font-semibold text-xs">${escapeHtml(method)}</span>`;

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
      expenseTbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No expense records found.' : 'Tidak ada data transaksi pengeluaran.'}</td></tr>`;
    } else {
      expenseTbody.innerHTML = expenseItems.map(item => {
        const rawDate = item.createdAt || item.tanggal || '';
        const method = item.metodePembayaran || item.metode || 'QRIS';
        const badgeMethod = (typeof renderPaymentMethodBadge === 'function')
          ? renderPaymentMethodBadge(method, item.sumber)
          : `<span class="font-semibold text-xs">${escapeHtml(method)}</span>`;

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
      mutasiTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-zinc-400 text-xs">${isEn ? 'No balance transfer records found.' : 'Tidak ada riwayat mutasi saldo.'}</td></tr>`;
    } else {
      mutasiTbody.innerHTML = mutasiItems.map(item => {
        const rawDate = item.createdAt || item.tanggal || '';
        const asalMethod = item.metodeBayarDp || item.metodeAsal || item.sumber || 'QRIS';
        const tujuanMethod = item.metodeBayarPelunasan || item.metodeTujuan || item.tujuan || 'BSI';

        const badgeAsal = (typeof renderPaymentMethodBadge === 'function')
          ? renderPaymentMethodBadge(asalMethod, item.sumber)
          : escapeHtml(asalMethod);
        const badgeTujuan = (typeof renderPaymentMethodBadge === 'function')
          ? renderPaymentMethodBadge(tujuanMethod, item.sumber)
          : escapeHtml(tujuanMethod);

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
      const total = Number(k.totalProyek) || Number(k.nominal) || 0;
      const dpVal = Number(k.dp !== undefined ? k.dp : (isUnpaid ? 0 : k.nominal)) || 0;
      const pelunasanVal = Number(k.pelunasan) || 0;
      const nominal = Number(k.nominal) || 0;

      let realIn = 0;
      if (isLunas) {
        realIn = (pelunasanVal > 0 && dpVal < total ? (dpVal + pelunasanVal) : (total > 0 ? total : nominal));
      } else if (!isUnpaid) {
        realIn = (dpVal > 0 ? dpVal : nominal);
      }
      monthlyData[key].pemasukan += realIn;

    } else if (k.jenis === 'Pengeluaran') {
      monthlyData[key].pengeluaran += (Number(k.nominal) || 0);
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
    container.innerHTML = `<div class="text-center py-8 text-zinc-400 text-sm">${isEn ? 'No financial history in selected filter.' : 'Belum ada mutasi pada filter yang dipilih.'}</div>`;
    return;
  }

  // Tampilkan dari bulan terbaru
  const reversedList = [...monthlyList].reverse();

  reversedList.forEach(item => {
    const profit = item.pemasukan - item.pengeluaran;
    const itemEl = document.createElement('div');
    itemEl.className = 'p-3.5 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-1.5 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors';
    itemEl.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm">${item.monthLabel}</span>
        <span class="text-xs font-bold font-mono ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}">
          ${formatRupiah(profit)}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
        <div>${isEn ? 'In' : 'Masuk'}: <span class="text-green-600 dark:text-green-400 font-semibold">${formatRupiah(item.pemasukan)}</span></div>
        <div class="text-right">${isEn ? 'Out' : 'Keluar'}: <span class="text-rose-600 dark:text-rose-400 font-semibold">${formatRupiah(item.pengeluaran)}</span></div>
      </div>
    `;
    container.appendChild(itemEl);
  });
}

// Render chart using Chart.js
function renderChart(monthlyList) {
  const canvas = document.getElementById('laporanChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = monthlyList.map(item => item.monthLabel);
  const pemasukanData = monthlyList.map(item => item.pemasukan);
  const pengeluaranData = monthlyList.map(item => item.pengeluaran);

  const isDark = document.documentElement.classList.contains('dark');
  Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
  Chart.defaults.borderColor = isDark ? '#27272a' : '#f4f4f5';

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'Income (Rp)' : 'Pemasukan (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(34, 197, 94, 0.85)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: isEn ? 'Expense (Rp)' : 'Pengeluaran (Rp)',
          data: pengeluaranData,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
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
          labels: {
            font: { family: 'Inter' }
          }
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
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { family: 'Inter' },
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
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });
}

/**
 * Client-side Structured Multi-Sheet Excel Export using SheetJS
 * Sheets:
 * 1. Ringkasan Bisnis & Posisi Saldo
 * 2. Rincian Pendapatan
 * 3. Rincian Pengeluaran
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

    // 1. Sheet 1: Ringkasan Bisnis & Posisi Saldo
    const wsRingkasanData = [
      { 'Laporan': 'LAPORAN BISNIS & KEUANGAN - FPMANAGER', 'Nilai': '' },
      { 'Laporan': 'Tanggal Ekspor', 'Nilai': new Date().toLocaleString('id-ID') },
      { 'Laporan': 'Filter Periode', 'Nilai': document.getElementById('activePeriodBadge')?.textContent || 'Bulan Ini' },
      { 'Laporan': 'Diekspor Oleh', 'Nilai': currUser?.name || 'Super Admin' },
      { 'Laporan': '', 'Nilai': '' },
      { 'Laporan': '--- RINGKASAN FINANSIAL ---', 'Nilai': '' },
      { 'Laporan': 'Total Pendapatan (Rp)', 'Nilai': summary.totalIn || 0 },
      { 'Laporan': 'Total Pengeluaran (Rp)', 'Nilai': summary.totalOut || 0 },
      { 'Laporan': 'Saldo Bersih / Laba (Rp)', 'Nilai': summary.saldo || 0 },
      { 'Laporan': 'Total Transaksi', 'Nilai': currentFilteredData.length },
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

    // 2. Sheet 2: Rincian Pendapatan
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

    // 3. Sheet 3: Rincian Pengeluaran
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

    XLSX.utils.book_append_sheet(wb, wsRingkasan, '1. Ringkasan Bisnis');
    XLSX.utils.book_append_sheet(wb, wsPendapatan, '2. Pendapatan');
    XLSX.utils.book_append_sheet(wb, wsPengeluaran, '3. Pengeluaran');
    XLSX.utils.book_append_sheet(wb, wsMutasi, '4. Mutasi Saldo');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Laporan_Bisnis_Keuangan_FPManager_${todayStr}.xlsx`);

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
