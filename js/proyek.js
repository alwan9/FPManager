let table; // Global table instance
let currentProyek = null;
document.addEventListener('DOMContentLoaded', () => {
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-800 shadow-sm shadow-emerald-500/50 animate-pulse"></span>';
    apiStatusBadge.className = 'absolute bottom-0 right-0 z-20 flex items-center justify-center pointer-events-none';
    apiStatusBadge.title = 'Live Google Sheets Connected';
  }

  const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
  const btnBlankInvoice = document.getElementById('btnBlankInvoice');
  if (btnBlankInvoice) {
    if (isDes) {
      btnBlankInvoice.classList.add('hidden');
      btnBlankInvoice.style.display = 'none';
    } else {
      btnBlankInvoice.classList.remove('hidden');
    }
  }

  if (isDes) {
    const selectAllEl = document.getElementById('selectAll');
    if (selectAllEl) {
      selectAllEl.style.display = 'none';
      const thEl = selectAllEl.closest('th');
      if (thEl) thEl.style.display = 'none';
    }
    const btnBulkDel = document.getElementById('btnBulkDelete');
    if (btnBulkDel) {
      btnBulkDel.style.display = 'none';
      btnBulkDel.classList.add('hidden');
      btnBulkDel.disabled = true;
    }
    const btnBulkInv = document.getElementById('btnBulkCreateInvoice');
    if (btnBulkInv) {
      btnBulkInv.style.display = 'none';
      btnBulkInv.classList.add('hidden');
      btnBulkInv.disabled = true;
    }
  }

  const btnFilterBelumBayar = document.getElementById('btnFilterBelumBayar');
  const statusFilterGrid = document.getElementById('statusFilterGrid');
  if (btnFilterBelumBayar) {
    if (isDes) {
      btnFilterBelumBayar.classList.add('hidden');
      if (statusFilterGrid) {
        statusFilterGrid.classList.remove('lg:grid-cols-6');
        statusFilterGrid.classList.add('lg:grid-cols-5');
      }
    } else {
      btnFilterBelumBayar.classList.remove('hidden');
      if (statusFilterGrid) {
        statusFilterGrid.classList.add('lg:grid-cols-6');
        statusFilterGrid.classList.remove('lg:grid-cols-5');
      }
    }
  }

  // Load Data
  loadProyekData();
});

// Helper: Dynamic distinct color styling for each assigned user
function getAssignColorStyles(dId) {
  if (!dId) {
    return {
      bgClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      badgeClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      iconClass: "text-zinc-400",
      arrowColor: "%2371717a"
    };
  }

  const palettes = [
    {
      // 0. Purple / Violet (e.g. wansmin / USR-001)
      bgClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      iconClass: "text-purple-500",
      arrowColor: "%23a855f7"
    },
    {
      // 1. Indigo / Blue
      bgClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      iconClass: "text-indigo-500",
      arrowColor: "%236366f1"
    },
    {
      // 2. Emerald / Green
      bgClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      iconClass: "text-emerald-500",
      arrowColor: "%2310b981"
    },
    {
      // 3. Amber / Orange
      bgClass: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      badgeClass: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      iconClass: "text-amber-500",
      arrowColor: "%23f59e0b"
    },
    {
      // 4. Rose / Pink
      bgClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      iconClass: "text-rose-500",
      arrowColor: "%23f43f5e"
    },
    {
      // 5. Sky / Blue
      bgClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      iconClass: "text-sky-500",
      arrowColor: "%230ea5e9"
    },
    {
      // 6. Fuchsia / Magenta
      bgClass: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
      badgeClass: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
      iconClass: "text-fuchsia-500",
      arrowColor: "%23d946ef"
    },
    {
      // 7. Teal
      bgClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      iconClass: "text-teal-500",
      arrowColor: "%2314b8a6"
    }
  ];

  const cleanId = String(dId).toLowerCase().trim();
  if (cleanId === "usr-001" || cleanId === "wansmin") return palettes[0];
  if (cleanId === "usr-002") return palettes[1];
  if (cleanId === "usr-003") return palettes[2];
  if (cleanId === "usr-004") return palettes[3];
  if (cleanId === "usr-005") return palettes[4];
  if (cleanId === "usr-006") return palettes[5];
  if (cleanId === "usr-007") return palettes[6];

  // Deterministic Hash code for any dynamic designer ID
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash << 5) - hash + cleanId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}
window.getAssignColorStyles = getAssignColorStyles;

// Load proyek data and initialize DataTables
async function loadProyekData() {
  showProyekSkeletons();
  try {
    let [listProyek, users] = await Promise.all([
      API.getProyek().catch(e => { console.warn("Error fetching proyek:", e); return []; }),
      API.getUsers().catch(e => { console.warn("Error fetching users:", e); return []; })
    ]);
    if (!Array.isArray(listProyek)) {
      listProyek = [];
    }
    if (Array.isArray(users)) {
      window.allUsersList = users;
      window.allDesignersList = users.filter(u => {
        const r = String(u.role || '').toLowerCase().trim();
        const uname = String(u.username || '').toLowerCase().trim();
        const uid = String(u.id || u.userId || '').toUpperCase().trim();
        return r === 'designer' || r === 'desainer' || uname === 'wansmin' || uid === 'USR-001';
      });
    } else {
      window.allUsersList = [];
      window.allDesignersList = [];
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

      // If filtering by 'Revisi', sort by deadline (column index 9) ascending (closest deadline first)
      if (statusFilter.toLowerCase() === 'revisi') {
        table.order([9, 'asc']).draw();
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
    data: Array.isArray(data) ? data : [],
    columnDefs: [
      { defaultContent: '', targets: '_all' }
    ],
    columns: [
      {
        data: null,
        orderable: false,
        visible: !(typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()),
        className: 'text-center w-10',
        render: function (data, type, row) {
          const rowData = row || data || {};
          const id = rowData.iDProyek || rowData.idProjek || rowData.id || '';
          return `<input type="checkbox" value="${escapeHtml(id)}" class="proyek-checkbox rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer align-middle">`;
        }
      },
      {
        data: 'iDProyek',
        className: 'hidden md:table-cell',
        render: function (data, type, row) {
          const rowData = row || {};
          const id = data || rowData.iDProyek || rowData.idProjek || rowData.id || '';
          const uid = rowData.userId || 'USR-001';
          return `
            <div>
              <div><span onclick="copyTextToClipboard('${escapeHtml(id)}', 'ID Proyek')" class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors" title="Klik untuk salin ID">${escapeHtml(id)}</span></div>
              <div class="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 font-mono"><i class="fa-solid fa-user-circle text-[10px]"></i><span>${escapeHtml(uid)}</span></div>
            </div>
          `;
        }
      },
      {
        data: 'tanggal',
        visible: false,
        render: function (data, type, row) {
          return (row && (row.tanggal || row.createdAt)) || data || '';
        }
      },
      {
        data: 'namaProyek',
        render: function (data, type, row) {
          const rowData = row || {};
          const name = data || rowData.namaProyek || rowData.nama_projek || rowData.proyek || '';
          const sumber = (rowData && rowData.sumber) ? rowData.sumber : 'WhatsApp';
          let sourceBadge = '';
          if (sumber.toLowerCase() === 'shopee') {
            sourceBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 ml-1.5 align-middle" title="Sumber: Shopee"><i class="fa-solid fa-bag-shopping text-[9px] text-orange-500"></i> Shopee</span>`;
          } else if (sumber.toLowerCase() === 'fiverr') {
            sourceBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ml-1.5 align-middle" title="Sumber: Fiverr"><i class="fa-solid fa-bolt text-[9px] text-emerald-500"></i> Fiverr</span>`;
          }
          return `<div><span class="font-medium text-zinc-900 dark:text-zinc-100">${escapeHtml(name)}</span> ${sourceBadge}</div>`;
        }
      },
      {
        data: 'namaPelanggan',
        className: 'hidden md:table-cell',
        render: function (data, type, row) {
          const rowData = row || {};
          return escapeHtml(data || rowData.namaPelanggan || rowData.pelanggan || '');
        }
      },
      {
        data: 'nomorWA',
        render: function (data, type, row) {
          const rowData = row || {};
          const wa = data || rowData.nomorWA || rowData.noWa || '';
          if (!wa) return '<span class="text-zinc-400 text-xs italic">-</span>';
          const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
          const displayWa = (isDes && typeof maskWhatsAppDigits === 'function') ? maskWhatsAppDigits(wa) : wa;
          const cleanWa = String(displayWa).startsWith('+') ? String(displayWa).slice(1) : String(displayWa);
          if (isDes) {
            return `<span onclick="copyTextToClipboard('${escapeHtml(displayWa)}', 'Nomor WA (Disamarkan)')" class="hover:underline cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold font-mono" title="Nomor WA (5 digit terakhir disamarkan)">+${escapeHtml(cleanWa)}</span>`;
          }
          return `<span onclick="copyTextToClipboard('${escapeHtml(wa)}', 'Nomor WA')" class="hover:underline cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold font-mono" title="Klik untuk salin Nomor WA">+${escapeHtml(cleanWa)}</span>`;
        }
      },
      {
        data: 'designerId',
        render: function (data, type, row) {
          const rowData = row || {};
          const prjId = rowData.iDProyek || rowData.idProjek || rowData.id || '';
          const dId = String(data || rowData.designerId || rowData.assignDesigner || '').trim();
          const users = window.allUsersList || [];
          const designers = window.allDesignersList || users.filter(u => {
            const r = String(u.role || '').toLowerCase().trim();
            const uname = String(u.username || '').toLowerCase().trim();
            const uid = String(u.id || u.userId || '').toUpperCase().trim();
            return r === 'designer' || r === 'desainer' || uname === 'wansmin' || uid === 'USR-001';
          });
          
          const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
          const colorStyle = getAssignColorStyles(dId);

          // If Designer role is viewing: show a read-only badge with the assigned designer name
          if (isDes) {
            if (!dId) {
              return '<span class="text-zinc-400 text-xs italic">Belum di-assign</span>';
            }
            const currentDesigner = users.find(u => (u.id && u.id === dId) || (u.userId && u.userId === dId) || (u.username && u.username === dId));
            const dName = currentDesigner ? (currentDesigner.name || currentDesigner.nama || currentDesigner.username) : dId;
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorStyle.badgeClass}" title="Designer: ${escapeHtml(dName)}"><i class="fa-solid fa-user-pen text-[10px] ${colorStyle.iconClass}"></i> ${escapeHtml(dName)}</span>`;
          }

          // For Super Admin and Service: Render an interactive dropdown with dynamic user color
          const selectBgSvg = `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22${colorStyle.arrowColor}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`;

          let selectHtml = `<select onchange="const style=getAssignColorStyles(this.value); this.className='inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 border ' + style.bgClass; updateProyekAssign('${escapeHtml(prjId)}', this.value, this)" class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 border ${colorStyle.bgClass}" style="appearance: none; -webkit-appearance: none; text-align-last: center; padding-right: 1.5rem; background-image: ${selectBgSvg}; background-repeat: no-repeat; background-position: right 0.5rem top 50%; background-size: 0.65rem auto;">`;

          selectHtml += `<option value="" class="bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">-- Belum di-assign --</option>`;

          designers.forEach(d => {
            const desId = d.id || d.userId || d.username;
            const desName = d.name || d.nama || d.username || desId;
            const isSelected = (String(desId) === dId || String(d.username || '').toLowerCase() === dId.toLowerCase()) ? 'selected' : '';
            selectHtml += `<option value="${escapeHtml(desId)}" ${isSelected} class="bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100">${escapeHtml(desName)}</option>`;
          });

          selectHtml += `</select>`;
          return selectHtml;
        }
      },
      {
        data: 'dP',
        visible: !(typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()),
        render: function (data, type, row) {
          if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) return '-';
          const rowData = row || {};
          const dpVal = Number(data !== undefined ? data : (rowData.totalDp !== undefined ? rowData.totalDp : (rowData.dp !== undefined ? rowData.dp : 0))) || 0;
          return `<span class="font-semibold text-zinc-900 dark:text-zinc-100">${formatRupiah(dpVal)}</span>`;
        }
      },
      {
        data: 'pelunasan',
        className: 'hidden md:table-cell',
        visible: !(typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()),
        render: function (data, type, row) {
          if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) return '-';
          const rowData = row || {};
          const totalNom = Number(rowData.nominalProyek || rowData.totalPembayaran || rowData.nominal || 0);
          const dpVal = Number(rowData.dP !== undefined ? rowData.dP : (rowData.totalDp !== undefined ? rowData.totalDp : (rowData.dp !== undefined ? rowData.dp : 0))) || 0;
          let pelunasanVal = Number(data !== undefined ? data : (rowData.totalPelunasan !== undefined ? rowData.totalPelunasan : (rowData.pelunasan !== undefined ? rowData.pelunasan : 0))) || 0;
          if (pelunasanVal <= 0 && totalNom > dpVal) {
            pelunasanVal = Math.max(0, totalNom - dpVal);
          }
          return `<span class="font-semibold text-zinc-800 dark:text-zinc-200">${formatRupiah(pelunasanVal)}</span>`;
        }
      },
      {
        data: 'deadline',
        render: function (data, type, row) {
          if (!data) return '-';
          if (type === 'display') {
            const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
            const cleanDl = (typeof window.parseSafeDateString === 'function')
              ? window.parseSafeDateString(data)
              : String(data || '').replace(/^'+/, '').split('T')[0];
            const parts = cleanDl.split('-');
            let diffDays = 0;
            let dateDisplay = cleanDl;

            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const day = parseInt(parts[2], 10);
              const dlDate = new Date(year, month - 1, day, 0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffMs = dlDate.getTime() - today.getTime();
              diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

              const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
              const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const mName = isEn ? monthsEn[month - 1] : monthsId[month - 1];
              dateDisplay = `${day} ${mName} ${year}`;
            } else {
              const dlDate = new Date(data);
              dlDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              diffDays = Math.round((dlDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }

            const st = String((row && row.status) || '').toLowerCase().trim();
            const isFinished = st.includes('selesai') || st.includes('batal') || st.includes('dibatalkan');

            const isWaitingOrProgress = st.includes('menunggu') || st.includes('dikerjakan');
            const isRevision = st.includes('revisi');

            if (isFinished) {
              return `<span class="font-semibold text-zinc-800 dark:text-zinc-200">${dateDisplay}</span>`;
            }

            let badgeHtml = '';
            const getBadgeText = (days) => {
              if (days === 0) return isEn ? 'Today' : 'Hari ini';
              if (days === 1) return isEn ? 'Tomorrow' : 'Besok';
              if (days > 1) return isEn ? `${days}d left` : `Sisa ${days} hari`;
              return isEn ? `Overdue ${Math.abs(days)}d` : `Terlambat ${Math.abs(days)} hari`;
            };

            if (isWaitingOrProgress) {
              if (diffDays >= 0) {
                const label = getBadgeText(diffDays);
                const badgeClass = diffDays === 0
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 font-bold'
                  : (diffDays === 1
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 font-bold'
                    : (diffDays <= 3
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-medium'));
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${badgeClass} w-max">${label}</span>`;
              } else {
                const label = getBadgeText(diffDays);
                const badgeClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 font-bold';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${badgeClass} w-max">${label}</span>`;
              }
            } else if (isRevision) {
              if (diffDays < 0) {
                const label = getBadgeText(diffDays);
                const badgeClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 font-bold animate-pulse';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${badgeClass} w-max">${label}</span>`;
              } else {
                const label = getBadgeText(diffDays);
                const badgeClass = diffDays <= 1
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 font-bold'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50 font-semibold';
                badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${badgeClass} w-max">${label}</span>`;
              }
            } else {
              // Fallback for other states (e.g. Belum Pembayaran)
              const label = getBadgeText(diffDays);
              const badgeClass = diffDays < 0
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-medium';
              badgeHtml = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${badgeClass} w-max">${label}</span>`;
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
            const rowData = row || {};
            const prjId = rowData.iDProyek || rowData.idProjek || rowData.id || '';
            const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
            const statusOptions = isDes
              ? ['Menunggu', 'Sedang Dikerjakan', 'Revisi', 'Selesai', 'Dibatalkan']
              : ['Menunggu', 'Sedang Dikerjakan', 'Revisi', 'Selesai', 'Belum Pembayaran', 'Dibatalkan'];
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
            const statusStr = String(data || rowData.status || '').trim();
            let badgeKey = statusStr.toLowerCase().replace(/\s+/g, '');
            if (badgeKey === 'dikerjakan') badgeKey = 'sedangdikerjakan';
            const badgeClass = 'badge-' + badgeKey;

            const currentUser = (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') ? Auth.getUser() : null;
            const currentUserId = currentUser ? (currentUser.id || currentUser.userId || currentUser.username) : '';
            const assignedDesignerId = rowData.designerId || rowData.assignDesigner || '';
            const isAssignedToCurrent = isDes && assignedDesignerId && (assignedDesignerId === currentUserId || (currentUser && currentUser.username && assignedDesignerId === currentUser.username));
            const canEditStatus = !isDes || isAssignedToCurrent;

            if (!canEditStatus) {
              return `<span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${badgeClass}" title="Hanya Designer yang di-assign / Admin / Service yang dapat mengubah status">${statusLabels[statusStr] || statusStr}</span>`;
            }

            let selectHtml = `<select onchange="const k=this.value.toLowerCase().replace(/\\s+/g,''); this.className='inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 badge-' + (k==='dikerjakan'?'sedangdikerjakan':k); updateProyekStatus('${escapeHtml(prjId)}', this.value, this)" class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${badgeClass}" style="appearance: none; -webkit-appearance: none; text-align-last: center; padding-right: 1.5rem; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.5rem top 50%; background-size: 0.65rem auto;">`;

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
        render: function (data, type, row) {
          const rowData = row || data || {};
          const id = rowData.iDProyek || rowData.idProjek || rowData.id || '';
          const escapedId = escapeHtml(id);
          const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());

          if (isDes) {
            return `
              <div class="flex space-x-1.5">
                <button onclick="viewDetail('${escapedId}')" class="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-md text-xs font-semibold" title="Detail Proyek (Read Only)">
                  <i class="fa-solid fa-eye mr-1"></i> Detail
                </button>
                <button onclick="syncCalendarPromptByProyekId('${escapedId}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold" title="Tambah ke Kalender (Google / iCal)">
                  <i class="fa-solid fa-calendar-plus"></i>
                </button>
              </div>
            `;
          }

          return `
            <div class="flex space-x-1.5">
              <button onclick="viewDetail('${escapedId}')" class="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-semibold" title="Detail Proyek">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button onclick="syncCalendarPromptByProyekId('${escapedId}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold" title="Tambah ke Kalender (Google / iCal)">
                <i class="fa-solid fa-calendar-plus"></i>
              </button>
              <a href="tambah-proyek.html?id=${encodeURIComponent(id)}" onclick="try{sessionStorage.setItem('cached_edit_proyek', JSON.stringify(window.allProyekList ? window.allProyekList.find(p => (p.iDProyek || p.idProjek || p.id) === '${escapedId}') : null))}catch(e){}" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors" title="Edit Proyek">
                <i class="fa-solid fa-pen"></i>
              </a>
              <button onclick="hapusProyek('${escapedId}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors" title="Hapus Proyek">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;
        }
      },
      {
        data: 'statusOrder',
        visible: false,
        searchable: false,
        defaultContent: 99
      }
    ],
    orderFixed: {
      pre: [[13, 'asc']]
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
    table.column(10).search('').draw();
  } else {
    // Regex exact match agar status tidak saling menyaring
    table.column(10).search('^' + status + '$', true, false).draw();
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

  const proyekId = proyek.iDProyek || proyek.idProjek || proyek.id || proyek.idProyek || '-';
  const userId = proyek.userId || proyek.userid || '-';
  const sumber = proyek.sumber || '-';
  const namaProyek = proyek.namaProyek || proyek.proyek || proyek.nama || '-';
  const namaPelanggan = proyek.namaPelanggan || proyek.pelanggan || proyek.client || '-';
  const produk = proyek.produk || proyek.jenisProduk || proyek.namaProduk || '-';
  const jumlah = (proyek.jumlah !== undefined && proyek.jumlah !== null && String(proyek.jumlah).trim() !== '') ? proyek.jumlah : '-';
  const satuan = (proyek.satuan && String(proyek.satuan).trim() !== '') ? String(proyek.satuan).trim() : '-';
  const nominal = parseFloat(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal !== undefined ? proyek.nominal : (proyek.totalPembayaran || 0))) || 0;
  const dp = parseFloat(proyek.dP !== undefined ? proyek.dP : (proyek.dp !== undefined ? proyek.dp : (proyek.totalDp || 0))) || 0;
  const pelunasan = parseFloat(proyek.pelunasan !== undefined ? proyek.pelunasan : (proyek.totalPelunasan || 0)) || 0;
  const sisa = parseFloat(proyek.sisaPembayaran !== undefined ? proyek.sisaPembayaran : (proyek.sisa !== undefined ? proyek.sisa : Math.max(0, nominal - dp - pelunasan))) || 0;
  const status = proyek.status || 'Menunggu';
  const catatan = proyek.catatan || proyek.keterangan || '';
  const gdriveLink = proyek.gdriveLink || proyek.gdrive || '';
  const metodePembayaran = proyek.metodePembayaran || proyek.metode || '-';
  const deadline = proyek.deadline || proyek.tenggatWaktu || proyek.target || '';

  // 1. ID & User ID
  const modalIdEl = document.getElementById('modalId');
  if (modalIdEl) {
    modalIdEl.textContent = proyekId;
    modalIdEl.classList.remove('hidden');
  }

  const modalUserIdEl = document.getElementById('modalUserId');
  if (modalUserIdEl) {
    modalUserIdEl.textContent = userId;
    modalUserIdEl.classList.remove('hidden');
  }

  // 1b. Assign Designer Display
  const modalAssignTextEl = document.getElementById('modalAssignText');
  const modalAssignEl = document.getElementById('modalAssign');
  const designerId = proyek.designerId || proyek.assignDesigner || '';
  let designerDisplayName = isEn ? 'Unassigned' : 'Belum di-assign';
  if (designerId) {
    const users = window.allUsersList || [];
    const designerObj = users.find(u => (u.id && u.id === designerId) || (u.userId && u.userId === designerId) || (u.username && u.username === designerId));
    designerDisplayName = designerObj ? (designerObj.nama || designerObj.name || designerObj.username) : designerId;
  }
  if (modalAssignTextEl) {
    modalAssignTextEl.textContent = designerDisplayName;
  }
  if (modalAssignEl) {
    const colorStyle = getAssignColorStyles(designerId);
    modalAssignEl.className = `inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${colorStyle.badgeClass}`;
    modalAssignEl.innerHTML = `<i class="fa-solid fa-user-pen text-[10px] ${colorStyle.iconClass}"></i> <span id="modalAssignText">${escapeHtml(designerDisplayName)}</span>`;
    modalAssignEl.classList.remove('hidden');
  }

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
    let badgeStatusKey = String(status).toLowerCase().replace(/\s+/g, '');
    if (badgeStatusKey === 'dikerjakan') badgeStatusKey = 'sedangdikerjakan';
    modalStatusEl.className = `inline-block px-2.5 py-1 text-xs font-semibold rounded-full badge-${badgeStatusKey}`;
  }

  // 3. Sumber Badge
  const modalSumberEl = document.getElementById('modalSumber');
  if (modalSumberEl) {
    const sLower = String(sumber).toLowerCase().trim();
    if (sLower === 'shopee') {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 transition';
      modalSumberEl.innerHTML = '<a href="https://shopee.co.id/premium_dz?categoryId=100642&entryPoint=ShopByPDP&itemId=55317597618" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-orange-700 dark:text-orange-300" title="Buka Toko Shopee"><i class="fa-solid fa-bag-shopping text-orange-500 mr-1.5"></i> Shopee <i class="fa-solid fa-arrow-up-right-from-square text-[9px] ml-1 opacity-70"></i></a>';
    } else if (sLower === 'fiverr') {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      modalSumberEl.innerHTML = '<i class="fa-solid fa-bolt text-emerald-500 mr-1"></i> Fiverr';
    } else if (sLower === 'whatsapp' || sLower === 'wa') {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800';
      modalSumberEl.innerHTML = '<i class="fa-brands fa-whatsapp text-green-500 mr-1"></i> WhatsApp';
    } else {
      modalSumberEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-lg mt-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700';
      modalSumberEl.innerHTML = escapeHtml(sumber);
    }
    modalSumberEl.classList.remove('hidden');
  }

  // 4. Deadline Display
  const modalDeadlineEl = document.getElementById('modalDeadline');
  if (modalDeadlineEl) {
    modalDeadlineEl.classList.remove('hidden');
    if (deadline && String(deadline).trim() !== '' && String(deadline).trim() !== '-') {
      const cleanDl = (typeof window.parseSafeDateString === 'function')
        ? window.parseSafeDateString(deadline)
        : String(deadline).replace(/^'+/, '').split('T')[0];
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
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs ${colorClass}"> (${isEn ? `${diffDays} days left` : `Sisa ${diffDays} hari`})</span>`;
        } else {
          modalDeadlineEl.innerHTML = `<span class="text-zinc-800 dark:text-zinc-100">${dateDisplay}</span> <span class="text-xs text-red-600 dark:text-red-400 font-bold"> (${isEn ? `Overdue ${Math.abs(diffDays)}d` : `Terlambat ${Math.abs(diffDays)} hari`})</span>`;
        }
      }
    } else {
      modalDeadlineEl.textContent = '-';
    }
  }

  // 5. Customer & WA / Contact
  const modalPelangganEl = document.getElementById('modalPelanggan');
  if (modalPelangganEl) {
    modalPelangganEl.textContent = namaPelanggan;
    modalPelangganEl.classList.remove('hidden');
  }

  const contactRaw = String(proyek.nomorWA || proyek.wa || proyek.noWa || proyek.nomorWa || '').trim();
  let digitsOnly = contactRaw.replace(/\D/g, '');
  let formattedContact = '-';
  let isPhone = false;

  if (digitsOnly.length >= 8) {
    if (digitsOnly.startsWith('0')) digitsOnly = '62' + digitsOnly.slice(1);
    else if (!digitsOnly.startsWith('62')) digitsOnly = '62' + digitsOnly;
    formattedContact = `+${digitsOnly}`;
    isPhone = true;
  } else if (contactRaw && contactRaw !== '-' && contactRaw !== '62') {
    formattedContact = contactRaw;
  }

  const modalWaEl = document.getElementById('modalWa');
  const isDesRole = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
  if (modalWaEl) {
    if (isPhone) {
      const displayPhone = (isDesRole && typeof maskWhatsAppDigits === 'function') ? maskWhatsAppDigits(formattedContact) : formattedContact;
      modalWaEl.innerHTML = `<i class="fa-brands fa-whatsapp ${isDesRole ? 'text-zinc-400 dark:text-zinc-500' : 'text-emerald-500'}"></i> <span>${displayPhone}</span>`;
      if (isDesRole) {
        modalWaEl.onclick = (e) => {
          if (e) e.preventDefault();
        };
        modalWaEl.className = "inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60 select-none";
        modalWaEl.title = isEn ? 'WhatsApp is disabled for Designer role' : 'Nomor WhatsApp dinonaktifkan untuk role Desainer';
      } else {
        modalWaEl.onclick = () => copyTextToClipboard(digitsOnly, 'Nomor WA');
        modalWaEl.className = "inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/70 cursor-pointer transition-colors";
        modalWaEl.title = isEn ? 'Click to copy WhatsApp Number' : 'Klik untuk salin Nomor WA';
      }
    } else if (sumber.toLowerCase() === 'shopee') {
      modalWaEl.className = "inline-flex items-center gap-1 text-xs font-semibold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 px-2 py-0.5 rounded-md border border-orange-200/70 dark:border-orange-800/70 cursor-pointer transition-colors";
      modalWaEl.innerHTML = `<i class="fa-solid fa-bag-shopping text-orange-500"></i> <span>${escapeHtml(formattedContact)}</span>`;
      modalWaEl.onclick = () => copyTextToClipboard(formattedContact, 'Kontak Shopee');
      modalWaEl.title = isEn ? 'Click to copy Shopee Contact' : 'Klik untuk salin Kontak Shopee';
    } else if (sumber.toLowerCase() === 'fiverr') {
      modalWaEl.className = "inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/70 cursor-pointer transition-colors";
      modalWaEl.innerHTML = `<i class="fa-solid fa-bolt text-emerald-500"></i> <span>${escapeHtml(formattedContact)}</span>`;
      modalWaEl.onclick = () => copyTextToClipboard(formattedContact, 'Kontak Fiverr');
      modalWaEl.title = isEn ? 'Click to copy Fiverr Contact' : 'Klik untuk salin Kontak Fiverr';
    } else {
      modalWaEl.className = "inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200/70 dark:border-zinc-700/70 cursor-pointer transition-colors";
      modalWaEl.innerHTML = `<span>${escapeHtml(formattedContact)}</span>`;
      modalWaEl.onclick = () => copyTextToClipboard(formattedContact, 'Kontak');
      modalWaEl.title = isEn ? 'Click to copy contact' : 'Klik untuk salin kontak';
    }
    modalWaEl.classList.remove('hidden');
  }

  // 6. Product Details
  const modalNamaProyekEl = document.getElementById('modalNamaProyek');
  if (modalNamaProyekEl) {
    modalNamaProyekEl.textContent = namaProyek;
    modalNamaProyekEl.classList.remove('hidden');
  }

  const modalProdukEl = document.getElementById('modalProduk');
  if (modalProdukEl) {
    modalProdukEl.textContent = produk;
    modalProdukEl.classList.remove('hidden');
  }

  const modalJumlahEl = document.getElementById('modalJumlah');
  if (modalJumlahEl) {
    modalJumlahEl.textContent = jumlah;
    modalJumlahEl.classList.remove('hidden');
  }

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
    modalSatuanEl.classList.remove('hidden');
  }

  const modalHargaSatuanEl = document.getElementById('modalHargaSatuan');
  if (modalHargaSatuanEl) {
    const qty = parseFloat(jumlah);
    let hargaSatuan = 0;
    if (proyek.hargaSatuan !== undefined && proyek.hargaSatuan !== null && Number(proyek.hargaSatuan) > 0) {
      hargaSatuan = Number(proyek.hargaSatuan);
    } else if (!isNaN(qty) && qty > 0 && nominal > 0) {
      hargaSatuan = Math.round(nominal / qty);
    }
    modalHargaSatuanEl.textContent = formatRupiah(hargaSatuan);
  }

  // 7. Finance Breakdown
  const modalNominalEl = document.getElementById('modalNominal');
  if (modalNominalEl) {
    modalNominalEl.textContent = formatRupiah(nominal);
    modalNominalEl.classList.remove('hidden');
  }

  const modalDpEl = document.getElementById('modalDp');
  if (modalDpEl) {
    modalDpEl.textContent = formatRupiah(dp);
    modalDpEl.classList.remove('hidden');
  }

  const modalPelunasanEl = document.getElementById('modalPelunasan');
  if (modalPelunasanEl) {
    modalPelunasanEl.textContent = formatRupiah(pelunasan);
    modalPelunasanEl.classList.remove('hidden');
  }

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
    sisaSelect.classList.remove('hidden');
  }

  // 9. Metode Pembayaran
  const modalMetodeEl = document.getElementById('modalMetode');
  if (modalMetodeEl) {
    modalMetodeEl.textContent = metodePembayaran;
    modalMetodeEl.classList.remove('hidden');
  }

  // 10. Catatan
  const modalCatatanEl = document.getElementById('modalCatatan');
  if (modalCatatanEl) {
    modalCatatanEl.textContent = catatan || (isEn ? 'No notes.' : 'Tidak ada catatan.');
    modalCatatanEl.classList.remove('hidden');
  }

  // 11. Google Drive Link
  const modalGDriveContainer = document.getElementById('modalGDriveContainer');
  const modalGDriveLink = document.getElementById('modalGDriveLink');
  const gdriveInputContainer = document.getElementById('gdriveInputContainer');
  const gdriveLinkInput = document.getElementById('gdriveLink');

  if (gdriveLink && gdriveLink.trim() !== '') {
    if (modalGDriveContainer) modalGDriveContainer.classList.remove('hidden');
    if (modalGDriveLink) {
      modalGDriveLink.href = sanitizeUrl(gdriveLink);
      modalGDriveLink.classList.remove('hidden');
    }
    if (gdriveInputContainer) gdriveInputContainer.classList.add('hidden');
    if (gdriveLinkInput) gdriveLinkInput.value = gdriveLink;
  } else {
    if (modalGDriveContainer) modalGDriveContainer.classList.add('hidden');
    if (modalGDriveLink) modalGDriveLink.href = '#';
    if (gdriveInputContainer) gdriveInputContainer.classList.remove('hidden');
    if (gdriveLinkInput) gdriveLinkInput.value = '';
  }

  const isDesigner = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());

  const detailFinancialCard = document.getElementById('detailFinancialCard');
  if (detailFinancialCard) {
    if (isDesigner) {
      detailFinancialCard.classList.add('hidden');
    } else {
      detailFinancialCard.classList.remove('hidden');
    }
  }

  const modalHargaSatuanContainer = document.getElementById('modalHargaSatuanContainer');
  if (modalHargaSatuanContainer) {
    if (isDesigner) {
      modalHargaSatuanContainer.classList.add('hidden');
    } else {
      modalHargaSatuanContainer.classList.remove('hidden');
    }
  }

  const modalMetodeContainer = document.getElementById('modalMetodeContainer');
  if (modalMetodeContainer) {
    if (isDesigner) {
      modalMetodeContainer.classList.add('hidden');
    } else {
      modalMetodeContainer.classList.remove('hidden');
    }
  }

  // 12. Action Buttons in Footer
  const modalCalendarBtn = document.getElementById('modalCalendarBtn');
  if (modalCalendarBtn) {
    modalCalendarBtn.classList.remove('hidden');
    modalCalendarBtn.onclick = () => {
      if (typeof CalendarSync !== 'undefined') {
        CalendarSync.prompt(proyek);
      }
    };
  }

  const modalEditBtn = document.getElementById('modalEditBtn');
  if (modalEditBtn) {
    if (isDesigner) {
      modalEditBtn.classList.add('hidden');
    } else {
      modalEditBtn.classList.remove('hidden');
      modalEditBtn.onclick = () => {
        try { sessionStorage.setItem('cached_edit_proyek', JSON.stringify(proyek)); } catch (e) { }
        window.location.href = `tambah-proyek.html?id=${encodeURIComponent(proyekId)}`;
      };
    }
  }

  const modalInvoiceBtn = document.getElementById('modalInvoiceBtn');
  if (modalInvoiceBtn) {
    if (isDesigner) {
      modalInvoiceBtn.classList.add('hidden');
    } else {
      modalInvoiceBtn.classList.remove('hidden');
      modalInvoiceBtn.onclick = () => {
        window.location.href = `invoice.html?id=${encodeURIComponent(proyekId)}`;
      };
    }
  }

  const modalHapusBtn = document.getElementById('modalHapusBtn');
  if (modalHapusBtn) {
    if (isDesigner) {
      modalHapusBtn.classList.add('hidden');
    } else {
      modalHapusBtn.classList.remove('hidden');
      modalHapusBtn.onclick = () => {
        closeModal();
        hapusProyek(proyekId, namaProyek);
      };
    }
  }

  const waBtnEl = document.getElementById('modalWaBtn');
  if (waBtnEl) {
    if (isDesRole) {
      waBtnEl.classList.remove('hidden');
      waBtnEl.href = 'javascript:void(0)';
      waBtnEl.removeAttribute('target');
      waBtnEl.onclick = (e) => {
        if (e) e.preventDefault();
        if (typeof Toast !== 'undefined') {
          Toast.warning('Akses Ditolak', 'Fitur WhatsApp dinonaktifkan untuk role Desainer.');
        } else if (typeof showToast === 'function') {
          showToast({ title: 'Akses Ditolak', message: 'Fitur WhatsApp dinonaktifkan untuk role Desainer.', type: 'warning' });
        }
      };
      waBtnEl.className = "w-full sm:w-auto px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-semibold rounded-xl text-xs text-center border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-2 cursor-not-allowed opacity-60";
      waBtnEl.title = isEn ? 'WhatsApp contact disabled for Designer role' : 'Kontak WhatsApp dinonaktifkan untuk role Desainer';
      waBtnEl.setAttribute('aria-disabled', 'true');
    } else {
      waBtnEl.classList.remove('hidden');
      waBtnEl.onclick = null;
      waBtnEl.className = "w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs text-center shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer";
      waBtnEl.title = isEn ? 'Contact WhatsApp' : 'Hubungi WhatsApp';
      waBtnEl.removeAttribute('aria-disabled');
      if (isPhone && digitsOnly) {
        const waText = encodeURIComponent(CONFIG.WA_TEMPLATE || '');
        waBtnEl.href = `https://api.whatsapp.com/send?phone=${digitsOnly}&text=${waText}`;
        waBtnEl.target = 'FPManager_WhatsAppTab';
        waBtnEl.classList.remove('opacity-50', 'pointer-events-none');
      } else {
        waBtnEl.href = '#';
        waBtnEl.classList.add('opacity-50', 'pointer-events-none');
      }
    }
  }

  const btnSendAIWa = document.getElementById('modalBtnSendAIWhatsapp');
  if (btnSendAIWa) {
    if (isDesRole) {
      btnSendAIWa.disabled = true;
      btnSendAIWa.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      btnSendAIWa.title = isEn ? 'WhatsApp feature is disabled for Designer role' : 'Fitur WhatsApp dinonaktifkan untuk role Desainer';
    } else {
      btnSendAIWa.disabled = false;
      btnSendAIWa.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      btnSendAIWa.title = '';
    }
  }

  // Reset AI section
  const hasilAIEl = document.getElementById('hasilAI');
  if (hasilAIEl) hasilAIEl.value = '';

  // Enforce DOM Role Visibility
  if (typeof Auth !== 'undefined') {
    if (typeof Auth.applyButtonPermissions === 'function') {
      Auth.applyButtonPermissions();
    }
  }

  // Reset ke Tab Informasi & Finansial
  switchDetailModalTab('info');

  // Buka modal
  const modal = document.getElementById('detailModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}
window.populateDetailModal = populateDetailModal;

// Tab Switcher for Detail Modal
function switchDetailModalTab(tabName) {
  const tabInfo = document.getElementById('detailTabInfo');
  const tabAI = document.getElementById('detailTabAI');
  const btnInfo = document.getElementById('tabBtnInfo');
  const btnAI = document.getElementById('tabBtnAI');

  if (!tabInfo || !tabAI || !btnInfo || !btnAI) return;

  if (tabName === 'ai') {
    tabInfo.classList.add('hidden');
    tabAI.classList.remove('hidden');

    btnAI.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs";
    btnInfo.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";
  } else {
    tabInfo.classList.remove('hidden');
    tabAI.classList.add('hidden');

    btnInfo.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs";
    btnAI.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";
  }
}
window.switchDetailModalTab = switchDetailModalTab;

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

  const result = await promptMetodePelunasanModal({
    proyekId: currentProyek.iDProyek || '',
    namaPelanggan: currentProyek.namaPelanggan,
    namaProyek: currentProyek.namaProyek,
    nominal: nominalVal,
    dp: dpVal,
    sisa: sisa,
    currentMetode: currentProyek.metodePembayaran || currentProyek.metode || 'Shopee'
  });

  if (!result || !result.confirmed) {
    return;
  }

  try {
    const sisaSelect = document.getElementById('modalSisaSelect');
    if (sisaSelect) {
      sisaSelect.disabled = true;
    }

    let newCatatan = currentProyek.catatan || "";
    if (result.catatan) {
      newCatatan = newCatatan ? `${newCatatan} - ${result.catatan}` : result.catatan;
    } else if (newCatatan && !newCatatan.toLowerCase().includes("lunas")) {
      newCatatan += " - Pembayaran LUNAS";
    } else if (!newCatatan) {
      newCatatan = "Pembayaran LUNAS";
    }

    const settledPelunasan = pelunasanCurrent + sisa;
    const chosenMetode = result.metode || currentProyek.metodePembayaran || 'Shopee';
    const dpMetodeAsli = currentProyek.metodeBayarDp || currentProyek.metodePembayaran || currentProyek.metode || 'Shopee';

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
      metodePembayaran: dpMetodeAsli, // Metode bayar DP / asal tetap tersimpan
      metodeBayarDp: dpMetodeAsli,
      metodeBayarPelunasan: chosenMetode, // Metode pembayaran pelunasan dari popup
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
            metodeBayarDp: linkedDpTx.metodeBayarDp || dpMetodeAsli,
            metodeBayarPelunasan: chosenMetode,
            metodePembayaran: chosenMetode,
            catatanPelunasan: result.catatan || `Pelunasan via ${chosenMetode} tgl ${new Date().toLocaleDateString('id-ID')}`
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
          metodeBayarDp: dpMetodeAsli,
          metodeBayarPelunasan: chosenMetode,
          metodePembayaran: chosenMetode,
          idProyek: prjId,
          catatanPelunasan: result.catatan || `Pelunasan tagihan projek via ${chosenMetode} (${formatRupiah(sisa)})`
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
  if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) {
    if (typeof Toast !== 'undefined') {
      Toast.error("Akses Ditolak", "Role Desainer tidak memiliki izin untuk menghapus projek.");
    } else if (typeof showToast === 'function') {
      showToast({ title: "Akses Ditolak", message: "Role Desainer tidak memiliki izin untuk menghapus projek.", type: "error" });
    }
    return;
  }

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

  let prjName = name || '';
  if (!prjName && window.allProyekList) {
    const prj = window.allProyekList.find(p => String(p.iDProyek) === String(id));
    if (prj) prjName = prj.namaProyek || '';
  }

  const confirmMsg = isEn
    ? `Are you sure you want to delete project ${prjName ? `"${prjName}"` : `(${id})`}? This action cannot be undone.`
    : `Apakah Anda yakin ingin menghapus projek ${prjName ? `"${prjName}"` : `(${id})`}? Tindakan ini tidak dapat dibatalkan.`;

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
function getGeminiApiKey() {
  if (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_API_KEY) {
    return CONFIG.GEMINI_API_KEY;
  }
  return localStorage.getItem('cfg_gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '';
}

function buildGeminiProjectPrompt(jenis, customPrompt, proyek, gdriveLink) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const formatRp = (num) => formatRupiah(num);
  const namaKlien = proyek.namaPelanggan || proyek.pelanggan || proyek.client || 'Kak';
  const namaProyek = proyek.namaProyek || proyek.proyek || proyek.nama || 'Projek Desain';
  const produk = proyek.produk || proyek.jenisProduk || '-';
  const jumlah = (proyek.jumlah !== undefined && proyek.jumlah !== null && String(proyek.jumlah).trim() !== '') ? proyek.jumlah : '-';
  const satuan = (proyek.satuan && String(proyek.satuan).trim() !== '') ? proyek.satuan : '';
  const nominal = formatRp(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0));
  const dp = formatRp(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0));
  const pelunasan = formatRp(proyek.pelunasan !== undefined ? proyek.pelunasan : (proyek.totalPelunasan || 0));
  const sisa = formatRp(proyek.sisaPembayaran !== undefined ? proyek.sisaPembayaran : (proyek.sisa !== undefined ? proyek.sisa : 0));
  const status = proyek.status || 'Menunggu';
  const deadline = proyek.deadline || '-';
  const metode = proyek.metodePembayaran || proyek.metode || '-';
  const catatan = proyek.catatan || proyek.keterangan || '-';
  const gdrive = gdriveLink || proyek.gdriveLink || proyek.gdrive || '';

  let tugas = '';
  if (jenis === 'followup') {
    tugas = 'Buat pesan WhatsApp singkat dan ramah untuk menanyakan kabar / respon / kelanjutan projek kepada klien.';
  } else if (jenis === 'penawaran') {
    tugas = 'Buat draf penawaran / konfirmasi pesanan projek secara ringkas, ramah, to the point dengan rincian biaya yang jelas.';
  } else if (jenis === 'invoice') {
    tugas = 'Buat pesan pengiriman invoice / tagihan pembayaran projek secara ringkas, ramah, dan santun dengan rincian nominal dan metode pembayaran.';
  } else if (jenis === 'pelunasan') {
    tugas = 'Buat pesan pengingat sisa pelunasan pembayaran projek secara ramah, santun, dan to the point, menyebutkan sisa tagihan.';
  } else if (jenis === 'selesai') {
    tugas = `Buat pesan ramah bahwa pekerjaan/desain telah selesai dan file final resolusi tinggi sudah diupload di Google Drive. Sertakan link Google Drive: ${gdrive || '[Link Google Drive]'}`;
  } else if (jenis === 'testimoni') {
    tugas = 'Buat pesan singkat dan ramah untuk meminta sedikit ulasan / feedback singkat dari klien atas hasil pekerjaan projek ini.';
  } else if (jenis === 'custom') {
    tugas = `Jawab pertanyaan atau laksanakan instruksi berikut mengenai project ini secara langsung, ramah, to the point, dan tidak bertele-tele:\n"${customPrompt}"`;
  }

  return `Kamu adalah AI Assistant untuk freelancer / desainer grafis pada aplikasi FPManager.
Pedoman Gaya Komunikasi (SANGAT PENTING):
1. Gunakan Bahasa Indonesia yang natural, santun, ramah, dan terasa seperti manusia asli (freelancer profesional yang akrab dan komunikatif).
2. Sapa klien dengan "Halo Kak ${namaKlien}" (atau "Halo Kak" jika nama tidak spesifik).
3. HINDARI bahasa yang terlalu formal, baku, kaku, atau seperti surat dinas (JANGAN gunakan kata seperti "Yth.", "Dengan ini kami informasikan", "Sehubungan dengan", dll).
4. HINDARI pembuka basa-basi yang tidak perlu seperti "Halo Kak, apa kabar? Semoga harinya menyenangkan." Langsung ke inti pembicaraan!
5. Jika ada pertanyaan sederhana, langsung jawab intinya secara jelas dan singkat.
6. Gunakan bahasa yang sopan, ramah, dan ringkas, jangan berlebihan.
7. Selalu gunakan fakta dan data proyek yang diberikan di bawah. JANGAN PERNAH MENGARANG informasi jika data tidak tersedia di konteks.
8. Pola Closing: Jika pekerjaan/pesan sudah selesai, gunakan closing yang singkat, ramah, dan positif yang konsisten, contoh:
"Semoga sesuai ya, Kak. Kalau ada yang mau disesuaikan lagi, tinggal kabarin aja."

DATA DETAIL PROJECT AKTIF:
- ID Proyek: ${proyek.iDProyek || proyek.idProjek || proyek.id || '-'}
- Nama Pelanggan / Klien: ${namaKlien}
- Nama Projek / Pekerjaan: ${namaProyek}
- Produk: ${produk}
- Jumlah: ${jumlah} ${satuan}
- Total Biaya / Nominal: ${nominal}
- Uang Muka (DP): ${dp}
- Pelunasan: ${pelunasan}
- Sisa Tagihan: ${sisa}
- Status Pengerjaan: ${status}
- Tenggat Waktu (Deadline): ${deadline}
- Metode Pembayaran: ${metode}
- Catatan / Keterangan: ${catatan}
- Link Google Drive: ${gdrive || 'Belum tersedia'}

TUGAS / INSTRUKSI:
${tugas}

Berikan langsung teks output yang siap dikirim/dibaca tanpa kata pengantar tambahan dari AI (seperti "Tentu, ini drafnya:").`;
}

function generateSmartLocalMessage(jenis, customPrompt, proyek, gdriveLink) {
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const formatRp = (num) => formatRupiah(num);
  const namaKlien = proyek.namaPelanggan || proyek.pelanggan || proyek.client || (isEn ? 'Client' : 'Kak');
  const namaProyek = proyek.namaProyek || proyek.proyek || proyek.nama || (isEn ? 'Design Project' : 'Projek Desain');
  const produk = proyek.produk || proyek.jenisProduk || '-';
  const jumlah = (proyek.jumlah !== undefined && proyek.jumlah !== null && String(proyek.jumlah).trim() !== '') ? proyek.jumlah : 1;
  const satuan = (proyek.satuan && String(proyek.satuan).trim() !== '') ? proyek.satuan : 'pcs';
  const nominal = formatRp(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0));
  const dp = formatRp(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0));
  const sisa = formatRp(proyek.sisaPembayaran !== undefined ? proyek.sisaPembayaran : (proyek.sisa !== undefined ? proyek.sisa : 0));
  const deadline = proyek.deadline || '-';
  const metode = proyek.metodePembayaran || proyek.metode || 'Transfer Bank / QRIS';
  const gdrive = gdriveLink || proyek.gdriveLink || proyek.gdrive || '';

  if (jenis === 'followup') {
    return isEn
      ? `Hello ${namaKlien}, following up on our project *${namaProyek}*.\n\nIs there anything you would like to discuss or adjust further, Kak?\n\nPlease let me know whenever you have a moment.`
      : `Halo Kak ${namaKlien}, mau follow up terkait kelanjutan projek *${namaProyek}* ya.\n\nKira-kira ada yang perlu kita diskusikan atau sesuaikan lagi, Kak?\n\nKalau Kakak ada waktu luang, tinggal kabarin aja ya.`;
  }

  if (jenis === 'penawaran') {
    return isEn
      ? `Hello ${namaKlien}, here is the quotation details for *${namaProyek}*:\n\n• Product: ${produk} (${jumlah} ${satuan})\n• Total Amount: ${nominal}\n• Payment Method: ${metode}\n\nIf everything looks good, please confirm so we can get started right away.\n\nLooking forward to working with you!`
      : `Halo Kak ${namaKlien}, ini rincian penawaran untuk pengerjaan *${namaProyek}* ya:\n\n• Produk: ${produk} (${jumlah} ${satuan})\n• Total Biaya: ${nominal}\n• Metode Pembayaran: ${metode}\n\nKalau sudah oke, bisa langsung konfirmasi ya Kak biar bisa segera saya jadwalkan pengerjaannya.\n\nSemoga sesuai ya, Kak. Kalau ada yang mau disesuaikan lagi, tinggal kabarin aja.`;
  }

  if (jenis === 'invoice') {
    return isEn
      ? `Hello ${namaKlien}, here is the invoice for project *${namaProyek}*:\n\n• Total Amount: ${nominal}\n• Down Payment (DP): ${dp}\n• Remaining Balance: ${sisa}\n• Payment Method: ${metode}\n\nPlease proceed with the transfer and share the payment receipt here once completed.`
      : `Halo Kak ${namaKlien}, untuk invoice rincian tagihan projek *${namaProyek}* sudah siap ya, Kak:\n\n• Total Biaya: ${nominal}\n• DP: ${dp}\n• Sisa Tagihan: ${sisa}\n• Metode Pembayaran: ${metode}\n\nNanti kalau sudah transfer, tinggal kirimkan bukti pembayarannya ke sini ya, Kak. Terima kasih banyak!`;
  }

  if (jenis === 'pelunasan') {
    return isEn
      ? `Hello ${namaKlien}, project *${namaProyek}* is now completed!\n\nFor the remaining balance of *${sisa}*, please transfer via *${metode}*.\n\nOnce received, I'll send over the final high-resolution files right away. Thank you!`
      : `Halo Kak ${namaKlien}, projek *${namaProyek}* sudah selesai dikerjakan ya.\n\nUntuk sisa pelunasannya sebesar *${sisa}* bisa ditransfer melalui *${metode}* ya, Kak.\n\nBegitu pelunasan masuk, file resolusi tingginya langsung saya kirimkan. Makasih banyak ya, Kak!`;
  }

  if (jenis === 'selesai') {
    return isEn
      ? `Hello ${namaKlien}, the final high-resolution files for *${namaProyek}* have been uploaded to Google Drive:\nLink: ${gdrive || '[Google Drive link]'}\n\nHope you love the result! If there's anything else you'd like to adjust, just let me know.`
      : `Halo Kak ${namaKlien}, untuk desain dan file final *${namaProyek}* udah saya upload di Google Drive ini ya, Kak:\nLink: ${gdrive || '[Link Google Drive]'}\n\nSemoga sesuai ya, Kak. Kalau ada yang mau disesuaikan lagi, tinggal kabarin aja.`;
  }

  if (jenis === 'testimoni') {
    return isEn
      ? `Hello ${namaKlien}, thank you very much for trusting us with *${namaProyek}*!\n\nIf you have a quick moment, I'd really appreciate your brief feedback or testimonial. It helps a lot!\n\nThank you again and looking forward to our next project together!`
      : `Halo Kak ${namaKlien}, makasih banyak udah percayain pengerjaan *${namaProyek}* ke saya ya.\n\nKalau Kakak ada waktu luang sebentar, boleh minta sedikit ulasan atau testimoni singkatnya, Kak? Sangat berharga banget buat saya.\n\nMakasih banyak atas kerja samanya, Kak!`;
  }

  if (jenis === 'custom' && customPrompt) {
    const qLower = customPrompt.toLowerCase();
    if (qLower.includes('upload') || qLower.includes('drive') || qLower.includes('file')) {
      if (gdrive) {
        return `Udah Kak, file finalnya sudah saya upload ke Google Drive ya. Link-nya: ${gdrive}\n\nSemoga sesuai ya, Kak. Kalau ada yang mau disesuaikan lagi, tinggal kabarin aja.`;
      } else {
        return `Untuk file finalnya saat ini belum ada link Google Drive yang terlampir di data projek ini, Kak.`;
      }
    }
    if (qLower.includes('status')) {
      return `Status projek *${namaProyek}* saat ini adalah: *${proyek.status || 'Menunggu'}*, Kak.`;
    }
    if (qLower.includes('deadline') || qLower.includes('tenggat')) {
      return `Deadline untuk projek *${namaProyek}* adalah *${deadline}*, Kak.`;
    }
    if (qLower.includes('sisa') || qLower.includes('bayar') || qLower.includes('biaya') || qLower.includes('nominal')) {
      return `Total biaya projek *${namaProyek}* adalah ${nominal} dengan DP ${dp} dan sisa tagihan *${sisa}* (${metode}), Kak.`;
    }
  }

  return `Halo Kak ${namaKlien}, terkait projek *${namaProyek}* statusnya saat ini *${proyek.status || 'Sedang Dikerjakan'}* ya.\n\nSemoga sesuai ya, Kak. Kalau ada yang mau disesuaikan lagi, tinggal kabarin aja.`;
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
  let gdriveLink = gdriveInput ? gdriveInput.value.trim() : (currentProyek.gdriveLink || currentProyek.gdrive || '');

  let customPrompt = '';
  if (jenis === 'custom') {
    const customInput = document.getElementById('aiCustomPromptInput');
    customPrompt = customInput ? customInput.value.trim() : '';
    if (!customPrompt) {
      if (customInput) customInput.focus();
      showToast({
        title: "AI",
        message: isEn ? "Please enter your question or prompt." : "Silakan ketik pertanyaan atau instruksi AI.",
        type: "warning"
      });
      return;
    }
  }

  // Handle visibility of Google Drive input
  if (jenis === 'selesai') {
    if (gdriveContainer && gdriveContainer.classList.contains('hidden') && !gdriveLink) {
      gdriveContainer.classList.remove('hidden');
      if (gdriveInput) gdriveInput.focus();
      showToast({
        title: isEn ? "Google Drive Link" : "Link Google Drive",
        message: isEn ? "Please enter the Google Drive link for the design files above." : "Silakan masukkan link Google Drive hasil desain di atas.",
        type: "info"
      });
      return;
    }

    if (gdriveInput && gdriveInput.value.trim()) {
      gdriveLink = gdriveInput.value.trim();
      currentProyek.gdriveLink = gdriveLink;
    }
  } else {
    if (gdriveContainer && jenis !== 'custom') {
      gdriveContainer.classList.add('hidden');
    }
  }

  isAIGenerating = true;
  showToast({
    title: "AI Assistant",
    message: isEn ? "Generating message..." : "Sedang menyusun respon AI...",
    type: "info"
  });

  const promptText = buildGeminiProjectPrompt(jenis, customPrompt, currentProyek, gdriveLink);
  const geminiKey = getGeminiApiKey();
  let generatedText = '';

  // 1. Coba Direct Client-side Gemini API jika ada API Key
  if (geminiKey) {
    const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    for (const model of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              topK: 40
            }
          })
        });
        if (res.ok) {
          const json = await res.json();
          const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim()) {
            generatedText = candidateText.trim();
            break;
          }
        }
      } catch (clientErr) {
        console.warn(`Direct Gemini model ${model} error:`, clientErr);
      }
    }
  }

  // 2. Coba Server-side Apps Script jika client-side belum menghasilkan teks
  if (!generatedText && typeof API !== 'undefined' && typeof API.generateAI === 'function') {
    try {
      const serverRes = await API.generateAI({
        prompt: promptText,
        model: 'gemini-1.5-flash'
      });
      if (serverRes && serverRes.success && serverRes.result) {
        generatedText = String(serverRes.result).trim();
      }
    } catch (serverErr) {
      console.warn("Server-side AI call failed:", serverErr);
    }
  }

  // 3. Fallback Cerdas Lokal (Konsisten Gaya Natural & Ramah)
  if (!generatedText) {
    generatedText = generateSmartLocalMessage(jenis, customPrompt, currentProyek, gdriveLink);
  }

  const hasilAIEl = document.getElementById("hasilAI");
  if (hasilAIEl) {
    hasilAIEl.value = generatedText;
    hasilAIEl.focus();
  }

  showToast({
    title: "AI Assistant",
    message: isEn ? "Message ready!" : "Pesan siap digunakan!",
    type: "success"
  });

  isAIGenerating = false;
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
  if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) {
    showToast({
      title: "Akses Ditolak",
      message: isEn ? "WhatsApp feature is disabled for Designer role." : "Fitur WhatsApp dinonaktifkan untuk role Desainer.",
      type: "warning"
    });
    return;
  }
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
  const num = typeof number === 'number' ? number : (parseFloat(number) || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(isNaN(num) ? 0 : num);
}

// Update status of project inline from table select
async function updateProyekStatus(id, newStatus, selectEl) {
  try {
    // Find original project object
    const list = window.allProyekList || [];
    const proyek = list.find(p => p.iDProyek === id);
    if (!proyek) {
      throw new Error("Projek tidak ditemukan di memori.");
    }

    const oldStatus = proyek.status || 'Menunggu';

    // Client-side role validation: Designer can only update status if assigned to this project
    const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
    const currentUser = (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') ? Auth.getUser() : null;
    const currentUserId = currentUser ? (currentUser.id || currentUser.userId || currentUser.username) : '';
    const assignedDesignerId = proyek.designerId || proyek.assignDesigner || '';

    if (isDes && (!assignedDesignerId || (assignedDesignerId !== currentUserId && assignedDesignerId !== currentUser?.username))) {
      showToast({
        title: "Akses Ditolak",
        message: "Anda hanya dapat mengubah status projek yang di-assign kepada Anda.",
        type: "error"
      });
      if (selectEl) {
        selectEl.value = oldStatus;
        const k = oldStatus.toLowerCase().replace(/\s+/g, '');
        selectEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 badge-' + (k === 'dikerjakan' ? 'sedangdikerjakan' : k);
      }
      return;
    }

    let chosenMetode = proyek.metodePembayaran || proyek.metode || 'Shopee';
    let addedCatatan = '';
    const nominalVal = Number(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0));
    const dpVal = Number(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0));
    const pelunasanCurrent = Number(proyek.pelunasan || 0);
    const sisa = proyek.sisaPembayaran !== undefined ? Number(proyek.sisaPembayaran) : Math.max(0, nominalVal - dpVal - pelunasanCurrent);
    let settledPelunasan = pelunasanCurrent;
    let newSisa = sisa;

    // JIKA STATUS DIGANTI JADI SELESAI
    if (newStatus.toLowerCase() === 'selesai') {
      const result = await promptMetodePelunasanModal({
        proyekId: id,
        namaPelanggan: proyek.namaPelanggan,
        namaProyek: proyek.namaProyek,
        nominal: nominalVal,
        dp: dpVal,
        sisa: sisa,
        currentMetode: chosenMetode
      });

      if (!result || !result.confirmed) {
        // User batalkan popup: Kembalikan dropdown ke status semula
        if (selectEl) {
          selectEl.value = oldStatus;
          const k = oldStatus.toLowerCase().replace(/\s+/g, '');
          selectEl.className = 'inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 badge-' + (k === 'dikerjakan' ? 'sedangdikerjakan' : k);
        }
        return;
      }

      chosenMetode = result.metode || chosenMetode;
      addedCatatan = result.catatan || '';
      if (sisa > 0) {
        settledPelunasan = pelunasanCurrent + sisa;
        newSisa = 0;
      }
    }

    showToast({
      title: "Memperbarui",
      message: "Sedang memperbarui status projek...",
      type: "info"
    });

    let newCatatan = proyek.catatan || '';
    if (addedCatatan) {
      newCatatan = newCatatan ? `${newCatatan} - ${addedCatatan}` : addedCatatan;
    } else if (newStatus.toLowerCase() === 'selesai' && !newCatatan.toLowerCase().includes('lunas') && sisa > 0) {
      newCatatan = newCatatan ? `${newCatatan} - Pembayaran LUNAS` : 'Pembayaran LUNAS';
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
      nominal: nominalVal,
      dp: dpVal,
      pelunasan: settledPelunasan,
      sisa: newSisa,
      deadline: proyek.deadline,
      status: newStatus,
      designerId: assignedDesignerId,
      assignDesigner: assignedDesignerId,
      metodePembayaran: proyek.metodeBayarDp || proyek.metodePembayaran || 'Shopee',
      metodeBayarDp: proyek.metodeBayarDp || proyek.metodePembayaran || 'Shopee',
      metodeBayarPelunasan: chosenMetode,
      sumber: proyek.sumber || 'WhatsApp',
      catatan: newCatatan
    };

    const res = await API.updateProyek(id, payload);
    if (res.success) {
      // Sync Keuangan if status is Selesai
      if (newStatus.toLowerCase() === 'selesai') {
        try {
          const keuanganList = await API.getKeuangan();
          const prjId = proyek.iDProyek;
          const dpMetodeAsli = proyek.metodeBayarDp || proyek.metodePembayaran || 'Shopee';
          
          const linkedDpTx = (keuanganList || []).find(k => {
            if (!k) return false;
            const kPrj = String(k.idProyek || '');
            const ket = String(k.keterangan || '');
            return (kPrj === prjId || ket.includes(prjId));
          });

          if (linkedDpTx) {
            await API.updateKeuangan(linkedDpTx.id, {
              dp: dpVal,
              pelunasan: settledPelunasan,
              sisa: 0,
              totalProyek: nominalVal,
              statusPembayaran: 'Lunas',
              metodeBayarDp: linkedDpTx.metodeBayarDp || dpMetodeAsli,
              metodeBayarPelunasan: chosenMetode,
              metodePembayaran: chosenMetode,
              catatanPelunasan: addedCatatan || `Pelunasan via ${chosenMetode} tgl ${new Date().toLocaleDateString('id-ID')}`
            });
          } else {
            const txPayload = {
              tanggal: new Date().toISOString().split('T')[0],
              jenis: 'Pemasukan',
              keterangan: `Pembayaran Lunas - ${proyek.namaPelanggan} (${prjId})`,
              nominal: nominalVal,
              dp: dpVal,
              pelunasan: settledPelunasan,
              sisa: 0,
              totalProyek: nominalVal,
              statusPembayaran: 'Lunas',
              metodeBayarDp: dpMetodeAsli,
              metodeBayarPelunasan: chosenMetode,
              metodePembayaran: chosenMetode,
              idProyek: prjId,
              catatanPelunasan: addedCatatan || `Pelunasan via ${chosenMetode}`
            };
            await API.addKeuangan(txPayload);
          }
        } catch (syncErr) {
          console.warn("Gagal menyinkronkan data keuangan on updateProyekStatus:", syncErr);
        }
      }

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

// Update assign designer of project inline from table select
async function updateProyekAssign(id, newDesignerId, selectEl) {
  try {
    const list = window.allProyekList || [];
    const proyek = list.find(p => (p.iDProyek || p.idProjek || p.id) === id);
    if (!proyek) {
      throw new Error("Projek tidak ditemukan di memori.");
    }

    const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
    if (isDes) {
      showToast({
        title: "Akses Ditolak",
        message: "Hanya Super Admin dan Service yang dapat mengubah assignment Designer.",
        type: "error"
      });
      loadProyekData();
      return;
    }

    showToast({
      title: "Memperbarui",
      message: "Sedang memperbarui assign designer...",
      type: "info"
    });

    const payload = {
      namaProyek: proyek.namaProyek,
      pelanggan: proyek.namaPelanggan || proyek.pelanggan || '',
      wa: proyek.nomorWA || proyek.noWa || '',
      produk: proyek.produk || proyek.jenisProduk || '',
      jumlah: Number(proyek.jumlah) || 1,
      satuan: proyek.satuan || 'Pcs',
      hargaSatuan: Number(proyek.hargaSatuan) || 0,
      nominal: Number(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0)),
      dp: Number(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0)),
      pelunasan: Number(proyek.pelunasan || 0),
      sisa: Number(proyek.sisaPembayaran !== undefined ? proyek.sisaPembayaran : (proyek.sisa || 0)),
      deadline: proyek.deadline || '',
      status: proyek.status || 'Menunggu',
      designerId: newDesignerId || '',
      assignDesigner: newDesignerId || '',
      metodePembayaran: proyek.metodeBayarDp || proyek.metodePembayaran || 'Shopee',
      metodeBayarDp: proyek.metodeBayarDp || proyek.metodePembayaran || 'Shopee',
      metodeBayarPelunasan: proyek.metodeBayarPelunasan || proyek.metodePembayaran || 'Shopee',
      sumber: proyek.sumber || 'WhatsApp',
      catatan: proyek.catatan || ''
    };

    const res = await API.updateProyek(id, payload);
    if (res && res.success) {
      proyek.designerId = newDesignerId;
      proyek.assignDesigner = newDesignerId;
      
      const users = window.allUsersList || [];
      const designerObj = users.find(u => u.id === newDesignerId || u.userId === newDesignerId);
      const dName = designerObj ? (designerObj.name || designerObj.nama || designerObj.username) : (newDesignerId || 'Belum di-assign');

      showToast({
        title: "Berhasil",
        message: newDesignerId ? `Projek berhasil di-assign ke ${dName}.` : "Assignment projek berhasil direset.",
        type: "success"
      });
      loadProyekData();
    } else {
      showToast({
        title: "Gagal",
        message: (res && res.message) || "Gagal memperbarui assign designer.",
        type: "error"
      });
      loadProyekData();
    }
  } catch (error) {
    console.error("Error updating assign:", error);
    showToast({
      title: "Error",
      message: "Terjadi kesalahan saat memperbarui assignment.",
      type: "error"
    });
    loadProyekData();
  }
}
window.updateProyekAssign = updateProyekAssign;

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

// Update status button batch delete & batch create invoice
function updateBulkDeleteButton() {
  const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
  const btnDelete = document.getElementById('btnBulkDelete');
  const btnInvoice = document.getElementById('btnBulkCreateInvoice');

  if (isDes) {
    if (btnDelete) {
      btnDelete.classList.add('hidden');
      btnDelete.style.display = 'none';
      btnDelete.disabled = true;
    }
    if (btnInvoice) {
      btnInvoice.classList.add('hidden');
      btnInvoice.style.display = 'none';
      btnInvoice.disabled = true;
    }
    return;
  }

  const checkedBoxes = $('.proyek-checkbox:checked');
  const count = checkedBoxes.length;
  
  // Tombol Hapus Terpilih
  const countDeleteEl = document.getElementById('selectedCount');
  if (btnDelete && countDeleteEl) {
    countDeleteEl.textContent = count;
    if (count > 0) {
      btnDelete.classList.remove('hidden');
      btnDelete.style.display = 'inline-flex';
      btnDelete.disabled = false;
    } else {
      btnDelete.classList.add('hidden');
      btnDelete.style.display = 'none';
      btnDelete.disabled = true;
    }
  }

  // Tombol Create Invoice dari Checklist
  const countInvoiceEl = document.getElementById('selectedInvoiceCount');
  if (btnInvoice && countInvoiceEl) {
    countInvoiceEl.textContent = count;
    if (count > 0) {
      btnInvoice.classList.remove('hidden');
      btnInvoice.style.display = 'inline-flex';
      btnInvoice.disabled = false;
    } else {
      btnInvoice.classList.add('hidden');
      btnInvoice.style.display = 'none';
      btnInvoice.disabled = true;
    }
  }
}

// Global helper variables for bulk invoice modal
window.selectedBulkProyekData = [];

function openBulkInvoiceModal() {
  if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) {
    if (typeof Toast !== 'undefined') {
      Toast.error("Akses Ditolak", "Role Desainer tidak memiliki izin untuk membuat invoice.");
    } else if (typeof showToast === 'function') {
      showToast({ title: "Akses Ditolak", message: "Role Desainer tidak memiliki izin untuk membuat invoice.", type: "error" });
    }
    return;
  }

  const checkedBoxes = $('.proyek-checkbox:checked');
  const ids = [];
  checkedBoxes.each(function () {
    ids.push(String($(this).val()).trim());
  });

  if (ids.length === 0) {
    if (typeof Toast !== 'undefined') {
      Toast.warning("Pilih Item", "Silakan checklist minimal satu projek/item untuk membuat invoice.");
    }
    return;
  }

  // Ambil list objek proyek terpilih
  const allList = window.allProyekList || [];
  const selectedProyek = [];
  ids.forEach(id => {
    const found = allList.find(p => String(p.iDProyek).trim() === id);
    if (found) {
      selectedProyek.push(found);
    } else {
      selectedProyek.push({ iDProyek: id, namaProyek: `Projek ${id}`, nominalProyek: 0, namaPelanggan: '-' });
    }
  });

  window.selectedBulkProyekData = selectedProyek;

  // Hitung total & ringkasan
  let totalNom = 0;
  const itemsContainer = document.getElementById('bulkInvoiceItemsList');
  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    selectedProyek.forEach((item, idx) => {
      const nom = Number(item.nominalProyek || item.totalPembayaran || 0) || 0;
      totalNom += nom;
      const rowDiv = document.createElement('div');
      rowDiv.className = 'flex justify-between items-center py-1 border-b border-indigo-100/50 dark:border-indigo-900/30';
      rowDiv.innerHTML = `
        <span class="truncate max-w-[280px]">${idx + 1}. <strong class="text-zinc-800 dark:text-zinc-200">${escapeHtml(item.produk || item.namaProyek || '-')}</strong> (${escapeHtml(String(item.jumlah || 1))} ${escapeHtml(item.satuan || 'pcs')})</span>
        <span class="font-semibold text-zinc-900 dark:text-zinc-100 ml-2 whitespace-nowrap">${formatRupiah(nom)}</span>
      `;
      itemsContainer.appendChild(rowDiv);
    });
  }

  const countBadge = document.getElementById('bulkInvoiceSelectedCountBadge');
  if (countBadge) countBadge.textContent = `${selectedProyek.length} Checklist / Item Dipilih`;

  const totalNomEl = document.getElementById('bulkInvoiceTotalNominal');
  if (totalNomEl) totalNomEl.textContent = formatRupiah(totalNom);

  // Set default customer name
  const defaultCustomer = selectedProyek[0] ? (selectedProyek[0].namaPelanggan || 'Pelanggan') : 'Pelanggan';
  const labelDefaultCust = document.getElementById('labelDefaultCustomerName');
  if (labelDefaultCust) labelDefaultCust.textContent = defaultCustomer;

  // Reset radio & inputs
  const optDefault = document.getElementById('optCustomerDefault');
  if (optDefault) optDefault.checked = true;
  toggleCustomerCustomInput(false);
  const customInput = document.getElementById('customCustomerNameInput');
  if (customInput) customInput.value = defaultCustomer;

  // Tampilkan modal
  const modal = document.getElementById('modalBulkInvoice');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeBulkInvoiceModal() {
  const modal = document.getElementById('modalBulkInvoice');
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

function toggleCustomerCustomInput(show) {
  const container = document.getElementById('customNameInputContainer');
  if (container) {
    if (show) {
      container.classList.remove('hidden');
      const input = document.getElementById('customCustomerNameInput');
      if (input) {
        input.focus();
        input.select();
      }
    } else {
      container.classList.add('hidden');
    }
  }
}

function proceedToBulkInvoice() {
  if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) {
    if (typeof Toast !== 'undefined') {
      Toast.error("Akses Ditolak", "Role Desainer tidak memiliki izin untuk membuat invoice.");
    }
    closeBulkInvoiceModal();
    return;
  }

  const selectedProyek = window.selectedBulkProyekData || [];
  if (selectedProyek.length === 0) {
    closeBulkInvoiceModal();
    return;
  }

  const isCustom = document.getElementById('optCustomerCustom') && document.getElementById('optCustomerCustom').checked;
  const defaultName = selectedProyek[0] ? (selectedProyek[0].namaPelanggan || 'Pelanggan') : 'Pelanggan';
  const customInputVal = document.getElementById('customCustomerNameInput') ? document.getElementById('customCustomerNameInput').value.trim() : '';
  const finalCustomerName = (isCustom && customInputVal) ? customInputVal : defaultName;

  const phone = selectedProyek[0] ? (selectedProyek[0].nomorWA || '') : '';
  const projectIds = selectedProyek.map(p => p.iDProyek);

  let totalNominal = 0;
  let totalDp = 0;
  let totalPelunasan = 0;

  const items = selectedProyek.map((p, idx) => {
    const qty = Number(p.jumlah) || 1;
    const harga = Number(p.hargaSatuan) || (Number(p.nominalProyek || 0) / (qty || 1));
    const nom = Number(p.nominalProyek || 0);
    const dpVal = Number(p.dP !== undefined ? p.dP : (p.totalDp || p.dp || 0)) || 0;
    const pelunasanVal = Number(p.pelunasan !== undefined ? p.pelunasan : (p.totalPelunasan || 0)) || 0;

    totalNominal += nom;
    totalDp += dpVal;
    totalPelunasan += pelunasanVal;

    return {
      no: idx + 1,
      projectId: p.iDProyek,
      produk: p.produk || p.namaProyek || `Item ${idx + 1}`,
      jumlah: qty,
      satuan: p.satuan || 'pcs',
      hargaSatuan: harga,
      nominal: nom,
      dp: dpVal,
      pelunasan: pelunasanVal,
      sisa: Math.max(0, nom - dpVal - pelunasanVal)
    };
  });

  const totalSisa = Math.max(0, totalNominal - totalDp - totalPelunasan);
  const catatanCombined = selectedProyek.map(p => p.catatan).filter(Boolean).join(' | ');

  const invoicePayload = {
    projectIds: projectIds,
    primaryProjectId: projectIds[0] || '',
    customerName: finalCustomerName,
    customerPhone: phone,
    isCustomCustomerName: isCustom,
    originalCustomerName: defaultName,
    items: items,
    totalNominal: totalNominal,
    totalDp: totalDp,
    totalPelunasan: totalPelunasan,
    totalSisa: totalSisa,
    catatan: catatanCombined || '-'
  };

  try {
    sessionStorage.setItem('pending_invoice_payload', JSON.stringify(invoicePayload));
  } catch (e) {
    console.error("Gagal menyimpan pending_invoice_payload:", e);
  }

  closeBulkInvoiceModal();

  // Redirect ke invoice.html dengan parameter fromSelection
  window.location.href = `invoice.html?fromSelection=true&id=${encodeURIComponent(projectIds[0] || '')}`;
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
        <td class="p-4 hidden"><div class="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
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
  if (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner()) {
    if (typeof Toast !== 'undefined') {
      Toast.error("Akses Ditolak", "Role Desainer tidak memiliki izin untuk menghapus projek.");
    } else if (typeof showToast === 'function') {
      showToast({ title: "Akses Ditolak", message: "Role Desainer tidak memiliki izin untuk menghapus projek.", type: "error" });
    }
    return;
  }

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

window.generateAI = generateAI;
window.copyAIText = copyAIText;
window.sendAIWhatsapp = sendAIWhatsapp;

// Excel Dropdown Menu Handlers
function toggleExcelDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('excelDropdownMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function closeExcelDropdown() {
  const menu = document.getElementById('excelDropdownMenu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  const group = document.getElementById('excelDropdownGroup');
  if (group && !group.contains(e.target)) {
    closeExcelDropdown();
  }
});

window.toggleExcelDropdown = toggleExcelDropdown;
window.closeExcelDropdown = closeExcelDropdown;

// ================= KALENDER DEADLINE PROJEK =================
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth(); // 0-11
let calendarSelectedDateStr = '';

function openProjectCalendarModal() {
  const modal = document.getElementById('projectCalendarModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  renderProjectCalendar();
}
window.openProjectCalendarModal = openProjectCalendarModal;

function closeProjectCalendarModal() {
  const modal = document.getElementById('projectCalendarModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeProjectCalendarModal = closeProjectCalendarModal;

function changeCalendarMonth(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth < 0) {
    calendarViewMonth = 11;
    calendarViewYear--;
  } else if (calendarViewMonth > 11) {
    calendarViewMonth = 0;
    calendarViewYear++;
  }
  renderProjectCalendar();
}
window.changeCalendarMonth = changeCalendarMonth;

function renderProjectCalendar() {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const monthYearLabel = document.getElementById('calendarMonthYearText');
  if (monthYearLabel) {
    monthYearLabel.textContent = `${monthNames[calendarViewMonth]} ${calendarViewYear}`;
  }

  const gridContainer = document.getElementById('calendarGridContainer');
  if (!gridContainer) return;

  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

  // Group active projects by deadline date string YYYY-MM-DD
  const projectsByDate = {};
  const allProjects = Array.isArray(window.allProyekList) ? window.allProyekList : [];
  allProjects.forEach(p => {
    if (!p.deadline) return;
    const dl = (typeof window.parseSafeDateString === 'function')
      ? window.parseSafeDateString(p.deadline)
      : String(p.deadline).replace(/^'+/, '').split('T')[0];
    if (dl) {
      if (!projectsByDate[dl]) projectsByDate[dl] = [];
      projectsByDate[dl].push(p);
    }
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = '';
  // Day header row
  dayNames.forEach(d => {
    html += `<div class="font-bold text-zinc-400 dark:text-zinc-500 py-1.5 uppercase text-[11px]">${d}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 opacity-30"></div>`;
  }

  // Days of month
  for (let day = 1; day <= totalDays; day++) {
    const dStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayProjects = projectsByDate[dStr] || [];
    const isToday = (dStr === todayStr);
    const isSelected = (dStr === calendarSelectedDateStr);

    let dotsHtml = '';
    if (dayProjects.length > 0) {
      dotsHtml = `<div class="flex items-center justify-center gap-1 mt-1 flex-wrap">`;
      dayProjects.slice(0, 3).forEach(p => {
        const st = String(p.status || '').toLowerCase();
        let dotColor = 'bg-blue-500';
        if (st.includes('dikerjakan')) dotColor = 'bg-amber-500';
        else if (st.includes('revisi')) dotColor = 'bg-rose-500';
        else if (st.includes('selesai')) dotColor = 'bg-emerald-500';
        dotsHtml += `<span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>`;
      });
      if (dayProjects.length > 3) {
        dotsHtml += `<span class="text-[9px] font-bold text-zinc-400">+${dayProjects.length - 3}</span>`;
      }
      dotsHtml += `</div>`;
    }

    const cellClass = isSelected
      ? 'border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-sm'
      : (isToday
          ? 'border-2 border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-800'
          : (dayProjects.length > 0 ? 'bg-white dark:bg-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer' : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80'));

    html += `
      <div onclick="selectCalendarDate('${dStr}')" class="p-2 sm:p-2.5 rounded-xl flex flex-col justify-between min-h-[58px] transition-all cursor-pointer ${cellClass}">
        <span class="font-bold text-xs ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-200'}">${day}</span>
        ${dotsHtml}
      </div>
    `;
  }

  gridContainer.innerHTML = html;

  if (!calendarSelectedDateStr) {
    calendarSelectedDateStr = todayStr;
  }
  selectCalendarDate(calendarSelectedDateStr, false);
}
window.renderProjectCalendar = renderProjectCalendar;

function selectCalendarDate(dateStr, reRender = true) {
  calendarSelectedDateStr = dateStr;
  const label = document.getElementById('calendarSelectedDateLabel');
  const list = document.getElementById('calendarProjectList');
  if (!list) return;

  if (label) {
    label.textContent = `Projek Deadline: ${dateStr}`;
  }

  const allProjects = Array.isArray(window.allProyekList) ? window.allProyekList : [];
  const dayProjects = allProjects.filter(p => {
    if (!p.deadline) return false;
    const dl = (typeof window.parseSafeDateString === 'function')
      ? window.parseSafeDateString(p.deadline)
      : String(p.deadline).replace(/^'+/, '').split('T')[0];
    return dl === dateStr;
  });

  if (dayProjects.length === 0) {
    list.innerHTML = `
      <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
        <i class="fa-solid fa-calendar-check text-lg mb-1 text-zinc-300 dark:text-zinc-600 block"></i>
        Tidak ada deadline projek pada tanggal ini.
      </div>
    `;
  } else {
    const isDes = (typeof Auth !== 'undefined' && typeof Auth.isDesigner === 'function' && Auth.isDesigner());
    list.innerHTML = dayProjects.map(p => {
      const id = p.iDProyek || p.idProjek || p.id || '';
      const st = String(p.status || 'Menunggu');
      let badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200';
      if (st.toLowerCase().includes('dikerjakan')) badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200';
      else if (st.toLowerCase().includes('revisi')) badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200';
      else if (st.toLowerCase().includes('selesai')) badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200';

      const nomDisplay = isDes ? '' : `<span class="text-zinc-700 dark:text-zinc-300 font-bold">${formatRupiah(p.nominalProyek || p.nominal || 0)}</span>`;

      return `
        <div class="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-indigo-400 transition-all">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-zinc-900 dark:text-white truncate">${escapeHtml(p.namaProyek || '-')}</span>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badgeClass}">${escapeHtml(st)}</span>
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              <span>${escapeHtml(p.namaPelanggan || '-')}</span>
              ${p.produk ? ` &bull; <span>${escapeHtml(p.produk)}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${nomDisplay}
            <button onclick="closeProjectCalendarModal(); viewDetail('${escapeHtml(id)}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1">
              <i class="fa-solid fa-eye text-[11px]"></i> Detail
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  if (reRender) {
    renderProjectCalendar();
  }
}
window.selectCalendarDate = selectCalendarDate;



