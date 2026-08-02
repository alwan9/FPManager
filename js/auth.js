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

    // User Biasa/Biasa Tidak Bisa Akses User Manager
    if (action.startsWith("users") || action.includes(":users") || action === "users") {
      return false;
    }

    const permissions = user.permissions;

    // Handle Object/Map format: { "proyek:read": true, "proyek:delete": false }
    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      if (permissions[action] !== undefined) return permissions[action] === true;
      const mod = action.split(":")[0];
      if (!action.split(":")[1] && permissions[mod + ":read"] !== undefined) {
        return permissions[mod + ":read"] === true;
      }
    }

    // Handle Array format: ["proyek:read", "proyek:create"]
    const userPerms = Array.isArray(permissions) ? permissions : [];

    // 1. Exact match (e.g. 'proyek:read', 'proyek:delete')
    if (userPerms.includes(action)) return true;

    const [mod, act] = action.split(":");

    // 2. Full module wildcard
    if (userPerms.includes(mod + ":*")) return true;

    // 3. Module read check (when checking module access, e.g. action='proyek:read' or 'proyek')
    if (!act || act === 'read') {
      if (userPerms.includes(mod)) return true;
      return userPerms.some(p => p.startsWith(mod + ":") || p === mod);
    }

    // 5. Fallback to default role matrix if permissions array is empty
    if ((!userPerms || userPerms.length === 0) && user.role) {
      const roleDefaults = {
        service: [
          "proyek:read", "proyek:create", "proyek:update", "proyek:delete",
          "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete",
          "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
          "laporan:read", "laporan:export"
        ],
        desainer: [
          "proyek:read", "proyek:create", "proyek:update",
          "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
          "tools:read", "tools:create", "tools:update", "tools:delete"
        ]
      };
      const defs = roleDefaults[user.role] || [];
      if (defs.includes(action)) return true;
      if (!act || act === 'read') return defs.some(p => p.startsWith(mod + ":") || p === mod);
    }

    return false;
  },

  checkLogin: () => {
    const token = Auth.getToken();
    const isLoginPage = window.location.pathname.endsWith("login.html");
    
    if (!token && !isLoginPage) {
      window.location.href = "login.html";
      return;
    }
    if (token && isLoginPage) {
      window.location.href = "index.html";
      return;
    }

    if (token && !isLoginPage) {
      Auth.checkPagePermissions();
      Auth.applyMenuPermissions();
      Auth.applyButtonPermissions();
    }
  },

  checkPagePermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));
    if (isSuperAdmin) return;

    const path = window.location.pathname.toLowerCase();

    let isDenied = false;
    if (path.endsWith("proyek.html") && !Auth.hasPermission("proyek:read")) isDenied = true;
    if (path.endsWith("tambah-proyek.html") && !Auth.hasPermission("proyek:create")) isDenied = true;
    if (path.endsWith("keuangan.html") && !Auth.hasPermission("keuangan:read")) isDenied = true;
    if (path.endsWith("laporan.html") && !Auth.hasPermission("laporan:read")) isDenied = true;
    if (path.endsWith("layanan.html") && !Auth.hasPermission("layanan:read")) isDenied = true;
    if (path.endsWith("tools.html") && !Auth.hasPermission("tools:read")) isDenied = true;
    if (path.endsWith("user-management.html")) isDenied = true; // User Biasa Tidak Boleh Akses Halaman User Manager

    if (isDenied) {
      sessionStorage.setItem("toast_denied", "Akses Ditolak: Anda tidak memiliki izin untuk mengakses halaman tersebut.");
      if (Auth.hasPermission("proyek:read")) {
        window.location.href = "proyek.html";
      } else {
        window.location.href = "index.html";
      }
    }
  },

  applyMenuPermissions: () => {
    const user = Auth.getUser();
    if (!user) return;

    const role = (user.role || "service").toLowerCase().trim();
    const isSuperAdmin = (user.username === "wansmin" || role === "super_admin" || role === "super admin" || role === "superadmin" || role.includes("super_admin") || role.includes("superadmin") || role.includes("admin"));
    const isDesainer = role.includes("desainer") || role.includes("designer");
    const isMobile = window.innerWidth < 768;

    // 1. Check sidebar navigation links inside navMenu
    const navLinks = document.querySelectorAll("#navMenu .sidebar-link");
    navLinks.forEach(el => {
      if (el.id === "pwaInstallBtn") return; // Let PWA manager control install button visibility

      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html")) permNeeded = "proyek:read";
        else if (href.endsWith("tambah-proyek.html")) permNeeded = "proyek:create";
        else if (href.endsWith("keuangan.html")) permNeeded = "keuangan:read";
        else if (href.endsWith("laporan.html")) permNeeded = "laporan:read";
        else if (href.endsWith("layanan.html")) permNeeded = "layanan:read";
        else if (href.endsWith("tools.html")) permNeeded = "tools:read";
        else if (href.endsWith("user-management.html")) permNeeded = "users:read";
      }

      const isAllowed = isSuperAdmin || !permNeeded || Auth.hasPermission(permNeeded);

      if (isAllowed) {
        if (isMobile) {
          // On mobile bottom navbar:
          // For Desainer role: show Home, Projek, Tambah, Layanan, Tools
          // For Service/Admin/Other roles: show Home, Projek, Tambah, Keuangan, Laporan
          let showOnMobile = false;
          if (href.endsWith("index.html") || href.endsWith("proyek.html") || href.endsWith("tambah-proyek.html")) {
            showOnMobile = true;
          } else if (isDesainer) {
            if (href.endsWith("layanan.html") || href.endsWith("tools.html")) {
              showOnMobile = true;
            }
          } else {
            // Service staff / Default roles show Keuangan & Laporan on bottom navbar
            if (href.endsWith("keuangan.html") || href.endsWith("laporan.html")) {
              showOnMobile = true;
            }
          }

          if (showOnMobile) {
            el.classList.remove("hidden");
            el.style.display = "";
          } else {
            el.classList.add("hidden");
            el.style.display = "none";
          }
        } else {
          // Desktop sidebar: show all allowed items
          el.classList.remove("hidden");
          el.style.display = "";
        }
      } else {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    // 2. Check profile dropdown links for permissions
    const dropdownLinks = document.querySelectorAll("#profileDropdown a");
    dropdownLinks.forEach(el => {
      const href = el.getAttribute("href") || "";
      let permNeeded = el.getAttribute("data-permission-allow");

      if (!permNeeded && href) {
        if (href.endsWith("proyek.html")) permNeeded = "proyek:read";
        else if (href.endsWith("tambah-proyek.html")) permNeeded = "proyek:create";
        else if (href.endsWith("keuangan.html")) permNeeded = "keuangan:read";
        else if (href.endsWith("laporan.html")) permNeeded = "laporan:read";
        else if (href.endsWith("layanan.html")) permNeeded = "layanan:read";
        else if (href.endsWith("tools.html")) permNeeded = "tools:read";
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
      if (btn.closest("#navMenu") || btn.closest("#profileDropdown")) return; // Skip menu items handled in applyMenuPermissions
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
    try {
      if (typeof CONFIG !== 'undefined') {
        const body = new URLSearchParams();
        body.append("action", "logout");
        body.append("token", sessionStorage.getItem("token"));
        body.append("apiKey", CONFIG.API_KEY);
        await fetch(CONFIG.API_URL, { method: "POST", body });
      }
    } catch (e) {
      console.log(e);
    }
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
};

window.addEventListener("resize", () => {
  if (typeof Auth !== "undefined" && Auth.applyMenuPermissions) {
    Auth.applyMenuPermissions();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Check for Access Denied notification
  const deniedMsg = sessionStorage.getItem("toast_denied");
  if (deniedMsg) {
    sessionStorage.removeItem("toast_denied");
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(deniedMsg, 'error');
      } else {
        alert(deniedMsg);
      }
    }, 300);
  }

  Auth.checkLogin();
});
