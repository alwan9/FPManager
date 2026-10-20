const SessionManager = {
  DAILY_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // 1 Day (86,400,000 ms)
  SESSION_MAX_AGE_MS: 3 * 24 * 60 * 60 * 1000,     // 3 Days (259,200,000 ms)

  // Auth & critical keys whitelist (MUST NEVER be deleted during daily cleanup)
  AUTH_KEYS: ['token', 'user', 'currentUser', 'fp_auth_token', 'fp_auth_user', 'auth_login_time'],
  PREF_KEYS: [
    'theme', 'sidebar_collapsed', 'shortcutsOrder', 'last_daily_cleanup',
    'cfg_api_url', 'cfg_api_key', 'cfg_gemini_api_key', 'cfg_wa_template',
    'cfg_reminder_interval', 'cfg_notif_style', 'cfg_notif_vibrate',
    'cfg_notif_silent', 'cfg_toast_position', 'cfg_toast_duration', 'cfg_lang'
  ],

  // Record login timestamp
  recordLogin: () => {
    const now = Date.now().toString();
    sessionStorage.setItem('auth_login_time', now);
    localStorage.setItem('auth_login_time', now);
    if (!localStorage.getItem('last_daily_cleanup')) {
      localStorage.setItem('last_daily_cleanup', now);
    }
  },

  // Get effective login timestamp
  getLoginTime: () => {
    const raw = sessionStorage.getItem('auth_login_time') || localStorage.getItem('auth_login_time');
    if (raw && !isNaN(Number(raw))) {
      if (!sessionStorage.getItem('auth_login_time')) {
        sessionStorage.setItem('auth_login_time', raw);
      }
      return Number(raw);
    }
    const token = Auth.getToken();
    if (token) {
      const now = Date.now();
      sessionStorage.setItem('auth_login_time', now.toString());
      localStorage.setItem('auth_login_time', now.toString());
      return now;
    }
    return null;
  },

  // Lifecycle check: auto logout on 3 days, daily cleanup on 1 day
  checkLifecycle: () => {
    const token = Auth.getToken();
    if (!token) return { status: 'unauthenticated' };

    const now = Date.now();
    const loginTime = SessionManager.getLoginTime();

    // 1. Check 3-Day Auto-Logout
    if (loginTime && (now - loginTime >= SessionManager.SESSION_MAX_AGE_MS)) {
      console.warn('[SessionManager] Sesi login telah mencapai batas 3 hari. Melakukan auto-logout.');
      SessionManager.triggerAutoLogout('session_expired');
      return { status: 'expired', elapsedDays: (now - loginTime) / (24 * 60 * 60 * 1000) };
    }

    // 2. Check 1-Day Daily Cleanup
    const lastCleanupRaw = localStorage.getItem('last_daily_cleanup');
    const lastCleanup = (lastCleanupRaw && !isNaN(Number(lastCleanupRaw))) ? Number(lastCleanupRaw) : 0;

    if (!lastCleanup || (now - lastCleanup >= SessionManager.DAILY_CLEANUP_INTERVAL_MS)) {
      SessionManager.performDailyCleanup();
    }

    return {
      status: 'active',
      sessionAgeDays: loginTime ? ((now - loginTime) / (24 * 60 * 60 * 1000)).toFixed(2) : 0,
      nextDailyCleanupInHours: Math.max(0, ((SessionManager.DAILY_CLEANUP_INTERVAL_MS - (now - (lastCleanup || now))) / (60 * 60 * 1000))).toFixed(1),
      nextAutoLogoutInDays: loginTime ? Math.max(0, ((SessionManager.SESSION_MAX_AGE_MS - (now - loginTime)) / (24 * 60 * 60 * 1000))).toFixed(2) : 3
    };
  },

  // Daily Cleanup: Purges temporary cookies & non-auth cache, PRESERVES LOGIN CREDENTIALS
  performDailyCleanup: () => {
    try {
      if (document.cookie) {
        const cookies = document.cookie.split(';');
        const loginCookiePatterns = ['token', 'user', 'fp_auth', 'auth', 'session', 'login'];
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = (eqPos > -1 ? cookie.substr(0, eqPos) : cookie).trim();
          if (!name) return;
          const isLoginCookie = loginCookiePatterns.some(pat => name.toLowerCase().includes(pat));
          if (!isLoginCookie) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
          }
        });
      }

      const tempSessionKeys = [
        'toast_denied', 'cached_edit_proyek',
        'pwa_notif_prompt_dismissed', 'pwa_ios_prompt_dismissed', 'pwa_install_prompt_dismissed',
        'just_logged_in'
      ];
      tempSessionKeys.forEach(k => sessionStorage.removeItem(k));

      if (typeof APICache !== 'undefined' && typeof APICache.clear === 'function') {
        APICache.clear();
      }

      localStorage.setItem('last_daily_cleanup', Date.now().toString());
    } catch (e) {
      console.warn('[SessionManager] Peringatan pembersihan harian:', e);
    }
  },

  // Auto Logout after 3 days or manual logout
  triggerAutoLogout: async (reason = 'session_expired') => {
    try {
      if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
        const body = new URLSearchParams();
        body.append('action', 'logout');
        body.append('token', sessionStorage.getItem('token') || localStorage.getItem('token') || '');
        body.append('apiKey', CONFIG.API_KEY || '');
        await fetch(CONFIG.API_URL, { method: 'POST', body }).catch(() => { });
      }
    } catch (e) { }

    if (typeof APICache !== 'undefined' && APICache.clear) APICache.clear();
    if (typeof FPManagerDB !== 'undefined' && FPManagerDB.clearAllStores) {
      try { await FPManagerDB.clearAllStores(); } catch (e) { }
    }

    // Bersihkan seluruh CacheStorage browser agar bersih & minimal
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) { }
    }

    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_login_time');
    localStorage.removeItem('fpm_offline_queue');
    localStorage.removeItem('cached_proyek_data');
    localStorage.removeItem('cached_keuangan_data');

    if (document.cookie) {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = (eqPos > -1 ? cookie.substr(0, eqPos) : cookie).trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        }
      });
    }

    const isInPages = (window.location.pathname || "").includes('/pages/');
    window.location.href = isInPages ? `../login.html?reason=${reason}` : `login.html?reason=${reason}`;
  }
};

window.SessionManager = SessionManager;

const Auth = {
  login: async (username, password, rememberMe = true) => {
    try {
      const body = new URLSearchParams();
      body.append("action", "login");
      body.append("username", username);
      body.append("password", password);
      body.append("apiKey", CONFIG.API_KEY);

      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        body
      });
      const result = await res.json();
      if (result.success) {
        const token = result.token || ("token-" + Date.now());
        sessionStorage.setItem("token", token);
        localStorage.setItem("token", token);
        if (result.user) {
          // Normalize role
          const rawRole = String(result.user.role || "").toLowerCase().trim();
          if (rawRole === "super_admin" || rawRole === "super admin" || rawRole === "superadmin" || rawRole.includes("admin") || result.user.username === "wansmin") {
            result.user.role = "super_admin";
          } else if (rawRole === "desainer" || rawRole === "designer") {
            result.user.role = "designer";
          } else {
            result.user.role = "service";
          }
          sessionStorage.setItem("user", JSON.stringify(result.user));
          localStorage.setItem("user", JSON.stringify(result.user));
        }
        SessionManager.recordLogin();
      }
      return result;
    } catch (err) {
      console.error("Auth login error:", err);
      return {
        success: false,
        message: "Tidak dapat terhubung ke server login Google Sheets. Periksa koneksi atau URL API Anda."
      };
    }
  },

  getUser: () => {
    try {
      const uStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!uStr) return null;
      if (!sessionStorage.getItem("user")) {
        sessionStorage.setItem("user", uStr);
      }
      const u = JSON.parse(uStr);
      if (u) {
        if (!u.role && u.username === "wansmin") u.role = "super_admin";
        if (u.role) {
          const r = String(u.role).toLowerCase().trim();
          if (r === "super_admin" || r === "super admin" || r === "superadmin" || r.includes("admin") || u.username === "wansmin") {
            u.role = "super_admin";
          } else if (r === "desainer" || r === "designer") {
            u.role = "designer";
          } else {
            u.role = "service";
          }
        } else {
          u.role = "service";
        }
        if (!u.avatar) {
          u.avatar = u.url_profile || u.urlprofile || u.foto || u.photo || u.avatar_url || u.avatarUrl || u.urlProfile || u.Url_profile || "";
        }
      }
      return u;
    } catch (e) {
      return null;
    }
  },

  getCurrentUser: () => {
    return Auth.getUser();
  },

  getToken: () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
    if (token && !sessionStorage.getItem("token")) {
      sessionStorage.setItem("token", token);
    }
    return token;
  },

  getRole: () => {
    const u = Auth.getUser();
    return (u && u.role) ? String(u.role).toLowerCase().trim() : "service";
  },

  isSuperAdmin: () => {
    const r = Auth.getRole();
    const u = Auth.getUser();
    return r === "super_admin" || r === "superadmin" || r.includes("admin") || (u && u.username === "wansmin");
  },

  isDesigner: () => {
    if (Auth.isSuperAdmin()) return false;
    const r = Auth.getRole();
    return r === "designer" || r === "desainer";
  },

  isService: () => {
    if (Auth.isSuperAdmin() || Auth.isDesigner()) return false;
    return true;
  },

  // Akses Halaman Sesuai Role
  canAccessPage: (pageName) => {
    const path = String(pageName || window.location.pathname || "").toLowerCase();
    const file = path.split("/").pop() || "index.html";

    if (Auth.isSuperAdmin()) return true;

    if (Auth.isDesigner()) {
      const forbiddenForDesigner = [
        "tambah-proyek.html", "tambah-proyek",
        "keuangan.html", "keuangan",
        "history-invoice.html", "history-invoice",
        "invoice.html", "invoice",
        "laporan.html", "laporan",
        "admin-tasks.html", "admin-tasks",
        "user-management.html", "user-management"
      ];
      return !forbiddenForDesigner.some(f => file === f || file.startsWith(f));
    }

    if (Auth.isService()) {
      const forbiddenForService = [
        "tools.html", "tools",
        "user-management.html", "user-management"
      ];
      return !forbiddenForService.some(f => file === f || file.startsWith(f));
    }

    return true;
  },

  canAddProject: () => {
    return Auth.isSuperAdmin() || Auth.isService();
  },

  canDeleteProject: () => {
    return Auth.isSuperAdmin() || Auth.isService();
  },

  canCreateInvoice: () => {
    return Auth.isSuperAdmin() || Auth.isService();
  },

  canModifyProject: () => {
    return true;
  },

  canAccessKeuangan: () => {
    return Auth.isSuperAdmin() || Auth.isService();
  },

  canAccessTools: () => {
    return Auth.isSuperAdmin() || Auth.isDesigner();
  },

  canManageUsers: () => {
    return Auth.isSuperAdmin();
  },

  hasPermission: (perm) => {
    if (Auth.isSuperAdmin()) return true;
    if (perm === 'manage_users' || perm === 'settings') return false;
    if (Auth.isDesigner() && (
      perm === 'tambah' || perm === 'tambah_proyek' || perm === 'add_project' ||
      perm === 'keuangan' || perm === 'admin_tasks' || perm === 'laporan' ||
      perm === 'hapus' || perm === 'hapus_proyek' || perm === 'delete' || perm === 'delete_project' ||
      perm === 'invoice' || perm === 'create_invoice' || perm === 'buat_invoice' ||
      perm === 'import_excel' || perm === 'export_excel' || perm === 'excel_tools' || perm === 'excel'
    )) return false;
    if (Auth.isService() && (perm === 'tools' || perm === 'crud_tools')) return false;
    return true;
  },

  formatAvatarUrl: (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return trimmed;
    // Blokir protokol berbahaya seperti javascript: atau data non-gambar
    if (/^(javascript|vbscript|data):/i.test(trimmed)) return '';

    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
      const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) {
        return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
      }
      const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
      }
    }
    // Hanya izinkan link http/https yang valid
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return '';
  },

  syncUserSession: (updatedUser) => {
    if (!updatedUser) return;
    const currentUser = Auth.getUser();
    if (!currentUser) return;
    if (String(currentUser.id) === String(updatedUser.id) || String(currentUser.username).toLowerCase() === String(updatedUser.username).toLowerCase()) {
      const mergedUser = { ...currentUser, ...updatedUser };
      sessionStorage.setItem("user", JSON.stringify(mergedUser));
      if (localStorage.getItem("user")) {
        localStorage.setItem("user", JSON.stringify(mergedUser));
      }
      if (Auth.applyMenuPermissions) Auth.applyMenuPermissions();
      if (Auth.applyButtonPermissions) Auth.applyButtonPermissions();
    }
  },

  refreshCurrentUserProfile: async () => {
    try {
      const currentUser = Auth.getUser();
      if (!currentUser) return;

      const path = (window.location.pathname || '').toLowerCase();
      if (!path.includes('profil.html')) return;

      if (typeof API !== 'undefined' && typeof API.getUsers === 'function') {
        const users = await API.getUsers();
        if (Array.isArray(users) && users.length > 0) {
          const freshUser = users.find(u =>
            (currentUser.id && String(u.id) === String(currentUser.id)) ||
            (currentUser.username && String(u.username || '').toLowerCase() === String(currentUser.username).toLowerCase())
          );
          if (freshUser) {
            if (!freshUser.avatar) {
              freshUser.avatar = freshUser.url_profile || freshUser.urlprofile || freshUser.foto || freshUser.photo || freshUser.Url_profile || "";
            }
            Auth.syncUserSession(freshUser);
            if (typeof loadProfileData === 'function') {
              loadProfileData();
            }
          }
        }
      }
    } catch (e) { }
  },

  checkLogin: () => {
    const token = Auth.getToken();
    const isLoginPage = window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("login");
    const isInPages = (window.location.pathname || "").includes("/pages/");

    if (!token && !isLoginPage) {
      window.location.href = isInPages ? "../login.html" : "login.html";
      return;
    }
    if (token && isLoginPage) {
      window.location.href = "index.html";
      return;
    }

    if (token && !isLoginPage) {
      const lifecycle = SessionManager.checkLifecycle();
      if (lifecycle && lifecycle.status === 'expired') {
        return;
      }

      Auth.guardCurrentPage();
      Auth.applyMenuPermissions();
      Auth.applyButtonPermissions();
      Auth.refreshCurrentUserProfile();
    }
  },

  guardCurrentPage: () => {
    const token = Auth.getToken();
    if (!token) return;

    const path = (window.location.pathname || "").toLowerCase();
    const file = path.split("/").pop() || "index.html";
    if (file === "login.html" || file === "login") return;

    if (!Auth.canAccessPage(file)) {
      console.warn(`[Auth Guard] Akses ke ${file} ditolak untuk role: ${Auth.getRole()}`);
      sessionStorage.setItem("toast_denied", "Anda tidak memiliki izin untuk mengakses halaman tersebut.");
      const isInPages = (window.location.pathname || "").includes("/pages/");
      window.location.href = isInPages ? "../index.html" : "index.html";
    }
  },

  renderMobileBottomNav: () => {
    const bottomNav = document.getElementById("mobileBottomNav");
    if (!bottomNav) return;

    // Determine current active page
    const currentPath = (window.location.pathname || "").toLowerCase();
    const filename = currentPath.split("/").pop() || "index.html";

    const isHome = filename === "index.html" || filename === "" || filename === "index";
    const isProyek = filename === "proyek.html" || filename === "proyek" || filename === "invoice.html" || filename === "invoice";
    const isTambah = filename === "tambah-proyek.html" || filename === "tambah-proyek";
    const isKeuangan = filename === "keuangan.html" || filename === "keuangan";
    const isHistory = filename === "history-invoice.html" || filename === "history-invoice";
    const isLaporan = filename === "laporan.html" || filename === "laporan";
    const isKeuanganGroup = isKeuangan || isHistory || isLaporan;
    const isTools = filename === "tools.html" || filename === "tools";
    const isProfil = filename === "profil.html" || filename === "profil";

    const activeClass = "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors flex-1 text-indigo-400 font-bold";
    const inactiveClass = "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors flex-1 text-zinc-400 hover:text-zinc-100 font-medium";

    const isInPages = (window.location.pathname || "").includes("/pages/");
    const rootPath = isInPages ? "../" : "./";
    const pagesPath = isInPages ? "./" : "pages/";

    if (Auth.isDesigner()) {
      // Designer: Home, Projek, Tools, Profil
      bottomNav.innerHTML = `
        <!-- 1. Dashboard -->
        <a href="${rootPath}index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-chart-line text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Dashboard</span>
        </a>

        <!-- 2. Project -->
        <a href="${pagesPath}proyek.html" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-list-check text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tools -->
        <a href="${pagesPath}tools.html" class="${isTools ? activeClass : inactiveClass}">
          <i class="fa-solid fa-toolbox text-base"></i>
          <span class="text-[10px] mt-0.5">Tools</span>
        </a>

        <!-- 4. Profile -->
        <a href="${pagesPath}profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;
    } else {
      // Super Admin & Service: Home, Projek, Tambah, Keuangan, Profil
      bottomNav.innerHTML = `
        <!-- 1. Dashboard -->
        <a href="${rootPath}index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-chart-line text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Dashboard</span>
        </a>

        <!-- 2. Project -->
        <a href="${pagesPath}proyek.html" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-list-check text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tambah (Center Prominent Action) -->
        <a href="${pagesPath}tambah-proyek.html"
          class="flex flex-col items-center justify-center -mt-5 flex-1 group focus:outline-none" title="Tambah Projek">
          <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-zinc-900 ${isTambah ? 'ring-2 ring-indigo-400' : ''} group-hover:scale-105 active:scale-95 transition-all">
            <i class="fa-solid fa-plus text-base"></i>
          </div>
          <span class="text-[10px] font-bold ${isTambah ? 'text-indigo-400' : 'text-zinc-200'} mt-0.5" data-i18n="nav-tambah">Tambah</span>
        </a>

        <!-- 4. Keuangan Group (Collapsible / Action Menu) -->
        <button type="button" id="btnMobileKeuanganNav" onclick="Auth.handleMobileKeuanganClick(event)"
          class="${isKeuanganGroup ? activeClass : inactiveClass} focus:outline-none cursor-pointer">
          <i class="fa-solid fa-wallet text-base"></i>
          <span class="text-[10px] mt-0.5 flex items-center gap-0.5" data-i18n="nav-keuangan-group">
            Keuangan <i class="fa-solid fa-chevron-up text-[8px] opacity-70"></i>
          </span>
        </button>

        <!-- 5. Profile -->
        <a href="${pagesPath}profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;
    }

    let backdrop = document.getElementById("mobileKeuanganBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mobileKeuanganBackdrop";
      backdrop.className = "md:hidden fixed inset-0";
      backdrop.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        Auth.toggleMobileKeuanganMenu(false);
      };
      document.body.appendChild(backdrop);
    }

    let popover = document.getElementById("mobileKeuanganPopover");
    if (!popover) {
      popover = document.createElement("div");
      popover.id = "mobileKeuanganPopover";
      popover.className = "md:hidden fixed";
      document.body.appendChild(popover);
    }

    if (popover) {
      popover.innerHTML = `
        <div class="popover-header">
          <span class="text-xs font-bold popover-title flex items-center gap-2">
            <i class="fa-solid fa-wallet text-indigo-500"></i>
            <span data-i18n="nav-keuangan-group">Keuangan</span>
          </span>
          <button type="button" onclick="Auth.toggleMobileKeuanganMenu(false)" class="text-zinc-400 hover:text-white p-1 focus:outline-none" title="Tutup">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
        <div class="flex flex-col space-y-1">
          <a href="${pagesPath}keuangan.html" class="popover-link ${isKeuangan ? 'active-sub' : ''}">
            <i class="fa-solid fa-coins text-sm text-indigo-400 w-5"></i>
            <span data-i18n="nav-keuangan">Keuangan</span>
          </a>
          <a href="${pagesPath}history-invoice.html" class="popover-link ${isHistory ? 'active-sub' : ''}">
            <i class="fa-solid fa-receipt text-sm text-indigo-400 w-5"></i>
            <span data-i18n="nav-history-invoice">History Invoice</span>
          </a>
          <a href="${pagesPath}laporan.html" class="popover-link ${isLaporan ? 'active-sub' : ''}">
            <i class="fa-solid fa-file-invoice-dollar text-sm text-indigo-400 w-5"></i>
            <span data-i18n="nav-laporan">Laporan</span>
          </a>
        </div>
      `;
    }

    if (typeof i18n !== 'undefined' && i18n.translatePage) {
      i18n.translatePage();
    }

    Auth.initMobileBottomNavScrollToTop();
  },

  getScrollTop: () => {
    const main = document.querySelector("main");
    return Math.max(
      window.pageYOffset || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
      main ? main.scrollTop : 0
    );
  },

  scrollToTop: () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    try {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (e) {
      document.documentElement.scrollTop = 0;
    }
    try {
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (e) {
      document.body.scrollTop = 0;
    }

    const main = document.querySelector("main");
    if (main) {
      try {
        main.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      } catch (e) {
        main.scrollTop = 0;
      }
    }

    const scrollables = document.querySelectorAll(".overflow-y-auto, .overflow-auto");
    scrollables.forEach(el => {
      if (el && el !== main && el.scrollTop > 0) {
        try {
          el.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } catch (e) {
          el.scrollTop = 0;
        }
      }
    });

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(20);
      } catch (e) {}
    }
  },

  animateNavClick: (element) => {
    if (!element) return;
    const target = element.querySelector("i, .rounded-full") || element;
    target.classList.remove("nav-tap-pulse");
    void target.offsetWidth;
    target.classList.add("nav-tap-pulse");
    setTimeout(() => {
      target.classList.remove("nav-tap-pulse");
    }, 400);
  },

  isCurrentPageLink: (href) => {
    if (!href) return false;
    const cleanHref = href.split("?")[0].split("#")[0].trim();
    let targetFile = cleanHref.split("/").pop().toLowerCase();
    if (!targetFile || targetFile === "index") targetFile = "index.html";

    const currentPath = (window.location.pathname || "").toLowerCase();
    let currentFile = currentPath.split("/").pop();
    if (!currentFile || currentFile === "index") currentFile = "index.html";

    const stripExt = (f) => f.replace(/\.html?$/i, "");
    return stripExt(targetFile) === stripExt(currentFile);
  },

  handleMobileKeuanganClick: (e) => {
    const currentPath = (window.location.pathname || "").toLowerCase();
    const filename = currentPath.split("/").pop() || "index.html";
    const isKeuangan = filename.includes("keuangan");
    const isHistory = filename.includes("history-invoice");
    const isLaporan = filename.includes("laporan");
    const isKeuanganGroup = isKeuangan || isHistory || isLaporan;

    const btn = document.getElementById("btnMobileKeuanganNav");

    if (isKeuanganGroup) {
      const scrollTop = Auth.getScrollTop();
      if (scrollTop > 60) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        Auth.scrollToTop();
        if (btn) Auth.animateNavClick(btn);
        return;
      }
    }

    Auth.toggleMobileKeuanganMenu();
    if (btn) Auth.animateNavClick(btn);
  },

  handlePopoverLinkClick: (e, targetHref) => {
    Auth.toggleMobileKeuanganMenu(false);
    if (Auth.isCurrentPageLink(targetHref)) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      Auth.scrollToTop();
    }
  },

  initMobileBottomNavScrollToTop: () => {
    const bottomNav = document.getElementById("mobileBottomNav");
    if (bottomNav && !bottomNav._hasBackToTopInit) {
      bottomNav._hasBackToTopInit = true;

      bottomNav.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link || !bottomNav.contains(link)) return;

        const href = link.getAttribute("href");
        if (!href) return;

        if (Auth.isCurrentPageLink(href)) {
          e.preventDefault();
          e.stopPropagation();
          Auth.scrollToTop();
          Auth.animateNavClick(link);
        }
      });
    }

    // Also support desktop sidebar active link back-to-top
    const desktopLinks = document.querySelectorAll("#navMenu a.sidebar-link");
    desktopLinks.forEach(link => {
      if (link._hasScrollInit) return;
      link._hasScrollInit = true;
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && Auth.isCurrentPageLink(href)) {
          e.preventDefault();
          Auth.scrollToTop();
        }
      });
    });
  },


  toggleMobileKeuanganMenu: (forceState) => {
    const backdrop = document.getElementById("mobileKeuanganBackdrop");
    const popover = document.getElementById("mobileKeuanganPopover");
    const navBtn = document.getElementById("btnMobileKeuanganNav");
    if (!popover || !backdrop) return;

    let shouldOpen = false;
    if (forceState !== undefined) {
      shouldOpen = !forceState;
    } else {
      shouldOpen = !popover.classList.contains("active");
    }

    if (shouldOpen) {
      backdrop.classList.add("active");
      popover.classList.add("active");
      if (navBtn) {
        navBtn.setAttribute("aria-expanded", "true");
        const icon = navBtn.querySelector(".fa-chevron-up, .fa-chevron-down");
        if (icon) icon.className = "fa-solid fa-chevron-down text-[8px] opacity-70";
      }
    } else {
      backdrop.classList.remove("active");
      popover.classList.remove("active");
      if (navBtn) {
        navBtn.setAttribute("aria-expanded", "false");
        const icon = navBtn.querySelector(".fa-chevron-up, .fa-chevron-down");
        if (icon) icon.className = "fa-solid fa-chevron-up text-[8px] opacity-70";
      }
    }
  },

  initSidebarNavGroup: () => {
    const group = document.getElementById("navKeuanganGroup");
    const toggleBtn = document.getElementById("btnNavKeuanganToggle");
    const submenu = document.getElementById("submenuKeuangan");
    if (!group || !toggleBtn || !submenu) return;

    const currentPath = (window.location.pathname || "").toLowerCase();
    const filename = currentPath.split("/").pop() || "index.html";

    const isKeuangan = filename === "keuangan.html" || filename === "keuangan";
    const isHistory = filename === "history-invoice.html" || filename === "history-invoice";
    const isLaporan = filename === "laporan.html" || filename === "laporan";
    const isKeuanganGroup = isKeuangan || isHistory || isLaporan;

    if (isKeuanganGroup) {
      toggleBtn.classList.add("active-parent", "expanded");
      toggleBtn.setAttribute("aria-expanded", "true");
      submenu.classList.remove("hidden");
      submenu.classList.add("flex");
    } else {
      toggleBtn.classList.remove("active-parent", "expanded");
      toggleBtn.setAttribute("aria-expanded", "false");
      submenu.classList.add("hidden");
      submenu.classList.remove("flex");
    }

    const sublinks = submenu.querySelectorAll(".sidebar-sublink");
    sublinks.forEach(link => {
      const href = link.getAttribute("href") || "";
      if ((isKeuangan && href.includes("keuangan.html")) ||
        (isHistory && href.includes("history-invoice.html")) ||
        (isLaporan && href.includes("laporan.html"))) {
        link.classList.add("active", "text-indigo-400", "font-semibold");
      } else {
        link.classList.remove("active");
      }
    });

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isCurrentlyHidden = submenu.classList.contains("hidden");
      if (isCurrentlyHidden) {
        submenu.classList.remove("hidden");
        submenu.classList.add("flex");
        toggleBtn.classList.add("expanded");
        toggleBtn.setAttribute("aria-expanded", "true");
      } else {
        submenu.classList.add("hidden");
        submenu.classList.remove("flex");
        toggleBtn.classList.remove("expanded");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    };
  },

  applyMenuPermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    // 1. Render Mobile Bottom Navigation
    Auth.renderMobileBottomNav();

    // 2. Initialize desktop sidebar group
    Auth.initSidebarNavGroup();

    // 3. Filter desktop sidebar navigation based on role
    const isSuper = Auth.isSuperAdmin();
    const isDes = Auth.isDesigner();
    const isServ = Auth.isService();

    const navLinks = document.querySelectorAll("#navMenu .sidebar-link, #navMenu a");
    navLinks.forEach(el => {
      const href = (el.getAttribute("href") || "").toLowerCase();

      // Keuangan Group
      if (el.closest("#navKeuanganGroup")) {
        if (isDes) {
          el.closest("#navKeuanganGroup").classList.add("hidden");
        } else {
          el.closest("#navKeuanganGroup").classList.remove("hidden");
        }
      }

      // Tambah Projek
      if (href.includes("tambah-proyek.html")) {
        if (!Auth.canAddProject()) {
          el.classList.add("hidden");
        } else {
          el.classList.remove("hidden");
        }
      }

      // Admin Tasks
      if (href.includes("admin-tasks.html")) {
        if (isDes) {
          el.classList.add("hidden");
        } else {
          el.classList.remove("hidden");
        }
      }

      // Tools
      if (href.includes("tools.html")) {
        if (!Auth.canAccessTools()) {
          el.classList.add("hidden");
        } else {
          el.classList.remove("hidden");
        }
      }

      // User Management
      if (href.includes("user-management.html")) {
        if (!isSuper) {
          el.classList.add("hidden");
        } else {
          el.classList.remove("hidden");
        }
      }

      // Notifikasi (Tersedia untuk semua role)
      if (href.includes("notifikasi.html")) {
        el.classList.remove("hidden");
      }

      // Pengaturan (Tersedia untuk semua role)
      if (href.includes("pengaturan.html")) {
        el.classList.remove("hidden");
      }
    });

    const groupKeuangan = document.getElementById("navKeuanganGroup");
    if (groupKeuangan) {
      if (isDes) {
        groupKeuangan.classList.add("hidden");
      } else {
        groupKeuangan.classList.remove("hidden");
      }
    }

    // 4. Filter profile dropdown links
    const dropdownLinks = document.querySelectorAll("#profileDropdown a");
    dropdownLinks.forEach(el => {
      const href = (el.getAttribute("href") || "").toLowerCase();
      if (href.includes("keuangan.html") || href.includes("laporan.html") || href.includes("admin-tasks.html")) {
        if (isDes) el.classList.add("hidden");
        else el.classList.remove("hidden");
      }
      if (href.includes("tools.html")) {
        if (!Auth.canAccessTools()) el.classList.add("hidden");
        else el.classList.remove("hidden");
      }
      if (href.includes("user-management.html")) {
        if (!isSuper) el.classList.add("hidden");
        else el.classList.remove("hidden");
      }
      if (href.includes("notifikasi.html") || href.includes("pengaturan.html")) {
        el.classList.remove("hidden");
      }
    });

    // Close mobile Keuangan popover when clicking outside
    document.addEventListener("click", (e) => {
      const popover = document.getElementById("mobileKeuanganPopover");
      const btn = document.getElementById("btnMobileKeuanganNav");
      if (popover && popover.classList.contains("active")) {
        if (!popover.contains(e.target) && (!btn || !btn.contains(e.target))) {
          Auth.toggleMobileKeuanganMenu(false);
        }
      }
    });

    // 5. Update Profile Avatar & Username
    const profileBtn = document.getElementById("profileDropdownBtn");
    if (profileBtn) {
      const rawAvatar = user.avatar || user.url_profile || user.urlprofile || user.foto || user.photo || user.avatar_url || user.avatarUrl || user.urlProfile || user.Url_profile || '';
      const avatarUrl = Auth.formatAvatarUrl(rawAvatar);
      const initial = (user.name || user.username || "A").charAt(0).toUpperCase();
      const displayName = user.name || user.username || "User";

      const currentAvatarKey = profileBtn.getAttribute("data-rendered-avatar") || "";
      const targetAvatarKey = `${user.id || user.username}_${avatarUrl}`;

      if (currentAvatarKey !== targetAvatarKey) {
        profileBtn.setAttribute("data-rendered-avatar", targetAvatarKey);

        const userAvatarText = profileBtn.querySelector("#userAvatarText") || document.getElementById("userAvatarText");
        const userNameText = profileBtn.querySelector("#userNameText") || document.getElementById("userNameText");

        if (userAvatarText) {
          userAvatarText.classList.add("overflow-hidden");
          if (avatarUrl) {
            const img = document.createElement("img");
            img.referrerPolicy = "no-referrer";
            img.loading = "lazy";
            img.src = avatarUrl;
            img.alt = initial;
            img.className = "h-full w-full object-cover rounded-xl";
            img.onerror = function() {
              if (!this.dataset.fallbackTried && (avatarUrl.includes("googleusercontent.com") || avatarUrl.includes("drive.google.com"))) {
                this.dataset.fallbackTried = "true";
                const match = avatarUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || avatarUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                  this.src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
                  return;
                }
              }
              this.remove();
              userAvatarText.textContent = initial;
            };
            userAvatarText.replaceChildren(img);
          } else {
            userAvatarText.textContent = initial;
          }
        }

        if (userNameText) {
          userNameText.textContent = displayName;
        }

        if (!userAvatarText) {
          profileBtn.classList.add("overflow-hidden", "flex", "items-center", "justify-center", "p-0");
          if (avatarUrl) {
            const img = document.createElement("img");
            img.referrerPolicy = "no-referrer";
            img.loading = "lazy";
            img.src = avatarUrl;
            img.alt = initial;
            img.className = "h-full w-full object-cover rounded-full block";
            img.onerror = function() {
              if (!this.dataset.fallbackTried && (avatarUrl.includes("googleusercontent.com") || avatarUrl.includes("drive.google.com"))) {
                this.dataset.fallbackTried = "true";
                const match = avatarUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || avatarUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                  this.src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
                  return;
                }
              }
              this.remove();
              const span = document.createElement("span");
              span.className = "font-bold text-sm text-zinc-600 dark:text-zinc-200";
              span.textContent = initial;
              profileBtn.replaceChildren(span);
            };
            profileBtn.replaceChildren(img);
          } else {
            const span = document.createElement("span");
            span.className = "font-bold text-sm text-zinc-600 dark:text-zinc-200";
            span.textContent = initial;
            profileBtn.replaceChildren(span);
          }
        }
      }

      profileBtn.title = displayName;
    }

    // 6. Update Top Header Role Badge
    const userRoleBadge = document.getElementById("headerUserRoleBadge");
    if (userRoleBadge) {
      if (isSuper) {
        userRoleBadge.innerText = "SUPER ADMIN";
        userRoleBadge.className = "hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800";
      } else if (isDes) {
        userRoleBadge.innerText = "DESIGNER";
        userRoleBadge.className = "hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
      } else {
        userRoleBadge.innerText = "SERVICE";
        userRoleBadge.className = "hidden lg:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      }
    }
  },

  applyButtonPermissions: () => {
    // Tombol-tombol khusus yang hanya boleh untuk Super Admin atau Service
    if (Auth.isDesigner()) {
      const bulkDeleteBtn = document.getElementById("btnBulkDelete");
      if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = "none";
        bulkDeleteBtn.classList.add("hidden");
        bulkDeleteBtn.disabled = true;
      }

      const bulkInvoiceBtn = document.getElementById("btnBulkCreateInvoice");
      if (bulkInvoiceBtn) {
        bulkInvoiceBtn.style.display = "none";
        bulkInvoiceBtn.classList.add("hidden");
        bulkInvoiceBtn.disabled = true;
      }

      const btnBlankInvoice = document.getElementById("btnBlankInvoice");
      if (btnBlankInvoice) {
        btnBlankInvoice.style.display = "none";
        btnBlankInvoice.classList.add("hidden");
      }

      const modalInvoiceBtn = document.getElementById("modalInvoiceBtn");
      if (modalInvoiceBtn) {
        modalInvoiceBtn.style.display = "none";
        modalInvoiceBtn.classList.add("hidden");
      }

      const modalHapusBtn = document.getElementById("modalHapusBtn");
      if (modalHapusBtn) {
        modalHapusBtn.style.display = "none";
        modalHapusBtn.classList.add("hidden");
      }

      const selectAllEl = document.getElementById("selectAll");
      if (selectAllEl) {
        selectAllEl.style.display = "none";
        const thSelect = selectAllEl.closest("th");
        if (thSelect) thSelect.style.display = "none";
      }

      const addProjectButtons = document.querySelectorAll('a[href*="tambah-proyek.html"], button[onclick*="tambah-proyek"]');
      addProjectButtons.forEach(btn => {
        btn.style.display = "none";
      });

      const excelGroup = document.getElementById("excelDropdownGroup");
      if (excelGroup) excelGroup.style.display = "none";

      const btnFilterBelumBayar = document.getElementById("btnFilterBelumBayar");
      if (btnFilterBelumBayar) btnFilterBelumBayar.style.display = "none";

      const statusFilterGrid = document.getElementById("statusFilterGrid");
      if (statusFilterGrid) {
        statusFilterGrid.classList.remove('lg:grid-cols-6');
        statusFilterGrid.classList.add('lg:grid-cols-5');
      }

      // Sembunyikan fitur Excel di halaman Tools untuk Desainer
      const shortcutExcelDropdownWrapper = document.getElementById("shortcutExcelDropdownWrapper");
      if (shortcutExcelDropdownWrapper) {
        shortcutExcelDropdownWrapper.style.display = "none";
        shortcutExcelDropdownWrapper.classList.add("hidden");
      }

      const toolExcelDropdownWrapper = document.getElementById("toolExcelDropdownWrapper");
      if (toolExcelDropdownWrapper) {
        toolExcelDropdownWrapper.style.display = "none";
        toolExcelDropdownWrapper.classList.add("hidden");
      }

      const btnToolsExcelHubMobile = document.getElementById("btnToolsExcelHubMobile");
      if (btnToolsExcelHubMobile) {
        btnToolsExcelHubMobile.style.display = "none";
        btnToolsExcelHubMobile.classList.add("hidden");
      }

      const toolsExcelHubModal = document.getElementById("toolsExcelHubModal");
      if (toolsExcelHubModal) {
        toolsExcelHubModal.style.display = "none";
        toolsExcelHubModal.classList.add("hidden");
        toolsExcelHubModal.classList.remove("flex");
      }
    }
  },

  applyRoleAccess: () => {
    Auth.applyMenuPermissions();
    Auth.applyButtonPermissions();
  },

  updateNotificationBadges: async () => {
    try {
      if (!Auth.isLoggedIn() || typeof API === 'undefined' || !API.getNotifikasi) return;
      const res = await API.getNotifikasi(false);
      const cu = (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function')
        ? API.getCurrentUser()
        : Auth.getUser();
      const userIdentifiers = [
        cu?.id,
        cu?.userId,
        cu?.id_user,
        cu?.username
      ].filter(Boolean).map(v => String(v).trim().toLowerCase());

      const unreadCount = res.data.filter(n => {
        const isUnread = n.status === false || n.status === 'FALSE' || n.status === 0 || n.status === '0';
        if (!isUnread) return false;
        const targetUser = String(n.id_user || n.userId || n.Id_user || n.user_id || '').trim().toLowerCase();
        return !targetUser || targetUser === 'all' || targetUser === 'semua' || userIdentifiers.includes(targetUser);
      }).length;

      document.querySelectorAll('.notif-topbar-badge').forEach(badge => {
        if (unreadCount > 0) {
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      });
      document.querySelectorAll('.notif-unread-badge').forEach(badge => {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      });
    } catch (e) {
      // silent
    }
  },

  logout: async () => {
    await SessionManager.triggerAutoLogout('manual_logout');
  }
};

window.Auth = Auth;

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (typeof Auth !== "undefined" && Auth.applyMenuPermissions) {
      Auth.applyMenuPermissions();
    }
  }, 150);
});

document.addEventListener("DOMContentLoaded", () => {
  const deniedMsg = sessionStorage.getItem("toast_denied");
  if (deniedMsg) {
    sessionStorage.removeItem("toast_denied");
    setTimeout(() => {
      if (typeof Toast !== 'undefined') {
        Toast.error('Akses Ditolak', deniedMsg);
      } else if (typeof showToast === 'function') {
        showToast({ title: 'Akses Ditolak', message: deniedMsg, type: 'error' });
      }
    }, 300);
  }

  Auth.checkLogin();
  Auth.initMobileBottomNavScrollToTop();

  // Initial and periodic notification badge sync
  if (Auth.isLoggedIn()) {
    setTimeout(() => {
      if (typeof Auth.updateNotificationBadges === 'function') {
        Auth.updateNotificationBadges();
      }
    }, 1200);

    setInterval(() => {
      if (typeof Auth.updateNotificationBadges === 'function') {
        Auth.updateNotificationBadges();
      }
    }, 60000);
  }
});
