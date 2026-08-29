document.addEventListener("DOMContentLoaded", () => {
  const userTableBody = document.getElementById("userTableBody");
  const openAddUserModalBtn = document.getElementById("openAddUserModalBtn");
  const closeUserModalBtn = document.getElementById("closeUserModalBtn");
  const cancelUserModalBtn = document.getElementById("cancelUserModalBtn");
  const userModal = document.getElementById("userModal");
  const userForm = document.getElementById("userForm");

  const modalTitle = document.getElementById("modalTitle");
  const userIdInput = document.getElementById("userIdInput");
  const usernameInput = document.getElementById("usernameInput");
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const phoneInput = document.getElementById("phoneInput");
  const avatarInput = document.getElementById("avatarInput");
  const passwordInput = document.getElementById("passwordInput");
  const roleSelect = document.getElementById("roleSelect");
  const permCrudCheckboxes = document.querySelectorAll(".perm-crud-cb");

  const statTotalUsers = document.getElementById("statTotalUsers");
  const statSuperAdmin = document.getElementById("statSuperAdmin");
  const statService = document.getElementById("statService");
  const statDesainer = document.getElementById("statDesainer");

  let usersData = [];

  const defaultRolePerms = {
    service: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:delete",
      "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete",
      "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
      "laporan:read", "laporan:export",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update"
    ],
    desainer: [
      "proyek:read", "proyek:create", "proyek:update",
      "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
      "tools:read", "tools:create", "tools:update", "tools:delete",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update"
    ],
    super_admin: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:delete",
      "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete",
      "laporan:read", "laporan:export",
      "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
      "tools:read", "tools:create", "tools:update", "tools:delete",
      "admin_tasks:read", "admin_tasks:create", "admin_tasks:update", "admin_tasks:delete",
      "users:read", "users:create", "users:update", "users:delete"
    ]
  };

  const loadUsers = async () => {
    if (typeof Auth !== 'undefined' && !Auth.hasPermission('users:read')) {
      const mainArea = document.querySelector('main section') || document.querySelector('main');
      if (mainArea) {
        mainArea.innerHTML = `
          <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
            <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
            <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (users:read) untuk melihat manajemen user.</p>
          </div>
        `;
      }
      return;
    }
    try {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-zinc-400">
            <i class="fa-solid fa-circle-notch fa-spin text-xl mb-2"></i>
            <p>Memuat data user...</p>
          </td>
        </tr>
      `;

      usersData = await API.getUsers();
      renderUsers(usersData);
    } catch (err) {
      console.error(err);
      if (typeof Toast !== 'undefined') Toast.error("Gagal", "Gagal mengambil data user.");
    }
  };
  window.loadUsers = loadUsers;

  const userHasPerm = (user, permKey) => {
    if (user.role === 'super_admin') return true;
    if (!user || !user.permissions) return false;
    if (typeof user.permissions === 'object' && !Array.isArray(user.permissions)) {
      return user.permissions[permKey] === true;
    }
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(permKey);
  };

  const renderUsers = (users) => {
    if (!users || users.length === 0) {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-zinc-400">
            <i class="fa-solid fa-user-slash text-2xl mb-2 text-zinc-300 block"></i>
            <p class="font-semibold text-zinc-600 dark:text-zinc-300">Belum ada data user yang dimuat dari Spreadsheet.</p>
            <p class="text-xs text-zinc-400 mt-1 mb-3">Pastikan Apps Script telah di-deploy ulang ke versi terbaru (New Version).</p>
            <button onclick="loadUsers()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all">
              <i class="fa-solid fa-rotate mr-1"></i> Muat Ulang Data
            </button>
          </td>
        </tr>
      `;
      updateStats([]);
      return;
    }

    updateStats(users);

    const modules = [
      { key: "proyek", label: "Projek", actions: ["proyek:read", "proyek:create", "proyek:update", "proyek:delete"] },
      { key: "keuangan", label: "Keuangan", actions: ["keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete"] },
      { key: "laporan", label: "Laporan", actions: ["laporan:read", "laporan:export"] },
      { key: "layanan", label: "Layanan", actions: ["layanan:read", "layanan:create", "layanan:update", "layanan:delete"] },
      { key: "tools", label: "Tools", actions: ["tools:read", "tools:create", "tools:update", "tools:delete"] },
      { key: "admin_tasks", label: "Aktivitas Admin", actions: ["admin_tasks:read", "admin_tasks:create", "admin_tasks:update", "admin_tasks:delete"] },
      { key: "users", label: "User Mgr", actions: ["users:read", "users:create", "users:update", "users:delete"] }
    ];

    userTableBody.innerHTML = users.map((u, idx) => {
      const isMainAdmin = (u.username === 'wansmin');

      const moduleCheckboxesHtml = modules.map(m => {
        const isAllChecked = m.actions.every(permKey => userHasPerm(u, permKey));
        const isPartial = !isAllChecked && m.actions.some(permKey => userHasPerm(u, permKey));

        return `
          <label class="inline-flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg text-xs cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors select-none ${isPartial ? 'border border-amber-400/60 dark:border-amber-600/60' : ''}" 
            title="${m.label}: ${isAllChecked ? 'Akses Penuh (CRUD Ceklis)' : isPartial ? 'Akses Sebagian (Kosong, klik Edit untuk detail)' : 'Kosong (Tidak Ada Akses)'}">
            <input type="checkbox" onchange="toggleUserModuleDirectly('${u.id}', '${m.key}', this.checked)"
              class="form-checkbox h-4 w-4 text-indigo-600 rounded transition cursor-pointer" ${isAllChecked ? 'checked' : ''} ${isMainAdmin ? 'disabled' : ''}>
            <span class="font-semibold ${isAllChecked ? 'text-indigo-600 dark:text-indigo-400' : isPartial ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-600 dark:text-zinc-400'}">${m.label}</span>
            ${isPartial ? '<span class="text-[10px] text-amber-500 font-mono" title="Akses Sebagian - Klik Edit untuk ubah">*</span>' : ''}
          </label>
        `;
      }).join("");

      const avatarHtml = u.avatar ? 
        `<img src="${escapeHtml(u.avatar)}" class="h-9 w-9 rounded-full object-cover shadow-sm border border-zinc-200 dark:border-zinc-700">` : 
        `<div class="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
           ${escapeHtml((u.name || u.username || "U").charAt(0).toUpperCase())}
         </div>`;

      return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <td class="px-3 py-3 text-center text-xs font-semibold text-zinc-400 font-mono">${idx + 1}</td>
          <td class="px-4 py-3">
            <div onclick="openUserDetailModal('${u.id}')" 
              class="flex items-center space-x-3 cursor-pointer group p-1.5 -m-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
              title="Klik untuk melihat detail pengguna">
              ${avatarHtml}
              <div>
                <div class="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center space-x-1.5">
                  <span>${escapeHtml(u.name || u.username)}</span>
                  <i class="fa-solid fa-circle-info text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
                <div class="text-xs text-indigo-600 dark:text-indigo-400 font-mono">@${escapeHtml(u.username)}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            ${isMainAdmin ? `
              <span class="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <i class="fa-solid fa-user-shield mr-1"></i> Super Admin
              </span>
            ` : `
              <select onchange="updateUserRoleDirectly('${u.id}', this.value)"
                class="px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium">
                <option value="service" ${u.role === 'service' ? 'selected' : ''}>Service</option>
                <option value="desainer" ${u.role === 'desainer' ? 'selected' : ''}>Desainer</option>
                <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                <option value="custom" ${u.role === 'custom' ? 'selected' : ''}>Custom</option>
              </select>
            `}
          </td>
          <td class="px-4 py-3">
            <div class="flex flex-wrap items-center gap-1.5 max-w-xl">
              ${moduleCheckboxesHtml}
            </div>
          </td>
          <td class="px-4 py-3 text-center">
            ${isMainAdmin ? '<span class="text-zinc-400 text-xs font-mono">-</span>' : `
              <button onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')" data-permission-allow="users:delete"
                class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Hapus User">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");
  };

  const updateStats = (users) => {
    statTotalUsers.innerText = users.length;
    statSuperAdmin.innerText = users.filter(u => u.role === 'super_admin').length;
    statService.innerText = users.filter(u => u.role === 'service').length;
    statDesainer.innerText = users.filter(u => u.role === 'desainer').length;
  };

  const escapeHtml = (str) => {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const syncSessionUserIfMatch = (updatedUser) => {
    if (typeof Auth !== 'undefined' && Auth.getUser) {
      const currentUser = Auth.getUser();
      if (currentUser && (currentUser.id === updatedUser.id || currentUser.username === updatedUser.username)) {
        const newSessionUser = { ...currentUser, ...updatedUser };
        sessionStorage.setItem("user", JSON.stringify(newSessionUser));
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(newSessionUser));
        }
        if (Auth.applyMenuPermissions) Auth.applyMenuPermissions();
        if (Auth.applyButtonPermissions) Auth.applyButtonPermissions();
      }
    }
  };

  // User Detail Modal Handlers
  const userDetailModal = document.getElementById("userDetailModal");
  const closeUserDetailModalBtn = document.getElementById("closeUserDetailModalBtn");
  const closeUserDetailModalBtn2 = document.getElementById("closeUserDetailModalBtn2");
  const detailAvatarContainer = document.getElementById("detailAvatarContainer");
  const detailName = document.getElementById("detailName");
  const detailUsername = document.getElementById("detailUsername");
  const detailId = document.getElementById("detailId");
  const detailRole = document.getElementById("detailRole");
  const detailEmail = document.getElementById("detailEmail");
  const detailPhone = document.getElementById("detailPhone");
  const detailCreatedAt = document.getElementById("detailCreatedAt");
  const detailPermissions = document.getElementById("detailPermissions");
  const detailEditBtn = document.getElementById("detailEditBtn");

  const closeUserDetailModal = () => {
    if (userDetailModal) userDetailModal.classList.add("hidden");
  };

  if (closeUserDetailModalBtn) closeUserDetailModalBtn.addEventListener("click", closeUserDetailModal);
  if (closeUserDetailModalBtn2) closeUserDetailModalBtn2.addEventListener("click", closeUserDetailModal);
  if (userDetailModal) {
    userDetailModal.addEventListener("click", (e) => {
      if (e.target === userDetailModal) closeUserDetailModal();
    });
  }

  window.openUserDetailModal = (id) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    if (detailAvatarContainer) {
      detailAvatarContainer.innerHTML = user.avatar ? 
        `<img src="${escapeHtml(user.avatar)}" class="h-12 w-12 rounded-full object-cover shadow border border-zinc-200 dark:border-zinc-700">` : 
        `<div class="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow">
           ${escapeHtml((user.name || user.username || "U").charAt(0).toUpperCase())}
         </div>`;
    }

    if (detailName) detailName.innerText = user.name || user.username;
    if (detailUsername) detailUsername.innerText = `@${user.username}`;
    if (detailId) detailId.innerText = user.id || "-";

    if (detailRole) {
      let roleLabel = user.role || 'service';
      let badgeClass = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700";
      if (user.role === 'super_admin' || user.username === 'wansmin') {
        roleLabel = "Super Admin";
        badgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      } else if (user.role === 'service') {
        roleLabel = "Service";
        badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      } else if (user.role === 'desainer') {
        roleLabel = "Desainer";
        badgeClass = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800";
      } else if (user.role === 'custom') {
        roleLabel = "Custom";
        badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      }
      detailRole.className = `px-2.5 py-1 text-xs font-semibold rounded-full border ${badgeClass}`;
      detailRole.innerText = roleLabel;
    }

    if (detailEmail) {
      detailEmail.innerHTML = user.email ? 
        `<a href="mailto:${escapeHtml(user.email)}" class="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold">${escapeHtml(user.email)}</a>` : 
        `<span class="text-zinc-400">-</span>`;
    }

    if (detailPhone) {
      if (user.phone) {
        const cleanPhone = user.phone.replace(/[^0-9]/g, '');
        const waLink = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        detailPhone.innerHTML = `<a href="https://wa.me/${waLink}" target="FPManager_WhatsAppTab" rel="noopener noreferrer" class="hover:underline text-green-600 dark:text-green-400 font-semibold flex items-center inline-flex gap-1"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(user.phone)}</a>`;
      } else {
        detailPhone.innerHTML = `<span class="text-zinc-400">-</span>`;
      }
    }

    if (detailCreatedAt) detailCreatedAt.innerText = user.createdAt || "-";

    if (detailPermissions) {
      const modules = [
        { key: "proyek", label: "Projek", actions: ["proyek:read", "proyek:create", "proyek:update", "proyek:delete"] },
        { key: "keuangan", label: "Keuangan", actions: ["keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete"] },
        { key: "laporan", label: "Laporan", actions: ["laporan:read", "laporan:export"] },
        { key: "layanan", label: "Layanan", actions: ["layanan:read", "layanan:create", "layanan:update", "layanan:delete"] },
        { key: "tools", label: "Tools", actions: ["tools:read", "tools:create", "tools:update", "tools:delete"] },
        { key: "users", label: "User Mgr", actions: ["users:read", "users:create", "users:update", "users:delete"] }
      ];

      detailPermissions.innerHTML = modules.map(m => {
        const isAllChecked = m.actions.every(permKey => userHasPerm(user, permKey));
        const isPartial = !isAllChecked && m.actions.some(permKey => userHasPerm(user, permKey));

        let badgeStyle = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
        let statusText = "Tidak ada akses";
        if (isAllChecked) {
          badgeStyle = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold";
          statusText = "Akses Penuh";
        } else if (isPartial) {
          badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 font-semibold";
          statusText = "Sebagian";
        }

        return `<span class="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 ${badgeStyle}" title="${m.label}: ${statusText}">
          ${m.label}: ${statusText}
        </span>`;
      }).join("");
    }

    if (detailEditBtn) {
      if (typeof Auth !== 'undefined' && !Auth.hasPermission('users:update')) {
        detailEditBtn.classList.add('hidden');
      } else {
        detailEditBtn.classList.remove('hidden');
        detailEditBtn.onclick = () => {
          closeUserDetailModal();
          openEditUserModal(user.id);
        };
      }
    }

    if (userDetailModal) userDetailModal.classList.remove("hidden");
  };

  const contactFieldsContainer = document.getElementById("contactFieldsContainer");
  const avatarFieldContainer = document.getElementById("avatarFieldContainer");
  const passwordFieldContainer = document.getElementById("passwordFieldContainer");
  const nameFieldContainer = document.getElementById("nameFieldContainer");
  const permissionsTableContainer = document.getElementById("permissionsTableContainer");

  const configureModalMode = (isEdit) => {
    if (contactFieldsContainer) contactFieldsContainer.classList.add("hidden");
    if (avatarFieldContainer) avatarFieldContainer.classList.add("hidden");
    if (passwordFieldContainer) passwordFieldContainer.classList.remove("hidden");

    if (isEdit) {
      if (nameFieldContainer) nameFieldContainer.classList.remove("hidden");
      if (permissionsTableContainer) permissionsTableContainer.classList.remove("hidden");
    } else {
      if (nameFieldContainer) nameFieldContainer.classList.add("hidden");
      if (permissionsTableContainer) permissionsTableContainer.classList.add("hidden");
    }
  };

  // Open Edit User Modal with Prefilled Role & CRUD Permissions
  window.openEditUserModal = (id) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    const isSuperAdmin = (user.role === 'super_admin' || user.username === 'wansmin');

    modalTitle.innerText = `Edit User & Hak Akses (${user.username})`;
    userIdInput.value = user.id;
    usernameInput.value = user.username;
    usernameInput.setAttribute("readonly", "readonly");
    if (nameInput) {
      nameInput.value = user.name || user.username;
    }
    if (emailInput) emailInput.value = user.email || "";
    if (phoneInput) phoneInput.value = user.phone || "";
    if (avatarInput) avatarInput.value = user.avatar || "";
    passwordInput.value = "";
    passwordInput.removeAttribute("required");
    passwordInput.setAttribute("placeholder", isSuperAdmin ? "Super Admin: Ubah password di Profil Saya" : "Biarkan kosong jika password tidak diubah");
    roleSelect.value = user.role || "service";

    configureModalMode(true);

    permCrudCheckboxes.forEach(cb => {
      const permKey = cb.getAttribute("data-perm");
      cb.checked = userHasPerm(user, permKey);
    });

    userModal.classList.remove("hidden");
  };

  // Direct Inline Module Master Checkbox Toggle Handler
  window.toggleUserModuleDirectly = async (id, moduleKey, isChecked) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    const moduleActionsMap = {
      proyek: ["proyek:read", "proyek:create", "proyek:update", "proyek:delete"],
      keuangan: ["keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete"],
      laporan: ["laporan:read", "laporan:export"],
      layanan: ["layanan:read", "layanan:create", "layanan:update", "layanan:delete"],
      tools: ["tools:read", "tools:create", "tools:update", "tools:delete"],
      users: ["users:read", "users:create", "users:update", "users:delete"]
    };

    const targetActions = moduleActionsMap[moduleKey] || [];
    let currentPerms = Array.isArray(user.permissions) ? [...user.permissions] : (defaultRolePerms[user.role] || defaultRolePerms.service);

    if (isChecked) {
      targetActions.forEach(act => {
        if (!currentPerms.includes(act)) currentPerms.push(act);
      });
    } else {
      currentPerms = currentPerms.filter(act => !targetActions.includes(act));
    }

    user.permissions = currentPerms;
    user.role = "custom";

    const res = await API.updateUser(id, { permissions: currentPerms, role: user.role });
    if (res.success) {
      syncSessionUserIfMatch(user);
      if (typeof Toast !== 'undefined') Toast.success("Hak Akses Diperbarui", `Akses modul ${moduleKey.toUpperCase()} untuk ${user.username} diubah.`);
      loadUsers();
    } else {
      if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      loadUsers();
    }
  };

  // Direct Inline Role Preset Change Handler
  window.updateUserRoleDirectly = async (id, newRole) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    let perms = defaultRolePerms[newRole] || (Array.isArray(user.permissions) ? user.permissions : defaultRolePerms.service);

    user.role = newRole;
    user.permissions = perms;

    const res = await API.updateUser(id, { role: newRole, permissions: perms });
    if (res.success) {
      syncSessionUserIfMatch(user);
      if (typeof Toast !== 'undefined') Toast.success("Role Diperbarui", `Role ${user.username} diubah ke ${newRole.toUpperCase()}.`);
      loadUsers();
    } else {
      if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
    }
  };

  // Role select in modal change listener
  roleSelect.addEventListener("change", (e) => {
    const selectedRole = e.target.value;
    if (defaultRolePerms[selectedRole]) {
      const allowed = defaultRolePerms[selectedRole];
      permCrudCheckboxes.forEach(cb => {
        const permKey = cb.getAttribute("data-perm");
        cb.checked = allowed.includes(permKey);
      });
    }
  });

  // Checkbox change listener inside modal to switch preset role to custom
  permCrudCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      roleSelect.value = "custom";
    });
  });

  // Modal Handlers (Tambah User Baru)
  openAddUserModalBtn.addEventListener("click", () => {
    modalTitle.innerText = "Tambah User Baru";
    userIdInput.value = "";
    usernameInput.value = "";
    usernameInput.removeAttribute("readonly");
    if (nameInput) nameInput.value = "";
    if (emailInput) emailInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (avatarInput) avatarInput.value = "";
    passwordInput.value = "";
    passwordInput.setAttribute("required", "required");
    passwordInput.setAttribute("placeholder", "Masukkan password user (misal: 123456)");
    roleSelect.value = "service";
    
    configureModalMode(false); // Mode Tambah: Hanya Username, Password, Role

    const servicePerms = defaultRolePerms.service;
    permCrudCheckboxes.forEach(cb => {
      const permKey = cb.getAttribute("data-perm");
      cb.checked = servicePerms.includes(permKey);
    });

    userModal.classList.remove("hidden");
  });

  const closeModal = () => {
    userModal.classList.add("hidden");
  };

  closeUserModalBtn.addEventListener("click", closeModal);
  cancelUserModalBtn.addEventListener("click", closeModal);
  userModal.addEventListener("click", (e) => {
    if (e.target === userModal) closeModal();
  });

  window.deleteUser = async (id, username) => {
    if (confirm(`Apakah Anda yakin ingin menghapus user "${username}"?`)) {
      const res = await API.deleteUser(id);
      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.success("Sukses", res.message);
        loadUsers();
      } else {
        if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      }
    }
  };

  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = userIdInput.value;
    const existingUser = editId ? usersData.find(u => u.id === editId) : null;
    const uname = usernameInput.value.trim();

    if (!editId && !passwordInput.value.trim()) {
      if (typeof Toast !== 'undefined') Toast.error("Peringatan", "Password wajib diisi saat menambah user baru.");
      return;
    }

    let selectedPerms = [];
    if (editId && roleSelect.value === "custom") {
      permCrudCheckboxes.forEach(cb => {
        if (cb.checked) {
          const permKey = cb.getAttribute("data-perm");
          if (permKey) selectedPerms.push(permKey);
        }
      });
    } else {
      selectedPerms = defaultRolePerms[roleSelect.value] || defaultRolePerms.service;
    }

    const userData = {
      username: uname,
      name: editId ? (nameInput ? nameInput.value.trim() : uname) : (uname.charAt(0).toUpperCase() + uname.slice(1)),
      email: existingUser ? (existingUser.email || `${uname}@fpmanager.com`) : `${uname}@fpmanager.com`,
      phone: existingUser ? (existingUser.phone || "") : "",
      avatar: existingUser ? (existingUser.avatar || "") : "",
      role: roleSelect.value,
      permissions: selectedPerms
    };

    if (passwordInput && passwordInput.value.trim()) {
      userData.password = passwordInput.value.trim();
    }

    const submitBtn = userForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "Simpan";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
    }

    try {
      let res;
      if (editId) {
        // Mode Edit User
        res = await API.updateUser(editId, userData);
        if (res.success) {
          syncSessionUserIfMatch({ id: editId, ...userData });
        }
      } else {
        // Mode Tambah User Baru
        res = await API.addUser(userData);
      }

      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.success("Berhasil", res.message || "Data user berhasil disimpan.");
        closeModal();
        loadUsers();
      } else {
        if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });

  loadUsers();
});
