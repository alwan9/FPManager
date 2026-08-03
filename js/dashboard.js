document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.textContent = 'Live API (Google Sheets)';
    apiStatusBadge.className = 'hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
  }
  
  // Apply role & permission customizations to dashboard UI
  applyDashboardRoleCustomizations();

  // Load Dashboard Data
  loadDashboardData();
});

// Customize Dashboard UI elements according to logged-in User Role and Permissions
function applyDashboardRoleCustomizations() {
  const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
  if (!user) return;

  const role = (user.role || 'service').toLowerCase().trim();
  const isSuperAdmin = (user.username === "wansmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));
  const isDesainer = role.includes("desainer") || role.includes("designer");
  const canReadFinancials = isSuperAdmin || (typeof Auth !== 'undefined' && Auth.hasPermission("keuangan:read"));
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  // 1. Customize Welcome Banner Title & Description
  const welcomeTitle = document.querySelector('[data-i18n="dash-welcome"]');
  const welcomeDesc = document.querySelector('[data-i18n="dash-desc"]');

  if (welcomeTitle) {
    if (isSuperAdmin) {
      welcomeTitle.textContent = isEn ? "Welcome Super Admin! 👋" : "Selamat Datang Super Admin! 👋";
    } else if (isDesainer) {
      welcomeTitle.textContent = isEn ? `Welcome ${user.name || 'Designer'}! 🎨` : `Selamat Datang ${user.name || 'Desainer'}! 🎨`;
    } else {
      welcomeTitle.textContent = isEn ? `Welcome ${user.name || 'Staff'}! 👋` : `Selamat Datang ${user.name || 'Staff'}! 👋`;
    }
  }

  if (welcomeDesc) {
    if (isDesainer) {
      welcomeDesc.textContent = isEn ? "Here is the summary of your design projects and upcoming revision deadlines." : "Berikut adalah ringkasan projek desain dan kalender revisi hari ini.";
    } else if (!canReadFinancials) {
      welcomeDesc.textContent = isEn ? "Here is the summary of your active projects and task deadlines." : "Berikut adalah ringkasan projek dan deadline tugas hari ini.";
    }
  }

  // 2. Hide/Show Financial Chart & Adjust Layout for Non-Financial Roles
  const chartCard = document.getElementById('chartCard');
  const recentProjectsCard = document.getElementById('recentProjectsCard');

  if (!canReadFinancials) {
    if (chartCard) chartCard.classList.add('hidden');
    if (recentProjectsCard) {
      recentProjectsCard.className = 'lg:col-span-3 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm flex flex-col justify-between';
    }
  } else {
    if (chartCard) chartCard.classList.remove('hidden');
    if (recentProjectsCard) {
      recentProjectsCard.className = 'bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm flex flex-col justify-between';
    }
  }
}

// Load all project and financial data for dashboard cards and charts
async function loadDashboardData() {
  showDashboardSkeletons();
  try {
    // Single consolidated fetch to drastically reduce dashboard loading latency
    const dashboardData = await API.getDashboard();
    if (!dashboardData) return;

    // Apply dashboard role customizations
    applyDashboardRoleCustomizations();

    // 1. Tampilkan Statistik Ringkasan (Role-aware)
    if (dashboardData.stats) {
      renderSummaryStats(dashboardData.stats);
    }
    // 2. Tampilkan Alert Deadline Terdekat
    renderDeadlineAlerts(dashboardData.deadlineAlerts);
    // 3. Tampilkan Proyek Terbaru (Top 5)
    renderRecentProjects(dashboardData.recentProjects);
    // 4. Render Grafik Keuangan Bulanan (jika diizinkan)
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    const role = (user && user.role) ? user.role.toLowerCase().trim() : 'service';
    const isSuperAdmin = (user && (user.username === "wansmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin")));
    const canReadFinancials = isSuperAdmin || (typeof Auth !== 'undefined' && Auth.hasPermission("keuangan:read"));
    
    if (canReadFinancials && dashboardData.chartData) {
      renderDashboardChart(dashboardData.chartData);
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

// Render statistic card counters dynamically according to role & permissions
function renderSummaryStats(stats) {
  const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
  const role = (user && user.role) ? user.role.toLowerCase().trim() : 'service';
  const isSuperAdmin = (user && (user.username === "wansmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin")));
  const canReadFinancials = isSuperAdmin || (typeof Auth !== 'undefined' && Auth.hasPermission("keuangan:read"));

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
      val2.textContent = formatRupiah(totalPemasukan);
      val2.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-emerald-600 mt-1 block truncate';
    }
    const icon2 = document.getElementById('statCard2Icon');
    if (icon2) icon2.className = 'bg-emerald-50 text-emerald-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title3 = document.getElementById('statCard3Title');
    if (title3) title3.textContent = isEn ? 'Expenses' : 'Pengeluaran';
    const val3 = document.getElementById('statPengeluaran');
    if (val3) {
      val3.textContent = formatRupiah(totalPengeluaran);
      val3.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-rose-600 mt-1 block truncate';
    }
    const icon3 = document.getElementById('statCard3Icon');
    if (icon3) icon3.className = 'bg-rose-50 text-rose-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

    const title4 = document.getElementById('statCard4Title');
    if (title4) title4.textContent = isEn ? 'Net Profit' : 'Laba Bersih';
    const val4 = document.getElementById('statKeuntungan');
    if (val4) {
      val4.textContent = formatRupiah(labaBersih);
      if (labaBersih < 0) {
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
      val3.className = 'text-base sm:text-lg md:text-2xl font-extrabold text-red-600 mt-1 block truncate';
    }
    const icon3 = document.getElementById('statCard3Icon');
    if (icon3) icon3.className = 'bg-red-50 text-red-600 p-2.5 md:p-3.5 rounded-xl shrink-0';

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
        <span class="font-semibold text-sm text-zinc-900 block truncate">${alert.namaProyek}</span>
        <span class="text-xs text-zinc-500 truncate block">${isEn ? 'Customer' : 'Pelanggan'}: ${alert.namaPelanggan}</span>
      </div>
      <div class="flex items-center space-x-1.5 flex-shrink-0">
        <button onclick="syncCalendarPromptByProyekId('${alert.iDProyek}')" class="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors" title="Tambah ke Kalender">
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
// Render the 5 most recent projects in lists
function renderRecentProjects(recent) {
  const container = document.getElementById('recentProyekList');
  container.innerHTML = '';
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
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
    const displayStatus = statusMap[p.status] || p.status;
    const badgeClass = 'badge-' + p.status.toLowerCase().replace(/\s+/g, '');
    const gdriveBtn = p.gdriveLink ? `
      <a href="${p.gdriveLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[8px] font-semibold border border-indigo-100 transition ml-2 align-middle" title="Buka Google Drive">
        <i class="fa-solid fa-folder-open text-indigo-600 text-[8px]"></i>
        <span>Drive</span>
      </a>
    ` : '';
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors duration-150';
    item.innerHTML = `
      <div class="min-w-0 flex-1 pr-2">
        <span class="font-bold text-sm text-zinc-900 block truncate">${p.namaProyek}</span>
        <span class="text-[10px] text-zinc-500 block truncate">${isEn ? 'Client' : 'Klien'}: ${p.namaPelanggan}</span>
        <div class="flex items-center mt-1">
          <span class="inline-block px-1.5 py-0.5 text-[8px] font-semibold rounded-full ${badgeClass}">${displayStatus}</span>
          ${gdriveBtn}
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="font-bold text-xs text-zinc-800 block">${formatRupiah(p.nominalProyek)}</span>
        <span class="text-[8px] text-zinc-400 block mt-1">${p.tanggal}</span>
      </div>
    `;
    container.appendChild(item);
  });
}
// Compile monthly finance data and render double-bar Chart
function renderDashboardChart(chartData) {
  const ctx = document.getElementById('dashboardChart').getContext('2d');
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const labels = chartData.labels || [];
  const pemasukanData = chartData.pemasukan || [];
  const pengeluaranData = chartData.pengeluaran || [];
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: isEn ? 'In (Rp)' : 'Masuk (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: isEn ? 'Out (Rp)' : 'Keluar (Rp)',
          data: pengeluaranData,
          backgroundColor: 'rgba(239, 68, 68, 0.85)', // Rose
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
        }
      },
      scales: {
        y: {
          beginAtZero: true,
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
          ticks: {
            font: { family: 'Inter' }
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

      cell.className = `p-2 text-xs text-center border border-zinc-200 dark:border-zinc-800 rounded-xl relative cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors flex flex-col items-center justify-between min-h-[54px] ${isToday ? 'bg-red-600 text-white font-bold border-red-600 hover:bg-red-700 hover:text-white' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
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
    <div class="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 animate-pulse">
      <div class="min-w-0 flex-1 pr-2 space-y-2">
        <div class="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="flex gap-2 mt-1">
          <div class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
        </div>
      </div>
      <div class="text-right flex-shrink-0 space-y-2">
        <div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
        <div class="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded ml-auto"></div>
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



