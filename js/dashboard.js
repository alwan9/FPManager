document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }
  // Load Dashboard Data
  loadDashboardData();
});
// Load all project and financial data for dashboard cards and charts
async function loadDashboardData() {
  try {
    const proyekList = await API.getProyek();
    const keuanganList = await API.getKeuangan();
    // 1. Hitung Statistik Ringkasan
    renderSummaryStats(proyekList, keuanganList);
    // 2. Tampilkan Alert Deadline Terdekat
    renderDeadlineAlerts(proyekList);
    // 3. Tampilkan Proyek Terbaru (Top 5)
    renderRecentProjects(proyekList);
    // 4. Render Grafik Keuangan Bulanan
    renderDashboardChart(keuanganList);
    // 5. Inisialisasi Kalender Deadline
    initDeadlineCalendar(proyekList);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    Toast.error(
      "Dashboard Gagal Dimuat",
      "Terjadi kesalahan saat memproses informasi dashboard."
    );
  }
}
// Calculate and render statistic card counters
function renderSummaryStats(proyekList, keuanganList) {
  const totalProyek = proyekList.length;
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  keuanganList.forEach(k => {
    const nominal = Number(k.nominal) || 0;
    if (k.jenis === 'Pemasukan') {
      totalPemasukan += nominal;
    } else if (k.jenis === 'Pengeluaran') {
      totalPengeluaran += nominal;
    }
  });
  const labaBersih = totalPemasukan - totalPengeluaran;
  document.getElementById('statTotalProyek').textContent = `${totalProyek} Proyek`;
  document.getElementById('statPendapatan').textContent = formatRupiah(totalPemasukan);
  document.getElementById('statPengeluaran').textContent = formatRupiah(totalPengeluaran);
  const labaEl = document.getElementById('statKeuntungan');
  labaEl.textContent = formatRupiah(labaBersih);
  if (labaBersih < 0) {
    labaEl.className = 'text-2xl font-extrabold text-rose-600 mt-1 block';
  } else {
    labaEl.className = 'text-2xl font-extrabold text-indigo-600 mt-1 block';
  }
}
// Identify and render alerts for projects with deadline <= 3 days
function renderDeadlineAlerts(proyekList) {
  const container = document.getElementById('deadlineAlertContainer');
  const list = document.getElementById('deadlineList');
  list.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let alertCount = 0;
  proyekList.forEach(proyek => {
    // Abaikan proyek yang sudah selesai/diambil/dibatalkan
    const statusLower = proyek.status.toLowerCase();
    if (statusLower === 'selesai' || statusLower === 'belum pembayaran' || statusLower === 'dibatalkan') {
      return;
    }
    if (!proyek.deadline) return;
    const deadlineDate = new Date(proyek.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Jika deadline mepet (<= 3 hari)
    if (diffDays >= 0 && diffDays <= 3) {
      alertCount++;
      let dayText = '';
      if (diffDays === 0) dayText = 'HARI INI!';
      else if (diffDays === 1) dayText = 'BESOK!';
      else dayText = `${diffDays} hari lagi`;
      const alertCard = document.createElement('div');
      alertCard.className = 'flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-xl text-zinc-800 shadow-sm';
      alertCard.innerHTML = `
        <div class="min-w-0 flex-1 pr-2">
          <span class="font-bold text-xs text-red-600 block tracking-wider uppercase mb-0.5">${dayText}</span>
          <span class="font-semibold text-sm text-zinc-900 block truncate">${proyek.namaProyek}</span>
          <span class="text-xs text-zinc-500 truncate block">Pelanggan: ${proyek.namaPelanggan}</span>
        </div>
        <a href="proyek.html" class="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
          Cek
        </a>
      `;
      list.appendChild(alertCard);
    }
  });
  if (alertCount > 0) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}
// Render the 5 most recent projects in lists
function renderRecentProjects(proyekList) {
  const container = document.getElementById('recentProyekList');
  container.innerHTML = '';
  if (proyekList.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-zinc-400 text-sm">Belum ada projek terdaftar.</div>`;
    return;
  }
  // Ambil maksimal 5 proyek terakhir (mengacu dari belakang array)
  const recent = [...proyekList].reverse().slice(0, 5);
  recent.forEach(p => {
    const badgeClass = 'badge-' + p.status.toLowerCase().replace(/\s+/g, '');
    const gdriveBtn = p.gdriveLink ? `
      <a href="${p.gdriveLink}" target="_blank" class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-semibold border border-indigo-100 transition ml-2 align-middle" title="Buka Google Drive">
        <i class="fa-solid fa-folder-open text-indigo-600"></i>
        <span>Drive</span>
      </a>
    ` : '';
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 border border-zinc-100 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors duration-150';
    item.innerHTML = `
      <div class="min-w-0 flex-1 pr-2">
        <span class="font-bold text-sm text-zinc-900 block truncate">${p.namaProyek}</span>
        <span class="text-xs text-zinc-500 block truncate">Klien: ${p.namaPelanggan}</span>
        <div class="flex items-center mt-1">
          <span class="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeClass}">${p.status}</span>
          ${gdriveBtn}
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="font-bold text-sm text-zinc-800 block">${formatRupiah(p.nominalProyek)}</span>
        <span class="text-[10px] text-zinc-400 block mt-1">${p.tanggal}</span>
      </div>
    `;
    container.appendChild(item);
  });
}
// Compile monthly finance data and render double-bar Chart
function renderDashboardChart(keuanganList) {
  const ctx = document.getElementById('dashboardChart').getContext('2d');
  // Group by Month-Year
  const monthlyData = {};
  keuanganList.forEach(k => {
    if (!k.tanggal) return;
    const date = new Date(k.tanggal);
    const monthName = date.toLocaleString('id-ID', { month: 'short' });
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
    const nominal = Number(k.nominal) || 0;
    if (k.jenis === 'Pemasukan') {
      monthlyData[key].pemasukan += nominal;
    } else if (k.jenis === 'Pengeluaran') {
      monthlyData[key].pengeluaran += nominal;
    }
  });
  // Urutkan dan ambil maksimal 6 bulan terakhir
  const sortedMonths = Object.values(monthlyData)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-6);
  const labels = sortedMonths.map(item => item.monthLabel);
  const pemasukanData = sortedMonths.map(item => item.pemasukan);
  const pengeluaranData = sortedMonths.map(item => item.pengeluaran);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Masuk (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Keluar (Rp)',
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
              const isMobile = window.innerWidth < 768;
              if (isMobile) {
                const allowed = [1000000, 3000000, 5000000, 7000000, 9000000];
                if (!allowed.includes(value)) return null;
              }
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions : millions.toFixed(1).replace('.', ',')) + ' jt';
              }
              if (value >= 1000) {
                return (value / 1000) + ' rb';
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
function initDeadlineCalendar(proyekList) {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  if (!prevBtn || !nextBtn) return;

  const renderCalendar = () => {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    const monthsName = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    document.getElementById('calendarMonthYear').textContent = `${monthsName[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const daysGrid = document.getElementById('calendarDaysGrid');
    daysGrid.innerHTML = '';

    // Filter project list to only show projects with status 'Revisi'
    const revisiProjects = proyekList.filter(p => p.status && p.status.toLowerCase() === 'revisi');

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

      cell.className = `p-2 text-xs text-center border border-zinc-200 dark:border-zinc-800 rounded-xl relative cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors flex flex-col items-center justify-between min-h-[54px] ${
        isToday ? 'bg-red-600 text-white font-bold border-red-600 hover:bg-red-700 hover:text-white' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
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


