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
  const passwordInput = document.getElementById("passwordInput");
  const roleSelect = document.getElementById("roleSelect");

  const statTotalUsers = document.getElementById("statTotalUsers");
  const statSuperAdmin = document.getElementById("statSuperAdmin");
  const statService = document.getElementById("statService");
  const statDesainer = document.getElementById("statDesainer");

  let usersData = [];

  const escapeHtml = (str) => {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const normalizeRole = (role) => {
    if (!role) return "service";
    const r = String(role).toLowerCase().trim();
    if (r === "super_admin" || r === "super admin" || r === "superadmin" || r.includes("admin") || r === "wansmin") return "super_admin";
    if (r === "desainer" || r === "designer") return "designer";
    return "service";
  };

  const loadUsers = async () => {
    if (typeof Auth !== 'undefined' && !Auth.isSuperAdmin()) {
      const mainArea = document.querySelector('main section') || document.querySelector('main');
      if (mainArea) {
        mainArea.innerHTML = `
          <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
            <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
            <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Halaman Manajemen User hanya dapat diakses oleh Super Admin.</p>
          </div>
        `;
      }
      return;
    }

    try {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-zinc-400">
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

  const renderUsers = (users) => {
    if (!users || users.length === 0) {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-zinc-400">
            <i class="fa-solid fa-user-slash text-2xl mb-2 text-zinc-300 block"></i>
            <p class="font-semibold text-zinc-600 dark:text-zinc-300">Belum ada data user yang dimuat.</p>
            <button onclick="loadUsers()" class="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all">
              <i class="fa-solid fa-rotate mr-1"></i> Muat Ulang Data
            </button>
          </td>
        </tr>
      `;
      updateStats([]);
      return;
    }

    updateStats(users);

    userTableBody.innerHTML = users.map((u, idx) => {
      const isMainAdmin = (u.username === 'wansmin');
      const role = normalizeRole(u.role);

      const rawAvatar = u.avatar || u.url_profile || u.urlprofile || u.foto || u.photo || u.avatar_url || u.avatarUrl || u.urlProfile || u.Url_profile || '';
      const formattedAvatar = (typeof Auth !== 'undefined' && typeof Auth.formatAvatarUrl === 'function') ? Auth.formatAvatarUrl(rawAvatar) : (rawAvatar || '');
      const initial = escapeHtml((u.name || u.username || "U").charAt(0).toUpperCase());
      const avatarHtml = formattedAvatar ? 
        `<img src="${escapeHtml(formattedAvatar)}" class="h-9 w-9 rounded-full object-cover shadow-sm border border-zinc-200 dark:border-zinc-700" onerror="this.outerHTML='<div class=\\'h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm\\'>${initial}</div>'">` : 
        `<div class="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
           ${initial}
         </div>`;

      let roleBadge = '';
      if (isMainAdmin) {
        roleBadge = `
          <span class="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
            <i class="fa-solid fa-user-shield text-[10px]"></i> Super Admin
          </span>
        `;
      } else {
        roleBadge = `
          <select onchange="updateUserRoleDirectly('${u.id}', this.value)"
            class="px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer">
            <option value="service" ${role === 'service' ? 'selected' : ''}>Service</option>
            <option value="designer" ${role === 'designer' ? 'selected' : ''}>Designer</option>
            <option value="super_admin" ${role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
        `;
      }

      const phoneDisplay = u.phone ? `
        <a href="https://wa.me/${u.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}" target="_blank" rel="noopener noreferrer" class="hover:underline text-green-600 dark:text-green-400 font-medium inline-flex items-center gap-1">
          <i class="fa-brands fa-whatsapp text-xs"></i> ${escapeHtml(u.phone)}
        </a>` : '<span class="text-zinc-400">-</span>';

      const emailDisplay = u.email ? `
        <a href="mailto:${escapeHtml(u.email)}" class="hover:underline text-zinc-600 dark:text-zinc-400">
          ${escapeHtml(u.email)}
        </a>` : '<span class="text-zinc-400">-</span>';

      return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <td class="px-4 py-3.5 text-center text-xs font-semibold text-zinc-400 font-mono">${idx + 1}</td>
          <td class="px-4 py-3.5">
            <div onclick="openUserDetailModal('${u.id}')" 
              class="flex items-center space-x-3 cursor-pointer group p-1 -m-1 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
              title="Klik untuk detail user">
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
          <td class="px-4 py-3.5">
            ${roleBadge}
          </td>
          <td class="px-4 py-3.5 text-xs space-y-0.5">
            <div>${emailDisplay}</div>
            <div>${phoneDisplay}</div>
          </td>
          <td class="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            ${u.createdAt || "-"}
          </td>
          <td class="px-4 py-3.5 text-center space-x-1.5 whitespace-nowrap">
            <button onclick="openEditUserModal('${u.id}')"
              class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors"
              title="Edit User">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            ${isMainAdmin ? '' : `
              <button onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')"
                class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors"
                title="Hapus User">
                <i class="fa-solid fa-trash"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");
  };

  const updateStats = (users) => {
    statTotalUsers.innerText = users.length;
    statSuperAdmin.innerText = users.filter(u => normalizeRole(u.role) === 'super_admin').length;
    statService.innerText = users.filter(u => normalizeRole(u.role) === 'service').length;
    statDesainer.innerText = users.filter(u => normalizeRole(u.role) === 'designer').length;
  };

  // Direct Inline Role Update
  window.updateUserRoleDirectly = async (id, newRole) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    const role = normalizeRole(newRole);
    user.role = role;

    const res = await API.updateUser(id, { role: role });
    if (res.success) {
      if (typeof Auth !== 'undefined' && typeof Auth.syncUserSession === 'function') {
        Auth.syncUserSession(user);
      }
      if (typeof Toast !== 'undefined') Toast.success("Role Diperbarui", `Role ${user.username} diubah ke ${role.toUpperCase()}.`);
      loadUsers();
    } else {
      if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      loadUsers();
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
  const detailEditBtn = document.getElementById("detailEditBtn");

  const closeUserDetailModal = () => {
    if (userDetailModal) userDetailModal.classList.add("hidden");
  };
  window.closeUserDetailModal = closeUserDetailModal;

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

    const role = normalizeRole(user.role);

    if (detailAvatarContainer) {
      const rawAvatar = user.avatar || user.url_profile || user.urlprofile || user.foto || user.photo || user.avatar_url || user.avatarUrl || user.urlProfile || user.Url_profile || '';
      const formattedAvatar = (typeof Auth !== 'undefined' && typeof Auth.formatAvatarUrl === 'function') ? Auth.formatAvatarUrl(rawAvatar) : (rawAvatar || '');
      const initial = escapeHtml((user.name || user.username || "U").charAt(0).toUpperCase());
      detailAvatarContainer.innerHTML = formattedAvatar ? 
        `<img src="${escapeHtml(formattedAvatar)}" class="h-12 w-12 rounded-full object-cover shadow border border-zinc-200 dark:border-zinc-700" onerror="this.outerHTML='<div class=\\'h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow\\'>${initial}</div>'">` : 
        `<div class="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow">
           ${initial}
         </div>`;
    }

    if (detailName) detailName.innerText = user.name || user.username;
    if (detailUsername) detailUsername.innerText = `@${user.username}`;
    if (detailId) detailId.innerText = user.id || "-";

    if (detailRole) {
      let roleLabel = "Service";
      let badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      if (role === 'super_admin' || user.username === 'wansmin') {
        roleLabel = "Super Admin";
        badgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      } else if (role === 'designer') {
        roleLabel = "Designer";
        badgeClass = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800";
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
        detailPhone.innerHTML = `<a href="https://wa.me/${waLink}" target="_blank" rel="noopener noreferrer" class="hover:underline text-green-600 dark:text-green-400 font-semibold flex items-center inline-flex gap-1"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(user.phone)}</a>`;
      } else {
        detailPhone.innerHTML = `<span class="text-zinc-400">-</span>`;
      }
    }

    if (detailCreatedAt) detailCreatedAt.innerText = user.createdAt || "-";

    if (detailEditBtn) {
      detailEditBtn.onclick = () => {
        closeUserDetailModal();
        openEditUserModal(user.id);
      };
    }

    if (userDetailModal) userDetailModal.classList.remove("hidden");
  };

  // Open Edit User Modal
  window.openEditUserModal = (id) => {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    modalTitle.innerText = `Edit User (${user.username})`;
    userIdInput.value = user.id;
    usernameInput.value = user.username;
    usernameInput.setAttribute("readonly", "readonly");
    if (nameInput) nameInput.value = user.name || user.username;
    if (emailInput) emailInput.value = user.email || "";
    if (phoneInput) phoneInput.value = user.phone || "";
    passwordInput.value = "";
    passwordInput.removeAttribute("required");
    passwordInput.setAttribute("placeholder", "Biarkan kosong jika password tidak diubah");
    roleSelect.value = normalizeRole(user.role);

    userModal.classList.remove("hidden");
  };

  // Modal Handlers (Add User)
  openAddUserModalBtn.addEventListener("click", () => {
    modalTitle.innerText = "Tambah User Baru";
    userIdInput.value = "";
    usernameInput.value = "";
    usernameInput.removeAttribute("readonly");
    if (nameInput) nameInput.value = "";
    if (emailInput) emailInput.value = "";
    if (phoneInput) phoneInput.value = "";
    passwordInput.value = "";
    passwordInput.setAttribute("required", "required");
    passwordInput.setAttribute("placeholder", "Masukkan password user (misal: 123456)");
    roleSelect.value = "service";

    userModal.classList.remove("hidden");
  });

  const closeModal = () => {
    userModal.classList.add("hidden");
  };
  window.closeUserModal = closeModal;

  closeUserModalBtn.addEventListener("click", closeModal);
  cancelUserModalBtn.addEventListener("click", closeModal);
  userModal.addEventListener("click", (e) => {
    if (e.target === userModal) closeModal();
  });

  window.deleteUser = async (id, username) => {
    if (await showConfirmModal({
      title: "Hapus Pengguna",
      message: `Apakah Anda yakin ingin menghapus user "${username}"? Tindakan ini tidak dapat dibatalkan.`,
      type: "danger",
      confirmText: "Hapus User"
    })) {
      const res = await API.deleteUser(id);
      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.success("Sukses", res.message);
        loadUsers();
      } else {
        if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      }
    }
  };

  let isUserFormSubmitting = false;
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = userForm.querySelector('button[type="submit"]');
    if (isUserFormSubmitting || (submitBtn && submitBtn.disabled)) return;

    const editId = userIdInput.value;
    const existingUser = editId ? usersData.find(u => u.id === editId) : null;
    const uname = usernameInput.value.trim();
    const selectedRole = normalizeRole(roleSelect.value);

    if (!editId && !passwordInput.value.trim()) {
      if (typeof Toast !== 'undefined') Toast.error("Peringatan", "Password wajib diisi saat menambah user baru.");
      return;
    }

    isUserFormSubmitting = true;
    const originalBtnText = submitBtn ? submitBtn.innerHTML : "Simpan";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
    }

    const userData = {
      username: uname,
      name: nameInput ? nameInput.value.trim() : uname,
      email: emailInput ? emailInput.value.trim() : (existingUser ? existingUser.email : `${uname}@fpmanager.com`),
      phone: phoneInput ? phoneInput.value.trim() : (existingUser ? existingUser.phone : ""),
      role: selectedRole
    };

    if (passwordInput && passwordInput.value.trim()) {
      userData.password = passwordInput.value.trim();
    }

    try {
      let res;
      if (editId) {
        res = await API.updateUser(editId, userData);
        if (res.success && typeof Auth !== 'undefined') {
          Auth.syncUserSession({ id: editId, ...userData });
        }
      } else {
        res = await API.addUser(userData);
      }

      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.success("Berhasil", res.message || "Data user berhasil disimpan.");
        closeModal();
        loadUsers();
      } else {
        if (typeof Toast !== 'undefined') Toast.error("Gagal", res.message);
      }
    } catch (err) {
      console.error(err);
      if (typeof Toast !== 'undefined') Toast.error("Error", "Terjadi kesalahan saat menyimpan data user.");
    } finally {
      isUserFormSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });

  loadUsers();
});
