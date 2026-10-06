const SessionManager = {
  DAILY_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // 1 Day (86,400,000 ms)
  SESSION_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,     // 7 Days (604,800,000 ms)

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

  // Lifecycle check: auto logout on 7 days, daily cleanup on 1 day
  checkLifecycle: () => {
    const token = Auth.getToken();
    if (!token) return { status: 'unauthenticated' };

    const now = Date.now();
    const loginTime = SessionManager.getLoginTime();

    // 1. Check 7-Day Auto-Logout
    if (loginTime && (now - loginTime >= SessionManager.SESSION_MAX_AGE_MS)) {
      console.warn('[SessionManager] Sesi login telah mencapai batas 7 hari. Melakukan auto-logout.');
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
      nextAutoLogoutInDays: loginTime ? Math.max(0, ((SessionManager.SESSION_MAX_AGE_MS - (now - loginTime)) / (24 * 60 * 60 * 1000))).toFixed(2) : 7
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
      console.log('[SessionManager] Pembersihan harian (1 hari) selesai. Status login tetap aktif.');
    } catch (e) {
      console.warn('[SessionManager] Peringatan pembersihan harian:', e);
    }
  },

  // Auto Logout after 7 days or manual logout
  triggerAutoLogout: async (reason = 'session_expired') => {
    try {
      if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
        const body = new URLSearchParams();
        body.append('action', 'logout');
        body.append('token', sessionStorage.getItem('token') || localStorage.getItem('token') || '');
        body.append('apiKey', CONFIG.API_KEY || '');
        await fetch(CONFIG.API_URL, { method: 'POST', body }).catch(() => {});
      }
    } catch (e) {}

    if (typeof APICache !== 'undefined' && APICache.clear) APICache.clear();
    if (typeof FPManagerDB !== 'undefined' && FPManagerDB.clearAllStores) {
      try { await FPManagerDB.clearAllStores(); } catch (e) {}
    }

    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_login_time');
    localStorage.removeItem('fpm_offline_queue');

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

    window.location.href = `login.html?reason=${reason}`;
  }
};

window.SessionManager = SessionManager;

const Auth = {
  login: async (username, password, rememberMe = false) => {
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
        }
        if (rememberMe) {
          localStorage.setItem("token", token);
          if (result.user) localStorage.setItem("user", JSON.stringify(result.user));
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
    return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
  },

  getRole: () => {
    const u = Auth.getUser();
    if (!u) return "service";
    const r = String(u.role || "").toLowerCase().trim();
    if (r === "super_admin" || r === "super admin" || r === "superadmin" || r.includes("admin") || u.username === "wansmin") return "super_admin";
    if (r === "desainer" || r === "designer") return "designer";
    return "service";
  },

  isSuperAdmin: () => {
    return Auth.getRole() === "super_admin";
  },

  isDesigner: () => {
    return Auth.getRole() === "designer";
  },

  isService: () => {
    return Auth.getRole() === "service";
  },

  hasPermission: (action) => {
    if (!action) return true;
    const role = Auth.getRole();

    // 1. Super Admin: full unrestricted access
    if (role === "super_admin") return true;

    const normAction = String(action).toLowerCase().trim().replace(/^projek:/i, "proyek:");

    // 2. Designer: View project + CRUD own & super admin tools + Settings + Profile
    if (role === "designer") {
      const allowedActions = [
        "home", "proyek:read", "proyek", "projek",
        "tools:read", "tools:create", "tools:update", "tools:delete", "tools:generate", "tools",
        "settings", "pengaturan", "profile", "profil"
      ];
      return allowedActions.includes(normAction) || normAction.startsWith("tools:");
    }

    // 3. Service: Full CRUD Project + Import/Export + Financials + Admin Tasks + Settings + Profile
    if (role === "service") {
      const forbiddenForService = [
        "tools:read", "tools:create", "tools:update", "tools:delete", "tools:generate", "tools",
        "users:read", "users:create", "users:update", "users:delete", "users:manage_role", "users", "user_management"
      ];
      if (forbiddenForService.includes(normAction) || normAction.startsWith("tools:") || normAction.startsWith("users:")) {
        return false;
      }
      return true;
    }

    return false;
  },

  formatAvatarUrl: (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

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
    return trimmed;
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

      if (typeof API !== 'undefined' && typeof API.getUsers === 'function') {
        if (Auth.isSuperAdmin()) {
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
      }
    } catch (e) {}
  },

  checkLogin: () => {
    const token = Auth.getToken();
    const isLoginPage = window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("login");
    
    if (!token && !isLoginPage) {
      window.location.href = "login.html";
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
    const user = Auth.getUser();
    if (!user) return;

    if (Auth.isSuperAdmin()) return;

    const path = window.location.pathname.toLowerCase();
    const role = Auth.getRole();

    let isDenied = false;

    if (role === "designer") {
      // Designer can ONLY access: index.html, proyek.html, tools.html, pengaturan.html, profil.html
      const forbiddenForDesigner = [
        "tambah-proyek.html", "keuangan.html", "history-invoice.html", "laporan.html",
        "admin-tasks.html", "user-management.html"
      ];
      isDenied = forbiddenForDesigner.some(p => path.includes(p));
    } else if (role === "service") {
      // Service can access: index.html, proyek.html, tambah-proyek.html, keuangan.html, history-invoice.html, laporan.html, admin-tasks.html, pengaturan.html, profil.html
      // Service CANNOT access: tools.html, user-management.html
      const forbiddenForService = ["tools.html", "user-management.html"];
      isDenied = forbiddenForService.some(p => path.includes(p));
    }

    if (isDenied) {
      sessionStorage.setItem("toast_denied", "Akses Ditolak: Role " + (role === "designer" ? "Designer" : "Service") + " tidak memiliki izin untuk halaman ini.");
      window.location.href = role === "designer" ? "proyek.html" : "index.html";
    }
  },

  renderMobileBottomNav: () => {
    const bottomNav = document.getElementById("mobileBottomNav");
    if (!bottomNav) return;

    const user = Auth.getUser();
    if (!user) return;

    const isDesigner = Auth.isDesigner();

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

    if (isDesigner) {
      // Role Designer: EXACTLY 4 Menus [ Home ] — [ Project ] — [ Tools ] — [ Profile ]
      bottomNav.innerHTML = `
        <!-- 1. Home -->
        <a href="index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-house text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Home</span>
        </a>

        <!-- 2. Project -->
        <a href="proyek.html" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-folder-open text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tools -->
        <a href="tools.html" class="${isTools ? activeClass : inactiveClass}">
          <i class="fa-solid fa-toolbox text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-tools">Tools</span>
        </a>

        <!-- 4. Profile -->
        <a href="profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;
    } else {
      // Role Service / Super Admin: 5 Menus [ Home | Project | + Tambah | Keuangan Group | Profile ]
      bottomNav.innerHTML = `
        <!-- 1. Home -->
        <a href="index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-chart-line text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Home</span>
        </a>

        <!-- 2. Project -->
        <a href="proyek.html" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-list-check text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tambah (Center Prominent Action) -->
        <a href="tambah-proyek.html"
          class="flex flex-col items-center justify-center -mt-5 flex-1 group focus:outline-none" title="Tambah Projek">
          <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-zinc-900 ${isTambah ? 'ring-2 ring-indigo-400' : ''} group-hover:scale-105 active:scale-95 transition-all">
            <i class="fa-solid fa-plus text-base"></i>
          </div>
          <span class="text-[10px] font-bold ${isTambah ? 'text-indigo-400' : 'text-zinc-200'} mt-0.5" data-i18n="nav-tambah">Tambah</span>
        </a>

        <!-- 4. Keuangan Group (Collapsible / Action Menu) -->
        <button type="button" id="btnMobileKeuanganNav" onclick="Auth.toggleMobileKeuanganMenu()"
          class="${isKeuanganGroup ? activeClass : inactiveClass} focus:outline-none cursor-pointer">
          <i class="fa-solid fa-wallet text-base"></i>
          <span class="text-[10px] mt-0.5 flex items-center gap-0.5" data-i18n="nav-keuangan-group">
            Keuangan <i class="fa-solid fa-chevron-up text-[8px] opacity-70"></i>
          </span>
        </button>

        <!-- 5. Profile -->
        <a href="profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;

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
            <a href="keuangan.html" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isKeuangan ? 'active-sub' : ''}">
              <i class="fa-solid fa-coins text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-keuangan">Keuangan</span>
            </a>
            <a href="history-invoice.html" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isHistory ? 'active-sub' : ''}">
              <i class="fa-solid fa-receipt text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-history-invoice">History Invoice</span>
            </a>
            <a href="laporan.html" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isLaporan ? 'active-sub' : ''}">
              <i class="fa-solid fa-file-invoice-dollar text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-laporan">Laporan</span>
            </a>
          </div>
        `;
      }
    }

    if (typeof i18n !== 'undefined' && i18n.translatePage) {
      i18n.translatePage();
    }
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

    const isSuperAdmin = Auth.isSuperAdmin();
    const isDesigner = Auth.isDesigner();
    const isService = Auth.isService();

    // 1. Render Mobile Bottom Navigation
    Auth.renderMobileBottomNav();

    // 2. Initialize desktop sidebar group
    Auth.initSidebarNavGroup();

    // 3. Filter sidebar navigation links inside navMenu
    const navLinks = document.querySelectorAll("#navMenu .sidebar-link");
    navLinks.forEach(el => {
      if (el.id === "pwaInstallBtn" || el.id === "btnNavKeuanganToggle") return;

      const href = (el.getAttribute("href") || "").toLowerCase();

      let isAllowed = true;
      if (isSuperAdmin) {
        isAllowed = true;
      } else if (isDesigner) {
        // Designer only has: Home, Project (view), Tools, Settings, Profile
        if (href.includes("tambah-proyek.html") ||
            href.includes("keuangan.html") ||
            href.includes("history-invoice.html") ||
            href.includes("laporan.html") ||
            href.includes("admin-tasks.html") ||
            href.includes("user-management.html")) {
          isAllowed = false;
        }
      } else if (isService) {
        // Service has: Home, Project, Tambah, Keuangan, History Invoice, Laporan, Admin Tasks, Settings, Profile
        // Service CANNOT access: Tools, User Management
        if (href.includes("tools.html") || href.includes("user-management.html")) {
          isAllowed = false;
        }
      }

      if (isAllowed) {
        el.classList.remove("hidden");
        el.style.display = "";
      } else {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    // 4. Handle Keuangan Group in Sidebar (Hidden for Designer, Shown for Service & Super Admin)
    const groupEl = document.getElementById("navKeuanganGroup");
    if (groupEl) {
      if (isDesigner) {
        groupEl.classList.add("hidden");
        groupEl.style.display = "none";
      } else {
        groupEl.classList.remove("hidden");
        groupEl.style.display = "";
      }
    }

    // 5. Filter profile dropdown links
    const dropdownLinks = document.querySelectorAll("#profileDropdown a");
    dropdownLinks.forEach(el => {
      const href = (el.getAttribute("href") || "").toLowerCase();
      let isAllowed = true;
      if (isSuperAdmin) {
        isAllowed = true;
      } else if (isDesigner) {
        if (href.includes("tambah-proyek.html") ||
            href.includes("keuangan.html") ||
            href.includes("history-invoice.html") ||
            href.includes("laporan.html") ||
            href.includes("admin-tasks.html") ||
            href.includes("user-management.html")) {
          isAllowed = false;
        }
      } else if (isService) {
        if (href.includes("tools.html") || href.includes("user-management.html")) {
          isAllowed = false;
        }
      }

      if (isAllowed) {
        el.classList.remove("hidden");
        el.style.display = "";
      } else {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    // Close mobile Keuangan popover when clicking anywhere outside
    document.addEventListener("click", (e) => {
      const popover = document.getElementById("mobileKeuanganPopover");
      const btn = document.getElementById("btnMobileKeuanganNav");
      if (popover && popover.classList.contains("active")) {
        if (!popover.contains(e.target) && (!btn || !btn.contains(e.target))) {
          Auth.toggleMobileKeuanganMenu(false);
        }
      }
    });

    // Update Profile Name / Badge / Avatar in Top Navbar
    const profileBtn = document.getElementById("profileDropdownBtn");
    if (profileBtn) {
      const rawAvatar = user.avatar || user.url_profile || user.urlprofile || user.foto || user.photo || user.avatar_url || user.avatarUrl || user.urlProfile || user.Url_profile || '';
      const avatarUrl = Auth.formatAvatarUrl(rawAvatar);
      const initial = (user.name || user.username || "A").charAt(0).toUpperCase();
      const displayName = user.name || user.username || "User";
      const displayRole = isSuperAdmin ? "Super Admin" : (isDesigner ? "Designer" : "Service");

      const userAvatarText = profileBtn.querySelector("#userAvatarText") || document.getElementById("userAvatarText");
      const userNameText = profileBtn.querySelector("#userNameText") || document.getElementById("userNameText");

      if (userAvatarText) {
        userAvatarText.classList.add("overflow-hidden");
        if (avatarUrl) {
          userAvatarText.innerHTML = `<img src="${avatarUrl}" alt="${initial}" class="h-full w-full object-cover rounded-xl" onerror="this.outerHTML='${initial}'">`;
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
          profileBtn.innerHTML = `<img src="${avatarUrl}" alt="${initial}" class="h-full w-full object-cover rounded-full block" onerror="this.outerHTML='<span class=\\'font-bold text-sm text-zinc-600 dark:text-zinc-200\\'>${initial}</span>'">`;
        } else {
          profileBtn.innerHTML = `<span class="font-bold text-sm text-zinc-600 dark:text-zinc-200">${initial}</span>`;
        }
      }

      profileBtn.title = `${displayName} (${displayRole})`;
    }

    const userRoleBadge = document.getElementById("headerUserRoleBadge");
    if (userRoleBadge) {
      const displayRole = isSuperAdmin ? "SUPER ADMIN" : (isDesigner ? "DESIGNER" : "SERVICE");
      userRoleBadge.innerText = displayRole;
      userRoleBadge.classList.remove("hidden");
    }
  },

  applyButtonPermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    const isSuperAdmin = Auth.isSuperAdmin();
    const isDesigner = Auth.isDesigner();
    const isService = Auth.isService();

    // If Designer on Proyek page, hide CUD buttons, bulk actions, import/export
    if (isDesigner) {
      const elementsToHide = document.querySelectorAll(`
        #btnTambahProyek,
        #btnTambahProyekMobile,
        #btnBulkDelete,
        #btnBulkCreateInvoice,
        #excelDropdownGroup,
        #btnImportExcel,
        #btnExportExcel,
        .btn-action-edit,
        .btn-action-delete,
        .btn-action-invoice,
        .table-action-edit,
        .table-action-delete,
        [data-permission-allow="proyek:create"],
        [data-permission-allow="proyek:update"],
        [data-permission-allow="proyek:delete"],
        [data-permission-allow="proyek:import"],
        [data-permission-allow="proyek:export"],
        [data-permission-allow="invoice:create"]
      `);
      elementsToHide.forEach(el => {
        el.classList.add("hidden");
        el.style.display = "none";
      });
    }

    // Generic button permission tag handling
    const permButtons = document.querySelectorAll("[data-permission-allow]");
    permButtons.forEach(btn => {
      if (btn.closest("#navMenu") || btn.closest("#profileDropdown") || btn.id === "btnBulkDelete" || btn.id === "btnBulkDeleteKeuangan" || btn.classList.contains("btn-bulk-action")) return;
      const permNeeded = btn.getAttribute("data-permission-allow");
      const isAllowed = isSuperAdmin || Auth.hasPermission(permNeeded);
      if (isAllowed) {
        btn.classList.remove("hidden");
        btn.style.display = "";
      } else {
        btn.classList.add("hidden");
        btn.style.display = "none";
      }
    });
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
});
