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

  // Get effective login timestamp (fallback to current time if missing for active session)
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
      // Clean non-auth cookies
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

      // Clean temporary sessionStorage keys (preserving auth & essential keys)
      const tempSessionKeys = [
        'toast_denied', 'cached_edit_proyek',
        'pwa_notif_prompt_dismissed', 'pwa_ios_prompt_dismissed', 'pwa_install_prompt_dismissed',
        'just_logged_in'
      ];
      tempSessionKeys.forEach(k => sessionStorage.removeItem(k));

      // Clean API cache if available
      if (typeof APICache !== 'undefined' && typeof APICache.clear === 'function') {
        APICache.clear();
      }

      // Record cleanup timestamp
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

    // Invalidate local caches
    if (typeof APICache !== 'undefined' && APICache.clear) APICache.clear();
    if (typeof FPManagerDB !== 'undefined' && FPManagerDB.clearAllStores) {
      try { await FPManagerDB.clearAllStores(); } catch (e) {}
    }

    // Clear session storage & auth local storage
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_login_time');
    localStorage.removeItem('fpm_offline_queue');

    // Remove all cookies
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
  },

  // Simulation & Testing Toolkit
  test: {
    simulateDailyCleanup: () => {
      console.log('[SessionManager:Test] Menjalankan simulasi pembersihan 1 hari...');
      SessionManager.performDailyCleanup();
      return {
        success: true,
        isLoggedIn: Boolean(Auth.getToken()),
        token: Auth.getToken(),
        user: Auth.getUser()
      };
    },

    simulateTimeElapsed: (days) => {
      const ms = days * 24 * 60 * 60 * 1000;
      const currentLogin = SessionManager.getLoginTime() || Date.now();
      const newLoginTime = currentLogin - ms;
      sessionStorage.setItem('auth_login_time', newLoginTime.toString());
      localStorage.setItem('auth_login_time', newLoginTime.toString());
      console.log(`[SessionManager:Test] Simulasi waktu berjalan ${days} hari. Timestamp login baru: ${new Date(newLoginTime).toLocaleString()}`);
      return SessionManager.checkLifecycle();
    },

    getDiagnostics: () => {
      const now = Date.now();
      const loginTime = SessionManager.getLoginTime();
      const lastCleanup = Number(localStorage.getItem('last_daily_cleanup') || 0);
      return {
        isLoggedIn: Boolean(Auth.getToken()),
        currentUser: Auth.getUser(),
        loginTimestamp: loginTime ? new Date(loginTime).toLocaleString() : 'Belum tercatat',
        sessionAgeDays: loginTime ? ((now - loginTime) / (24 * 60 * 60 * 1000)).toFixed(2) : 0,
        lastDailyCleanup: lastCleanup ? new Date(lastCleanup).toLocaleString() : 'Belum pernah',
        nextAutoLogoutDays: loginTime ? Math.max(0, ((SessionManager.SESSION_MAX_AGE_MS - (now - loginTime)) / (24 * 60 * 60 * 1000))).toFixed(2) : 7,
        activeCookies: document.cookie || '(Tidak ada cookie aktif)'
      };
    }
  }
};

window.SessionManager = SessionManager;

const Auth = {
  login: async (username, password, rememberMe = false) => {
    try {
      // Live Login via Apps Script API
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
        if (!u.role) u.role = "super_admin";
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
    return u ? (u.role || "service") : "service";
  },

  hasPermission: (action) => {
    const user = Auth.getUser();
    if (!user) return false;
    const role = (user.role || "").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));
    if (isSuperAdmin) return true;

    // Handle Object/Map format: { "proyek:read": true, "proyek:delete": false }
    const permissions = user.permissions;
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      if (permissions[action] !== undefined) return permissions[action] === true;
      const mod = action.split(":")[0];
      if (!action.split(":")[1] && permissions[mod + ":read"] !== undefined) {
        return permissions[mod + ":read"] === true;
      }
      if (permissions[mod] !== undefined) return permissions[mod] === true;
    }

    // Handle Array format: ["proyek:read", "proyek:create"]
    const userPerms = Array.isArray(permissions) ? permissions : [];

    // 1. Exact match (e.g. 'proyek:read', 'proyek:delete')
    if (userPerms.includes(action)) return true;

    const [mod, act] = action.split(":");

    // 2. Full module wildcard (e.g. 'proyek:*' or 'proyek')
    if (userPerms.includes(mod + ":*") || userPerms.includes(mod)) return true;

    // 3. Module read check (when checking module access, e.g. action='proyek:read' or 'proyek')
    if (!act || act === 'read') {
      if (userPerms.includes(mod)) return true;
      return userPerms.some(p => p.startsWith(mod + ":") || p === mod);
    }

    // 4. Fallback to default role matrix if permissions array is empty
    if ((!userPerms || userPerms.length === 0) && user.role) {
      const roleDefaults = {
        service: [
          "proyek:read", "proyek:create", "proyek:update", "proyek:delete"
        ],
        desainer: [
          "proyek:read", "proyek:create", "proyek:update",
          "tools:read", "tools:create", "tools:update", "tools:delete",
          "admin_tasks:read", "admin_tasks:create", "admin_tasks:update"
        ],
        super_admin: [
          "proyek:read", "proyek:create", "proyek:update", "proyek:delete",
          "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete",
          "laporan:read", "laporan:export", "laporan:create", "laporan:update", "laporan:delete",
          "tools:read", "tools:create", "tools:update", "tools:delete",
          "admin_tasks:read", "admin_tasks:create", "admin_tasks:update", "admin_tasks:delete",
          "users:read", "users:create", "users:update", "users:delete"
        ]
      };
      const defs = roleDefaults[user.role] || [];
      if (defs.includes(action)) return true;
      if (defs.includes(mod) || defs.includes(mod + ":*")) return true;
      if (!act || act === 'read') return defs.some(p => p.startsWith(mod + ":") || p === mod);
    }

    return false;
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
      // Check 7-Day Expiration & 1-Day Daily Cleanup Lifecycle
      const lifecycle = SessionManager.checkLifecycle();
      if (lifecycle && lifecycle.status === 'expired') {
        return;
      }

      Auth.guardCurrentPage();
      Auth.applyMenuPermissions();
      Auth.applyButtonPermissions();
    }
  },

  guardCurrentPage: () => {
    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));
    if (isSuperAdmin) return;

    const path = window.location.pathname.toLowerCase();

    let isDenied = false;
    if (/(^|\/)proyek(\.html)?$/i.test(path) && !Auth.hasPermission("proyek:read")) isDenied = true;
    if (/(^|\/)invoice(\.html)?$/i.test(path) && !Auth.hasPermission("proyek:read")) isDenied = true;
    if (/(^|\/)tambah-proyek(\.html)?$/i.test(path) && !Auth.hasPermission("proyek:create")) isDenied = true;
    if (/(^|\/)keuangan(\.html)?$/i.test(path) && !Auth.hasPermission("keuangan:read")) isDenied = true;
    if (/(^|\/)laporan(\.html)?$/i.test(path) && !Auth.hasPermission("laporan:read")) isDenied = true;
    if (/(^|\/)tools(\.html)?$/i.test(path) && !Auth.hasPermission("tools:read")) isDenied = true;
    if (/(^|\/)admin-tasks(\.html)?$/i.test(path) && !Auth.hasPermission("admin_tasks:read")) isDenied = true;
    if (/(^|\/)user-management(\.html)?$/i.test(path) && !Auth.hasPermission("users:read")) isDenied = true;

    if (isDenied) {
      sessionStorage.setItem("toast_denied", "Akses Ditolak: Anda tidak memiliki izin untuk mengakses halaman tersebut.");
      if (Auth.hasPermission("proyek:read")) {
        window.location.href = "proyek.html";
      } else {
        window.location.href = "index.html";
      }
    }
  },

  renderMobileBottomNav: () => {
    const bottomNav = document.getElementById("mobileBottomNav");
    if (!bottomNav) return;

    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "service").toLowerCase().trim();
    const isDesainer = (role === "desainer" || role === "designer");
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));

    // Determine current active page
    const currentPath = (window.location.pathname || "").toLowerCase();
    const filename = currentPath.split("/").pop() || "index.html";

    const isHome = filename === "index.html" || filename === "" || filename === "index";
    const isProyek = filename === "proyek.html" || filename === "proyek" || filename === "invoice.html" || filename === "invoice";
    const isTambah = filename === "tambah-proyek.html" || filename === "tambah-proyek";
    const isKeuangan = filename === "keuangan.html" || filename === "keuangan";
    const isLaporan = filename === "laporan.html" || filename === "laporan";
    const isTools = filename === "tools.html" || filename === "tools";
    const isProfil = filename === "profil.html" || filename === "profil";

    const activeClass = "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors flex-1 text-indigo-400 font-bold";
    const inactiveClass = "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors flex-1 text-zinc-400 hover:text-zinc-100 font-medium";

    if (isDesainer) {
      // Role Desainer: EXACTLY 4 Menus [ Home ] — [ Project ] — [ Tools ] — [ Profile ]
      bottomNav.innerHTML = `
        <!-- 1. Home -->
        <a href="index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-house text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Home</span>
        </a>

        <!-- 2. Project -->
        <a href="proyek.html" data-permission-allow="proyek:read" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-folder-open text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tools -->
        <a href="tools.html" data-permission-allow="tools:read" class="${isTools ? activeClass : inactiveClass}">
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
      // Role Service / Super Admin / Default: 5 Menus [ Home | Project | + Tambah Project | Keuangan | Profile ]
      const canKeuangan = isSuperAdmin || Auth.hasPermission("keuangan:read");
      const canLaporan = isSuperAdmin || Auth.hasPermission("laporan:read");
      const fourthHref = (canKeuangan || !canLaporan) ? "keuangan.html" : "laporan.html";
      const fourthLabel = (canKeuangan || !canLaporan) ? "Keuangan" : "Laporan";
      const fourthI18n = (canKeuangan || !canLaporan) ? "nav-keuangan" : "nav-laporan";
      const fourthIcon = (canKeuangan || !canLaporan) ? "fa-wallet" : "fa-file-invoice-dollar";
      const fourthPerm = (canKeuangan || !canLaporan) ? "keuangan:read" : "laporan:read";
      const isFourthActive = isKeuangan || (fourthHref === "laporan.html" && isLaporan);

      bottomNav.innerHTML = `
        <!-- 1. Home -->
        <a href="index.html" class="${isHome ? activeClass : inactiveClass}">
          <i class="fa-solid fa-chart-line text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-home">Home</span>
        </a>

        <!-- 2. Project -->
        <a href="proyek.html" data-permission-allow="proyek:read" class="${isProyek ? activeClass : inactiveClass}">
          <i class="fa-solid fa-list-check text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-proyek">Project</span>
        </a>

        <!-- 3. Tambah (Center Prominent Action) -->
        <a href="tambah-proyek.html" data-permission-allow="proyek:create"
          class="flex flex-col items-center justify-center -mt-5 flex-1 group focus:outline-none" title="Tambah Projek">
          <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-zinc-900 ${isTambah ? 'ring-2 ring-indigo-400' : ''} group-hover:scale-105 active:scale-95 transition-all">
            <i class="fa-solid fa-plus text-base"></i>
          </div>
          <span class="text-[10px] font-bold ${isTambah ? 'text-indigo-400' : 'text-zinc-200'} mt-0.5" data-i18n="nav-tambah">Tambah</span>
        </a>

        <!-- 4. Keuangan / Laporan -->
        <a href="${fourthHref}" data-permission-allow="${fourthPerm}" class="${isFourthActive ? activeClass : inactiveClass}">
          <i class="fa-solid ${fourthIcon} text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="${fourthI18n}">${fourthLabel}</span>
        </a>

        <!-- 5. Profile -->
        <a href="profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;
    }

    // Apply translations if i18n is available
    if (typeof i18n !== 'undefined' && i18n.translatePage) {
      i18n.translatePage();
    }
  },

  applyMenuPermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "service").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));

    // 1. Render Mobile Bottom Navigation according to role
    Auth.renderMobileBottomNav();

    // 2. Check sidebar navigation links inside navMenu
    const navLinks = document.querySelectorAll("#navMenu .sidebar-link");
    navLinks.forEach(el => {
      if (el.id === "pwaInstallBtn") return; // Let PWA manager control install button visibility

      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html") || href.includes("invoice.html")) permNeeded = "proyek:read";
        else if (href.endsWith("tambah-proyek.html")) permNeeded = "proyek:create";
        else if (href.endsWith("keuangan.html")) permNeeded = "keuangan:read";
        else if (href.endsWith("laporan.html")) permNeeded = "laporan:read";
        else if (href.endsWith("tools.html")) permNeeded = "tools:read";
        else if (href.endsWith("admin-tasks.html")) permNeeded = "admin_tasks:read";
        else if (href.endsWith("user-management.html")) permNeeded = "users:read";
      }

      const isAllowed = isSuperAdmin || !permNeeded || Auth.hasPermission(permNeeded);

      if (isAllowed) {
        el.classList.remove("hidden");
        el.style.display = "";
      } else {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    // 3. Check profile dropdown links for permissions
    const dropdownLinks = document.querySelectorAll("#profileDropdown a");
    dropdownLinks.forEach(el => {
      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html") || href.includes("invoice.html")) permNeeded = "proyek:read";
        else if (href.endsWith("tambah-proyek.html")) permNeeded = "proyek:create";
        else if (href.endsWith("keuangan.html")) permNeeded = "keuangan:read";
        else if (href.endsWith("laporan.html")) permNeeded = "laporan:read";
        else if (href.endsWith("tools.html")) permNeeded = "tools:read";
        else if (href.endsWith("admin-tasks.html")) permNeeded = "admin_tasks:read";
        else if (href.endsWith("user-management.html")) permNeeded = "users:read";
      }

      const isAllowed = isSuperAdmin || !permNeeded || Auth.hasPermission(permNeeded);
      if (isAllowed) {
        el.classList.remove("hidden");
        el.style.display = "";
      } else {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    // Update Profile Name / Badge display if elements exist
    const profileBtn = document.getElementById("profileDropdownBtn");
    if (profileBtn) {
      if (user.avatar) {
        profileBtn.innerHTML = `<img src="${user.avatar}" class="h-full w-full rounded-full object-cover">`;
      } else {
        profileBtn.innerText = (user.name || user.username || "A").charAt(0).toUpperCase();
      }
      profileBtn.title = `${user.name || user.username} (${role})`;
    }

    const userRoleBadge = document.getElementById("headerUserRoleBadge");
    if (userRoleBadge) {
      userRoleBadge.innerText = role.replace("_", " ").toUpperCase();
      userRoleBadge.classList.remove("hidden");
    }
  },

  applyButtonPermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "service").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));

    const permButtons = document.querySelectorAll("[data-permission-allow]");
    permButtons.forEach(btn => {
      if (btn.closest("#navMenu") || btn.closest("#profileDropdown") || btn.id === "btnBulkDelete" || btn.id === "btnBulkDeleteKeuangan" || btn.classList.contains("btn-bulk-action")) return; // Skip menu & bulk action items
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
  // Check for Access Denied notification
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
