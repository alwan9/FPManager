let table; // Global table instance
let currentProyek = null;
document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.textContent = 'Live Google Sheets';
    apiStatusBadge.className = 'hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
  }
  // Load Data
  loadProyekData();
});
// Load proyek data and initialize DataTables
async function loadProyekData() {
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:read')) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (proyek:read) untuk melihat data projek.</p>
        </div>
      `;
    }
    return;
  }
  showProyekSkeletons();
  try {
    let listProyek = await API.getProyek();
    if (!Array.isArray(listProyek)) {
      listProyek = [];
    }
    window.allProyekList = listProyek; // Cache list globally for status updates

    // Add statusOrder property dynamically for custom sorting
    listProyek.forEach(p => {
      if (!p) return;
      const st = String(p.status || '').toLowerCase().trim();
      if (st === 'menunggu') p.statusOrder = 1;
      else if (st === 'revisi') p.statusOrder = 2;
      else if (st === 'sedang dikerjakan') p.statusOrder = 3;
      else if (st === 'belum pembayaran') p.statusOrder = 4;
      else if (st === 'selesai') p.statusOrder = 5;
      else if (st === 'dibatalkan') p.statusOrder = 6;
      else p.statusOrder = 99;
    });

    updateStatusCounters(listProyek);
    initTable(listProyek);

    // Apply URL status filter if present
    const urlParams = new URLSearchParams(window.location.search);
    const statusFilter = urlParams.get('status');
    if (statusFilter && typeof table !== 'undefined' && table) {
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

    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error("Data Proyek", "Terjadi kesalahan saat memuat data proyek.");
    } else if (typeof showToast === 'function') {
      showToast({
        title: "Data Proyek",
        message: "Terjadi kesalahan saat memuat data proyek.",
        type: "error"
      });
    }
  }
}

// Update status summary numbers on dashboard/top badges
function updateStatusCounters(proyekList) {
  const list = Array.isArray(proyekList) ? proyekList : [];
  const counts = {
    all: list.length,
    menunggu: 0,
    dikerjakan: 0,
    revisi: 0,
    selesai: 0,
    belumpembayaran: 0
  };
  list.forEach(p => {
    if (!p) return;
    const status = String(p.status || '').toLowerCase().trim();
    if (status === 'menunggu') counts.menunggu++;
    else if (status === 'sedang dikerjakan') counts.dikerjakan++;
    else if (status === 'revisi') counts.revisi++;
    else if (status === 'selesai') counts.selesai++;
    else if (status === 'belum pembayaran') counts.belumpembayaran++;
  });

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setVal('count-all', counts.all);
  setVal('count-menunggu', counts.menunggu);
  setVal('count-dikerjakan', counts.dikerjakan);
  setVal('count-revisi', counts.revisi);
  setVal('count-selesai', counts.selesai);
  setVal('count-belumpembayaran', counts.belumpembayaran);
}
// Initialize DataTables with customized styles and features
function initTable(data) {
  // Destroy existing table if any
  if ($.fn.DataTable.isDataTable('#proyekTable')) {
    $('#proyekTable').DataTable().destroy();
  }
  $('#proyekTable tbody').empty();
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
      {
        data: 'iDProyek',
        className: 'hidden md:table-cell',
        render: function (data, type, row) {
          const uid = (row && row.userId) || 'USR-001';
          return `
            <div>
              <div><span onclick="copyTextToClipboard('${escapeHtml(data)}', 'ID Proyek')" class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors" title="Klik untuk salin ID">${escapeHtml(data)}</span></div>
              <div class="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 font-mono"><i class="fa-solid fa-user-circle text-[10px]"></i><span>${escapeHtml(uid)}</span></div>
            </div>
          `;
        }
      },
      { data: 'tanggal', visible: false },
      {
        data: 'namaProyek',
        render: function (data, type, row) {
          const sumber = (row && row.sumber) ? row.sumber : 'WhatsApp';
          let sourceBadge = '';
          if (sumber.toLowerCase() === 'shopee') {
            sourceBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 ml-1.5 align-middle" title="Sumber: Shopee"><i class="fa-solid fa-bag-shopping text-[9px] text-orange-500"></i> Shopee</span>`;
          } else if (sumber.toLowerCase() === 'fiverr') {
            sourceBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ml-1.5 align-middle" title="Sumber: Fiverr"><i class="fa-solid fa-bolt text-[9px] text-emerald-500"></i> Fiverr</span>`;
          }
          return `<div><span class="font-medium text-zinc-900 dark:text-zinc-100">${escapeHtml(data || '')}</span> ${sourceBadge}</div>`;
        }
      },
      {
        data: 'namaPelanggan',
        className: 'hidden md:table-cell',
        render: function (data) {
          return escapeHtml(data || '');
        }
      },
      {
        data: 'nomorWA',
        render: function (data) {
          return `<span onclick="copyTextToClipboard('${escapeHtml(data)}', 'Nomor WA')" class="hover:underline cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold" title="Klik untuk salin Nomor WA">+${escapeHtml(data)}</span>`;
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
      {
        data: 'deadline',
        render: function (data, type, row) {
          if (!data) return '-';
          if (type === 'display') {
            const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
            const dlDate = new Date(data);
            dlDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffMs = dlDate - today;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const st = String(row.status || '').toLowerCase().trim();
            const isFinished = st.includes('selesai') || st.includes('batal') || st.includes('dibatalkan');

            let dateDisplay = data;
            try {
              const parts = data.split('-');
              if (parts.length === 3) {
                const year = parts[0];
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mName = isEn ? monthsEn[month - 1] : monthsId[month - 1];
                dateDisplay = `${day} ${mName} ${year}`;
              }
            } catch (e) {
              dateDisplay = data;
            }

            const isWaitingOrProgress = st.includes('menunggu') || st.includes('dikerjakan');
            const isRevision = st.includes('revisi');

            if (isFinished) {
              return `<span class="font-semibold text-zinc-800 dark:text-zinc-200">${dateDisplay}</span>`;
            }

            let badgeHtml = '';
            if (isWaitingOrProgress) {
              if (diffDays >= 0) {
                const label = isEn ? `-${diffDays}d` : `-${diffDays} hari`;
                const badgeClass = diffDays <= 3
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50'
                  : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              } else {
                const label = isEn ? `Overdue ${Math.abs(diffDays)}d` : `Terlambat ${Math.abs(diffDays)} hari`;
                const badgeClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              }
            } else if (isRevision) {
              if (diffDays < 0) {
                const label = isEn ? `Overdue ${Math.abs(diffDays)}d` : `Terlambat ${Math.abs(diffDays)} hari`;
                const badgeClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 animate-pulse';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              } else {
                const label = isEn ? `-${diffDays}d` : `-${diffDays} hari`;
                const badgeClass = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              }
            } else {
              // Fallback for other states (e.g. Belum Pembayaran)
              if (diffDays >= 0) {
                const label = isEn ? `-${diffDays}d` : `-${diffDays} hari`;
                const badgeClass = 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              } else {
                const label = isEn ? `Overdue ${Math.abs(diffDays)}d` : `Terlambat ${Math.abs(diffDays)} hari`;
                const badgeClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} w-max">${label}</span>`;
              }
            }

            return `<div class="flex flex-col space-y-0.5">
              <span class="font-semibold text-zinc-800 dark:text-zinc-200">${dateDisplay}</span>
              ${badgeHtml}
            </div>`;
          }
          return data;
        }
      },
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
            const statusStr = String(data || '').trim();
            const badgeClass = 'badge-' + statusStr.toLowerCase().replace(/\s+/g, '');

            let selectHtml = `<select onchange="updateProyekStatus('${row.iDProyek}', this.value)" class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${badgeClass}" style="appearance: none; -webkit-appearance: none; text-align-last: center; padding-right: 1.5rem; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.5rem top 50%; background-size: 0.65rem auto;">`;

            statusOptions.forEach(opt => {
              const selected = (opt.toLowerCase() === statusStr.toLowerCase()) ? 'selected' : '';
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
              <a href="${sanitizeUrl(data)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100 transition" title="Buka Google Drive">
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
          const canUpdate = (typeof Auth === 'undefined' || Auth.hasPermission('proyek:update'));
          const canDelete = (typeof Auth === 'undefined' || Auth.hasPermission('proyek:delete'));

          return `
            <div class="flex space-x-1.5">
              <button onclick="viewDetail('${data.iDProyek}')" class="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-semibold" title="Detail Proyek">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button onclick="syncCalendarPromptByProyekId('${data.iDProyek}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold" title="Tambah ke Kalender (Google / iCal)">
                <i class="fa-solid fa-calendar-plus"></i>
              </button>
              ${canUpdate ? `
              <a href="tambah-proyek.html?id=${encodeURIComponent(data.iDProyek)}" onclick="try{sessionStorage.setItem('cached_edit_proyek', JSON.stringify(window.allProyekList ? window.allProyekList.find(p => p.iDProyek === '${data.iDProyek}') : null))}catch(e){}" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors" title="Edit Proyek">
                <i class="fa-solid fa-pen"></i>
              </a>
              ` : ''}
              ${canDelete ? `
              <button onclick="hapusProyek('${data.iDProyek}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors" title="Hapus Proyek">
                <i class="fa-solid fa-trash"></i>
              </button>
              ` : ''}
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

// Filter proyek berdasarkan sumber (WhatsApp, Fiverr, Shopee)
function filterBySumber(sumber) {
  if (!table) return;
  if (!sumber || sumber === 'all') {
    table.column(3).search('').draw();
  } else {
    table.column(3).search(sumber, true, false).draw();
  }
}
window.filterBySumber = filterBySumber;
// View Project details inside Modal
async function viewDetail(idOrObj) {
  try {
    let proyek = null;
    if (idOrObj && typeof idOrObj === 'object') {
      proyek = idOrObj;
    } else {
      const rawId = String(idOrObj || '').trim();
      const decodedId = decodeURIComponent(rawId).trim();

      // 1. Cari instan di memori lokal tabel terlebih dahulu
      const localList = window.allProyekList || (typeof table !== 'undefined' && table ? table.data().toArray() : []);
      proyek = (localList || []).find(p => {
        if (!p) return false;
        const pid = String(p.iDProyek || p.id || p.idProyek || '').trim();
        return pid === rawId || pid === decodedId || pid.toLowerCase() === rawId.toLowerCase() || pid.toLowerCase() === decodedId.toLowerCase();
      });

      // 2. Jika belum ditemukan, fetch dari API
      if (!proyek) {
        const list = await API.getProyek();
        proyek = (list || []).find(p => {
          if (!p) return false;
          const pid = String(p.iDProyek || p.id || p.idProyek || '').trim();
          return pid === rawId || pid === decodedId || pid.toLowerCase() === rawId.toLowerCase() || pid.toLowerCase() === decodedId.toLowerCase();
        });
      }
    }

    if (!proyek) {
      console.warn("Proyek tidak ditemukan untuk ID/Data:", idOrObj);
      const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
      if (typeof Toast !== 'undefined') {
        Toast.error(isEn ? "Project Detail" : "Detail Projek", isEn ? "Project data not found." : "Data projek tidak ditemukan.");
      }
      return;
    }

    currentProyek = proyek;
    populateDetailModal(proyek);
  } catch (error) {
    console.error("Error loading project detail:", error);
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
    if (typeof Toast !== 'undefined') {
      Toast.error(isEn ? "Project Detail" : "Detail Projek", isEn ? "Failed to load project details." : "Gagal memuat detail projek.");
    }
  }
}
window.viewDetail = viewDetail;

function populateDetailModal(proyek) {
  if (!proyek) return;
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  const proyekId = proyek.iDProyek || proyek.id || proyek.idProyek || '-';
  const userId = proyek.userId || proyek.userid || 'USR-001';
  const sumber = proyek.sumber || 'WhatsApp';
  const namaProyek = proyek.namaProyek || proyek.proyek || proyek.nama || '-';
  const namaPelanggan = proyek.namaPelanggan || proyek.pelanggan || proyek.client || '-';
  const produk = proyek.produk || proyek.jenisProduk || proyek.namaProduk || '-';
  const jumlah = proyek.jumlah !== undefined ? proyek.jumlah : (proyek.qty || 1);
  const satuan = proyek.satuan || 'pcs';
  const nominal = parseFloat(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0)) || 0;
  const dp = parseFloat(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0)) || 0;
  const pelunasan = parseFloat(proyek.pelunasan || 0) || 0;
  const sisa = parseFloat(proyek.sisaPembayaran !== undefined ? proyek.sisaPembayaran : (proyek.sisa !== undefined ? proyek.sisa : Math.max(0, nominal - dp - pelunasan))) || 0;
  const status = proyek.status || 'Menunggu';
  const catatan = proyek.catatan || proyek.keterangan || '';
  const gdriveLink = proyek.gdriveLink || proyek.gdrive || '';
  const metodePembayaran = proyek.metodePembayaran || proyek.metode || '-';
  const deadline = proyek.deadline || proyek.tenggatWaktu || proyek.target || '';

  // 1. ID & User ID
  const modalIdEl = document.getElementById('modalId');
  if (modalIdEl) modalIdEl.textContent = proyekId;

  const modalUserIdEl = document.getElementById('modalUserId');
  if (modalUserIdEl) modalUserIdEl.textContent = userId;

  // 2. Status Badge
  const modalStatusEl = document.getElementById('modalStatus');
  if (modalStatusEl) {
    const statusMap = {
      'Menunggu': 'Waiting',
      'Sedang Dikerjakan': 'In Progress',
      'Revisi': 'Revision',
      'Selesai': 'Completed',
      'Belum Pembayaran': 'Unpaid',
      'Dibatalkan': 'Cancelled'
    };
    modalStatusEl.textContent = isEn ? (statusMap[status] || status) : status;
    const badgeStatusKey = String(status).toLowerCase().replace(/\s+/g, '');
    modalStatusEl.className = `inline-block px-2.5 py-1 text-xs font-semibold rounded-full badge-${badgeStatusKey}`;
  }

  // 3. Sumber Badge
  const modalSumberEl = document.getElementById('modalSumber');
  if (modalSumberEl) {
    if (sumber.toLowerCase() === 'shopee') {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      modalSumberEl.innerHTML = '<i class="fa-solid fa-bag-shopping text-orange-500 mr-1"></i> Shopee';
    } else if (sumber.toLowerCase() === 'fiverr') {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      modalSumberEl.innerHTML = '<i class="fa-solid fa-bolt text-emerald-500 mr-1"></i> Fiverr';
    } else {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800';
      modalSumberEl.innerHTML = '<i class="fa-brands fa-whatsapp text-green-500 mr-1"></i> WhatsApp';
    }
  }

  // 4. Deadline Display
  const modalDeadlineEl = document.getElementById('modalDeadline');
  if (modalDeadlineEl) {
    if (deadline) {
      const cleanDl = String(deadline).split('T')[0];
      const parts = cleanDl.split('-');
      let dateDisplay = cleanDl;
      let diffDays = 0;

      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const monthsId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const mName = isEn ? monthsEn[month - 1] : monthsId[month - 1];
        dateDisplay = `${day} ${mName} ${year}`;

        const dlDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffMs = dlDate.getTime() - today.getTime();
        diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }

      const st = String(status).toLowerCase().trim();
      const isFinished = st.includes('selesai') || st.includes('batal') || st.includes('dibatalkan');

      if (isFinished) {
        modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span>`;
      } else {
        if (diffDays === 0) {
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs text-amber-600 dark:text-amber-400 font-bold"> (${isEn ? 'Today!' : 'Hari ini!'})</span>`;
        } else if (diffDays === 1) {
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs text-orange-600 dark:text-orange-400 font-bold"> (${isEn ? 'Tomorrow!' : 'Besok!'})</span>`;
        } else if (diffDays > 1) {
          const colorClass = diffDays <= 3 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-500 dark:text-zinc-400 font-semibold';
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs ${colorClass}"> (${isEn ? `-${diffDays} days` : `-${diffDays} hari`})</span>`;
        } else {
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs text-red-600 dark:text-red-400 font-bold"> (${isEn ? `Overdue ${Math.abs(diffDays)}d` : `Terlambat ${Math.abs(diffDays)} hari`})</span>`;
        }
      }
    } else {
      modalDeadlineEl.textContent = '-';
    }
  }

  // 5. Customer & WA
  const modalPelangganEl = document.getElementById('modalPelanggan');
  if (modalPelangganEl) modalPelangganEl.textContent = namaPelanggan;

  let rawWA = String(proyek.nomorWA || proyek.wa || proyek.nomorWa || '').replace(/\D/g, '');
  if (rawWA.startsWith('0')) rawWA = '62' + rawWA.slice(1);
  else if (!rawWA.startsWith('62') && rawWA.length > 0) rawWA = '62' + rawWA;

  const modalWaEl = document.getElementById('modalWa');
  if (modalWaEl) {
    modalWaEl.textContent = rawWA ? `+${rawWA}` : '-';
  }

  // 6. Product Details
  const modalNamaProyekEl = document.getElementById('modalNamaProyek');
  if (modalNamaProyekEl) modalNamaProyekEl.textContent = namaProyek;

  const modalProdukEl = document.getElementById('modalProduk');
  if (modalProdukEl) modalProdukEl.textContent = produk;

  const modalJumlahEl = document.getElementById('modalJumlah');
  if (modalJumlahEl) modalJumlahEl.textContent = jumlah;

  const modalSatuanEl = document.getElementById('modalSatuan');
  if (modalSatuanEl) {
    const satuanMap = {
      'pcs': 'pcs',
      'lembar': 'sheet',
      'meter': 'meter',
      'dus': 'box',
      'paket': 'package',
      'rim': 'ream',
      'buku': 'book'
    };
    modalSatuanEl.textContent = isEn ? (satuanMap[satuan] || satuan) : satuan;
  }

  // 7. Finance Breakdown
  const modalNominalEl = document.getElementById('modalNominal');
  if (modalNominalEl) modalNominalEl.textContent = formatRupiah(nominal);

  const modalDpEl = document.getElementById('modalDp');
  if (modalDpEl) modalDpEl.textContent = formatRupiah(dp);

  const modalPelunasanEl = document.getElementById('modalPelunasan');
  if (modalPelunasanEl) modalPelunasanEl.textContent = formatRupiah(pelunasan);

  // 8. Sisa Tagihan & Dropdown Lunasi
  const isLunas = sisa <= 0 || (dp + pelunasan >= nominal && nominal > 0);
  const sisaSelect = document.getElementById('modalSisaSelect');
  const sisaIcon = document.getElementById('modalSisaIcon');

  if (sisaSelect) {
    sisaSelect.innerHTML = '';
    if (isLunas) {
      const opt = document.createElement('option');
      opt.value = 'lunas';
      opt.textContent = isEn ? 'Paid (Rp0)' : 'Lunas (Rp0)';
      sisaSelect.appendChild(opt);
      sisaSelect.disabled = true;
      sisaSelect.className = "appearance-none bg-transparent font-bold text-green-600 text-sm focus:outline-none w-full truncate";
      if (sisaIcon) sisaIcon.classList.add('hidden');
    } else {
      const optUtang = document.createElement('option');
      optUtang.value = 'utang';
      optUtang.textContent = formatRupiah(sisa);
      optUtang.selected = true;
      sisaSelect.appendChild(optUtang);

      const optLunas = document.createElement('option');
      optLunas.value = 'lunas';
      optLunas.textContent = isEn ? 'Mark as Paid' : 'Lunasi (Ubah jadi lunas)';
      sisaSelect.appendChild(optLunas);

      sisaSelect.disabled = false;
      sisaSelect.className = "appearance-none bg-transparent font-bold text-rose-600 text-sm focus:outline-none cursor-pointer pr-4 w-full truncate";
      if (sisaIcon) sisaIcon.classList.remove('hidden');
    }
  }

  // 9. Metode Pembayaran
  const modalMetodeEl = document.getElementById('modalMetode');
  if (modalMetodeEl) {
    modalMetodeEl.textContent = metodePembayaran;
  }

  // 10. Catatan
  const modalCatatanEl = document.getElementById('modalCatatan');
  if (modalCatatanEl) {
    modalCatatanEl.textContent = catatan || (isEn ? 'No notes.' : 'Tidak ada catatan.');
  }

  // 11. Google Drive Link
  const modalGDriveContainer = document.getElementById('modalGDriveContainer');
  const modalGDriveLink = document.getElementById('modalGDriveLink');
  const gdriveInputContainer = document.getElementById('gdriveInputContainer');
  const gdriveLinkInput = document.getElementById('gdriveLink');

  if (gdriveLink && gdriveLink.trim() !== '') {
    if (modalGDriveContainer) modalGDriveContainer.classList.remove('hidden');
    if (modalGDriveLink) modalGDriveLink.href = sanitizeUrl(gdriveLink);
    if (gdriveInputContainer) gdriveInputContainer.classList.add('hidden');
    if (gdriveLinkInput) gdriveLinkInput.value = gdriveLink;
  } else {
    if (modalGDriveContainer) modalGDriveContainer.classList.add('hidden');
    if (modalGDriveLink) modalGDriveLink.href = '#';
    if (gdriveInputContainer) gdriveInputContainer.classList.remove('hidden');
    if (gdriveLinkInput) gdriveLinkInput.value = '';
  }

  // 12. Action Buttons in Footer
  const modalCalendarBtn = document.getElementById('modalCalendarBtn');
  if (modalCalendarBtn) {
    modalCalendarBtn.onclick = () => {
      if (typeof CalendarSync !== 'undefined') {
        CalendarSync.prompt(proyek);
      }
    };
  }

  const modalEditBtn = document.getElementById('modalEditBtn');
  if (modalEditBtn) {
    modalEditBtn.onclick = () => {
      try { sessionStorage.setItem('cached_edit_proyek', JSON.stringify(proyek)); } catch (e) { }
      window.location.href = `tambah-proyek.html?id=${encodeURIComponent(proyekId)}`;
    };
  }

  const modalInvoiceBtn = document.getElementById('modalInvoiceBtn');
  if (modalInvoiceBtn) {
    modalInvoiceBtn.onclick = () => {
      window.location.href = `invoice.html?id=${encodeURIComponent(proyekId)}`;
    };
  }

  const modalHapusBtn = document.getElementById('modalHapusBtn');
  if (modalHapusBtn) {
    modalHapusBtn.onclick = () => {
      closeModal();
      hapusProyek(proyekId, namaProyek);
    };
  }

  const waBtnEl = document.getElementById('modalWaBtn');
  if (waBtnEl) {
    if (rawWA) {
      const waText = encodeURIComponent(CONFIG.WA_TEMPLATE || '');
      waBtnEl.href = `https://api.whatsapp.com/send?phone=${rawWA}&text=${waText}`;
      waBtnEl.target = 'FPManager_WhatsAppTab';
      waBtnEl.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      waBtnEl.href = '#';
      waBtnEl.classList.add('opacity-50', 'pointer-events-none');
    }
  }

  // Reset AI section
  const hasilAIEl = document.getElementById('hasilAI');
  if (hasilAIEl) hasilAIEl.value = '';

  // Enforce DOM Permissions
  if (typeof Auth !== 'undefined' && typeof Auth.enforceDOMPermissions === 'function') {
    Auth.enforceDOMPermissions();
  }

  // Buka modal
  const modal = document.getElementById('detailModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}
window.populateDetailModal = populateDetailModal;

// Close Modal
function closeModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

// Handler Dropdown Sisa
async function handleSisaChange(selectEl) {
  if (selectEl.value === 'lunas') {
    // Revert select back to 'utang' initially so if they cancel, it stays.
    selectEl.value = 'utang';
    await lunasiProyek();
  }
}

// Fitur Lunasi Proyek
async function lunasiProyek() {
  if (!currentProyek) return;
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  const nominalVal = Number(currentProyek.nominalProyek) || 0;
  const dpVal = Number(currentProyek.dP) || 0;
  const pelunasanCurrent = Number(currentProyek.pelunasan) || 0;
  const sisa = currentProyek.sisaPembayaran !== undefined ? Number(currentProyek.sisaPembayaran) : Math.max(0, nominalVal - dpVal - pelunasanCurrent);

  if (sisa <= 0) {
    showToast({ title: "Info", message: isEn ? "Project is already fully paid." : "Proyek sudah lunas.", type: "info" });
    return;
  }

  if (!await showConfirmModal({
    title: isEn ? "Mark as Paid" : "Pelunasan Projek",
    message: isEn ? `Are you sure you want to mark this project as paid? (Settlement amount: ${formatRupiah(sisa)})` : `Lakukan pelunasan sebesar ${formatRupiah(sisa)} untuk proyek ini?`,
    type: "info",
    confirmText: isEn ? "Yes, Mark Paid" : "Ya, Lunasi"
  })) {
    return;
  }

  try {
    const sisaSelect = document.getElementById('modalSisaSelect');
    if (sisaSelect) {
      sisaSelect.disabled = true;
    }

    let newCatatan = currentProyek.catatan || "";
    if (newCatatan && !newCatatan.toLowerCase().includes("lunas")) {
      newCatatan += " - Pembayaran LUNAS";
    } else if (!newCatatan) {
      newCatatan = "Pembayaran LUNAS";
    }

    const settledPelunasan = pelunasanCurrent + sisa;

    // 1. Update data proyek (DP ASLI TETAP UTUH, Pelunasan dicatat terpisah, Sisa = 0)
    const payloadProyek = {
      namaProyek: currentProyek.namaProyek,
      pelanggan: currentProyek.namaPelanggan,
      wa: currentProyek.nomorWA,
      produk: currentProyek.produk,
      jumlah: currentProyek.jumlah,
      satuan: currentProyek.satuan,
      hargaSatuan: currentProyek.hargaSatuan,
      nominal: nominalVal,
      dp: dpVal, // Pertahankan DP asli
      pelunasan: settledPelunasan, // Catat pelunasan riil secara terpisah
      sisa: 0,
      deadline: currentProyek.deadline,
      status: currentProyek.status === "Menunggu" ? "Sedang Dikerjakan" : currentProyek.status,
      catatan: newCatatan,
      gdriveLink: currentProyek.gdriveLink,
      sumber: currentProyek.sumber || "WhatsApp"
    };

    const updateRes = await API.updateProyek(currentProyek.iDProyek, payloadProyek);

    // 2. Sync / Insert Mutasi Keuangan
    if (updateRes.success) {
      try {
        const keuanganList = await API.getKeuangan();
        const prjId = currentProyek.iDProyek;
        
        // Cari transaksi keuangan DP dari projek ini jika ada
        const linkedDpTx = (keuanganList || []).find(k => {
          if (!k) return false;
          const kPrj = String(k.idProyek || '');
          const ket = String(k.keterangan || '');
          return (kPrj === prjId || ket.includes(prjId)) && String(k.statusPembayaran || '').toLowerCase() === 'dp';
        });

        if (linkedDpTx) {
          // Update status & pelunasan di baris DP tanpa merusak nominal kas DP yang sudah masuk
          await API.updateKeuangan(linkedDpTx.id, {
            dp: dpVal,
            pelunasan: settledPelunasan,
            sisa: 0,
            totalProyek: nominalVal,
            statusPembayaran: 'Lunas',
            catatanPelunasan: `Pelunasan Rp${sisa.toLocaleString('id-ID')} tgl ${new Date().toLocaleDateString('id-ID')}`
          });
        }

        // Tambah entri mutasi penerimaan kas pelunasan baru di buku Keuangan
        const txPayload = {
          tanggal: new Date().toISOString().split('T')[0],
          jenis: 'Pemasukan',
          keterangan: `Pelunasan Projek - ${currentProyek.namaPelanggan} (${prjId})`,
          nominal: sisa, // Kas riil pelunasan yang baru masuk
          dp: dpVal,
          pelunasan: settledPelunasan,
          sisa: 0,
          totalProyek: nominalVal,
          statusPembayaran: 'Lunas',
          idProyek: prjId,
          catatanPelunasan: `Pelunasan tagihan projek (${formatRupiah(sisa)})`
        };
        await API.addKeuangan(txPayload);

      } catch (kErr) {
        console.warn("Sync keuangan on lunasi error:", kErr);
      }

      showToast({
        title: isEn ? "Success" : "Berhasil",
        message: isEn ? "Project marked as paid." : "Pelunasan berhasil dicatat ke sistem dan buku keuangan.",
        type: "success"
      });

      closeModal();
      loadProyekData();
    } else {
      showToast({ title: "Error", message: updateRes.message, type: "error" });
    }
  } catch (error) {
    console.error(error);
    showToast({ title: "Error", message: "Terjadi kesalahan saat melunasi proyek.", type: "error" });
  } finally {
    const sisaSelect = document.getElementById('modalSisaSelect');
    if (sisaSelect) {
      sisaSelect.disabled = false;
    }
  }
}
// Hapus Proyek Action
async function hapusProyek(id, name) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:delete')) {
    showToast({
      title: isEn ? "Access Denied" : "Akses Ditolak",
      message: isEn ? "You do not have permission to delete projects." : "Anda tidak memiliki izin untuk menghapus projek.",
      type: "error"
    });
    return;
  }

  let prjName = name || '';
  if (!prjName && window.allProyekList) {
    const prj = window.allProyekList.find(p => String(p.iDProyek) === String(id));
    if (prj) prjName = prj.namaProyek || '';
  }

  const isConfirmed = await showConfirmModal({
    title: isEn ? "Delete Project" : "Hapus Projek",
    message: confirmMsg,
    type: "danger",
    confirmText: isEn ? "Delete Project" : "Hapus Projek"
  });
  if (isConfirmed) {
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
let isAIGenerating = false;
async function generateAI(jenis) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  if (isAIGenerating) return;
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

  isAIGenerating = true;
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

  try {
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
  } catch (err) {
    console.error(err);
    showToast({
      title: "AI Error",
      message: isEn ? "Failed to generate AI response." : "Gagal membuat respon AI.",
      type: "error"
    });
  } finally {
    isAIGenerating = false;
  }
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
  const win = window.open(waUrl, 'FPManager_WhatsAppTab');
  if (win && typeof win.focus === 'function') {
    try { win.focus(); } catch (e) { }
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
      sumber: proyek.sumber || 'WhatsApp',
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

// Setup custom search handling
$('#customSearch').on('keyup', function () {
  if (table) {
    table.search(this.value).draw();
  }
});

function showProyekSkeletons() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');

  const tbody = document.querySelector('#proyekTable tbody');
  if (tbody) {
    tbody.innerHTML = Array(5).fill(`
      <tr class="border-b border-zinc-100 bg-white animate-pulse">
        <td class="p-4 text-center"><div class="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
        <td class="p-4 hidden md:table-cell"><div class="h-4 w-8 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4 hidden"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4 hidden md:table-cell"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4 hidden md:table-cell"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div></td>
        <td class="p-4"><div class="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="p-4"><div class="flex gap-2"><div class="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded"></div><div class="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded"></div></div></td>
      </tr>
    `).join('');
  }

  // Status Counters
  const skeletonCounter = '<div class="h-5 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mt-1"></div>';
  document.getElementById('count-all').innerHTML = skeletonCounter;
  document.getElementById('count-menunggu').innerHTML = skeletonCounter;
  document.getElementById('count-dikerjakan').innerHTML = skeletonCounter;
  document.getElementById('count-revisi').innerHTML = skeletonCounter;
  document.getElementById('count-selesai').innerHTML = skeletonCounter;
  document.getElementById('count-belumpembayaran').innerHTML = skeletonCounter;
}

// Action Bulk Delete
async function bulkDeleteProyek() {
  const checkedBoxes = $('.proyek-checkbox:checked');
  const ids = [];
  checkedBoxes.each(function () {
    ids.push($(this).val());
  });

  if (ids.length === 0) return;

  const isConfirmed = await showConfirmModal({
    title: "Hapus Projek Terpilih",
    message: `Apakah Anda yakin ingin menghapus ${ids.length} projek terpilih? Tindakan ini tidak dapat dibatalkan.`,
    type: "danger",
    confirmText: "Hapus Semua"
  });
  if (isConfirmed) {
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

// Global Calendar Sync helper by Proyek ID
function syncCalendarPromptByProyekId(id) {
  if (window.allProyekList) {
    const proyek = window.allProyekList.find(p => String(p.iDProyek) === String(id));
    if (proyek && typeof CalendarSync !== 'undefined') {
      CalendarSync.prompt(proyek);
      return;
    }
  }
  if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
    API.getProyek().then(list => {
      const proyek = list.find(p => String(p.iDProyek) === String(id));
      if (proyek && typeof CalendarSync !== 'undefined') {
        CalendarSync.prompt(proyek);
      }
    });
  }
}



