

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
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

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    alert('Terjadi kesalahan saat memproses informasi dashboard.');
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
    if (statusLower === 'selesai' || statusLower === 'sudah diambil' || statusLower === 'dibatalkan') {
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
      alertCard.className = 'flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-xl text-slate-800 shadow-sm';
      alertCard.innerHTML = `
        <div class="min-w-0 flex-1 pr-2">
          <span class="font-bold text-xs text-red-600 block tracking-wider uppercase mb-0.5">${dayText}</span>
          <span class="font-semibold text-sm text-slate-900 block truncate">${proyek.namaProyek}</span>
          <span class="text-xs text-slate-500 truncate block">Pelanggan: ${proyek.namaPelanggan}</span>
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
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Belum ada proyek terdaftar.</div>`;
    return;
  }

  // Ambil maksimal 5 proyek terakhir (mengacu dari belakang array)
  const recent = [...proyekList].reverse().slice(0, 5);

  recent.forEach(p => {
    const badgeClass = 'badge-' + p.status.toLowerCase().replace(/\s+/g, '');
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-150';
    item.innerHTML = `
      <div class="min-w-0 flex-1 pr-2">
        <span class="font-bold text-sm text-slate-900 block truncate">${p.namaProyek}</span>
        <span class="text-xs text-slate-500 block truncate">Klien: ${p.namaPelanggan}</span>
        <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeClass}">${p.status}</span>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="font-bold text-sm text-slate-800 block">${formatRupiah(p.nominalProyek)}</span>
        <span class="text-[10px] text-slate-400 block">${p.tanggal}</span>
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
          ticks: {
            font: { family: 'Inter' },
            callback: function (value) {
              return 'Rp ' + value.toLocaleString('id-ID');
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
