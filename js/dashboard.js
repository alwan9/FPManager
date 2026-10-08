// Privacy feature: Hide/Show financial amounts on Dashboard (Default: HIDE)
let isFinancialsHidden = localStorage.getItem('dashboard_hide_financials') !== 'false'; // Default: true (Hidden)

function formatFinancialDisplay(number) {
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  if (isDesainer) {
    return '-';
  }
  if (isFinancialsHidden) {
    return 'Rp ••••••••';
  }
  return formatRupiah(number || 0);
}

function updatePrivacyUI() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  const btn = document.getElementById('toggleHideNominalBtn');
  const icon = document.getElementById('toggleHideNominalIcon');
  const text = document.getElementById('toggleHideNominalText');
  const cardEye = document.getElementById('cardPrivacyEyeIcon');
  const cardEyeBtn = document.getElementById('cardPrivacyEyeBtn');

  if (isDesainer) {
    if (btn) btn.classList.add('hidden');
    if (cardEye) cardEye.classList.add('hidden');
    if (cardEyeBtn) cardEyeBtn.classList.add('hidden');
    return;
  }

  if (isFinancialsHidden) {
    if (icon) icon.className = 'fa-solid fa-eye-slash mr-1.5 text-indigo-200';
    if (text) text.textContent = isEn ? 'Show Balance' : 'Tampilkan Saldo';
    if (btn) btn.title = isEn ? 'Click to show financial amounts' : 'Klik untuk menampilkan nominal saldo';
    if (cardEye) {
      cardEye.className = 'fa-solid fa-eye-slash text-zinc-400';
      if (cardEye.parentElement) cardEye.parentElement.title = isEn ? 'Click to show balance' : 'Klik untuk menampilkan nominal saldo';
    }
  } else {
    if (icon) icon.className = 'fa-solid fa-eye mr-1.5 text-emerald-300';
    if (text) text.textContent = isEn ? 'Hide Balance' : 'Sembunyikan Saldo';
    if (btn) btn.title = isEn ? 'Click to hide financial amounts' : 'Klik untuk menyembunyikan nominal saldo';
    if (cardEye) {
      cardEye.className = 'fa-solid fa-eye text-indigo-500';
      if (cardEye.parentElement) cardEye.parentElement.title = isEn ? 'Click to hide balance' : 'Klik untuk menyembunyikan nominal saldo';
    }
  }
}

function toggleDashboardNominalPrivacy() {
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  if (isDesainer) return;

  isFinancialsHidden = !isFinancialsHidden;
  localStorage.setItem('dashboard_hide_financials', isFinancialsHidden ? 'true' : 'false');
  updatePrivacyUI();

  if (window.lastDashboardStats) {
    renderSummaryStats(window.lastDashboardStats);
  }
  if (window.lastRecentProjects) {
    renderRecentProjects(window.lastRecentProjects);
  }
  if (window.lastChartData) {
    renderDashboardChart(window.lastChartData);
  }
  const modal = document.getElementById('dashboardIncomeBreakdownModal');
  if (modal && !modal.classList.contains('hidden')) {
    showIncomeBreakdownModal();
  }
}

window.toggleDashboardNominalPrivacy = toggleDashboardNominalPrivacy;
window.formatFinancialDisplay = formatFinancialDisplay;

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"></span>';
    apiStatusBadge.className = 'inline-flex items-center justify-center p-1.5';
    apiStatusBadge.title = 'Live Google Sheets Connected';
  }

  // Update Privacy UI State
  updatePrivacyUI();

  // Apply role customizations to dashboard UI
  applyDashboardRoleCustomizations();

  // Load Dashboard Data
  loadDashboardData();
});

// Customize Dashboard UI
function applyDashboardRoleCustomizations() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;

  const chartCard = document.getElementById('chartCard');
  const recentProjectsCard = document.getElementById('recentProjectsCard');
  const incomeDetailBadge = document.getElementById('incomeDetailBadge');
  const statCardPendapatan = document.getElementById('statCardPendapatan');
  const statCardPengeluaran = document.getElementById('statCardPengeluaran');
  const statCardKeuntungan = document.getElementById('statCardKeuntungan');
  const toggleHideNominalBtn = document.getElementById('toggleHideNominalBtn');
  const cardPrivacyEyeIcon = document.getElementById('cardPrivacyEyeIcon');
  const cardPrivacyEyeBtn = document.getElementById('cardPrivacyEyeBtn');
  const bannerAddProjectBtn = document.getElementById('bannerAddProjectBtn');
  const dashWelcomeTitle = document.getElementById('dashWelcomeTitle');
  const dashWelcomeDesc = document.getElementById('dashWelcomeDesc');
  const chartHeaderIcon = document.getElementById('chartHeaderIcon');
  const chartHeaderTitle = document.getElementById('chartHeaderTitle');
  const chartHeaderLink = document.getElementById('chartHeaderLink');
  const chartHeaderLinkText = document.getElementById('chartHeaderLinkText');

  if (isDesainer) {
    // 1. Hide Nominal Privacy Toggle and Add Project Button
    if (toggleHideNominalBtn) toggleHideNominalBtn.classList.add('hidden');
    if (bannerAddProjectBtn) bannerAddProjectBtn.classList.add('hidden');
    if (cardPrivacyEyeIcon) cardPrivacyEyeIcon.classList.add('hidden');
    if (cardPrivacyEyeBtn) cardPrivacyEyeBtn.classList.add('hidden');
    if (incomeDetailBadge) {
      incomeDetailBadge.classList.add('hidden');
      incomeDetailBadge.classList.remove('inline-flex');
    }

    // 2. Personalize Welcome Banner for Designer
    const displayName = (user && (user.nama || user.username)) ? (user.nama || user.username) : 'Designer';
    if (dashWelcomeTitle) {
      dashWelcomeTitle.innerHTML = `${isEn ? 'Welcome' : 'Selamat Datang'} ${escapeHtml(displayName)}! <iconify-icon icon="fluent-emoji-flat:artist-palette" class="inline-block align-middle ml-1"></iconify-icon>`;
    }
    if (dashWelcomeDesc) {
      dashWelcomeDesc.innerHTML = `<span class="hidden md:inline">${isEn ? 'Here is an overview of your active project progress and deadlines today.' : 'Berikut adalah ringkasan progres pengerjaan dan deadline projek Anda hari ini.'}</span><span class="inline md:hidden">${isEn ? 'Active projects progress overview today.' : 'Ringkasan progres projek hari ini.'}</span>`;
    }

    // 3. Card 2: Link to In Progress Projects
    if (statCardPendapatan) {
      statCardPendapatan.classList.add('cursor-pointer');
      statCardPendapatan.setAttribute('onclick', "window.location.href='proyek.html?status=Sedang%20Dikerjakan'");
      statCardPendapatan.setAttribute('title', isEn ? 'Click to view In Progress projects' : 'Klik untuk melihat projek yang sedang dikerjakan');
    }

    // 4. Card 3: Link to Revision Projects
    if (statCardPengeluaran) {
      statCardPengeluaran.setAttribute('href', 'proyek.html?status=Revisi');
      statCardPengeluaran.setAttribute('title', isEn ? 'Click to view projects In Revision' : 'Klik untuk melihat projek dalam status revisi');
    }

    // 5. Card 4: Link to Completed Projects
    if (statCardKeuntungan) {
      statCardKeuntungan.classList.add('cursor-pointer', 'hover:border-emerald-300', 'dark:hover:border-emerald-700', 'hover:shadow-md');
      statCardKeuntungan.setAttribute('onclick', "window.location.href='proyek.html?status=Selesai'");
      statCardKeuntungan.setAttribute('title', isEn ? 'Click to view Completed projects' : 'Klik untuk melihat projek selesai');
    }

    // 6. Chart Card Header for Designer (Workload / Status Distribution)
    if (chartHeaderIcon) {
      chartHeaderIcon.className = 'fa-solid fa-chart-pie text-indigo-600 dark:text-indigo-400 mr-2';
    }
    if (chartHeaderTitle) {
      chartHeaderTitle.innerHTML = `<span class="hidden md:inline">${isEn ? 'Project Status Distribution' : 'Distribusi Status Projek'}</span><span class="inline md:hidden">${isEn ? 'Status Distribution' : 'Status Projek'}</span>`;
    }
    if (chartHeaderLink) {
      chartHeaderLink.setAttribute('href', 'proyek.html');
      chartHeaderLink.setAttribute('title', isEn ? 'View all projects' : 'Lihat semua projek');
    }
    if (chartHeaderLinkText) {
      chartHeaderLinkText.textContent = isEn ? 'View All Projects' : 'Lihat Projek';
    }
  } else {
    // Super Admin & Service Roles (Allow Financial View)
    if (chartCard) chartCard.classList.remove('hidden');
    if (toggleHideNominalBtn) toggleHideNominalBtn.classList.remove('hidden');
    if (bannerAddProjectBtn) bannerAddProjectBtn.classList.remove('hidden');
    if (cardPrivacyEyeIcon) cardPrivacyEyeIcon.classList.remove('hidden');
    if (cardPrivacyEyeBtn) cardPrivacyEyeBtn.classList.remove('hidden');
    if (incomeDetailBadge) {
      incomeDetailBadge.classList.remove('hidden');
      incomeDetailBadge.classList.add('inline-flex');
    }
    if (statCardPendapatan) {
      statCardPendapatan.classList.add('cursor-pointer');
      statCardPendapatan.setAttribute('onclick', "showIncomeBreakdownModal()");
      statCardPendapatan.setAttribute('title', 'Klik untuk melihat rincian pendapatan berdasarkan metode pembayaran');
    }
    if (statCardPengeluaran) {
      statCardPengeluaran.setAttribute('href', 'keuangan.html');
      statCardPengeluaran.setAttribute('title', 'Buka modul Keuangan untuk melihat detail Pengeluaran');
    }
    if (statCardKeuntungan) {
      statCardKeuntungan.removeAttribute('onclick');
      statCardKeuntungan.removeAttribute('title');
      statCardKeuntungan.classList.remove('cursor-pointer');
    }
    if (chartHeaderIcon) {
      chartHeaderIcon.className = 'fa-solid fa-chart-simple text-indigo-600 dark:text-indigo-400 mr-2';
    }
    if (chartHeaderTitle) {
      chartHeaderTitle.innerHTML = `<span class="hidden md:inline">${isEn ? 'Monthly Cashflow Chart' : 'Grafik Arus Keuangan Bulanan'}</span><span class="inline md:hidden">${isEn ? 'Financial Chart' : 'Grafik Keuangan'}</span>`;
    }
    if (chartHeaderLink) {
      chartHeaderLink.setAttribute('href', 'laporan.html');
      chartHeaderLink.setAttribute('title', isEn ? 'View financial report' : 'Buka modul laporan');
    }
    if (chartHeaderLinkText) {
      chartHeaderLinkText.textContent = isEn ? 'Financial Report' : 'Detail Laporan';
    }
  }

  if (recentProjectsCard) {
    recentProjectsCard.className = 'lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between';
  }
}

// Load all project and financial data for dashboard cards and charts
async function loadDashboardData() {
  showDashboardSkeletons();
  try {
    // Consolidated fetch for complete dashboard payload
    const dashboardData = await API.getDashboard();
    if (!dashboardData) return;

    // Apply dashboard role customizations
    applyDashboardRoleCustomizations();

    const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
    const canReadFinancials = !isDesainer;

    // Sync financial metrics 100% with Keuangan Parent Consolidated data (Source of Truth)
    if (canReadFinancials) {
      try {
        const rawKeuangan = (await API.getKeuangan()) || [];
        const consolidated = typeof consolidateKeuanganList === 'function' ? consolidateKeuanganList(rawKeuangan) : rawKeuangan;
        const summary = typeof calculateKeuanganSummary === 'function' ? calculateKeuanganSummary(consolidated) : null;
        if (summary) {
          window.dashboardFinancialSummary = summary;
          if (!dashboardData.stats) dashboardData.stats = {};
          dashboardData.stats.totalPemasukan = summary.totalIn;
          dashboardData.stats.totalPengeluaran = summary.totalOut;
          dashboardData.stats.labaBersih = summary.saldo;
        }
      } catch (syncErr) {
        console.warn("Failed to sync direct keuangan summary for dashboard:", syncErr);
      }
    }

    // 1. Tampilkan Statistik Ringkasan (Role-aware)
    if (dashboardData.stats) {
      renderSummaryStats(dashboardData.stats);
    }
    // 2. Tampilkan Alert Deadline Terdekat
    renderDeadlineAlerts(dashboardData.deadlineAlerts);
    // 3. Tampilkan Proyek Terbaru (Top 5)
    renderRecentProjects(dashboardData.recentProjects);
    // 4. Render Grafik (Keuangan untuk Admin/Service, Status Distribusi untuk Designer)
    if (canReadFinancials) {
      if (dashboardData.chartData) {
        renderDashboardChart(dashboardData.chartData);
      }
    } else {
      renderDesignerProjectChart(dashboardData.stats, dashboardData.recentProjects);
    }
    // 5. Inisialisasi Kalender Deadline
    initDeadlineCalendar(dashboardData.revisiProjects || []);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
    Toast.error(
      isEn ? "Failed to Load Dashboard" : "Dashboard Gagal Dimuat",
      isEn ? "An error occurred while compiling the dashboard information." : "Terjadi kesalahan saat memproses informasi dashboard."
    );
  }
}

// Render statistic card counters dynamically according to role
function renderSummaryStats(stats) {
  window.lastDashboardStats = stats;
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  const canReadFinancials = !isDesainer;

  const totalProyek = stats.totalProyek || 0;
  const totalPemasukan = stats.totalPemasukan || 0;
  const totalPengeluaran = stats.totalPengeluaran || 0;
  const labaBersih = stats.labaBersih !== undefined ? stats.labaBersih : (totalPemasukan - totalPengeluaran);

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const projSuffix = isEn ? 'Projects' : 'Proyek';

  const statTotalEl = document.getElementById('statTotalProyek');
  if (statTotalEl) statTotalEl.textContent = `${totalProyek} ${projSuffix}`;

  if (canReadFinancials) {
    // Show Financial Metrics for Admin & Financial roles
    const title2 = document.getElementById('statCard2Title');
    if (title2) title2.textContent = isEn ? 'Income' : 'Pendapatan';
    const val2 = document.getElementById('statPendapatan');
    if (val2) {
      val2.textContent = formatFinancialDisplay(totalPemasukan);
      val2.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-green-600 mt-1 block truncate';
    }
    const icon2 = document.getElementById('statCard2Icon');
    if (icon2) icon2.className = 'bg-green-50 text-green-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title3 = document.getElementById('statCard3Title');
    if (title3) title3.textContent = isEn ? 'Expenses' : 'Pengeluaran';
    const val3 = document.getElementById('statPengeluaran');
    if (val3) {
      val3.textContent = formatFinancialDisplay(totalPengeluaran);
      val3.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-rose-600 mt-1 block truncate';
    }
    const icon3 = document.getElementById('statCard3Icon');
    if (icon3) icon3.className = 'bg-rose-50 text-rose-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title4 = document.getElementById('statCard4Title');
    if (title4) title4.textContent = isEn ? 'Net Profit' : 'Laba Bersih';
    const val4 = document.getElementById('statKeuntungan');
    if (val4) {
      val4.textContent = formatFinancialDisplay(labaBersih);
      if (labaBersih < 0 && !isFinancialsHidden) {
        val4.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-rose-600 mt-1 block truncate';
      } else {
        val4.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-indigo-600 mt-1 block truncate';
      }
    }
    const icon4 = document.getElementById('statCard4Icon');
    if (icon4) icon4.className = 'bg-indigo-50 text-indigo-600 p-2.5 md:p-3.5 rounded-xl shrink-0';
  } else {
    // Show Project Status Metrics for Desainer & Non-financial roles
    const inProgress = stats.dikerjakanCount !== undefined ? stats.dikerjakanCount : (stats.sedangDikerjakan || 0);
    const inRevision = stats.revisiCount !== undefined ? stats.revisiCount : (stats.revisi || 0);
    const completed = stats.selesaiCount !== undefined ? stats.selesaiCount : (stats.selesai || 0);

    const title2 = document.getElementById('statCard2Title');
    if (title2) title2.textContent = isEn ? 'In Progress' : 'Sedang Dikerjakan';
    const val2 = document.getElementById('statPendapatan');
    if (val2) {
      val2.textContent = `${inProgress} ${projSuffix}`;
      val2.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-amber-600 mt-1 block truncate';
    }
    const icon2 = document.getElementById('statCard2Icon');
    if (icon2) icon2.className = 'bg-amber-50 text-amber-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title3 = document.getElementById('statCard3Title');
    if (title3) title3.textContent = isEn ? 'In Revision' : 'Dalam Revisi';
    const val3 = document.getElementById('statPengeluaran');
    if (val3) {
      val3.textContent = `${inRevision} ${projSuffix}`;
      val3.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-rose-600 mt-1 block truncate';
    }
    const icon3 = document.getElementById('statCard3Icon');
    if (icon3) icon3.className = 'bg-rose-50 text-rose-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title4 = document.getElementById('statCard4Title');
    if (title4) title4.textContent = isEn ? 'Completed' : 'Selesai';
    const val4 = document.getElementById('statKeuntungan');
    if (val4) {
      val4.textContent = `${completed} ${projSuffix}`;
      val4.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-emerald-600 mt-1 block truncate';
    }
    const icon4 = document.getElementById('statCard4Icon');
    if (icon4) icon4.className = 'bg-emerald-50 text-emerald-600 p-2.5 md:p-3.5 rounded-xl shrink-0';
  }
}

// Identify and render alerts for projects with deadline <= 3 days
function renderDeadlineAlerts(deadlineAlerts) {
  const container = document.getElementById('deadlineAlertContainer');
  const list = document.getElementById('deadlineList');
  list.innerHTML = '';
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (!deadlineAlerts || deadlineAlerts.length === 0) {
    container.classList.add('hidden');
    return;
  }
  deadlineAlerts.forEach(alert => {
    let dayText = '';
    const diffDays = alert.diffDays;
    if (diffDays === 0) dayText = isEn ? 'TODAY!' : 'HARI INI!';
    else if (diffDays === 1) dayText = isEn ? 'TOMORROW!' : 'BESOK!';
    else dayText = isEn ? `${diffDays} days left` : `${diffDays} hari lagi`;
    const alertCard = document.createElement('div');
    alertCard.className = 'flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-xl text-zinc-800 shadow-sm';
    alertCard.innerHTML = `
      <div class="min-w-0 flex-1 pr-2">
        <span class="font-bold text-xs text-red-600 block tracking-wider uppercase mb-0.5">${dayText}</span>
        <span class="font-semibold text-sm text-zinc-900 block truncate">${escapeHtml(alert.namaProyek)}</span>
        <span class="text-xs text-zinc-500 truncate block">${isEn ? 'Customer' : 'Pelanggan'}: ${escapeHtml(alert.namaPelanggan)}</span>
      </div>
      <div class="flex items-center space-x-1.5 flex-shrink-0">
        <button onclick="syncCalendarPromptByProyekId('${alert.iDProyek}')" class="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-bold transition-colors" title="Tambah ke Kalender">
          <i class="fa-solid fa-calendar-plus"></i>
        </button>
        <a href="proyek.html" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
          ${isEn ? 'Check' : 'Cek'}
        </a>
      </div>
    `;
    list.appendChild(alertCard);
  });
  container.classList.remove('hidden');
  const headerTitle = container.querySelector('h4');
  if (headerTitle) {
    headerTitle.innerHTML = `<i class="fa-solid fa-bell text-rose-500 mr-1.5 animate-bounce"></i> ${isEn ? 'Upcoming Deadlines' : 'Pengingat Deadline Mendatang'} (${isEn ? '≤ 3 Days' : '≤ 3 Hari'})`;
  }
}

// Render the 5 most recent projects in lists (Hide financial nominal for Designer)
function renderRecentProjects(recent) {
  window.lastRecentProjects = recent;
  const container = document.getElementById('recentProyekList');
  container.innerHTML = '';
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;

  if (!recent || recent.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-zinc-400 text-sm">${isEn ? 'No projects registered yet.' : 'Belum ada projek terdaftar.'}</div>`;
    return;
  }
  recent.forEach(p => {
    const statusMap = isEn ? {
      'Menunggu': 'Waiting',
      'Sedang Dikerjakan': 'In Progress',
      'Revisi': 'Revision',
      'Selesai': 'Completed',
      'Belum Pembayaran': 'Unpaid',
      'Dibatalkan': 'Cancelled'
    } : {
      'Menunggu': 'Menunggu',
      'Sedang Dikerjakan': 'Sedang Dikerjakan',
      'Revisi': 'Revisi',
      'Selesai': 'Selesai',
      'Belum Pembayaran': 'Belum Pembayaran',
      'Dibatalkan': 'Dibatalkan'
    };
    const displayStatus = statusMap[p.status] || p.status || (isEn ? 'Waiting' : 'Menunggu');
    let badgeKey = String(p.status || '').toLowerCase().replace(/\s+/g, '');
    if (badgeKey === 'dikerjakan') badgeKey = 'sedangdikerjakan';
    const badgeClass = 'badge-' + badgeKey;
    const sumber = p.sumber || 'WhatsApp';
    let sourceBadge = '';
    if (sumber.toLowerCase() === 'shopee') {
      sourceBadge = `<span class="dash-micro-badge bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/80" title="Sumber: Shopee"><i class="fa-solid fa-bag-shopping text-orange-500"></i> Shopee</span>`;
    } else if (sumber.toLowerCase() === 'fiverr') {
      sourceBadge = `<span class="dash-micro-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80" title="Sumber: Fiverr"><i class="fa-solid fa-bolt text-emerald-500"></i> Fiverr</span>`;
    }
    const gdriveBtn = p.gdriveLink ? `
      <a href="${escapeHtml(p.gdriveLink)}" target="_blank" rel="noopener noreferrer" class="dash-micro-badge bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition" title="Buka Google Drive">
        <i class="fa-solid fa-folder-open text-indigo-600 dark:text-indigo-400"></i>
        <span>Drive</span>
      </a>
    ` : '';

    // Right Column: Show deadline/created date for Designer, Nominal for Admin/Service
    const rightColHtml = isDesainer ? `
      <div class="text-right flex-shrink-0">
        <span class="font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 block flex items-center justify-end gap-1">
          <i class="fa-regular fa-clock text-[10px] text-indigo-500"></i>
          <span>${escapeHtml(p.deadline || p.tanggal || '-')}</span>
        </span>
        <span class="text-[8px] text-zinc-400 dark:text-zinc-500 block mt-0.5">${p.deadline ? (isEn ? 'Deadline' : 'Deadline') : (isEn ? 'Created' : 'Tgl Dibuat')}</span>
      </div>
    ` : `
      <div class="text-right flex-shrink-0">
        <span class="font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 block">${formatFinancialDisplay(p.nominalProyek)}</span>
        <span class="text-[8px] text-zinc-400 dark:text-zinc-500 block mt-0.5">${escapeHtml(p.tanggal || '')}</span>
      </div>
    `;

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2.5 sm:p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors duration-150';
    item.innerHTML = `
      <div class="min-w-0 flex-1 pr-2">
        <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 block truncate">${escapeHtml(p.namaProyek)}</span>
        <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">${isEn ? 'Client' : 'Klien'}: ${escapeHtml(p.namaPelanggan)}</span>
        <div class="flex items-center mt-1 flex-wrap gap-1">
          <span class="dash-micro-badge ${badgeClass}">${displayStatus}</span>
          ${sourceBadge}
          ${gdriveBtn}
        </div>
      </div>
      ${rightColHtml}
    `;
    container.appendChild(item);
  });
}

// Render Designer Status Distribution Chart (No financial data)
function renderDesignerProjectChart(stats, recentProjects) {
  const canvas = document.getElementById('dashboardChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js belum siap, mencoba memuat ulang dalam 300ms...');
    setTimeout(() => renderDesignerProjectChart(stats, recentProjects), 300);
    return;
  }

  if (window.dashboardChartInstance) {
    try {
      window.dashboardChartInstance.destroy();
    } catch (e) {
      console.warn('Could not destroy previous chart instance:', e);
    }
  }

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const isDark = document.documentElement.classList.contains('dark');
  Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
  Chart.defaults.borderColor = isDark ? '#27272a' : '#f4f4f5';

  const inProgress = (stats && stats.dikerjakanCount !== undefined) ? stats.dikerjakanCount : 0;
  const inRevision = (stats && stats.revisiCount !== undefined) ? stats.revisiCount : 0;
  const waiting = (stats && stats.menungguCount !== undefined) ? stats.menungguCount : 0;
  const completed = (stats && stats.selesaiCount !== undefined) ? stats.selesaiCount : 0;

  const labels = isEn 
    ? ['In Progress', 'In Revision', 'Waiting', 'Completed'] 
    : ['Sedang Dikerjakan', 'Dalam Revisi', 'Menunggu', 'Selesai'];

  const dataValues = [inProgress, inRevision, waiting, completed];
  const bgColors = [
    'rgba(245, 158, 11, 0.85)',  // Amber
    'rgba(239, 68, 68, 0.85)',   // Rose
    'rgba(139, 92, 246, 0.85)',  // Purple
    'rgba(16, 185, 129, 0.85)'   // Emerald
  ];
  const borderColors = [
    'rgb(245, 158, 11)',
    'rgb(239, 68, 68)',
    'rgb(139, 92, 246)',
    'rgb(16, 185, 129)'
  ];

  const ctx = canvas.getContext('2d');
  window.dashboardChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'Number of Projects' : 'Jumlah Projek',
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 8,
          barPercentage: 0.55,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              return `${context.dataset.label}: ${val} ${isEn ? 'Projects' : 'Projek'}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { family: 'Inter' },
            color: isDark ? '#a1a1aa' : '#71717a'
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Inter', weight: '600' },
            color: isDark ? '#a1a1aa' : '#71717a'
          }
        }
      }
    }
  });
}
// Compile monthly finance data and render double-bar Chart
function renderDashboardChart(chartData) {
  window.lastChartData = chartData;
  const canvas = document.getElementById('dashboardChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js belum siap, mencoba memuat ulang dalam 300ms...');
    setTimeout(() => renderDashboardChart(chartData), 300);
    return;
  }

  // Destroy previous instance to avoid "Canvas is already in use" error
  if (window.dashboardChartInstance) {
    try {
      window.dashboardChartInstance.destroy();
    } catch (e) {
      console.warn('Could not destroy previous chart instance:', e);
    }
  }

  const ctx = canvas.getContext('2d');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const labels = (chartData && chartData.labels && chartData.labels.length > 0) ? chartData.labels : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
  const pemasukanData = (chartData && chartData.pemasukan && chartData.pemasukan.length > 0) ? chartData.pemasukan : [0, 0, 0, 0, 0, 0];
  const pengeluaranData = (chartData && chartData.pengeluaran && chartData.pengeluaran.length > 0) ? chartData.pengeluaran : [0, 0, 0, 0, 0, 0];

  const isDark = document.documentElement.classList.contains('dark');
  Chart.defaults.color = isDark ? '#d4d4d8' : '#52525b';
  Chart.defaults.borderColor = isDark ? '#27272a' : '#f4f4f5';

  window.dashboardChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'In (Rp)' : 'Masuk (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(34, 197, 94, 0.85)', // Green
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.7
        },
        {
          label: isEn ? 'Out (Rp)' : 'Keluar (Rp)',
          data: pengeluaranData,
          backgroundColor: 'rgba(239, 68, 68, 0.85)', // Rose
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.7
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
            font: { family: 'Inter' },
            color: isDark ? '#e4e4e7' : '#3f3f46'
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              return `${context.dataset.label}: ${formatFinancialDisplay(val)}`;
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
          afterBuildTicks: function (scale) {
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
              scale.ticks = [
                { value: 1000000 },
                { value: 3000000 },
                { value: 5000000 },
                { value: 7000000 },
                { value: 9000000 }
              ];
            }
          },
          ticks: {
            font: { family: 'Inter' },
            color: isDark ? '#a1a1aa' : '#71717a',
            callback: function (value) {
              const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
              const isMobile = window.innerWidth < 768;
              if (isMobile) {
                const allowed = [1000000, 3000000, 5000000, 7000000, 9000000];
                if (!allowed.includes(value)) return null;
              }
              if (value >= 1000000) {
                const millions = value / 1000000;
                const millionsSuffix = isEn ? 'M' : ' jt';
                return (millions % 1 === 0 ? millions : millions.toFixed(1).replace('.', ',')) + millionsSuffix;
              }
              if (value >= 1000) {
                const thousandsSuffix = isEn ? 'K' : ' rb';
                return (value / 1000) + thousandsSuffix;
              }
              return value;
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Inter' },
            color: isDark ? '#a1a1aa' : '#71717a'
          }
        }
      }
    }
  });
}
// Format Rupiah Helper
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}

// Initialize and render deadline calendar (Revision Calendar only)
let calendarCurrentDate = new Date();
function initDeadlineCalendar(revisiProjects) {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  if (!prevBtn || !nextBtn) return;

  const renderCalendar = () => {
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
    const monthsName = isEn ? [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ] : [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    document.getElementById('calendarMonthYear').textContent = `${monthsName[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const daysGrid = document.getElementById('calendarDaysGrid');
    daysGrid.innerHTML = '';

    // Create lookup by YYYY-MM-DD
    const deadlineLookup = {};
    revisiProjects.forEach(p => {
      if (p.deadline) {
        const dateStr = p.deadline;
        if (!deadlineLookup[dateStr]) {
          deadlineLookup[dateStr] = [];
        }
        deadlineLookup[dateStr].push(p);
      }
    });

    // Prev month days
    for (let i = firstDayIndex; i > 0; i--) {
      const prevDay = prevTotalDays - i + 1;
      const cell = document.createElement('div');
      cell.className = 'p-2 text-zinc-300 text-xs text-center border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/10 dark:bg-zinc-800/10 select-none';
      cell.textContent = prevDay;
      daysGrid.appendChild(cell);
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');

      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const dayDeadlines = deadlineLookup[dateString] || [];
      const hasDeadlines = dayDeadlines.length > 0;

      cell.className = `p-2 text-xs text-center border border-zinc-200 dark:border-zinc-800 rounded-xl relative cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 transition-colors flex flex-col items-center justify-between min-h-[54px] ${isToday ? 'bg-indigo-600 text-white font-bold border-indigo-600 hover:bg-indigo-700 hover:text-white shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
        }`;

      const dayNumSpan = document.createElement('span');
      dayNumSpan.className = 'font-semibold';
      dayNumSpan.textContent = day;
      cell.appendChild(dayNumSpan);

      if (hasDeadlines) {
        const dotContainer = document.createElement('div');
        dotContainer.className = 'flex space-x-1 justify-center mt-1 w-full overflow-hidden';

        // Show 1 dot/circle for each revision project
        dayDeadlines.forEach(() => {
          const dot = document.createElement('span');
          // For today, show white dots, otherwise red/rose dots
          dot.className = `w-1.5 h-1.5 rounded-full shrink-0 ${isToday ? 'bg-white' : 'bg-red-500'}`;
          dotContainer.appendChild(dot);
        });

        cell.appendChild(dotContainer);
      }

      // Clicking any day redirects to proyek.html with status=Revisi parameter
      cell.addEventListener('click', () => {
        window.location.href = 'proyek.html?status=Revisi';
      });

      daysGrid.appendChild(cell);
    }

    // Next month days trailing
    const totalCells = firstDayIndex + totalDays;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'p-2 text-zinc-300 text-xs text-center border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/10 dark:bg-zinc-800/10 select-none';
      cell.textContent = i;
      daysGrid.appendChild(cell);
    }
  };

  prevBtn.onclick = () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderCalendar();
  };

  nextBtn.onclick = () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderCalendar();
  };

  renderCalendar();
}

function showDashboardSkeletons() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');

  const skeletonText = '<div class="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse inline-block mt-1"></div>';

  // Stats
  document.getElementById('statTotalProyek').innerHTML = skeletonText;
  document.getElementById('statPendapatan').innerHTML = skeletonText;
  document.getElementById('statPengeluaran').innerHTML = skeletonText;
  document.getElementById('statKeuntungan').innerHTML = skeletonText;
  document.getElementById('statKeuntungan').className = 'block'; // reset color classes during load

  // Deadline Alerts
  const deadlineList = document.getElementById('deadlineList');
  const deadlineContainer = document.getElementById('deadlineAlertContainer');
  deadlineContainer.classList.remove('hidden');
  deadlineList.innerHTML = Array(3).fill(`
    <div class="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm animate-pulse">
      <div class="min-w-0 flex-1 pr-2 space-y-2">
        <div class="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      </div>
      <div class="w-12 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
    </div>
  `).join('');

  // Recent Projects
  const recentList = document.getElementById('recentProyekList');
  recentList.innerHTML = Array(5).fill(`
    <div class="flex items-center justify-between p-2.5 sm:p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 animate-pulse">
      <div class="min-w-0 flex-1 pr-2 space-y-1.5">
        <div class="h-3.5 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="h-2.5 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="flex gap-1.5 mt-1">
          <div class="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
          <div class="h-3.5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
        </div>
      </div>
      <div class="text-right flex-shrink-0 space-y-1.5">
        <div class="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded ml-auto"></div>
        <div class="h-2.5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded ml-auto"></div>
      </div>
    </div>
  `).join('');

  // Calendar Skeletons
  const daysGrid = document.getElementById('calendarDaysGrid');
  if (daysGrid) {
    daysGrid.innerHTML = Array(35).fill(`
      <div class="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl min-h-[54px] bg-zinc-50 dark:bg-zinc-800/50 animate-pulse">
        <div class="h-3 w-4 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto mb-2"></div>
        <div class="flex space-x-1 justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
        </div>
      </div>
    `).join('');
  }
}

// Global Calendar Sync helper for Dashboard
function syncCalendarPromptByProyekId(id) {
  if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
    API.getProyek().then(list => {
      const proyek = list.find(p => String(p.iDProyek) === String(id));
      if (proyek && typeof CalendarSync !== 'undefined') {
        CalendarSync.prompt(proyek);
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

/**
 * Display Modal: Rincian Pendapatan Berdasarkan Metode Pembayaran (QRIS, Shopee, BSI, dll)
 * Mirroring Keuangan system as the sole Source of Truth.
 */
function showIncomeBreakdownModal() {
  const isDesainer = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function') ? Auth.isDesigner() : false;
  if (isDesainer) {
    window.location.href = 'proyek.html?status=Sedang%20Dikerjakan';
    return;
  }

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const summary = window.dashboardFinancialSummary || (typeof calculateKeuanganSummary === 'function' ? calculateKeuanganSummary([]) : { totalIn: 0, totalOut: 0, saldo: 0, accountsMap: {} });
  const accountsMap = summary.accountsMap || {};
  const totalIn = summary.totalIn || 0;

  let modal = document.getElementById('dashboardIncomeBreakdownModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dashboardIncomeBreakdownModal';
    document.body.appendChild(modal);
  }

  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 transition-all duration-200';

  // Extract payment methods list
  const defaultKeys = ['QRIS', 'Shopee', 'BSI'];
  const allKeys = Array.from(new Set([...defaultKeys, ...Object.keys(accountsMap)]));

  const breakdownItems = allKeys.map(key => {
    const acc = accountsMap[key] || {
      name: key,
      totalIn: 0,
      totalOut: 0,
      txCount: 0,
      icon: key === 'QRIS' ? 'fa-solid fa-qrcode text-indigo-500' : (key === 'Shopee' ? 'fa-solid fa-bag-shopping text-orange-500' : 'fa-solid fa-building-columns text-emerald-500'),
      bgClass: key === 'QRIS' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : (key === 'Shopee' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800')
    };
    const income = acc.totalIn || 0;
    const percentage = totalIn > 0 ? Math.round((income / totalIn) * 100) : 0;
    return {
      key,
      name: acc.name || key,
      groupName: acc.groupName || acc.type || 'Metode Pembayaran',
      income,
      percentage,
      txCount: acc.txCount || 0,
      icon: acc.icon || 'fa-solid fa-wallet text-indigo-500',
      bgClass: acc.bgClass || 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
    };
  }).filter(item => defaultKeys.includes(item.key) || item.income > 0 || item.txCount > 0);

  // Sort: highest income first
  breakdownItems.sort((a, b) => b.income - a.income);

  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transform transition-all text-zinc-800 dark:text-zinc-100">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-wallet"></i>
          </div>
          <div>
            <h3 class="font-bold text-base sm:text-lg text-zinc-900 dark:text-white leading-tight">
              ${isEn ? 'Income Breakdown' : 'Rincian Pendapatan'}
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">${isEn ? 'Payment methods summary' : 'Ringkasan per metode pembayaran'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="toggleDashboardNominalPrivacy()" class="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer" title="${isFinancialsHidden ? 'Tampilkan Nominal' : 'Sembunyikan Nominal'}">
            <i class="fa-solid ${isFinancialsHidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
            <span>${isFinancialsHidden ? (isEn ? 'Show' : 'Tampilkan') : (isEn ? 'Hide' : 'Sembunyikan')}</span>
          </button>
          <button onclick="document.getElementById('dashboardIncomeBreakdownModal').classList.add('hidden')" class="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer" title="Tutup">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>
      </div>

      <!-- Total Income Summary Card -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm flex items-center justify-between gap-4">
        <div>
          <span class="text-xs font-semibold text-emerald-100 uppercase tracking-wider block">
            ${isEn ? 'Total Income' : 'Total Pendapatan'}
          </span>
          <span class="text-xl sm:text-2xl font-extrabold block mt-0.5">${formatFinancialDisplay(totalIn)}</span>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs text-white">
            <i class="fa-solid fa-shield-halved text-[10px]"></i> 100% Sinkron
          </span>
        </div>
      </div>

      <!-- Breakdown List by Payment Method -->
      <div class="space-y-2.5">
        <div class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-0.5">
          ${isEn ? 'Method Breakdown' : 'Rincian Nominal per Metode'}
        </div>

        <div class="space-y-2">
          ${breakdownItems.map(item => `
            <div class="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg ${item.bgClass} flex items-center justify-center text-sm shrink-0">
                    <i class="${item.icon}"></i>
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">${escapeHtml(item.name)}</div>
                    <div class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">${item.txCount} Transaksi (${item.percentage}%)</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="font-bold font-mono text-xs sm:text-sm text-green-600 dark:text-green-400">${formatFinancialDisplay(item.income)}</div>
                </div>
              </div>
              <!-- Progress Bar -->
              <div class="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div class="bg-green-500 h-full rounded-full transition-all duration-300" style="width: ${item.percentage}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
        <a href="keuangan.html" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline">
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          <span>${isEn ? 'Open Finance Module' : 'Buka Halaman Keuangan'}</span>
        </a>

        <button onclick="document.getElementById('dashboardIncomeBreakdownModal').classList.add('hidden')" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition cursor-pointer">
          ${isEn ? 'Close' : 'Tutup'}
        </button>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  };
}
window.showIncomeBreakdownModal = showIncomeBreakdownModal;



