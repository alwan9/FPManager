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
    window.allProyekList = listProyek; // Cache list globally for status updates

    // Add statusOrder property dynamically
    listProyek.forEach(p => {
      p.statusOrder = (p.status && p.status.toLowerCase() === 'dibatalkan') ? 1 : 0;
    });

    updateStatusCounters(listProyek);
    initTable(listProyek);

    // Apply URL status filter if present
    const urlParams = new URLSearchParams(window.location.search);
    const statusFilter = urlParams.get('status');
    if (statusFilter) {
      filterStatus(statusFilter);

      // Auto-focus the filter button
      const btns = document.querySelectorAll('.status-filter-btn');
      btns.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(statusFilter)) {
          btn.classList.add('ring-2', 'ring-indigo-500');
        } else {
          btn.classList.remove('ring-2', 'ring-indigo-500');
        }
      });

      // If filtering by 'Revisi', sort by deadline (column index 8) ascending (closest deadline first)
      if (statusFilter.toLowerCase() === 'revisi') {
        table.order([8, 'asc']).draw();
      }
    }
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
    revisi: 0,
    selesai: 0,
    belumpembayaran: 0
  };
  proyekList.forEach(p => {
    const status = p.status.toLowerCase();
    if (status === 'menunggu') counts.menunggu++;
    else if (status === 'sedang dikerjakan') counts.dikerjakan++;
    else if (status === 'revisi') counts.revisi++;
    else if (status === 'selesai') counts.selesai++;
    else if (status === 'belum pembayaran') counts.belumpembayaran++;
  });
  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-menunggu').textContent = counts.menunggu;
  document.getElementById('count-dikerjakan').textContent = counts.dikerjakan;

  const countRevisiEl = document.getElementById('count-revisi');
  if (countRevisiEl) {
    countRevisiEl.textContent = counts.revisi;
  }

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
    autoWidth: false,
    data: data,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center w-10',
        render: function (data) {
          return `<input type="checkbox" value="${data.iDProyek}" class="proyek-checkbox rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer align-middle">`;
        }
      },
      { data: 'iDProyek', className: 'hidden md:table-cell' },
      { data: 'tanggal', visible: false },
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
          const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
          if (data > 0) {
            return `<span class="text-rose-600 font-semibold">${formatRupiah(data)}</span>`;
          }
          return `<span class="text-green-600 font-semibold">${isEn ? 'Paid' : 'Lunas'}</span>`;
        }
      },
      { data: 'deadline' },
      {
        data: 'status',
        render: function (data, type, row) {
          if (type === 'display') {
            const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
            const statusOptions = ['Menunggu', 'Sedang Dikerjakan', 'Revisi', 'Selesai', 'Belum Pembayaran', 'Dibatalkan'];
            const statusLabels = isEn ? {
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
            const badgeClass = 'badge-' + data.toLowerCase().replace(/\s+/g, '');

            let selectHtml = `<select onchange="updateProyekStatus('${row.iDProyek}', this.value)" class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${badgeClass}" style="appearance: none; -webkit-appearance: none; text-align-last: center; padding-right: 1.5rem; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.5rem top 50%; background-size: 0.65rem auto;">`;

            statusOptions.forEach(opt => {
              const selected = (opt.toLowerCase() === data.toLowerCase()) ? 'selected' : '';
              selectHtml += `<option value="${opt}" ${selected} class="bg-white text-zinc-800">${statusLabels[opt] || opt}</option>`;
            });

            selectHtml += `</select>`;
            return selectHtml;
          }
          return data;
        }
      },
      {
        data: 'gdriveLink',
        render: function (data) {
          const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
          if (data) {
            return `
              <a href="${data}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100 transition" title="Buka Google Drive">
                <i class="fa-solid fa-folder-open text-indigo-600"></i>
                <span>Drive</span>
              </a>
            `;
          }
          return `<span class="text-zinc-400 text-xs italic">${isEn ? 'None' : 'Belum ada'}</span>`;
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
      },
      {
        data: 'statusOrder',
        visible: false,
        searchable: false
      }
    ],
    orderFixed: {
      pre: [[12, 'asc']]
    },
    order: [[1, 'desc']], // Urutkan berdasarkan ID proyek terbaru (kolom ID sekarang di indeks 1)
    language: (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en') ? {
      search: "Search Project:",
      lengthMenu: "Show _MENU_ projects",
      info: "Showing _START_ to _END_ of _TOTAL_ projects",
      infoEmpty: "Showing 0 to 0 of 0 projects",
      infoFiltered: "(filtered from _MAX_ total projects)",
      paginate: {
        first: "First",
        last: "Last",
        next: "Next",
        previous: "Previous"
      },
      zeroRecords: "No projects found"
    } : {
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

  // Reset selectAll checkbox dan update button on draw
  table.on('draw', function () {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
    updateBulkDeleteButton();
  });
}
// Filter status by badges
function filterStatus(status) {
  // Hapus warna ring aktif pada filter sebelumnya
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-indigo-500');
  });
  // Tambah ring aktif pada filter saat ini
  const activeBtn = typeof event !== 'undefined' && event ? event.currentTarget : null;
  if (activeBtn) {
    activeBtn.classList.add('ring-2', 'ring-indigo-500');
  }
  if (status === 'all') {
    table.column(9).search('').draw();
  } else {
    // Regex exact match agar status tidak saling menyaring
    table.column(9).search('^' + status + '$', true, false).draw();
  }
}
// View Project details inside Modal
async function viewDetail(id) {
  try {
    const list = await API.getProyek();
    const proyek = list.find(p => p.iDProyek === id);
    currentProyek = proyek;
    if (proyek) {
      if (document.getElementById('gdriveInputContainer')) {
        document.getElementById('gdriveInputContainer').classList.add('hidden');
      }
      if (document.getElementById('gdriveLink')) {
        document.getElementById('gdriveLink').value = proyek.gdriveLink || '';
      }
      if (document.getElementById('hasilAI')) {
        document.getElementById('hasilAI').value = '';
      }

      // Tampilkan link Google Drive jika ada
      const modalGDriveContainer = document.getElementById('modalGDriveContainer');
      const modalGDriveLink = document.getElementById('modalGDriveLink');
      if (modalGDriveContainer && modalGDriveLink) {
        if (proyek.gdriveLink) {
          modalGDriveContainer.classList.remove('hidden');
          modalGDriveLink.href = proyek.gdriveLink;
        } else {
          modalGDriveContainer.classList.add('hidden');
          modalGDriveLink.href = '#';
        }
      }
      document.getElementById('modalId').textContent = proyek.iDProyek;
      document.getElementById('modalPelanggan').textContent = proyek.namaPelanggan;
      document.getElementById('modalWa').textContent = `+${proyek.nomorWA}`;
      document.getElementById('modalNamaProyek').textContent = proyek.namaProyek;
      document.getElementById('modalProduk').textContent = proyek.produk || proyek.jenisProduk || '-';
      document.getElementById('modalJumlah').textContent = proyek.jumlah;
      const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
      const satuanMap = {
        'pcs': 'pcs',
        'lembar': 'sheet',
        'meter': 'meter',
        'dus': 'box',
        'paket': 'package',
        'rim': 'ream',
        'buku': 'book'
      };
      document.getElementById('modalSatuan').textContent = isEn ? (satuanMap[proyek.satuan] || proyek.satuan) : proyek.satuan;
      document.getElementById('modalNominal').textContent = formatRupiah(proyek.nominalProyek);
      document.getElementById('modalDp').textContent = formatRupiah(proyek.dP);
      document.getElementById('modalSisa').textContent = formatRupiah(proyek.sisaPembayaran);
      document.getElementById('modalDeadline').textContent = proyek.deadline;
      document.getElementById('modalCatatan').textContent = proyek.catatan || (isEn ? 'No notes.' : 'Tidak ada catatan.');
      // Style badge status
      const statusBadge = document.getElementById('modalStatus');
      const statusMap = {
        'Menunggu': 'Waiting',
        'Sedang Dikerjakan': 'In Progress',
        'Revisi': 'Revision',
        'Selesai': 'Completed',
        'Belum Pembayaran': 'Unpaid',
        'Dibatalkan': 'Cancelled'
      };
      statusBadge.textContent = isEn ? (statusMap[proyek.status] || proyek.status) : proyek.status;
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

      // Auto open details tag for AI Assistant on desktop screen sizes
      const detailsEl = document.querySelector('#detailModal details');
      if (detailsEl) {
        if (window.innerWidth >= 768) {
          detailsEl.setAttribute('open', '');
        } else {
          detailsEl.removeAttribute('open');
        }
      }
    }
  } catch (error) {
    console.error(error);
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
    showToast({
      title: isEn ? "Project Detail" : "Detail Projek",
      message: isEn ? "Failed to load project details." : "Gagal memuat detail projek.",
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
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  console.log("ID yang akan dihapus =", id);
  const confirmMsg = isEn 
    ? `Are you sure you want to delete project "${id} - ${name}"? This action cannot be undone.` 
    : `Apakah Anda yakin ingin menghapus projek "${id} - ${name}"? Tindakan ini tidak dapat dibatalkan.`;
  if (confirm(confirmMsg)) {
    try {
      const res = await API.deleteProyek(id);
      if (res.success) {
        showToast({
          title: isEn ? "Success" : "Berhasil",
          message: isEn ? "Project deleted successfully." : "Projek berhasil dihapus.",
          type: "success"
        });
        loadProyekData(); // Refresh data
      } else {
        showToast({
          title: isEn ? "Failed" : "Gagal",
          message: res.message,
          type: "error"
        });
      }
    } catch (e) {
      console.error(e);

      showToast({
        title: "Error",
        message: isEn ? "An error occurred while deleting project." : "Terjadi kesalahan saat menghapus projek.",
        type: "error"
      });
    }
  }
}
async function generateAI(jenis) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (!currentProyek) {
    showToast({
      title: "AI",
      message: isEn ? "Project data not selected." : "Data proyek belum dipilih.",
      type: "error"
    });
    return;
  }

  const gdriveContainer = document.getElementById('gdriveInputContainer');
  const gdriveInput = document.getElementById('gdriveLink');
  const gdriveLink = gdriveInput ? gdriveInput.value.trim() : '';

  // Handle visibility of Google Drive input
  if (jenis === 'selesai') {
    if (gdriveContainer && gdriveContainer.classList.contains('hidden')) {
      gdriveContainer.classList.remove('hidden');
      gdriveInput.focus();
      showToast({
        title: isEn ? "Google Drive Link" : "Link Google Drive",
        message: isEn ? "Please enter the Google Drive link for the design files above." : "Silakan masukkan link Google Drive hasil desain di atas.",
        type: "info"
      });
      return;
    }

    // If it's shown but empty for 'selesai'
    if (!gdriveLink) {
      gdriveInput.focus();
      showToast({
        title: isEn ? "Google Drive Link" : "Link Google Drive",
        message: isEn ? "Google Drive link is required for completion message." : "Link Google Drive wajib diisi untuk ucapan selesai.",
        type: "warning"
      });
      return;
    }
  } else {
    // Hide it for other options (followup, penawaran, invoice, testimoni, pelunasan)
    if (gdriveContainer) {
      gdriveContainer.classList.add('hidden');
    }
  }

  // Local generation for custom types
  if (['testimoni', 'pelunasan', 'selesai'].includes(jenis)) {
    let text = '';
    const formatRp = (num) => formatRupiah(num);
    const namaKlien = currentProyek.namaPelanggan || (isEn ? 'Client' : 'Kak');
    const namaProyek = currentProyek.namaProyek || (isEn ? 'Design Project' : 'Projek Desain');
    const nominal = formatRp(currentProyek.nominalProyek || 0);
    const dp = formatRp(currentProyek.dP || 0);
    const sisa = formatRp(currentProyek.sisaPembayaran || 0);

    if (jenis === 'testimoni') {
      text = isEn 
        ? `Hello ${namaKlien}, thank you very much for trusting us with the project *${namaProyek}*. 😊\n\nIf you don't mind, we would like to request a quick testimonial or feedback about our design work and service. Your feedback is highly valuable to help us improve.\n\nThank you very much for your time and cooperation! 🙏✨`
        : `Halo Kak ${namaKlien}, terima kasih banyak telah mempercayakan pengerjaan projek *${namaProyek}* kepada kami. 😊\n\nJika tidak keberatan, kami ingin meminta sedikit testimoni atau feedback singkat mengenai hasil desain dan pelayanan kami. Pendapat Kakak sangat berarti bagi kami untuk terus berkembang.\n\nTerima kasih banyak atas waktu dan kerja samanya, Kak! 🙏✨`;
    } else if (jenis === 'pelunasan') {
      text = isEn
        ? `Hello ${namaKlien}, hope you are doing well.\n\nThe design project *${namaProyek}* has been completed. Here is the payment invoice summary:\n- Total Amount: ${nominal}\n- Down Payment (DP): ${dp}\n- Remaining Balance: ${sisa}\n\nPlease proceed with the remaining payment of *${sisa}*. Once the payment is received, we will send over the final high-resolution files.\n\nThank you very much for your cooperation! 🙏`
        : `Halo Kak ${namaKlien}, semoga kabarnya baik.\n\nProjek desain *${namaProyek}* saat ini sudah selesai kami kerjakan. Berikut adalah rincian tagihan pembayaran:\n- Total Nominal: ${nominal}\n- Uang Muka (DP): ${dp}\n- Sisa Pelunasan: ${sisa}\n\nMohon untuk melakukan pelunasan sisa pembayaran sebesar *${sisa}*. Setelah pelunasan diterima, kami akan segera mengirimkan file final resolusi tinggi.\n\nTerima kasih banyak atas kerja samanya, Kak! 🙏`;
    } else if (jenis === 'selesai') {
      text = isEn
        ? `Hello ${namaKlien}, great news!\n\nAll final high-resolution design files for the project *${namaProyek}* have been uploaded.\n\nYou can download all the files using the following Google Drive link:\n🔗 ${gdriveLink || '[Google Drive link not entered yet]'}\n\nThank you very much for using our services. Hope the design is helpful and best of luck for your business! Looking forward to working with you again! 🚀✨`
        : `Halo Kak ${namaKlien}, kabar baik!\n\nSeluruh file desain final resolusi tinggi untuk projek *${namaProyek}* telah selesai diunggah.\n\nKakak dapat mengunduh semua file tersebut melalui tautan Google Drive berikut:\n🔗 ${gdriveLink || '[Link Google Drive belum dimasukkan]'}\n\nTerima kasih banyak telah menggunakan jasa kami. Semoga desainnya bermanfaat dan sukses selalu untuk usahanya! Kami tunggu projek kerja sama berikutnya ya Kak! 🚀✨`;
    }

    document.getElementById("hasilAI").value = text;
    showToast({
      title: "AI",
      message: isEn ? "Text generated locally." : "Teks berhasil dibuat secara lokal.",
      type: "success"
    });
    return;
  }

  showToast({
    title: "AI",
    message: isEn ? "Generating text..." : "Sedang membuat teks...",
    type: "info"
  });

  const data = {
    ...currentProyek,
    jenis,
    gdriveLink
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
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const text = document.getElementById("hasilAI").value;
  navigator.clipboard.writeText(text);
  showToast({
    title: "AI",
    message: isEn ? "Text copied to clipboard." : "Teks berhasil disalin.",
    type: "success"
  });
}

function sendAIWhatsapp() {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (!currentProyek || !currentProyek.nomorWA) {
    showToast({
      title: "Error",
      message: isEn ? "Project data or WhatsApp number is not available." : "Data proyek atau nomor WhatsApp tidak tersedia.",
      type: "error"
    });
    return;
  }

  const text = document.getElementById("hasilAI").value;
  if (!text.trim()) {
    showToast({
      title: isEn ? "Warning" : "Peringatan",
      message: isEn ? "AI text is empty. Please generate first." : "Teks AI masih kosong. Silakan generate terlebih dahulu.",
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

// Update status of project inline from table select
async function updateProyekStatus(id, newStatus) {
  try {
    showToast({
      title: "Memperbarui",
      message: "Sedang memperbarui status projek...",
      type: "info"
    });

    // Find original project object
    const list = window.allProyekList || [];
    const proyek = list.find(p => p.iDProyek === id);
    if (!proyek) {
      throw new Error("Projek tidak ditemukan di memori.");
    }

    // Construct full update payload
    const payload = {
      namaProyek: proyek.namaProyek,
      pelanggan: proyek.namaPelanggan,
      wa: proyek.nomorWA,
      produk: proyek.produk || proyek.jenisProduk || '',
      jumlah: Number(proyek.jumlah) || 1,
      satuan: proyek.satuan || 'Pcs',
      hargaSatuan: Number(proyek.hargaSatuan) || 0,
      nominal: Number(proyek.nominalProyek) || 0,
      dp: Number(proyek.dP) || 0,
      sisa: Number(proyek.sisaPembayaran) || 0,
      deadline: proyek.deadline,
      status: newStatus,
      catatan: proyek.catatan || ''
    };

    const res = await API.updateProyek(id, payload);
    if (res.success) {
      showToast({
        title: "Berhasil",
        message: "Status projek berhasil diperbarui.",
        type: "success"
      });
      loadProyekData(); // Reload table and counter metrics
    } else {
      showToast({
        title: "Gagal",
        message: res.message || "Gagal memperbarui status.",
        type: "error"
      });
      loadProyekData(); // Reset table display
    }
  } catch (error) {
    console.error("Error updating status:", error);
    showToast({
      title: "Error",
      message: "Terjadi kesalahan saat memperbarui status.",
      type: "error"
    });
    loadProyekData();
  }
}

// ===================================
// BATCH / BULK DELETE IMPLEMENTATION
// ===================================

// Handle Select/Deselect All Checkbox
$(document).on('change', '#selectAll', function () {
  const isChecked = this.checked;
  $('.proyek-checkbox').prop('checked', isChecked);
  updateBulkDeleteButton();
});

// Handle Individual Checkbox
$(document).on('change', '.proyek-checkbox', function () {
  const total = $('.proyek-checkbox').length;
  const checked = $('.proyek-checkbox:checked').length;
  $('#selectAll').prop('checked', total === checked);
  updateBulkDeleteButton();
});

// Update status button batch delete
function updateBulkDeleteButton() {
  const checkedBoxes = $('.proyek-checkbox:checked');
  const count = checkedBoxes.length;
  const btn = document.getElementById('btnBulkDelete');
  const countEl = document.getElementById('selectedCount');

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

// Action Bulk Delete
async function bulkDeleteProyek() {
  const checkedBoxes = $('.proyek-checkbox:checked');
  const ids = [];
  checkedBoxes.each(function () {
    ids.push($(this).val());
  });

  if (ids.length === 0) return;

  if (confirm(`Apakah Anda yakin ingin menghapus ${ids.length} projek terpilih? Tindakan ini tidak dapat dibatalkan.`)) {
    try {
      const btn = document.getElementById('btnBulkDelete');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>Menghapus...`;
      }

      const res = await API.deleteProyek(ids); // Kirim array ID ke API

      if (res.success) {
        showToast({
          title: "Berhasil",
          message: `${ids.length} projek berhasil dihapus.`,
          type: "success"
        });
        loadProyekData(); // Reload tabel proyek
      } else {
        showToast({
          title: "Gagal",
          message: res.message,
          type: "error"
        });
      }
    } catch (error) {
      console.error(error);
      showToast({
        title: "Error",
        message: "Terjadi kesalahan saat menghapus projek terpilih.",
        type: "error"
      });
    } finally {
      const btn = document.getElementById('btnBulkDelete');
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-trash-can mr-2"></i><span>Hapus Terpilih (<span id="selectedCount">0</span>)</span>`;
        btn.disabled = true;
        btn.classList.add('hidden');
      }
    }
  }
}


