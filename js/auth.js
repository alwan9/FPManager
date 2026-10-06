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
    return u ? (u.role || "service") : "service";
  },

  ROLE_DEFAULTS: {
    service: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:delete", "proyek:import", "proyek:export",
      "invoice:read", "invoice:create", "invoice:update", "invoice:download", "invoice:print",
      "history_invoice:read",
      "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:export",
      "laporan:read", "laporan:export", "laporan:print",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update"
    ],
    desainer: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:export",
      "invoice:read", "invoice:download", "invoice:print",
      "tools:read", "tools:create", "tools:update", "tools:delete", "tools:generate",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update"
    ],
    super_admin: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:delete", "proyek:import", "proyek:export",
      "invoice:read", "invoice:create", "invoice:update", "invoice:download", "invoice:print",
      "history_invoice:read", "history_invoice:delete",
      "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete", "keuangan:export",
      "laporan:read", "laporan:export", "laporan:print",
      "tools:read", "tools:create", "tools:update", "tools:delete", "tools:generate",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update", "admin_tasks:delete", "admin_tasks:settings",
      "users:read", "users:create", "users:update", "users:delete", "users:manage_role"
    ]
  },

  hasPermission: (action) => {
    if (!action) return true;
    const user = Auth.getUser();
    if (!user) return false;

    const role = (user.role || "").toLowerCase().trim();
    const isSuperAdmin = (
      user.username === "wansmin" ||
      role === "super_admin" ||
      role === "super admin" ||
      role === "superadmin" ||
      role.includes("super_admin") ||
      role.includes("superadmin") ||
      role.includes("admin")
    );
    if (isSuperAdmin) return true;

    // Normalize action (support both 'projek' and 'proyek')
    const normalizedAction = String(action).toLowerCase().trim().replace(/^projek:/i, "proyek:");
    const altAction = normalizedAction.replace(/^proyek:/i, "projek:");
    const [mod, act] = normalizedAction.split(":");

    // 1. Handle Object/Map format: { "proyek:read": true, "proyek:delete": false }
    const permissions = user.permissions;
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      if (permissions[normalizedAction] !== undefined) return permissions[normalizedAction] === true;
      if (permissions[altAction] !== undefined) return permissions[altAction] === true;
      if (permissions[action] !== undefined) return permissions[action] === true;
      if (mod && permissions[mod + ":*"] !== undefined) return permissions[mod + ":*"] === true;
      if (mod && permissions[mod] !== undefined) return permissions[mod] === true;
      if (!act || act === 'read') {
        if (permissions[mod + ":read"] !== undefined) return permissions[mod + ":read"] === true;
      }
    }

    // 2. Determine Effective Permissions (Base Role Defaults + Direct Permissions Array)
    const baseRolePerms = (role && role !== "custom" && Auth.ROLE_DEFAULTS[role]) ? Auth.ROLE_DEFAULTS[role] : [];
    let directPerms = [];
    if (Array.isArray(permissions)) {
      directPerms = permissions.map(p => String(p).toLowerCase().trim().replace(/^projek:/i, "proyek:"));
    }

    // Union of base role permissions and direct permissions
    const effectiveSet = new Set([...baseRolePerms, ...directPerms]);

    // Exact match
    if (effectiveSet.has(normalizedAction) || effectiveSet.has(altAction) || effectiveSet.has(action.toLowerCase())) {
      return true;
    }

    // Full module wildcard (e.g. 'proyek:*' or 'proyek')
    if (effectiveSet.has(mod + ":*") || effectiveSet.has(mod) || (mod === "proyek" && (effectiveSet.has("projek:*") || effectiveSet.has("projek")))) {
      return true;
    }

    // Module read check (when checking module access, e.g. action='proyek:read' or 'proyek')
    if (!act || act === 'read') {
      if (effectiveSet.has(mod) || (mod === "proyek" && effectiveSet.has("projek"))) return true;
      for (const p of effectiveSet) {
        if (p.startsWith(mod + ":") || p === mod || (mod === "proyek" && (p.startsWith("projek:") || p === "projek"))) {
          return true;
        }
      }
    }

    return false;
  },

  formatAvatarUrl: (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

    // Convert Google Drive view/open links to direct embeddable links
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
        const role = (currentUser.role || '').toLowerCase();
        const isSuper = (currentUser.username === 'wansmin' || role.includes('admin') || role === 'super_admin');
        if (isSuper || Auth.hasPermission('users:read')) {
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
    } catch (e) {
      // Background sync is non-blocking
    }
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

      // Non-blocking background sync for fresh profile/avatar
      Auth.refreshCurrentUserProfile();
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
    if (/(^|\/)tambah-proyek(\.html)?$/i.test(path) && !Auth.hasPermission("proyek:create")) isDenied = true;
    if (/(^|\/)invoice(\.html)?$/i.test(path) && !Auth.hasPermission("invoice:read") && !Auth.hasPermission("proyek:read")) isDenied = true;
    if (/(^|\/)history-invoice(\.html)?$/i.test(path) && !Auth.hasPermission("history_invoice:read") && !Auth.hasPermission("proyek:read")) isDenied = true;
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
    const isHistory = filename === "history-invoice.html" || filename === "history-invoice";
    const isLaporan = filename === "laporan.html" || filename === "laporan";
    const isKeuanganGroup = isKeuangan || isHistory || isLaporan;
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
      // Role Service / Super Admin / Default: 5 Menus [ Home | Project | + Tambah Project | Keuangan Group | Profile ]
      const canKeuangan = isSuperAdmin || Auth.hasPermission("keuangan:read");
      const canHistory = isSuperAdmin || Auth.hasPermission("history_invoice:read") || Auth.hasPermission("proyek:read");
      const canLaporan = isSuperAdmin || Auth.hasPermission("laporan:read");
      const hasAnyKeuangan = canKeuangan || canHistory || canLaporan;

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

        <!-- 4. Keuangan Group (Collapsible / Action Menu) -->
        ${hasAnyKeuangan ? `
        <button type="button" id="btnMobileKeuanganNav" onclick="Auth.toggleMobileKeuanganMenu()"
          class="${isKeuanganGroup ? activeClass : inactiveClass} focus:outline-none cursor-pointer">
          <i class="fa-solid fa-wallet text-base"></i>
          <span class="text-[10px] mt-0.5 flex items-center gap-0.5" data-i18n="nav-keuangan-group">
            Keuangan <i class="fa-solid fa-chevron-up text-[8px] opacity-70"></i>
          </span>
        </button>
        ` : ''}

        <!-- 5. Profile -->
        <a href="profil.html" class="${isProfil ? activeClass : inactiveClass}">
          <i class="fa-solid fa-user text-base"></i>
          <span class="text-[10px] mt-0.5" data-i18n="nav-profile">Profile</span>
        </a>
      `;

      // Render Mobile Keuangan Backdrop Overlay Container if not exists
      let backdrop = document.getElementById("mobileKeuanganBackdrop");
      if (!backdrop && hasAnyKeuangan) {
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

      // Render Mobile Keuangan Popover Container if not exists
      let popover = document.getElementById("mobileKeuanganPopover");
      if (!popover && hasAnyKeuangan) {
        popover = document.createElement("div");
        popover.id = "mobileKeuanganPopover";
        popover.className = "md:hidden fixed";
        document.body.appendChild(popover);
      }

      if (popover && hasAnyKeuangan) {
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
            ${canKeuangan ? `
            <a href="keuangan.html" data-permission-allow="keuangan:read" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isKeuangan ? 'active-sub' : ''}">
              <i class="fa-solid fa-coins text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-keuangan">Keuangan</span>
            </a>` : ''}
            ${canHistory ? `
            <a href="history-invoice.html" data-permission-allow="history_invoice:read" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isHistory ? 'active-sub' : ''}">
              <i class="fa-solid fa-receipt text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-history-invoice">History Invoice</span>
            </a>` : ''}
            ${canLaporan ? `
            <a href="laporan.html" data-permission-allow="laporan:read" onclick="Auth.toggleMobileKeuanganMenu(false)" class="popover-link ${isLaporan ? 'active-sub' : ''}">
              <i class="fa-solid fa-file-invoice-dollar text-sm text-indigo-400 w-5"></i>
              <span data-i18n="nav-laporan">Laporan</span>
            </a>` : ''}
          </div>
        `;
      }
    }

    // Apply translations if i18n is available
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
      shouldOpen = !!forceState;
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

    // Highlight parent and open submenu if on one of the group pages
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

    // Mark active submenu item
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

    // Attach click toggle handler safely
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

    const role = (user.role || "service").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));

    // 1. Render Mobile Bottom Navigation according to role
    Auth.renderMobileBottomNav();

    // 2. Initialize desktop sidebar group accordion & active state
    Auth.initSidebarNavGroup();

    // 3. Check sidebar navigation links inside navMenu
    const navLinks = document.querySelectorAll("#navMenu .sidebar-link");
    navLinks.forEach(el => {
      if (el.id === "pwaInstallBtn" || el.id === "btnNavKeuanganToggle") return; // Let dedicated logic control install & group button

      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html") || href.includes("invoice.html")) permNeeded = "proyek:read";
        else if (href.includes("history-invoice.html")) permNeeded = "history_invoice:read";
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

    // 4. Check if any sublink is visible inside Keuangan Group; if none, hide the whole group
    const groupEl = document.getElementById("navKeuanganGroup");
    const submenuEl = document.getElementById("submenuKeuangan");
    if (groupEl && submenuEl) {
      const sublinks = submenuEl.querySelectorAll(".sidebar-sublink");
      let visibleCount = 0;
      sublinks.forEach(sub => {
        if (!sub.classList.contains("hidden") && sub.style.display !== "none") {
          visibleCount++;
        }
      });
      if (visibleCount > 0) {
        groupEl.classList.remove("hidden");
        groupEl.style.display = "";
      } else {
        groupEl.classList.add("hidden");
        groupEl.style.display = "none";
      }
    }

    // 5. Check profile dropdown links for permissions
    const dropdownLinks = document.querySelectorAll("#profileDropdown a");
    dropdownLinks.forEach(el => {
      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html") || href.includes("invoice.html")) permNeeded = "proyek:read";
        else if (href.includes("history-invoice.html")) permNeeded = "history_invoice:read";
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

      // Case 1: Header button with custom child layout (e.g., history-invoice.html)
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

      // Case 2: Standard round button (index.html, proyek.html, profil.html, etc.)
      if (!userAvatarText) {
        profileBtn.classList.add("overflow-hidden", "flex", "items-center", "justify-center", "p-0");
        if (avatarUrl) {
          profileBtn.innerHTML = `<img src="${avatarUrl}" alt="${initial}" class="h-full w-full object-cover rounded-full block" onerror="this.outerHTML='<span class=\\'font-bold text-sm text-zinc-600 dark:text-zinc-200\\'>${initial}</span>'">`;
        } else {
          profileBtn.innerHTML = `<span class="font-bold text-sm text-zinc-600 dark:text-zinc-200">${initial}</span>`;
        }
      }

      profileBtn.title = `${displayName} (${role})`;
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
