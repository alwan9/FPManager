/**
 * FREELANCE PROJEK MANAGER (FPManager)
 * Modul Pusat Notifikasi & Riwayat Aktivitas CRUD
 * Mengelola notifikasi, log berhasil/gagal, filter relasi pengguna (Nama & Role), dan status baca
 */

(function () {
  'use strict';

  let allNotifikasi = [];
  let activeStatusFilter = 'all'; // 'all', 'unread' (FALSE), 'read' (TRUE)
  let activeTypeFilter = 'all';   // 'all', 'sukses', 'gagal', 'info', 'warning'
  let searchQuery = '';
  let activeUserFilter = 'all';
  let refreshTimer = null;

  // Cache data relasi user: id -> { id, name, role, avatar }
  const userCacheMap = {
    'USR-001': { id: 'USR-001', name: 'Super Admin Wans', role: 'Super Admin', avatar: '' }
  };

  // Helper Escape HTML
  function escapeHtml(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Normalisasi & Format Label Role Pengguna
  function formatRoleLabel(role) {
    const r = String(role || '').toLowerCase().trim();
    if (r.includes('super_admin') || r.includes('superadmin') || r === 'wansmin' || r.includes('admin')) {
      return 'Super Admin';
    }
    if (r.includes('desain') || r.includes('designer')) {
      return 'Desainer';
    }
    if (r.includes('service') || r.includes('teknisi')) {
      return 'Service / Teknisi';
    }
    return role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'Anggota Tim';
  }

  // Helper Style Badge Role
  function getRoleBadgeStyle(role) {
    const r = String(role || '').toLowerCase().trim();
    if (r.includes('super admin') || r.includes('admin')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
    }
    if (r.includes('desainer') || r.includes('designer')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
    }
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
  }

  // Sanitasi teks: bersihkan ID mentah (seperti PRJ-xxx, USR-xxx) dari deskripsi notifikasi
  function cleanRelationText(text) {
    if (!text) return '';
    return String(text)
      // Hapus ID di dalam kurung, contoh: (PRJ-2026-001), (PRJ-001), (USR-001), (TRX-xxx)
      .replace(/\s*\((PRJ|USR|TRX|INV|TASK)[^)]*\)/gi, '')
      // Ganti transaksi TRX mentah menjadi transaksi keuangan
      .replace(/transaksi\s+TRX-[A-Za-z0-9_-]+/gi, 'transaksi keuangan')
      .replace(/\bTRX-[A-Za-z0-9_-]+/gi, 'transaksi keuangan')
      // Hapus kode ID yang tercecer
      .replace(/\b(PRJ|USR|INV|TASK)-[A-Za-z0-9_-]+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Muat dan Sinkronkan Cache Relasi Pengguna
  async function ensureUsersData() {
    try {
      let users = window.allUsersList;
      if (!users || !Array.isArray(users) || users.length === 0) {
        if (typeof API !== 'undefined' && typeof API.getUsers === 'function') {
          const res = await API.getUsers();
          if (res && res.success && Array.isArray(res.data)) {
            users = res.data;
            window.allUsersList = users;
          }
        }
      }

      if (Array.isArray(users)) {
        users.forEach(u => {
          const uId = String(u.id || u.userId || u.id_user || '').trim();
          if (uId) {
            userCacheMap[uId] = {
              id: uId,
              name: u.name || u.nama || u.username || 'Pengguna',
              role: formatRoleLabel(u.role),
              avatar: u.avatar || u.urlProfile || u.url_profile || ''
            };
          }
        });
      }

      // Ambil juga data user yang sedang login saat ini
      if (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function') {
        const cu = API.getCurrentUser();
        if (cu && cu.id) {
          userCacheMap[cu.id] = {
            id: cu.id,
            name: cu.name || cu.username || 'Pengguna',
            role: formatRoleLabel(cu.role),
            avatar: cu.avatar || ''
          };
        }
      }
    } catch (err) {
      console.warn('[NotifikasiModule] Gagal memuat data relasi user:', err);
    }
  }

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

  // Ambil semua identitas yang mungkin merujuk ke user yang sedang login saat ini
  function getCurrentUserIdentifiers() {
    const cu = (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function')
      ? API.getCurrentUser()
      : ((typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') ? Auth.getUser() : null);

    if (!cu) return ['usr-001'];

    const ids = [
      cu.id,
      cu.userId,
      cu.id_user,
      cu.Id_user,
      cu.username
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    if (Array.isArray(window.allUsersList) && cu.username) {
      const matched = window.allUsersList.find(u =>
        String(u.username || '').toLowerCase() === String(cu.username).toLowerCase()
      );
      if (matched) {
        const extraId = matched.id || matched.userId || matched.id_user;
        if (extraId) ids.push(String(extraId).trim().toLowerCase());
      }
    }

    return [...new Set(ids)];
  }

  // Cek apakah notifikasi sesuai dengan id_user pengguna saat ini (atau broadcast ke semua tim)
  function isNotificationForCurrentUser(item) {
    if (!item) return false;
    const userIds = getCurrentUserIdentifiers();
    if (userIds.length === 0) return true;

    const rawTarget = String(
      item.id_user ||
      item.userId ||
      item.Id_user ||
      item.user_id ||
      item.idUser ||
      ''
    ).trim().toLowerCase();

    // Broadcast ke seluruh tim atau tidak ditentukan
    if (!rawTarget || rawTarget === 'all' || rawTarget === 'semua') {
      return true;
    }

    return userIds.includes(rawTarget);
  }

  // Ambil hanya daftar notifikasi yang sesuai dengan id_user pengguna yang sedang aktif
  function getUserNotifications() {
    return allNotifikasi.filter(isNotificationForCurrentUser);
  }

  // Render Kartu Notifikasi
  function renderNotifikasi() {
    const container = document.getElementById('notifikasiListContainer');
    if (!container) return;

    // Filter ketat data notifikasi yang sesuai dengan id_user pengguna aktif
    const userNotifs = getUserNotifications();

    // Filter data berdasarkan status, tipe, dan kata kunci pencarian
    let filtered = userNotifs.filter(item => {
      // 1. Status Filter (All, Unread: FALSE, Read: TRUE)
      const isRead = item.status === 'TRUE' || item.isRead === true;
      if (activeStatusFilter === 'unread' && isRead) return false;
      if (activeStatusFilter === 'read' && !isRead) return false;

      // 2. Type Filter
      const t = String(item.tipe || '').toLowerCase();
      if (activeTypeFilter === 'sukses' && t !== 'sukses') return false;
      if (activeTypeFilter === 'gagal' && (t !== 'gagal' && t !== 'error')) return false;
      if (activeTypeFilter === 'info' && (t !== 'info' && t !== 'system')) return false;

      // 3. Search Query (Mencocokkan judul dan deskripsi)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const j = String(item.judul || '').toLowerCase();
        const d = String(item.ket || item.des || '').toLowerCase();
        if (!j.includes(q) && !d.includes(q)) return false;
      }

      return true;
    });

    // Update Counter Badges di UI (hanya menghitung data milik user ini)
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
            ${searchQuery ? 'Tidak ada notifikasi yang cocok dengan kata kunci pencarian Anda.' : 'Semua notifikasi dan riwayat aktivitas Anda telah bersih.'}
          </p>
          ${(activeStatusFilter !== 'all' || activeTypeFilter !== 'all' || searchQuery) ? `
            <button onclick="window.NotifikasiModule.resetFilters()" class="mt-4 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer">
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

      // Bersihkan teks judul dan deskripsi dari ID mentah jika ada
      const cleanTitle = cleanRelationText(item.judul || 'Notifikasi');
      const cleanDes = cleanRelationText(item.ket || item.des || '');

      html += `
        <div class="notif-swipe-item relative overflow-hidden rounded-2xl group shadow-2xs" data-id="${item.id}">
          <!-- Mobile Swipe-to-Delete Action (Tampil di HP saat di-swipe ke samping kiri) -->
          <div class="absolute inset-y-0 right-0 w-[84px] bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center rounded-r-2xl cursor-pointer md:hidden shadow-inner transition-colors z-0"
            onclick="event.stopPropagation(); window.NotifikasiModule.deleteItem('${item.id}')"
            title="Hapus Notifikasi">
            <i class="fa-solid fa-trash-can text-base mb-1"></i>
            <span class="text-[10px] font-bold uppercase tracking-wider">Hapus</span>
          </div>

          <!-- Front Card (Klik untuk membuka detail & otomatis tandai dibaca) -->
          <div class="notif-card-front relative z-10 p-3.5 sm:p-4 rounded-2xl transition-transform duration-200 ease-out border ${isRead
          ? 'bg-white dark:bg-zinc-800/80 border-zinc-200/70 dark:border-zinc-700/70 opacity-90'
          : 'bg-indigo-50/40 dark:bg-zinc-800 border-indigo-200 dark:border-indigo-900/60 shadow-xs ring-1 ring-indigo-500/10'
        } hover:border-zinc-300 dark:hover:border-zinc-600 flex items-start gap-3 sm:gap-4 cursor-pointer select-none"
            onclick="window.NotifikasiModule.openDetail('${item.id}')">

            <!-- Icon Badge -->
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${typeStyle.iconBg} flex items-center justify-center shrink-0 shadow-2xs mt-0.5 pointer-events-none">
              <i class="${typeStyle.icon} text-xs sm:text-sm"></i>
            </div>

            <!-- Main Content -->
            <div class="flex-1 min-w-0 pointer-events-none">
              <!-- Top Line: Title (Kiri) & Date (Pojok Kanan Tiap Card) -->
              <div class="flex items-start justify-between gap-2 mb-1">
                <h4 class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 break-words line-clamp-1 sm:truncate flex-1 min-w-0">
                  ${escapeHtml(cleanTitle)}
                </h4>
                <span class="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 shrink-0 whitespace-nowrap pt-0.5">
                  <i class="fa-regular fa-clock text-[9px] sm:text-[10px]"></i>
                  <span>${relativeTime}</span>
                </span>
              </div>

              <!-- Description -->
              <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2 break-words mt-0.5">
                ${escapeHtml(cleanDes)}
              </p>
            </div>

            <!-- Laptop/Desktop Delete Button: Di Sisi Kanan (hidden md:flex) -->
            <div class="hidden md:flex items-center justify-center shrink-0 self-center pl-2">
              <button type="button"
                onclick="event.stopPropagation(); window.NotifikasiModule.deleteItem('${item.id}')"
                class="w-8 h-8 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer"
                title="Hapus notifikasi">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
    initSwipeGestures();
  }

  // Update Counters & Stats Cards (hanya untuk data yang sesuai id_user pengguna)
  function updateCounterBadges() {
    const userNotifs = getUserNotifications();
    const total = userNotifs.length;
    const unread = userNotifs.filter(n => n.status !== 'TRUE' && n.isRead !== true).length;
    const success = userNotifs.filter(n => String(n.tipe).toLowerCase() === 'sukses').length;
    const failed = userNotifs.filter(n => ['gagal', 'error'].includes(String(n.tipe).toLowerCase())).length;

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
      // Pastikan relasi user sudah dimuat
      await ensureUsersData();

      const currUser = (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function')
        ? API.getCurrentUser()
        : { id: 'USR-001', role: 'super_admin' };

      const res = await API.getNotifikasi({ userId: currUser.id });
      if (res && res.success && Array.isArray(res.data)) {
        // Deduplikasi agar notifikasi tidak tampil ganda/double
        const seen = new Set();
        allNotifikasi = res.data.filter(item => {
          const idKey = String(item.id || item.idNotifikasi || '').trim();
          const contentKey = `${item.judul || ''}|${item.ket || item.des || ''}|${item.tanggal || ''}`.trim().toLowerCase();
          const uniqueKey = idKey || contentKey;
          if (uniqueKey && seen.has(uniqueKey)) return false;
          if (uniqueKey) seen.add(uniqueKey);
          return true;
        });

        // Jika respons dari backend menyertakan data relasi userName/userRole, simpan ke cache
        allNotifikasi.forEach(item => {
          const uId = String(item.id_user || item.userId || '').trim();
          if (uId && uId !== 'ALL' && item.userName && !userCacheMap[uId]) {
            userCacheMap[uId] = {
              id: uId,
              name: item.userName,
              role: formatRoleLabel(item.userRole),
              avatar: item.userAvatar || ''
            };
          }
        });
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

  // Tandai Semua Dibaca (hanya notifikasi milik user aktif)
  async function markAllAsRead() {
    const userNotifs = getUserNotifications();
    if (userNotifs.length === 0) return;

    userNotifs.forEach(n => {
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

  // Gesture Swipe-to-delete di HP / perangkat layar sentuh
  function initSwipeGestures() {
    const items = document.querySelectorAll('.notif-swipe-item');
    items.forEach(wrapper => {
      const front = wrapper.querySelector('.notif-card-front');
      if (!front || front._hasSwipeInit) return;
      front._hasSwipeInit = true;

      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let isSwiping = false;
      let isHorizontal = null;

      front.addEventListener('touchstart', (e) => {
        // Tutup item lain yang sedang terbuka
        document.querySelectorAll('.notif-card-front').forEach(other => {
          if (other !== front && other._isOpen) {
            other.style.transition = 'transform 0.2s ease-out';
            other.style.transform = 'translateX(0px)';
            other._isOpen = false;
          }
        });

        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        isHorizontal = null;
        isSwiping = false;
        front.style.transition = 'none';
      }, { passive: true });

      front.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        currentX = touch.clientX;
        const deltaX = currentX - startX;
        const deltaY = touch.clientY - startY;

        if (isHorizontal === null) {
          if (Math.abs(deltaX) > 7 || Math.abs(deltaY) > 7) {
            isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
          }
        }

        if (isHorizontal) {
          const baseOffset = front._isOpen ? -84 : 0;
          let newX = baseOffset + deltaX;
          if (newX > 0) newX = 0;
          if (newX < -150) newX = -150;

          front.style.transform = `translateX(${newX}px)`;
          if (Math.abs(deltaX) > 8) {
            isSwiping = true;
          }
        }
      }, { passive: true });

      front.addEventListener('touchend', () => {
        const deltaX = currentX - startX;

        if (isSwiping && isHorizontal) {
          front.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';

          if (deltaX < -150) {
            // Full swipe left -> Otomatis hapus notifikasi
            front.style.transform = 'translateX(-100%)';
            const itemId = wrapper.getAttribute('data-id');
            setTimeout(() => {
              if (itemId) deleteItem(itemId);
            }, 180);
          } else if (deltaX < -40 || (front._isOpen && deltaX < 20)) {
            // Swipe ke kiri -> Tampilkan tombol hapus merah di HP
            front.style.transform = 'translateX(-84px)';
            front._isOpen = true;
          } else {
            // Batalkan swipe
            front.style.transform = 'translateX(0px)';
            front._isOpen = false;
          }
          front._justSwiped = true;
          setTimeout(() => { front._justSwiped = false; }, 320);
        } else if (front._isOpen) {
          front.style.transition = 'transform 0.22s ease-out';
          front.style.transform = 'translateX(0px)';
          front._isOpen = false;
        }
        isSwiping = false;
      }, { passive: true });
    });
  }

  // Buka detail pesan notifikasi & otomatis tandai sebagai sudah dibaca
  function openDetail(id) {
    const wrapper = document.querySelector(`.notif-swipe-item[data-id="${id}"]`);
    const front = wrapper ? wrapper.querySelector('.notif-card-front') : null;

    if (front && front._justSwiped) {
      return;
    }
    if (front && front._isOpen) {
      front.style.transition = 'transform 0.2s ease-out';
      front.style.transform = 'translateX(0px)';
      front._isOpen = false;
      return;
    }

    const item = allNotifikasi.find(n => String(n.id) === String(id));
    if (!item) return;

    // 1. Otomatis tandai dibaca jika statusnya belum dibaca
    const isRead = item.status === 'TRUE' || item.isRead === true;
    if (!isRead) {
      item.status = 'TRUE';
      item.isRead = true;
      updateCounterBadges();

      if (front) {
        front.classList.remove('bg-indigo-50/40', 'border-indigo-200', 'dark:border-indigo-900/60', 'ring-1', 'ring-indigo-500/10');
        front.classList.add('bg-white', 'dark:bg-zinc-800/80', 'border-zinc-200/70', 'dark:border-zinc-700/70', 'opacity-90');
      }

      if (typeof API !== 'undefined' && API.updateNotifikasiStatus) {
        API.updateNotifikasiStatus(id, true).catch(err => console.warn(err));
      }
    }

    // 2. Tampilkan dialog detail pesan notifikasi
    showDetailModal(item);
  }

  // Tampilkan Modal Detail Notifikasi
  function showDetailModal(item) {
    const modal = document.getElementById('notifikasiDetailModal');
    const content = document.getElementById('notifikasiDetailModalContent');
    if (!modal) return;

    const typeStyle = getTypeBadgeStyles(item.tipe);
    const cleanTitle = cleanRelationText(item.judul || 'Notifikasi');
    const cleanDes = cleanRelationText(item.ket || item.des || 'Tidak ada detail pesan.');
    const relativeTime = formatRelativeTime(item.tanggal || item.createdAt);

    let fullDateStr = '-';
    if (item.tanggal || item.createdAt) {
      try {
        const d = new Date(item.tanggal || item.createdAt);
        if (!isNaN(d.getTime())) {
          fullDateStr = d.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';
        } else {
          fullDateStr = String(item.tanggal || item.createdAt);
        }
      } catch (e) {
        fullDateStr = String(item.tanggal || item.createdAt);
      }
    }

    const elTitle = document.getElementById('modalNotifTitle');
    const elDate = document.getElementById('modalNotifDate');
    const elRelTime = document.getElementById('modalNotifRelativeTime');
    const elDesc = document.getElementById('modalNotifDesc');
    const elIconWrapper = document.getElementById('modalNotifIconWrapper');
    const elIcon = document.getElementById('modalNotifIcon');
    const elTypeBadge = document.getElementById('modalNotifTypeBadge');

    if (elTitle) elTitle.textContent = cleanTitle;
    if (elDate) elDate.textContent = fullDateStr;
    if (elRelTime) elRelTime.textContent = relativeTime;
    if (elDesc) elDesc.textContent = cleanDes;

    if (elIconWrapper) {
      elIconWrapper.className = `w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${typeStyle.iconBg} flex items-center justify-center shrink-0`;
    }
    if (elIcon) {
      elIcon.className = `${typeStyle.icon} text-sm`;
    }
    if (elTypeBadge) {
      elTypeBadge.className = `inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-0.5 ${typeStyle.bgLight}`;
      elTypeBadge.textContent = typeStyle.label;
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
      if (content) {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  // Tutup Modal Detail
  function closeDetailModal() {
    const modal = document.getElementById('notifikasiDetailModal');
    const content = document.getElementById('notifikasiDetailModalContent');
    if (!modal || modal.classList.contains('hidden')) return;

    if (content) {
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 180);
  }

  // Hapus satu notifikasi (dari tombol desktop sisi kanan atau swipe HP)
  async function deleteItem(id) {
    closeDetailModal();

    const wrapper = document.querySelector(`.notif-swipe-item[data-id="${id}"]`);
    if (wrapper) {
      wrapper.style.transition = 'all 0.22s ease-out';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateX(-100%)';
      wrapper.style.maxHeight = '0px';
      wrapper.style.marginTop = '0px';
      wrapper.style.marginBottom = '0px';
      wrapper.style.paddingTop = '0px';
      wrapper.style.paddingBottom = '0px';
      await new Promise(r => setTimeout(r, 200));
    }

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

  // Bersihkan riwayat yang sudah dibaca (hanya notifikasi milik user aktif)
  async function clearReadHistory() {
    const userNotifs = getUserNotifications();
    const readCount = userNotifs.filter(n => n.status === 'TRUE' || n.isRead === true).length;
    if (readCount === 0) {
      if (typeof Toast !== 'undefined') {
        Toast.info('Info', 'Tidak ada riwayat notifikasi yang sudah dibaca.');
      }
      return;
    }

    allNotifikasi = allNotifikasi.filter(n => {
      if (isNotificationForCurrentUser(n) && (n.status === 'TRUE' || n.isRead === true)) {
        return false;
      }
      return true;
    });
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
        btn.className = 'btn-status-filter px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0';
      } else {
        btn.className = 'btn-status-filter px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0';
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

    setStatusFilter('all');
  }

  // Populate list user untuk filter jika elemen tersedia (backward-compatibility safe)
  async function populateUserFilter() {
    const userSelect = document.getElementById('filterUserSelect');
    if (!userSelect) return;

    await ensureUsersData();
    const userKeys = Object.keys(userCacheMap);
    if (userKeys.length > 0) {
      userSelect.innerHTML = '<option value="all">Semua Anggota Tim</option>';
      userKeys.forEach(uId => {
        const u = userCacheMap[uId];
        const opt = document.createElement('option');
        opt.value = uId;
        opt.textContent = `${u.name} • ${u.role}`;
        userSelect.appendChild(opt);
      });
    }
  }

  // Inisialisasi Halaman
  async function init() {
    await ensureUsersData();
    await loadNotifikasi();
    await populateUserFilter();

    // Event listener untuk menutup modal detail ketika klik di backdrop atau tekan Escape
    const modal = document.getElementById('notifikasiDetailModal');
    if (modal && !modal._hasInitCloseListeners) {
      modal._hasInitCloseListeners = true;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeDetailModal();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          closeDetailModal();
        }
      });
    }

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
    openDetail,
    closeDetailModal,
    toggleStatus,
    markAllAsRead,
    deleteItem,
    clearReadHistory,
    setStatusFilter,
    setTypeFilter,
    setUserFilter,
    setSearch,
    resetFilters,
    setupNotifikasiSheet: async () => {
      if (typeof API !== 'undefined' && API.setupNotifikasiSheet) {
        return await API.setupNotifikasiSheet();
      }
    }
  };

  // Run on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
