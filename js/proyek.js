let table; // Global table instance
let currentProyek = null;
document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (!CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Live API (Google sheets)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }
  // Load Data
  loadProyekData();
});
// Load proyek data and initialize DataTables
async function loadProyekData() {
  try {
    const listProyek = await API.getProyek();
    updateStatusCounters(listProyek);
    initTable(listProyek);
  } catch (error) {
    console.error('Gagal memuat data proyek:', error);

    showToast({
      title: "Data Proyek",
      message: "Terjadi kesalahan saat memuat data proyek.",
      type: "error"
    });
  }
}
// Update status summary numbers on dashboard/top badges
function updateStatusCounters(proyekList) {
  const counts = {
    all: proyekList.length,
    menunggu: 0,
    dikerjakan: 0,
    selesai: 0,
    belumpembayaran: 0
  };
  proyekList.forEach(p => {
    const status = p.status.toLowerCase();
    if (status === 'menunggu') counts.menunggu++;
    else if (status === 'sedang dikerjakan') counts.dikerjakan++;
    else if (status === 'selesai') counts.selesai++;
    else if (status === 'belum pembayaran') counts.belumpembayaran++;
  });
  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-menunggu').textContent = counts.menunggu;
  document.getElementById('count-dikerjakan').textContent = counts.dikerjakan;
  document.getElementById('count-selesai').textContent = counts.selesai;
  document.getElementById('count-belumpembayaran').textContent = counts.belumpembayaran;
}
// Initialize DataTables with customized styles and features
function initTable(data) {
  // Destroy existing table if any
  if ($.fn.DataTable.isDataTable('#proyekTable')) {
    $('#proyekTable').DataTable().destroy();
  }
  table = $('#proyekTable').DataTable({
    data: data,
    columns: [
      { data: 'iDProyek', className: 'hidden md:table-cell' },
      { data: 'tanggal' },
      { data: 'namaProyek' },
      { data: 'namaPelanggan', className: 'hidden md:table-cell' },
      {
        data: 'nomorWA',
        render: function (data) {
          return `+${data}`;
        }
      },
      {
        data: 'nominalProyek',
        render: function (data) {
          return formatRupiah(data);
        }
      },
      {
        data: 'sisaPembayaran',
        className: 'hidden md:table-cell',
        render: function (data) {
          if (data > 0) {
            return `<span class="text-rose-600 font-semibold">${formatRupiah(data)}</span>`;
          }
          return `<span class="text-green-600 font-semibold">Lunas</span>`;
        }
      },
      { data: 'deadline' },
      {
        data: 'status',
        render: function (data) {
          const badgeClass = 'badge-' + data.toLowerCase().replace(/\s+/g, '');
          return `<span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${badgeClass}">${data}</span>`;
        }
      },
      {
        data: null,
        orderable: false,
        render: function (data) {
          return `
            <div class="flex space-x-1.5">
              <button onclick="viewDetail('${data.iDProyek}')" class="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-semibold" title="Detail Proyek">
                <i class="fa-solid fa-eye"></i>
              </button>
              <a href="tambah-proyek.html?id=${data.iDProyek}" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold" title="Edit Proyek">
                <i class="fa-solid fa-pen"></i>
              </a>
              <button onclick="hapusProyek('${data.iDProyek}', '${data.namaProyek}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold" title="Hapus Proyek">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;
        }
      }
    ],
    order: [[0, 'desc']], // Urutkan berdasarkan ID proyek terbaru
    language: {
      search: "Cari Proyek:",
      lengthMenu: "Tampilkan _MENU_ proyek",
      info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ proyek",
      infoEmpty: "Menampilkan 0 sampai 0 dari 0 proyek",
      infoFiltered: "(disaring dari _MAX_ total proyek)",
      paginate: {
        first: "Pertama",
        last: "Terakhir",
        next: "Lanjut",
        previous: "Sebelum"
      },
      zeroRecords: "Tidak ada data proyek ditemukan"
    }
  });
}
// Filter status by badges
function filterStatus(status) {
  // Hapus warna ring aktif pada filter sebelumnya
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-indigo-500');
  });
  // Tambah ring aktif pada filter saat ini
  const activeBtn = event.currentTarget;
  if (activeBtn) {
    activeBtn.classList.add('ring-2', 'ring-indigo-500');
  }
  if (status === 'all') {
    table.column(8).search('').draw();
  } else {
    // Regex exact match agar status tidak saling menyaring
    table.column(8).search('^' + status + '$', true, false).draw();
  }
}
// View Project details inside Modal
async function viewDetail(id) {
  try {
    const list = await API.getProyek();
    const proyek = list.find(p => p.iDProyek === id);
    currentProyek = proyek;
    if (proyek) {
      document.getElementById('modalId').textContent = proyek.iDProyek;
      document.getElementById('modalPelanggan').textContent = proyek.namaPelanggan;
      document.getElementById('modalWa').textContent = `+${proyek.nomorWA}`;
      document.getElementById('modalNamaProyek').textContent = proyek.namaProyek;
      document.getElementById('modalProduk').textContent = proyek.produk || proyek.jenisProduk || '-';
      document.getElementById('modalJumlah').textContent = proyek.jumlah;
      document.getElementById('modalSatuan').textContent = proyek.satuan;
      document.getElementById('modalNominal').textContent = formatRupiah(proyek.nominalProyek);
      document.getElementById('modalDp').textContent = formatRupiah(proyek.dP);
      document.getElementById('modalSisa').textContent = formatRupiah(proyek.sisaPembayaran);
      document.getElementById('modalDeadline').textContent = proyek.deadline;
      document.getElementById('modalCatatan').textContent = proyek.catatan || 'Tidak ada catatan.';
      // Style badge status
      const statusBadge = document.getElementById('modalStatus');
      statusBadge.textContent = proyek.status;
      statusBadge.className = `inline-block px-2.5 py-1 text-xs font-semibold rounded-full badge-${proyek.status.toLowerCase().replace(/\s+/g, '')}`;
      // Edit Button
      document.getElementById('modalEditBtn').onclick = () => {
        window.location.href = `tambah-proyek.html?id=${proyek.iDProyek}`;
      };
      document.getElementById("modalInvoiceBtn").onclick = () => {
        window.location.href =
          "invoice.html?id=" + proyek.iDProyek;
      };
      // Hapus Button
      document.getElementById('modalHapusBtn').onclick = () => {
        closeModal();
        hapusProyek(proyek.iDProyek, proyek.namaProyek);
      };
      // WA Button
      const waText = encodeURIComponent(CONFIG.WA_TEMPLATE);
      const waUrl = `https://api.whatsapp.com/send?phone=${proyek.nomorWA}&text=${waText}`;
      document.getElementById('modalWaBtn').href = waUrl;
      // Show Modal
      document.getElementById('detailModal').classList.remove('hidden');
    }
  } catch (error) {
    console.error(error);

    showToast({
      title: "Detail Proyek",
      message: "Gagal memuat detail proyek.",
      type: "error"
    });
  }
}

// Close Modal
function closeModal() {
  document.getElementById('detailModal').classList.add('hidden');
}
// Hapus Proyek Action
async function hapusProyek(id, name) {
  console.log("ID yang akan dihapus =", id);
  if (confirm(`Apakah Anda yakin ingin menghapus proyek "${id} - ${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
    try {
      const res = await API.deleteProyek(id);
      if (res.success) {
        showToast({
          title: "Berhasil",
          message: "Proyek berhasil dihapus.",
          type: "success"
        });
        loadProyekData(); // Refresh data
      } else {
        showToast({
          title: "Gagal",
          message: res.message,
          type: "error"
        });
      }
    } catch (e) {
      console.error(e);

      showToast({
        title: "Error",
        message: "Terjadi kesalahan saat menghapus proyek.",
        type: "error"
      });
    }
  }
}
async function generateAI(jenis) {

  if (!currentProyek) {

    showToast({
      title: "AI",
      message: "Data proyek belum dipilih.",
      type: "error"
    });

    return;
  }

  showToast({
    title: "AI",
    message: "Sedang membuat teks...",
    type: "info"
  });

  const data = {
    ...currentProyek,
    jenis
  };

  const result = await API.generateAI(data);

  if (!result.success) {

    showToast({
      title: "AI",
      message: result.message,
      type: "error"
    });

    return;
  }

  document.getElementById("hasilAI").value = result.text;

}

function copyAIText() {
  const text = document.getElementById("hasilAI").value;
  navigator.clipboard.writeText(text);
  showToast({
    title: "AI",
    message: "Teks berhasil disalin.",
    type: "success"
  });
}

function sendAIWhatsapp() {
  if (!currentProyek || !currentProyek.nomorWA) {
    showToast({
      title: "Error",
      message: "Data proyek atau nomor WhatsApp tidak tersedia.",
      type: "error"
    });
    return;
  }

  const text = document.getElementById("hasilAI").value;
  if (!text.trim()) {
    showToast({
      title: "Warning",
      message: "Teks AI masih kosong. Silakan generate terlebih dahulu.",
      type: "warning"
    });
    return;
  }

  const waText = encodeURIComponent(text);
  const waUrl = `https://api.whatsapp.com/send?phone=${currentProyek.nomorWA}&text=${waText}`;
  window.open(waUrl, '_blank');
}

// Format Rupiah Helper
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}


