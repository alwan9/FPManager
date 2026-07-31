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
      "proyek:read", "proyek:create", "proyek:update",
      "keuangan:read", "keuangan:create", "keuangan:update",
      "laporan:read", "laporan:export"
    ],
    desainer: [
      "proyek:read", "proyek:update",
      "layanan:read", "layanan:create", "layanan:update",
      "tools:read", "tools:create", "tools:update"
    ],
    super_admin: [
      "proyek:read", "proyek:create", "proyek:update", "proyek:delete",
      "keuangan:read", "keuangan:create", "keuangan:update", "keuangan:delete",
      "laporan:read", "laporan:export",
      "layanan:read", "layanan:create", "layanan:update", "layanan:delete",
      "tools:read", "tools:create", "tools:update", "tools:delete",
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
          <td colspan="7" class="text-center py-8 text-zinc-400">
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
          <td colspan="7" class="text-center py-8 text-zinc-400">
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
      { key: "proyek", label: "Projek", actions: [ { act: "read", tag: "R" }, { act: "create", tag: "C" }, { act: "update", tag: "U" }, { act: "delete", tag: "D" } ] },
      { key: "keuangan", label: "Keuangan", actions: [ { act: "read", tag: "R" }, { act: "create", tag: "C" }, { act: "update", tag: "U" }, { act: "delete", tag: "D" } ] },
      { key: "laporan", label: "Laporan", actions: [ { act: "read", tag: "R" }, { act: "export", tag: "E" } ] },
      { key: "layanan", label: "Layanan", actions: [ { act: "read", tag: "R" }, { act: "create", tag: "C" }, { act: "update", tag: "U" }, { act: "delete", tag: "D" } ] },
      { key: "tools", label: "Tools", actions: [ { act: "read", tag: "R" }, { act: "create", tag: "C" }, { act: "update", tag: "U" }, { act: "delete", tag: "D" } ] },
      { key: "users", label: "User Mgr", actions: [ { act: "read", tag: "R" }, { act: "create", tag: "C" }, { act: "update", tag: "U" }, { act: "delete", tag: "D" } ] }
    ];

    userTableBody.innerHTML = users.map(u => {
      const isMainAdmin = (u.username === 'wansmin');

      const crudMatrixHtml = modules.map(m => {
        const actionBadges = m.actions.map(a => {
          const permKey = `${m.key}:${a.act}`;
          const isChecked = userHasPerm(u, permKey);
          return `
            <label class="inline-flex items-center cursor-pointer space-x-0.5 text-[11px]" title="${m.label} ${a.act.toUpperCase()}">
              <input type="checkbox" onchange="toggleUserPermDirectly('${u.id}', '${permKey}', this.checked)"
                class="form-checkbox h-3 w-3 text-indigo-600 rounded" ${isChecked ? 'checked' : ''} ${isMainAdmin ? 'disabled' : ''}>
              <span class="text-zinc-500 font-mono font-semibold">${a.tag}</span>
            </label>
          `;
        }).join(" ");

        return `
          <div class="inline-flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-xs">
            <span class="font-bold text-zinc-700 dark:text-zinc-300 mr-1 text-[11px]">${m.label}:</span>
            ${actionBadges}
          </div>
        `;
      }).join("");

      return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <td class="px-4 py-3 font-mono text-xs">
            <span class="px-2 py-0.5 font-mono font-bold text-xs rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">${u.id || '-'}</span>
          </td>
          <td class="px-4 py-3 font-semibold text-zinc-800 dark:text-white">
            ${escapeHtml(u.username)}
          </td>
          <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
            ${escapeHtml(u.name || u.username)}
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
              ${crudMatrixHtml}
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-zinc-400">${u.createdAt || '-'}</td>
          <td class="px-4 py-3 text-center">
            <div class="flex items-center justify-center space-x-1">
              <button onclick="openEditUserModal('${u.id}')" data-permission-allow="users:update"
                class="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Edit User & Permission">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              ${isMainAdmin ? '' : `
              <button onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')" data-permission-allow="users:delete"
                class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Hapus User">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              `}
            </div>
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

  // Open Edit User Modal with Prefilled Role & CRUD Permissions
  window.openEditUserModal = (id) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    modalTitle.innerText = `Edit User & Permission (${user.username})`;
    userIdInput.value = user.id;
    usernameInput.value = user.username;
    usernameInput.setAttribute("readonly", "readonly");
    nameInput.value = user.name || user.username;
    passwordInput.value = "";
    passwordInput.setAttribute("placeholder", "Biarkan kosong jika password tidak diubah");
    roleSelect.value = user.role || "service";

    permCrudCheckboxes.forEach(cb => {
      const permKey = cb.getAttribute("data-perm");
      cb.checked = userHasPerm(user, permKey);
    });

    userModal.classList.remove("hidden");
  };

  // Direct Inline Permission Toggle Handler
  window.toggleUserPermDirectly = async (id, permKey, isChecked) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    let perms = Array.isArray(user.permissions) ? [...user.permissions] : (defaultRolePerms[user.role] || defaultRolePerms.service);

    if (isChecked) {
      if (!perms.includes(permKey)) perms.push(permKey);
    } else {
      perms = perms.filter(p => p !== permKey && p !== permKey.split(':')[0]);
    }

    user.permissions = perms;
    user.role = "custom"; // Switch to custom if checkboxes edited manually

    const res = await API.updateUser(id, { permissions: perms, role: user.role });
    if (res.success) {
      syncSessionUserIfMatch(user);
      if (typeof Toast !== 'undefined') Toast.success("Hak Akses Diperbarui", `Hak akses ${user.username} telah diperbarui.`);
      loadUsers();
    } else {
      if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
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
    nameInput.value = "";
    passwordInput.value = "";
    passwordInput.setAttribute("placeholder", "Masukkan password (misal: 123456)");
    roleSelect.value = "service";
    
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
    const selectedPerms = [];
    permCrudCheckboxes.forEach(cb => {
      if (cb.checked) {
        const permKey = cb.getAttribute("data-perm");
        if (permKey) selectedPerms.push(permKey);
      }
    });

    const editId = userIdInput.value;
    const userData = {
      username: usernameInput.value.trim(),
      name: nameInput.value.trim(),
      role: roleSelect.value,
      permissions: selectedPerms
    };

    if (passwordInput.value.trim()) {
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
