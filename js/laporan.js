let chartInstance; // Global chart handle

document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }

  // Set tanggal cetak
  const printDateEl = document.getElementById('printDate');
  if (printDateEl) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    printDateEl.textContent = new Date().toLocaleDateString('id-ID', options);
  }

  // Load Laporan Data
  loadLaporanData();
});

// Load all project and financial data and compile reports
async function loadLaporanData() {
  try {
    const proyekList = await API.getProyek();
    const keuanganList = await API.getKeuangan();

    renderOverviewCards(proyekList, keuanganList);
    const monthlySummary = compileMonthlyData(keuanganList);
    renderMonthlySummaryList(monthlySummary);
    renderChart(monthlySummary);

  } catch (error) {
    console.error('Error loading laporan data:', error);
    alert('Terjadi kesalahan saat memproses laporan keuangan.');
  }
}

// Populate the top summary cards
function renderOverviewCards(proyekList, keuanganList) {
  const totalProyek = proyekList.length;
  let totalOmzet = 0;
  let totalDp = 0;
  let totalPiutang = 0;
  let totalPengeluaran = 0;

  proyekList.forEach(p => {
    totalOmzet += Number(p.nominal) || 0;
    totalDp += Number(p.dp) || 0;
    totalPiutang += Number(p.sisa) || 0;
  });

  keuanganList.forEach(k => {
    if (k.jenis === 'Pengeluaran') {
      totalPengeluaran += Number(k.nominal) || 0;
    }
  });

  const estimasiLaba = totalOmzet - totalPengeluaran;

  document.getElementById('recapTotalProyek').textContent = `${totalProyek} Proyek`;
  document.getElementById('recapTotalOmzet').textContent = formatRupiah(totalOmzet);
  document.getElementById('recapTotalDp').textContent = formatRupiah(totalDp);
  document.getElementById('recapTotalPiutang').textContent = formatRupiah(totalPiutang);
  document.getElementById('recapTotalPengeluaran').textContent = formatRupiah(totalPengeluaran);

  const labaEl = document.getElementById('recapTotalLaba');
  labaEl.textContent = formatRupiah(estimasiLaba);
  if (estimasiLaba < 0) {
    labaEl.className = 'text-xl font-extrabold text-rose-600';
  } else {
    labaEl.className = 'text-xl font-extrabold text-emerald-600';
  }
}

// Helper to group transactions by Month-Year
function compileMonthlyData(keuanganList) {
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

  // Urutkan berdasarkan urutan kronologis waktu
  return Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey);
}

// Render the sidebar monthly listing
function renderMonthlySummaryList(monthlyList) {
  const container = document.getElementById('monthlySummaryContainer');
  container.innerHTML = '';

  if (monthlyList.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">Belum ada mutasi keuangan tercatat.</div>`;
    return;
  }

  // Tampilkan dari bulan terbaru
  const reversedList = [...monthlyList].reverse();

  reversedList.forEach(item => {
    const profit = item.pemasukan - item.pengeluaran;
    const itemEl = document.createElement('div');
    itemEl.className = 'p-4 border border-slate-100 rounded-xl space-y-1.5 bg-slate-50';
    itemEl.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold text-slate-800 text-sm">${item.monthLabel}</span>
        <span class="text-xs font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
          Profit: ${formatRupiah(profit)}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>Masuk: <span class="text-emerald-600 font-medium">${formatRupiah(item.pemasukan)}</span></div>
        <div class="text-right">Keluar: <span class="text-rose-600 font-medium">${formatRupiah(item.pengeluaran)}</span></div>
      </div>
    `;
    container.appendChild(itemEl);
  });
}

// Render chart using Chart.js
function renderChart(monthlyList) {
  const ctx = document.getElementById('laporanChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = monthlyList.map(item => item.monthLabel);
  const pemasukanData = monthlyList.map(item => item.pemasukan);
  const pengeluaranData = monthlyList.map(item => item.pengeluaran);

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pemasukan (Rp)',
          data: pemasukanData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Pengeluaran (Rp)',
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

// Client-side Excel Export using SheetJS (xlsx.full.min.js)
async function exportToExcel() {
  try {
    const proyek = await API.getProyek();
    const keuangan = await API.getKeuangan();

    // 1. Siapkan Sheet Proyek
    const wsProyekData = proyek.map(p => ({
      'ID Proyek': p.id,
      'Tanggal Input': p.tanggal,
      'Nama Proyek': p.namaProyek,
      'Nama Pelanggan': p.pelanggan,
      'No WhatsApp': p.wa,
      'Jenis Produk': p.produk || '-',
      'Jumlah': p.jumlah,
      'Satuan': p.satuan,
      'Harga Satuan (Rp)': p.hargaSatuan || 0,
      'Nominal Proyek (Rp)': p.nominal,
      'DP (Rp)': p.dp,
      'Sisa Tagihan (Rp)': p.sisa,
      'Tenggat Waktu': p.deadline,
      'Status': p.status,
      'Catatan': p.catatan || ''
    }));

    // 2. Siapkan Sheet Keuangan
    const wsKeuanganData = keuangan.map(k => ({
      'ID Transaksi': k.id,
      'Tanggal': k.tanggal,
      'Jenis Mutasi': k.jenis,
      'Keterangan': k.keterangan,
      'Nominal (Rp)': k.nominal
    }));

    // Buat Workbook dan pasangkan sheet
    const wb = XLSX.utils.book_new();

    const wsProyek = XLSX.utils.json_to_sheet(wsProyekData);
    const wsKeuangan = XLSX.utils.json_to_sheet(wsKeuanganData);

    XLSX.utils.book_append_sheet(wb, wsProyek, 'Daftar Proyek');
    XLSX.utils.book_append_sheet(wb, wsKeuangan, 'Buku Kas & Keuangan');

    // Trigger unduhan file excel
    XLSX.writeFile(wb, 'Laporan_FPManager.xlsx');

  } catch (error) {
    console.error(error);
    alert('Terjadi kesalahan saat mengekspor data ke Excel');
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
