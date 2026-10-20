/**
 * FREELANCE PROJEK MANAGER (FPManager)
 * Modul Pusat Notifikasi & Riwayat Aktivitas CRUD
 * Mengelola notifikasi, log berhasil/gagal, filter id_user, dan status baca (TRUE/FALSE)
 */

(function () {
  'use strict';

  let allNotifikasi = [];
  let activeStatusFilter = 'all'; // 'all', 'unread' (FALSE), 'read' (TRUE)
  let activeTypeFilter = 'all';   // 'all', 'sukses', 'gagal', 'info', 'warning'
  let searchQuery = '';
  let activeUserFilter = 'all';
  let refreshTimer = null;

  // Format Waktu Relatif / Human-readable
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return String(dateStr);
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} menit yang lalu`;
      if (diffHour < 24) return `${diffHour} jam yang lalu`;
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return `${diffDays} hari yang lalu`;

      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch (e) {
      return String(dateStr);
    }
  }

  // Helper Ikon & Warna berdasarkan Tipe Notifikasi
  function getTypeBadgeStyles(tipe, isSuccess) {
    const t = String(tipe || '').toLowerCase();
    if (t === 'sukses' || isSuccess === true) {
      return {
        bgLight: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
        icon: 'fa-solid fa-circle-check',
        label: 'Berhasil'
      };
    }
    if (t === 'gagal' || t === 'error' || isSuccess === false) {
      return {
        bgLight: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        iconBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400',
        icon: 'fa-solid fa-triangle-exclamation',
        label: 'Gagal'
      };
    }
    if (t === 'warning' || t === 'peringatan') {
      return {
        bgLight: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',
        icon: 'fa-solid fa-triangle-exclamation',
        label: 'Peringatan'
      };
    }
    return {
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400',
      icon: 'fa-solid fa-bell',
      label: 'Info Sistem'
    };
  }

  // Render Kartu Notifikasi
  function renderNotifikasi() {
    const container = document.getElementById('notifikasiListContainer');
    if (!container) return;

    const currUser = (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function')
      ? API.getCurrentUser()
      : { id: 'USR-001', role: 'super_admin' };
    const isSuperAdmin = currUser && (currUser.role === 'super_admin' || currUser.role === 'admin');

    // Filter data
    let filtered = allNotifikasi.filter(item => {
      // 1. Status Filter (All, Unread: FALSE, Read: TRUE)
      const isRead = item.status === 'TRUE' || item.isRead === true;
      if (activeStatusFilter === 'unread' && isRead) return false;
      if (activeStatusFilter === 'read' && !isRead) return false;

      // 2. Type Filter
      const t = String(item.tipe || '').toLowerCase();
      if (activeTypeFilter === 'sukses' && t !== 'sukses') return false;
      if (activeTypeFilter === 'gagal' && (t !== 'gagal' && t !== 'error')) return false;
      if (activeTypeFilter === 'info' && (t !== 'info' && t !== 'system')) return false;

      // 3. User Filter (jika Super Admin memilih user tertentu)
      if (isSuperAdmin && activeUserFilter !== 'all') {
        const itemUserId = String(item.id_user || item.userId || '').trim();
        if (itemUserId !== activeUserFilter && itemUserId !== 'ALL') return false;
      }

      // 4. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const j = String(item.judul || '').toLowerCase();
        const d = String(item.des || '').toLowerCase();
        const u = String(item.id_user || '').toLowerCase();
        if (!j.includes(q) && !d.includes(q) && !u.includes(q)) return false;
      }

      return true;
    });

    // Update Counter Badges di UI
    updateCounterBadges();

    // Render Kosong jika tidak ada data
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-16 px-4 text-center bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
          <div class="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-700/50 flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <i class="fa-regular fa-bell-slash text-2xl"></i>
          </div>
          <h4 class="font-bold text-zinc-800 dark:text-zinc-100 text-base">Tidak Ada Notifikasi</h4>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            ${searchQuery ? 'Tidak ada notifikasi yang cocok dengan kata kunci pencarian Anda.' : 'Semua notifikasi dan riwayat aktivitas sistem telah bersih.'}
          </p>
          ${(activeStatusFilter !== 'all' || activeTypeFilter !== 'all' || searchQuery) ? `
            <button onclick="window.NotifikasiModule.resetFilters()" class="mt-4 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition">
              Reset Semua Filter
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    // Render Daftar Notifikasi
    let html = '<div class="space-y-2.5">';

    filtered.forEach(item => {
      const isRead = item.status === 'TRUE' || item.isRead === true;
      const typeStyle = getTypeBadgeStyles(item.tipe);
      const relativeTime = formatRelativeTime(item.tanggal || item.createdAt);
      const userTag = item.id_user || item.userId || 'ALL';

      html += `
        <div class="p-3.5 sm:p-4 rounded-xl transition-all border ${
          isRead
            ? 'bg-white dark:bg-zinc-800/70 border-zinc-200/70 dark:border-zinc-700/70 opacity-90'
            : 'bg-indigo-50/30 dark:bg-zinc-800 border-indigo-200 dark:border-indigo-900/60 shadow-xs ring-1 ring-indigo-500/10'
        } flex items-start gap-3 sm:gap-4 group">
          <!-- Icon Badge -->
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${typeStyle.iconBg} flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <i class="${typeStyle.icon} text-sm sm:text-base"></i>
          </div>

          <!-- Main Content -->
          <div class="flex-1 min-w-0">
            <!-- Top Line: Title & Badges -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <div class="flex items-center gap-2 min-w-0">
                <h4 class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 truncate">
                  ${window.escapeHtml(item.judul || 'Notifikasi')}
                </h4>
                ${!isRead ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white shrink-0 animate-pulse">
                    Baru
                  </span>
                ` : ''}
              </div>

              <!-- Tags / Meta -->
              <div class="flex items-center gap-1.5 shrink-0 text-[11px]">
                <span class="px-2 py-0.5 rounded-md font-semibold border ${typeStyle.bgLight}">
                  ${typeStyle.label}
                </span>
                <span class="px-2 py-0.5 rounded-md font-mono font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-700/70 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600/60" title="Penerima Notifikasi">
                  <i class="fa-solid fa-user-tag text-[9px] mr-1 opacity-70"></i>${window.escapeHtml(userTag)}
                </span>
              </div>
            </div>

            <!-- Description -->
            <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">
              ${window.escapeHtml(item.des || '')}
            </p>

            <!-- Bottom Line: Timestamp & Action Buttons -->
            <div class="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span class="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <i class="fa-regular fa-clock text-[10px]"></i>
                <span>${relativeTime}</span>
              </span>

              <div class="flex items-center gap-1.5">
                <button onclick="window.NotifikasiModule.toggleStatus('${item.id}', ${isRead})"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    isRead
                      ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-600 dark:text-zinc-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                  }"
                  title="${isRead ? 'Tandai sebagai belum dibaca' : 'Tandai sebagai sudah dibaca'}">
                  <i class="fa-solid ${isRead ? 'fa-envelope' : 'fa-check'} text-[10px]"></i>
                  <span>${isRead ? 'Tandai Belum Dibaca' : 'Tandai Dibaca'}</span>
                </button>

                <button onclick="window.NotifikasiModule.deleteItem('${item.id}')"
                  class="p-1 sm:px-2 sm:py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 transition cursor-pointer flex items-center gap-1"
                  title="Hapus notifikasi ini">
                  <i class="fa-solid fa-trash-can text-[10px]"></i>
                  <span class="hidden sm:inline">Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // Update Counters & Stats Cards
  function updateCounterBadges() {
    const total = allNotifikasi.length;
    const unread = allNotifikasi.filter(n => n.status !== 'TRUE' && n.isRead !== true).length;
    const success = allNotifikasi.filter(n => String(n.tipe).toLowerCase() === 'sukses').length;
    const failed = allNotifikasi.filter(n => ['gagal', 'error'].includes(String(n.tipe).toLowerCase())).length;

    const elTotal = document.getElementById('statTotalNotif');
    const elUnread = document.getElementById('statUnreadNotif');
    const elSuccess = document.getElementById('statSuccessNotif');
    const elFailed = document.getElementById('statFailedNotif');

    if (elTotal) elTotal.textContent = total;
    if (elUnread) elUnread.textContent = unread;
    if (elSuccess) elSuccess.textContent = success;
    if (elFailed) elFailed.textContent = failed;

    // Update Header Badge jika ada
    const headerBadges = document.querySelectorAll('.notif-unread-badge, #headerNotifBadge');
    headerBadges.forEach(b => {
      if (unread > 0) {
        b.textContent = unread > 99 ? '99+' : unread;
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });

    // Update pill filter counters
    const pillAll = document.getElementById('badgeCountAll');
    const pillUnread = document.getElementById('badgeCountUnread');
    const pillRead = document.getElementById('badgeCountRead');

    if (pillAll) pillAll.textContent = total;
    if (pillUnread) pillUnread.textContent = unread;
    if (pillRead) pillRead.textContent = total - unread;
  }

  // Muat Data Notifikasi dari Server / Local Cache
  async function loadNotifikasi(isSilent = false) {
    const refreshBtn = document.getElementById('btnRefreshNotif');
    if (refreshBtn && !isSilent) {
      refreshBtn.querySelector('i')?.classList.add('fa-spin');
    }

    try {
      const currUser = (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function')
        ? API.getCurrentUser()
        : { id: 'USR-001', role: 'super_admin' };

      const res = await API.getNotifikasi({ userId: currUser.id });
      if (res && res.success && Array.isArray(res.data)) {
        allNotifikasi = res.data;
      } else {
        // Fallback local storage CRUD history jika backend kosong
        const localLogs = JSON.parse(localStorage.getItem('fpm_crud_history') || '[]');
        if (localLogs.length > 0 && allNotifikasi.length === 0) {
          allNotifikasi = localLogs;
        }
      }
    } catch (err) {
      console.warn('[NotifikasiModule] Gagal mengambil notifikasi:', err);
      const cached = JSON.parse(localStorage.getItem('fpm_notifikasi_cache') || '[]');
      if (cached.length > 0) allNotifikasi = cached;
    } finally {
      if (refreshBtn) {
        refreshBtn.querySelector('i')?.classList.remove('fa-spin');
      }
      renderNotifikasi();
    }
  }

  // Toggle status dibaca / belum dibaca (TRUE/FALSE)
  async function toggleStatus(id, currentIsRead) {
    const newStatus = !currentIsRead;
    // Optimistic Update
    const item = allNotifikasi.find(n => String(n.id) === String(id));
    if (item) {
      item.status = newStatus ? 'TRUE' : 'FALSE';
      item.isRead = newStatus;
      renderNotifikasi();
    }

    try {
      await API.updateNotifikasiStatus(id, newStatus);
    } catch (err) {
      console.error('Gagal update status:', err);
    }
  }

  // Tandai Semua Dibaca
  async function markAllAsRead() {
    allNotifikasi.forEach(n => {
      n.status = 'TRUE';
      n.isRead = true;
    });
    renderNotifikasi();

    try {
      const res = await API.markAllNotifikasiRead();
      if (typeof Toast !== 'undefined') {
        Toast.success('Berhasil', 'Semua notifikasi telah ditandai sebagai sudah dibaca.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Hapus satu notifikasi
  async function deleteItem(id) {
    allNotifikasi = allNotifikasi.filter(n => String(n.id) !== String(id));
    renderNotifikasi();

    try {
      await API.deleteNotifikasi(id);
      if (typeof Toast !== 'undefined') {
        Toast.success('Dihapus', 'Notifikasi berhasil dihapus.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Bersihkan riwayat yang sudah dibaca
  async function clearReadHistory() {
    const readCount = allNotifikasi.filter(n => n.status === 'TRUE' || n.isRead === true).length;
    if (readCount === 0) {
      if (typeof Toast !== 'undefined') {
        Toast.info('Info', 'Tidak ada riwayat notifikasi yang sudah dibaca.');
      }
      return;
    }

    allNotifikasi = allNotifikasi.filter(n => n.status !== 'TRUE' && n.isRead !== true);
    renderNotifikasi();

    try {
      await API.clearNotifikasi();
      if (typeof Toast !== 'undefined') {
        Toast.success('Dibersihkan', 'Riwayat notifikasi yang telah dibaca berhasil dibersihkan.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Event handlers untuk filter
  function setStatusFilter(filter) {
    activeStatusFilter = filter;
    document.querySelectorAll('.btn-status-filter').forEach(btn => {
      const type = btn.getAttribute('data-status');
      if (type === filter) {
        btn.className = 'btn-status-filter px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5';
      } else {
        btn.className = 'btn-status-filter px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5';
      }
    });
    renderNotifikasi();
  }

  function setTypeFilter(type) {
    activeTypeFilter = type;
    renderNotifikasi();
  }

  function setUserFilter(userId) {
    activeUserFilter = userId;
    renderNotifikasi();
  }

  function setSearch(query) {
    searchQuery = query;
    renderNotifikasi();
  }

  function resetFilters() {
    activeStatusFilter = 'all';
    activeTypeFilter = 'all';
    activeUserFilter = 'all';
    searchQuery = '';

    const searchInput = document.getElementById('searchNotifInput');
    if (searchInput) searchInput.value = '';

    const typeSelect = document.getElementById('filterTypeSelect');
    if (typeSelect) typeSelect.value = 'all';

    const userSelect = document.getElementById('filterUserSelect');
    if (userSelect) userSelect.value = 'all';

    setStatusFilter('all');
  }

  // Populate list user untuk filter admin
  async function populateUserFilter() {
    const userSelect = document.getElementById('filterUserSelect');
    if (!userSelect) return;

    try {
      const users = window.allUsersList || (typeof API !== 'undefined' && typeof API.getUsers === 'function' ? (await API.getUsers()).data : []);
      if (Array.isArray(users) && users.length > 0) {
        userSelect.innerHTML = '<option value="all">Semua User (Global)</option>';
        users.forEach(u => {
          const uId = u.id || u.userId || u.id_user;
          const uName = u.name || u.nama || u.username || uId;
          const opt = document.createElement('option');
          opt.value = uId;
          opt.textContent = `${uName} (${uId})`;
          userSelect.appendChild(opt);
        });
        document.getElementById('filterUserContainer')?.classList.remove('hidden');
      }
    } catch (e) {}
  }

  // Inisialisasi Halaman
  function init() {
    loadNotifikasi();
    populateUserFilter();

    // Auto refresh setiap 30 detik
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      loadNotifikasi(true);
    }, 30000);
  }

  // Export ke Global Scope
  window.NotifikasiModule = {
    init,
    loadNotifikasi,
    toggleStatus,
    markAllAsRead,
    deleteItem,
    clearReadHistory,
    setStatusFilter,
    setTypeFilter,
    setUserFilter,
    setSearch,
    resetFilters
  };

  // Run on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
