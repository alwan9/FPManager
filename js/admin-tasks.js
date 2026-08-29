/**
 * FREELANCE PROJEK MANAGER (FPManager)
 * Modul: Aktivitas & Checklist Harian Admin (Admin Tasks)
 * Fitur: Multi-Admin Assignment, Kustomisasi Tugas Per Admin, SOP Preset Templates,
 *        Multi-Filter & Workload Distribution Matrix, Auto-Reset Harian, Timer Notifikasi Berkala
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Check permission to view page
  if (typeof Auth !== "undefined" && !Auth.hasPermission("admin_tasks:read")) {
    const mainSection = document.querySelector("main section");
    if (mainSection) {
      mainSection.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (admin_tasks:read) untuk melihat tugas admin.</p>
        </div>
      `;
    }
    return;
  }

  // DOM Elements
  const taskTableBody = document.getElementById("taskTableBody");
  const taskSearchInput = document.getElementById("taskSearchInput");
  const filterAdminSelect = document.getElementById("filterAdminSelect");
  const filterStatusSelect = document.getElementById("filterStatusSelect");
  const filterScheduleSelect = document.getElementById("filterScheduleSelect");
  const tableRecordCount = document.getElementById("tableRecordCount");
  const progressBarFill = document.getElementById("progressBarFill");
  const progressBarText = document.getElementById("progressBarText");
  const adminFilterTabsContainer = document.getElementById("adminFilterTabsContainer");
  const adminWorkloadContainer = document.getElementById("adminWorkloadContainer");
  const adminCountBadge = document.getElementById("adminCountBadge");

  // Stats DOM
  const statTotalTasks = document.getElementById("statTotalTasks");
  const statDoneTasks = document.getElementById("statDoneTasks");
  const statPendingTasks = document.getElementById("statPendingTasks");
  const statProgressPercent = document.getElementById("statProgressPercent");
  const statActiveInterval = document.getElementById("statActiveInterval");
  const bannerAutoResetDate = document.getElementById("bannerAutoResetDate");

  // Task Form Modal DOM
  const taskModal = document.getElementById("taskModal");
  const taskModalTitle = document.getElementById("taskModalTitle");
  const taskForm = document.getElementById("taskForm");
  const openAddTaskModalBtn = document.getElementById("openAddTaskModalBtn");
  const closeTaskModalBtn = document.getElementById("closeTaskModalBtn");
  const cancelTaskModalBtn = document.getElementById("cancelTaskModalBtn");

  const taskIdInput = document.getElementById("taskIdInput");
  const taskTemplateSelect = document.getElementById("taskTemplateSelect");
  const taskNameInput = document.getElementById("taskNameInput");
  const taskAdminSelect = document.getElementById("taskAdminSelect");
  const singleAdminSelectContainer = document.getElementById("singleAdminSelectContainer");
  const multiAdminChecklistContainer = document.getElementById("multiAdminChecklistContainer");
  const multiAdminCheckboxList = document.getElementById("multiAdminCheckboxList");
  const multiAssignRadioWrapper = document.getElementById("multiAssignRadioWrapper");

  const taskPrioritySelect = document.getElementById("taskPrioritySelect");
  const taskScheduleTypeSelect = document.getElementById("taskScheduleTypeSelect");
  const taskIntervalHoursSelect = document.getElementById("taskIntervalHoursSelect");
  const taskSpecificTimeInput = document.getElementById("taskSpecificTimeInput");
  const intervalHoursContainer = document.getElementById("intervalHoursContainer");
  const specificTimeContainer = document.getElementById("specificTimeContainer");
  const intervalAdminOnlyBadge = document.getElementById("intervalAdminOnlyBadge");
  const taskTotalInput = document.getElementById("taskTotalInput");
  const taskStatusSelect = document.getElementById("taskStatusSelect");
  const taskLinkInput = document.getElementById("taskLinkInput");
  const taskNotesInput = document.getElementById("taskNotesInput");

  // Settings Modal DOM (Super Admin Only)
  const settingsModal = document.getElementById("settingsModal");
  const openSettingsModalBtn = document.getElementById("openSettingsModalBtn");
  const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
  const cancelSettingsModalBtn = document.getElementById("cancelSettingsModalBtn");
  const settingsForm = document.getElementById("settingsForm");
  const settingDefaultInterval = document.getElementById("settingDefaultInterval");
  const settingSoundToggle = document.getElementById("settingSoundToggle");
  const settingBrowserNotifToggle = document.getElementById("settingBrowserNotifToggle");
  const settingToastToggle = document.getElementById("settingToastToggle");
  const settingAutoResetToggle = document.getElementById("settingAutoResetToggle");
  const testChimeSoundBtn = document.getElementById("testChimeSoundBtn");
  const requestBrowserNotifBtn = document.getElementById("requestBrowserNotifBtn");
  const manualResetBtn = document.getElementById("manualResetBtn");

  // Floating Reminder DOM
  const floatingReminderPopup = document.getElementById("floatingReminderPopup");
  const floatingReminderMessage = document.getElementById("floatingReminderMessage");

  // State
  let tasksData = [];
  let usersList = [];
  let currentActiveAdminTab = "all";
  let isWorkloadExpanded = true;

  let settingsData = {
    defaultIntervalHours: 1,
    soundNotification: true,
    browserNotification: true,
    toastReminder: true,
    autoDailyReset: true,
    resetHour: "00:00",
    lastResetDate: getTodayDateString()
  };

  const currentUser = (typeof Auth !== "undefined" && Auth.getUser) ? Auth.getUser() : { username: "wansmin", role: "super_admin" };
  const userRole = (currentUser.role || "").toLowerCase().trim();
  const isSuperAdmin = (currentUser.username === "wansmin" || userRole === "super_admin" || userRole === "superadmin" || userRole.includes("admin"));
  const canDeleteTask = isSuperAdmin || (typeof Auth !== "undefined" && Auth.hasPermission("admin_tasks:delete"));
  const canCreateTask = isSuperAdmin || (typeof Auth !== "undefined" && Auth.hasPermission("admin_tasks:create"));
  const canUpdateTask = isSuperAdmin || (typeof Auth !== "undefined" && Auth.hasPermission("admin_tasks:update"));

  // ==========================================
  // HELPER UTILITIES
  // ==========================================
  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return dateStr;
    }
  }

  function escapeHtmlSafe(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sanitizeTaskLink(link) {
    if (!link) return "";
    const clean = String(link).trim();
    if (clean.toLowerCase().startsWith("javascript:") || clean.toLowerCase().startsWith("data:")) {
      return "#";
    }
    return clean;
  }

  // Web Audio API Synthesized Chime (Rich crystal chime without external MP3 files)
  function playNotificationChime(isDoneChime = false) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (isDoneChime) {
        // Success melody (ascending notes: C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
        });
      } else {
        // Reminder Alert chime (crystal double bell: 880Hz -> 1174.66Hz)
        const notes = [880.0, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.55);
        });
      }
    } catch (e) {
      console.warn("Audio chime playback not allowed or failed:", e);
    }
  }

  // ==========================================
  // AUTO-RESET HARIAN (DAILY AUTO-RESET ENGINE)
  // ==========================================
  async function checkAndApplyDailyAutoReset() {
    const today = getTodayDateString();
    let hasReset = false;

    // Check settings last reset date
    const savedLastReset = localStorage.getItem("fpmanager_admin_tasks_last_reset") || settingsData.lastResetDate;

    if (savedLastReset && savedLastReset !== today && settingsData.autoDailyReset !== false) {
      console.log(`[Auto-Reset Harian] Pergantian tanggal terdeteksi (${savedLastReset} -> ${today}). Me-reset checklist tugas.`);
      
      tasksData = tasksData.map(task => {
        return {
          ...task,
          status: "Belum Selesai",
          lastResetDate: today
        };
      });

      localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
      localStorage.setItem("fpmanager_admin_tasks_last_reset", today);
      settingsData.lastResetDate = today;

      hasReset = true;
      if (typeof Toast !== "undefined") {
        Toast.info("✨ Hari Baru Dimulai!", "Status seluruh checklist tugas harian admin telah di-reset otomatis ke 'Belum Selesai'.");
      }
    } else {
      localStorage.setItem("fpmanager_admin_tasks_last_reset", today);
    }

    if (bannerAutoResetDate) {
      bannerAutoResetDate.innerText = `Auto-Reset: Aktif Tiap 00:00 (Hari ini: ${formatDisplayDate(today)})`;
    }

    return hasReset;
  }

  // ==========================================
  // DATA LOAD & RENDER
  // ==========================================
  async function loadAdminTasks() {
    try {
      taskTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-10 text-zinc-400">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-500"></i>
            <p class="font-medium">Memuat data aktivitas tugas admin...</p>
          </td>
        </tr>
      `;

      // Load Settings & Users in parallel
      const [tasksRes, settingsRes, usersRes] = await Promise.allSettled([
        API.getAdminTasks(),
        API.getAdminTaskSettings(),
        API.getUsers()
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        settingsData = { ...settingsData, ...settingsRes.value };
      }

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value) && usersRes.value.length > 0) {
        usersList = usersRes.value;
      } else {
        // Fallback default users if API returns empty
        usersList = [
          { id: "USR-001", username: "wansmin", name: "Super Admin", role: "super_admin" },
          { id: "USR-002", username: "service", name: "Admin Customer Service", role: "service" },
          { id: "USR-003", username: "desainer", name: "Tim Desainer", role: "desainer" }
        ];
      }

      populateUserDropdowns();

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        tasksData = tasksRes.value;
      }

      // Check daily auto-reset
      await checkAndApplyDailyAutoReset();

      renderTasks();
      updateStats();
      applySettingsToUI();
      scheduleNotificationChecker();
    } catch (err) {
      console.error("Gagal load admin tasks:", err);
      if (typeof Toast !== "undefined") {
        Toast.error("Gagal Memuat", "Terjadi kesalahan saat memuat checklist tugas admin.");
      }
    }
  }
  window.loadAdminTasks = loadAdminTasks;

  function populateUserDropdowns() {
    // 1. Populate filter dropdown
    let filterOptionsHtml = `
      <option value="all">Semua Admin (Semua Tugas)</option>
      <option value="mine">Tugas Saya Saja (@${escapeHtmlSafe(currentUser.username)})</option>
      <option value="shared">Shared Task (SOP Bersama)</option>
    `;

    usersList.forEach(u => {
      if (u.username) {
        const roleLabel = (u.role || 'Admin').toUpperCase();
        filterOptionsHtml += `<option value="${escapeHtmlSafe(u.username)}">${escapeHtmlSafe(u.name || u.username)} (@${escapeHtmlSafe(u.username)} - ${roleLabel})</option>`;
      }
    });
    filterAdminSelect.innerHTML = filterOptionsHtml;

    // 2. Populate modal single assignment dropdown
    let modalOptionsHtml = `<option value="all">👥 Semua Admin (Shared SOP Bersama)</option>`;
    if (!isSuperAdmin) {
      // Non-super admin can only assign to themselves or shared
      modalOptionsHtml += `<option value="${escapeHtmlSafe(currentUser.username)}" selected>👤 ${escapeHtmlSafe(currentUser.name || currentUser.username)} (@${escapeHtmlSafe(currentUser.username)})</option>`;
    } else {
      usersList.forEach(u => {
        const roleLabel = (u.role || 'Admin').toUpperCase();
        modalOptionsHtml += `<option value="${escapeHtmlSafe(u.username)}">👤 ${escapeHtmlSafe(u.name || u.username)} (@${escapeHtmlSafe(u.username)} - ${roleLabel})</option>`;
      });
      // Ensure current user is in list if not yet
      if (!usersList.some(u => u.username === currentUser.username)) {
        modalOptionsHtml += `<option value="${escapeHtmlSafe(currentUser.username)}">👤 ${escapeHtmlSafe(currentUser.name || currentUser.username)} (@${escapeHtmlSafe(currentUser.username)})</option>`;
      }
    }
    taskAdminSelect.innerHTML = modalOptionsHtml;

    // 3. Populate modal multi-admin checkboxes
    let multiCheckboxesHtml = "";
    usersList.forEach(u => {
      if (u.username) {
        const roleLabel = (u.role || 'Admin').toUpperCase();
        multiCheckboxesHtml += `
          <label class="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 cursor-pointer text-xs">
            <input type="checkbox" name="multiAdminUser" value="${escapeHtmlSafe(u.username)}" class="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4">
            <span class="font-medium text-zinc-800 dark:text-zinc-200 truncate">${escapeHtmlSafe(u.name || u.username)} <span class="text-[10px] text-zinc-400">(@${escapeHtmlSafe(u.username)})</span></span>
          </label>
        `;
      }
    });
    multiAdminCheckboxList.innerHTML = multiCheckboxesHtml;

    // Update admin count badge
    if (adminCountBadge) {
      adminCountBadge.innerText = `${usersList.length} Admin Terdaftar`;
    }

    // Render Tab Pills and Workload Cards
    renderAdminFilterTabs();
    renderAdminWorkloadCards();
  }

  // ==========================================
  // ADMIN FILTER TABS & WORKLOAD MATRIX
  // ==========================================
  function renderAdminFilterTabs() {
    if (!adminFilterTabsContainer) return;

    const totalAll = tasksData.length;
    const myTasks = tasksData.filter(t => t.adminUser === currentUser.username || t.adminUser === "all");
    const myDone = myTasks.filter(t => t.status === "Selesai").length;
    const sharedTasks = tasksData.filter(t => t.adminUser === "all");

    let tabsHtml = `
      <button onclick="setFilterAdmin('all')"
        class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${currentActiveAdminTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
        <i class="fa-solid fa-list-ul text-[10px]"></i>
        <span>Semua Admin</span>
        <span class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${currentActiveAdminTab === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}">${totalAll}</span>
      </button>

      <button onclick="setFilterAdmin('mine')"
        class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${currentActiveAdminTab === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
        <i class="fa-solid fa-user-check text-[10px]"></i>
        <span>Tugas Saya</span>
        <span class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${currentActiveAdminTab === 'mine' ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}">${myDone}/${myTasks.length}</span>
      </button>

      <button onclick="setFilterAdmin('shared')"
        class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${currentActiveAdminTab === 'shared' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
        <i class="fa-solid fa-users text-[10px]"></i>
        <span>Shared SOP</span>
        <span class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${currentActiveAdminTab === 'shared' ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}">${sharedTasks.length}</span>
      </button>
    `;

    // Dynamic Tab per registered user
    usersList.forEach(u => {
      if (u.username) {
        const uTasks = tasksData.filter(t => t.adminUser === u.username);
        const uDone = uTasks.filter(t => t.status === "Selesai").length;
        const isActive = currentActiveAdminTab === u.username;

        tabsHtml += `
          <button onclick="setFilterAdmin('${escapeHtmlSafe(u.username)}')"
            class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
            <span class="h-2 w-2 rounded-full ${uDone === uTasks.length && uTasks.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
            <span>${escapeHtmlSafe(u.name || u.username)}</span>
            <span class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}">${uDone}/${uTasks.length}</span>
          </button>
        `;
      }
    });

    adminFilterTabsContainer.innerHTML = tabsHtml;
  }

  window.setFilterAdmin = (adminKey) => {
    currentActiveAdminTab = adminKey;
    filterAdminSelect.value = adminKey;
    renderAdminFilterTabs();
    renderTasks();
  };

  function renderAdminWorkloadCards() {
    if (!adminWorkloadContainer) return;

    if (usersList.length === 0) {
      adminWorkloadContainer.innerHTML = `<div class="col-span-full text-center py-4 text-xs text-zinc-400">Tidak ada admin terdaftar.</div>`;
      return;
    }

    let cardsHtml = "";

    // 1. Shared SOP Card
    const sharedTasks = tasksData.filter(t => t.adminUser === "all");
    const sharedDone = sharedTasks.filter(t => t.status === "Selesai").length;
    const sharedPercent = sharedTasks.length > 0 ? Math.round((sharedDone / sharedTasks.length) * 100) : 0;

    cardsHtml += `
      <div class="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-zinc-900/40 hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2.5">
            <div class="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div class="font-bold text-xs text-zinc-900 dark:text-white">Shared SOP Bersama</div>
              <div class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase">Semua Admin</div>
            </div>
          </div>
          <button onclick="setFilterAdmin('shared')" class="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg text-xs" title="Filter checklist shared SOP">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
          </button>
        </div>
        
        <div class="space-y-1.5 mt-2.5">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-zinc-500 dark:text-zinc-400 font-medium">Progres Selesai:</span>
            <span class="font-bold text-purple-700 dark:text-purple-300 font-mono">${sharedDone}/${sharedTasks.length} (${sharedPercent}%)</span>
          </div>
          <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div class="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style="width: ${sharedPercent}%"></div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-purple-100 dark:border-purple-900/40 flex justify-between items-center text-[11px]">
          <span class="text-zinc-400">${sharedTasks.length - sharedDone} Belum Selesai</span>
          ${canCreateTask ? `
            <button onclick="openAddTaskModal('all')" class="text-purple-600 dark:text-purple-400 hover:underline font-bold text-[10px]">
              + Tambah SOP
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // 2. Individual Admin Cards
    usersList.forEach(u => {
      const uTasks = tasksData.filter(t => t.adminUser === u.username);
      const uDone = uTasks.filter(t => t.status === "Selesai").length;
      const uPending = uTasks.length - uDone;
      const uPercent = uTasks.length > 0 ? Math.round((uDone / uTasks.length) * 100) : 0;
      const isMe = u.username === currentUser.username;
      const roleLabel = (u.role || 'Admin').toUpperCase();

      cardsHtml += `
        <div class="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:shadow-md transition-all ${isMe ? 'ring-1 ring-indigo-500/50' : ''}">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2.5 min-w-0">
              <div class="h-8 w-8 rounded-xl ${isMe ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-100'} flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
                ${escapeHtmlSafe((u.name || u.username).charAt(0).toUpperCase())}
              </div>
              <div class="min-w-0">
                <div class="font-bold text-xs text-zinc-900 dark:text-white truncate flex items-center gap-1">
                  <span>${escapeHtmlSafe(u.name || u.username)}</span>
                  ${isMe ? '<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1 py-0.2 rounded font-bold">Anda</span>' : ''}
                </div>
                <div class="text-[10px] text-zinc-400 font-mono truncate">@${escapeHtmlSafe(u.username)} • ${roleLabel}</div>
              </div>
            </div>
            <button onclick="setFilterAdmin('${escapeHtmlSafe(u.username)}')" class="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-xs" title="Lihat tugas @${escapeHtmlSafe(u.username)}">
              <i class="fa-solid fa-filter text-[11px]"></i>
            </button>
          </div>
          
          <div class="space-y-1.5 mt-2.5">
            <div class="flex justify-between items-center text-[11px]">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">Capaian Hari Ini:</span>
              <span class="font-bold ${uPercent === 100 && uTasks.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'} font-mono">
                ${uDone}/${uTasks.length} (${uPercent}%)
              </span>
            </div>
            <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
              <div class="h-1.5 rounded-full transition-all duration-500 ${uPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}" style="width: ${uPercent}%"></div>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-700/80 flex justify-between items-center text-[11px]">
            <span class="${uPending > 0 ? 'text-rose-500 font-semibold' : 'text-zinc-400'}">${uPending} Belum Selesai</span>
            ${canCreateTask ? `
              <button onclick="openAddTaskModal('${escapeHtmlSafe(u.username)}')" class="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[10px] flex items-center gap-1">
                <i class="fa-solid fa-plus text-[9px]"></i> Beri Tugas
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    adminWorkloadContainer.innerHTML = cardsHtml;
  }

  window.toggleWorkloadCards = () => {
    isWorkloadExpanded = !isWorkloadExpanded;
    const textEl = document.getElementById("toggleWorkloadText");
    const iconEl = document.getElementById("toggleWorkloadIcon");

    if (isWorkloadExpanded) {
      adminWorkloadContainer.classList.remove("hidden");
      if (textEl) textEl.innerText = "Sembunyikan Ringkasan";
      if (iconEl) iconEl.className = "fa-solid fa-chevron-up text-[10px]";
    } else {
      adminWorkloadContainer.classList.add("hidden");
      if (textEl) textEl.innerText = "Tampilkan Ringkasan";
      if (iconEl) iconEl.className = "fa-solid fa-chevron-down text-[10px]";
    }
  };

  // ==========================================
  // TABLE RENDERING WITH INLINE ADMIN REASSIGN
  // ==========================================
  function renderTasks() {
    const searchQuery = (taskSearchInput.value || "").toLowerCase().trim();
    const adminFilter = filterAdminSelect.value || "all";
    const statusFilter = filterStatusSelect.value || "all";
    const scheduleFilter = filterScheduleSelect.value || "all";

    const filtered = tasksData.filter(task => {
      // Search
      if (searchQuery) {
        const matchName = (task.taskName || "").toLowerCase().includes(searchQuery);
        const matchAdmin = (task.adminName || "").toLowerCase().includes(searchQuery) || (task.adminUser || "").toLowerCase().includes(searchQuery);
        const matchNotes = (task.notes || "").toLowerCase().includes(searchQuery);
        const matchTotal = (task.total || "").toLowerCase().includes(searchQuery);
        if (!matchName && !matchAdmin && !matchNotes && !matchTotal) return false;
      }

      // Filter Admin
      if (adminFilter === "mine") {
        if (task.adminUser !== currentUser.username && task.adminUser !== "all") return false;
      } else if (adminFilter === "shared") {
        if (task.adminUser !== "all") return false;
      } else if (adminFilter !== "all") {
        if (task.adminUser !== adminFilter) return false;
      }

      // Filter Status
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Filter Schedule
      if (scheduleFilter !== "all") {
        if (task.scheduleType !== scheduleFilter) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      taskTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-12 text-zinc-400">
            <div class="max-w-sm mx-auto space-y-2">
              <i class="fa-solid fa-clipboard-check text-4xl text-zinc-300 dark:text-zinc-600 block mb-1"></i>
              <p class="font-bold text-zinc-600 dark:text-zinc-300">Tidak ada tugas yang sesuai.</p>
              <p class="text-xs text-zinc-400">Silakan sesuaikan filter pencarian atau buat checklist tugas baru.</p>
              ${canCreateTask ? `
                <button onclick="openAddTaskModal()" class="mt-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-all">
                  <i class="fa-solid fa-plus mr-1"></i> Tambah Tugas Baru
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
      tableRecordCount.innerText = "Menampilkan 0 tugas";
      return;
    }

    tableRecordCount.innerText = `Menampilkan ${filtered.length} dari ${tasksData.length} tugas`;

    taskTableBody.innerHTML = filtered.map((task, idx) => {
      const isDone = task.status === "Selesai";
      const isProgress = task.status === "Sedang Dikerjakan";

      // Status Badge Style
      let statusBadgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      let statusIcon = "fa-clock";
      if (isDone) {
        statusBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
        statusIcon = "fa-check";
      } else if (isProgress) {
        statusBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
        statusIcon = "fa-spinner fa-spin";
      }

      // Schedule Badge
      let scheduleLabel = "Rutin Harian";
      let scheduleIcon = "fa-calendar-day";
      if (task.scheduleType === "hourly") {
        scheduleLabel = `Tiap ${task.intervalHours || 1} Jam`;
        scheduleIcon = "fa-clock-rotate-left";
      } else if (task.scheduleType === "specific") {
        scheduleLabel = `Pukul ${task.specificTime || '09:00'} WIB`;
        scheduleIcon = "fa-bell";
      }

      // Priority Indicator
      let priorityPill = `<span class="h-2 w-2 rounded-full bg-amber-400 mr-1.5 flex-shrink-0" title="Prioritas Sedang"></span>`;
      if (task.priority === "high") {
        priorityPill = `<span class="h-2 w-2 rounded-full bg-rose-500 mr-1.5 flex-shrink-0" title="Prioritas Tinggi"></span>`;
      } else if (task.priority === "low") {
        priorityPill = `<span class="h-2 w-2 rounded-full bg-emerald-400 mr-1.5 flex-shrink-0" title="Prioritas Rendah"></span>`;
      }

      // Admin Label & Assignment Pill
      const adminName = task.adminName || (task.adminUser === "all" ? "Semua Admin" : `@${task.adminUser}`);
      const isAdminMine = task.adminUser === currentUser.username;
      const isShared = task.adminUser === "all";

      // Inline Admin Switcher for Super Admin
      let adminSelectorHtml = "";
      if (isSuperAdmin) {
        let adminOptions = `<option value="all" ${task.adminUser === 'all' ? 'selected' : ''}>👥 Semua Admin (Shared)</option>`;
        usersList.forEach(u => {
          if (u.username) {
            adminOptions += `<option value="${escapeHtmlSafe(u.username)}" ${task.adminUser === u.username ? 'selected' : ''}>👤 ${escapeHtmlSafe(u.name || u.username)}</option>`;
          }
        });
        adminSelectorHtml = `
          <select onchange="quickReassignTask('${task.id}', this.value)"
            class="text-[11px] font-bold py-0.5 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
            title="Ubah Penanggung Jawab Admin">
            ${adminOptions}
          </select>
        `;
      } else {
        adminSelectorHtml = `
          <div class="font-bold text-zinc-900 dark:text-white text-xs flex items-center gap-1">
            <span>${escapeHtmlSafe(adminName)}</span>
            ${isAdminMine ? '<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold">Anda</span>' : ''}
          </div>
          <div class="text-[10px] text-zinc-400 font-mono">${isShared ? 'Shared Task' : `@${escapeHtmlSafe(task.adminUser)}`}</div>
        `;
      }

      // Link Button
      const cleanLink = sanitizeTaskLink(task.link);
      const linkHtml = (task.link && cleanLink !== "#") ? `
        <a href="${cleanLink}" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors shadow-xs"
          title="Buka Tautan: ${escapeHtmlSafe(task.link)}">
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          <span>Buka</span>
        </a>
      ` : `<span class="text-zinc-300 dark:text-zinc-600 text-xs">-</span>`;

      return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors ${isDone ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}">
          
          <!-- Checkbox Selesai Toggle -->
          <td class="px-4 py-3.5 text-center">
            <button onclick="toggleTaskStatusDirectly('${task.id}')"
              class="h-7 w-7 rounded-xl flex items-center justify-center transition-all transform active:scale-90 ${isDone ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600' : 'border-2 border-zinc-300 dark:border-zinc-600 text-transparent hover:border-indigo-500 hover:text-indigo-400'}"
              title="${isDone ? 'Klik untuk tandai Belum Selesai' : 'Klik untuk tandai Selesai'}">
              <i class="fa-solid fa-check text-xs font-bold"></i>
            </button>
          </td>

          <!-- User Admin -->
          <td class="px-4 py-3.5 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <div class="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isShared ? 'bg-purple-600' : isAdminMine ? 'bg-indigo-600' : 'bg-zinc-600'}">
                ${isShared ? '<i class="fa-solid fa-users text-[10px]"></i>' : escapeHtmlSafe(adminName.charAt(0).toUpperCase())}
              </div>
              <div>
                ${adminSelectorHtml}
              </div>
            </div>
          </td>

          <!-- Nama Tugas -->
          <td class="px-4 py-3.5 min-w-[200px]">
            <div class="flex items-center">
              ${priorityPill}
              <span class="font-bold text-zinc-800 dark:text-zinc-100 ${isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">
                ${escapeHtmlSafe(task.taskName)}
              </span>
            </div>
          </td>

          <!-- Jadwal / Interval -->
          <td class="px-4 py-3.5 whitespace-nowrap">
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-xs font-semibold border border-zinc-200 dark:border-zinc-600/50">
              <i class="fa-solid ${scheduleIcon} text-indigo-500 text-[11px]"></i>
              <span>${escapeHtmlSafe(scheduleLabel)}</span>
            </span>
          </td>

          <!-- Status Dropdown / Badge -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            <select onchange="updateTaskStatusValue('${task.id}', this.value)"
              class="px-2.5 py-1 text-xs font-bold rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${statusBadgeClass}">
              <option value="Belum Selesai" ${task.status === 'Belum Selesai' ? 'selected' : ''}>🔴 Belum Selesai</option>
              <option value="Sedang Dikerjakan" ${task.status === 'Sedang Dikerjakan' ? 'selected' : ''}>🟡 Sedang Dikerjakan</option>
              <option value="Selesai" ${task.status === 'Selesai' ? 'selected' : ''}>🟢 Selesai</option>
            </select>
          </td>

          <!-- Total / Metrik -->
          <td class="px-4 py-3.5 whitespace-nowrap">
            ${task.total ? `
              <span class="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-xs">
                ${escapeHtmlSafe(task.total)}
              </span>
            ` : `<span class="text-zinc-400 text-xs">-</span>`}
          </td>

          <!-- Catatan -->
          <td class="px-4 py-3.5 max-w-[240px]">
            <p class="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2" title="${escapeHtmlSafe(task.notes || '-')}">
              ${escapeHtmlSafe(task.notes || '-')}
            </p>
          </td>

          <!-- Link -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            ${linkHtml}
          </td>

          <!-- Aksi (Edit for Admin CRU, Delete for Super Admin CRUD) -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            <div class="flex items-center justify-center space-x-1">
              <!-- Edit Button (CRU) -->
              <button onclick="openEditTaskModal('${task.id}')"
                class="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Edit Tugas / Catatan">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <!-- Delete Button (CRUD - Super Admin Only) -->
              ${canDeleteTask ? `
                <button onclick="deleteAdminTaskConfirm('${task.id}', '${escapeHtmlSafe(task.taskName)}')"
                  class="p-1.5 text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Hapus Tugas">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : ''}
            </div>
          </td>

        </tr>
      `;
    }).join("");
  }

  // Inline quick reassign from table
  window.quickReassignTask = async (taskId, newAdminUser) => {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;

    let newAdminName = "Semua Admin";
    if (newAdminUser !== "all") {
      const u = usersList.find(x => x.username === newAdminUser);
      newAdminName = u ? (u.name || u.username) : `@${newAdminUser}`;
    }

    task.adminUser = newAdminUser;
    task.adminName = newAdminName;

    renderTasks();
    updateStats();

    try {
      await API.updateAdminTask(taskId, { adminUser: newAdminUser, adminName: newAdminName });
      if (typeof Toast !== "undefined") {
        Toast.success("Admin Ditugaskan", `Tugas "${task.taskName}" berhasil ditugaskan ke ${newAdminName}.`);
      }
    } catch(e) {
      console.warn("Gagal update admin penugasan:", e);
    }
  };

  function updateStats() {
    const total = tasksData.length;
    const done = tasksData.filter(t => t.status === "Selesai").length;
    const pending = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    statTotalTasks.innerText = total;
    statDoneTasks.innerText = done;
    statPendingTasks.innerText = pending;
    statProgressPercent.innerText = `${percent}% tercapai`;

    progressBarFill.style.width = `${percent}%`;
    progressBarText.innerText = `${done}/${total} Selesai (${percent}%)`;

    // Default interval display
    statActiveInterval.innerText = `Tiap ${settingsData.defaultIntervalHours || 1} Jam`;

    // Refresh Tab counter and Workload cards
    renderAdminFilterTabs();
    renderAdminWorkloadCards();
  }

  function applySettingsToUI() {
    settingDefaultInterval.value = String(settingsData.defaultIntervalHours || 1);
    settingSoundToggle.checked = settingsData.soundNotification !== false;
    settingBrowserNotifToggle.checked = settingsData.browserNotification !== false;
    settingToastToggle.checked = settingsData.toastReminder !== false;
    settingAutoResetToggle.checked = settingsData.autoDailyReset !== false;

    // Lock interval configuration in task modal if not super admin
    if (!isSuperAdmin) {
      intervalAdminOnlyBadge.classList.remove("hidden");
    } else {
      intervalAdminOnlyBadge.classList.add("hidden");
    }
  }

  // ==========================================
  // SOP PRESET TEMPLATES
  // ==========================================
  const SOP_TEMPLATES = {
    cs_wa: {
      taskName: "Follow-up Chat WhatsApp Klien",
      adminRole: "service",
      scheduleType: "hourly",
      intervalHours: 1,
      total: "15 Chat",
      link: "https://web.whatsapp.com",
      notes: "Balas semua chat calon klien dan tanyakan kelanjutan kebutuhan portofolio atau estimasi biaya."
    },
    cs_inquiry: {
      taskName: "Respon Pesan & Tanya Jawab Masuk",
      adminRole: "service",
      scheduleType: "hourly",
      intervalHours: 2,
      total: "10 Pesan",
      link: "https://mail.google.com",
      notes: "Cek email masuk, inquiry form website, dan direct message sosial media."
    },
    cs_invoice: {
      taskName: "Kirim Tagihan & Invoice ke Klien",
      adminRole: "service",
      scheduleType: "specific",
      specificTime: "10:00",
      total: "5 Invoice",
      link: "invoice.html",
      notes: "Kirim invoice DP bagi projek baru dan invoice pelunasan bagi projek yang telah selesai."
    },
    cs_review: {
      taskName: "Minta Review / Testimoni Klien Selesai",
      adminRole: "service",
      scheduleType: "daily",
      intervalHours: 24,
      total: "3 Review",
      link: "proyek.html",
      notes: "Kirim pesan ucapan terima kasih dan form review bintang 5 ke klien yang telah tuntas."
    },
    fin_mutasi: {
      taskName: "Cek Mutasi & Rekening Pembayaran Masuk",
      adminRole: "super_admin",
      scheduleType: "specific",
      specificTime: "09:00",
      total: "100% Cocok",
      link: "keuangan.html",
      notes: "Cek rekening bank dan verifikasi bukti transfer DP/pelunasan sebelum pengerjaan dimulai."
    },
    fin_kas: {
      taskName: "Rekap Arus Kas & Pengeluaran Harian",
      adminRole: "super_admin",
      scheduleType: "specific",
      specificTime: "17:00",
      total: "Rp 1.000.000",
      link: "keuangan.html",
      notes: "Input seluruh struk pengeluaran harian dan hitung total saldo kas penutupan."
    },
    fin_laporan: {
      taskName: "Verifikasi Pembukuan & Laporan Mingguan",
      adminRole: "super_admin",
      scheduleType: "daily",
      intervalHours: 24,
      link: "laporan.html",
      total: "100%",
      notes: "Periksa grafik omzet dan ekspor laporan keuangan ke format Excel."
    },
    des_update: {
      taskName: "Update Progress Desain di Trello/Drive",
      adminRole: "desainer",
      scheduleType: "hourly",
      intervalHours: 3,
      total: "5 Projek",
      link: "tools.html",
      notes: "Upload progres revisi dan preview desain ke folder Google Drive klien masing-masing."
    },
    des_preview: {
      taskName: "Kirim Preview Desain / Draft Revisi ke Klien",
      adminRole: "desainer",
      scheduleType: "specific",
      specificTime: "14:00",
      total: "3 Draft",
      link: "proyek.html",
      notes: "Kirim mockup ber-watermark untuk review klien dan catat poin-poin feedback."
    },
    des_final: {
      taskName: "Ekspor & Kirim File Final Projek",
      adminRole: "desainer",
      scheduleType: "specific",
      specificTime: "16:00",
      total: "2 Master",
      link: "tools.html",
      notes: "Pastikan font ter-convert outlines/curves, warna CMYK/RGB sesuai, dan resolusi 300 DPI."
    },
    des_backup: {
      taskName: "Backup File Mentah / Master Desain ke Cloud",
      adminRole: "desainer",
      scheduleType: "daily",
      intervalHours: 24,
      link: "tools.html",
      total: "100%",
      notes: "Arsipkan file .AI, .PSD, atau .EPS ke Google Drive Cloud Storage."
    },
    soc_post: {
      taskName: "Posting Feed / Reel Instagram & TikTok",
      adminRole: "all",
      scheduleType: "specific",
      specificTime: "11:00",
      total: "1 Konten",
      link: "https://instagram.com",
      notes: "Posting konten edukasi desain beserta caption menarik dan hashtag yang relevan."
    },
    soc_story: {
      taskName: "Update Story & Engagement Interaktif",
      adminRole: "all",
      scheduleType: "hourly",
      intervalHours: 4,
      total: "3 Story",
      link: "https://instagram.com",
      notes: "Posting cuplikan behind-the-scenes pengerjaan desain dan polling interaktif."
    },
    soc_analytics: {
      taskName: "Rekap Insight & Jangkauan Konten",
      adminRole: "all",
      scheduleType: "daily",
      intervalHours: 24,
      total: "100%",
      notes: "Catat pertambahan followers, jangkauan akun, dan interaksi komentar harian."
    },
    adm_briefing: {
      taskName: "Briefing Harian & Review Antrean Projek",
      adminRole: "super_admin",
      scheduleType: "specific",
      specificTime: "08:30",
      total: "10 Projek",
      link: "proyek.html",
      notes: "Cek deadline projek aktif dan delegasikan ke desainer yang tersedia."
    },
    adm_backup: {
      taskName: "Backup Spreadsheet & Verifikasi Akun Baru",
      adminRole: "super_admin",
      scheduleType: "daily",
      intervalHours: 24,
      link: "pengaturan.html",
      total: "100%",
      notes: "Pastikan seluruh data projek dan kas tersinkronisasi aman di Google Sheets."
    },
    adm_eval: {
      taskName: "Evaluasi Capaian Harian & SOP Tim",
      adminRole: "super_admin",
      scheduleType: "specific",
      specificTime: "17:30",
      total: "100%",
      notes: "Evaluasi checklist tindakan yang belum selesai dan siapkan target untuk esok hari."
    }
  };

  window.applyTaskTemplate = (templateKey) => {
    if (!templateKey || !SOP_TEMPLATES[templateKey]) return;
    const tpl = SOP_TEMPLATES[templateKey];

    taskNameInput.value = tpl.taskName || "";
    taskScheduleTypeSelect.value = tpl.scheduleType || "hourly";
    if (tpl.intervalHours) taskIntervalHoursSelect.value = String(tpl.intervalHours);
    if (tpl.specificTime) taskSpecificTimeInput.value = tpl.specificTime;
    taskTotalInput.value = tpl.total || "";
    taskLinkInput.value = tpl.link || "";
    taskNotesInput.value = tpl.notes || "";

    // Suggest matching admin
    if (isSuperAdmin) {
      if (tpl.adminRole === "all") {
        taskAdminSelect.value = "all";
      } else {
        const matchingUser = usersList.find(u => (u.role || '').toLowerCase().includes(tpl.adminRole) || u.username.toLowerCase().includes(tpl.adminRole));
        if (matchingUser) {
          taskAdminSelect.value = matchingUser.username;
        } else {
          taskAdminSelect.value = "all";
        }
      }
    }

    toggleScheduleInputs();
    if (typeof Toast !== "undefined") {
      Toast.info("Template Diterapkan", `Formulir otomatis terisi dengan template "${tpl.taskName}".`);
    }
  };

  // ==========================================
  // ASSIGNMENT MODE (SINGLE / MULTI / SHARED)
  // ==========================================
  window.toggleAssignMode = (mode) => {
    if (mode === "single") {
      singleAdminSelectContainer.classList.remove("hidden");
      multiAdminChecklistContainer.classList.add("hidden");
      taskAdminSelect.required = true;
    } else if (mode === "shared") {
      singleAdminSelectContainer.classList.remove("hidden");
      multiAdminChecklistContainer.classList.add("hidden");
      taskAdminSelect.value = "all";
      taskAdminSelect.required = true;
    } else if (mode === "multi") {
      singleAdminSelectContainer.classList.add("hidden");
      multiAdminChecklistContainer.classList.remove("hidden");
      taskAdminSelect.required = false;
    }
  };

  window.selectAllMultiAdmins = (check) => {
    const checkboxes = document.querySelectorAll('input[name="multiAdminUser"]');
    checkboxes.forEach(cb => cb.checked = check);
  };

  // ==========================================
  // TASK CRUD ACTIONS
  // ==========================================
  window.openAddTaskModal = (preSelectedAdmin = null) => {
    taskForm.reset();
    taskIdInput.value = "";
    taskModalTitle.innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-600 mr-1.5"></i><span>Tambah Tindakan / Tugas Baru</span>`;
    
    // Default values
    taskStatusSelect.value = "Belum Selesai";
    taskPrioritySelect.value = "medium";
    taskScheduleTypeSelect.value = "hourly";
    taskIntervalHoursSelect.value = String(settingsData.defaultIntervalHours || 1);
    taskSpecificTimeInput.value = "09:00";
    taskTemplateSelect.value = "";
    
    // Reset Assignment Mode
    const singleRadio = document.querySelector('input[name="assignMode"][value="single"]');
    if (singleRadio) singleRadio.checked = true;
    toggleAssignMode("single");
    selectAllMultiAdmins(false);

    // Auto-select admin
    if (preSelectedAdmin) {
      taskAdminSelect.value = preSelectedAdmin;
    } else if (!isSuperAdmin) {
      taskAdminSelect.value = currentUser.username || "all";
    } else {
      taskAdminSelect.value = "all";
    }

    toggleScheduleInputs();
    taskModal.classList.remove("hidden");
  };

  window.openEditTaskModal = (id) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    taskIdInput.value = task.id;
    taskNameInput.value = task.taskName || "";
    taskAdminSelect.value = task.adminUser || "all";
    taskPrioritySelect.value = task.priority || "medium";
    taskScheduleTypeSelect.value = task.scheduleType || "hourly";
    taskIntervalHoursSelect.value = String(task.intervalHours || 1);
    taskSpecificTimeInput.value = task.specificTime || "09:00";
    taskTotalInput.value = task.total || "";
    taskStatusSelect.value = task.status || "Belum Selesai";
    taskLinkInput.value = task.link || "";
    taskNotesInput.value = task.notes || "";
    taskTemplateSelect.value = "";

    // Edit mode only supports single/shared
    const singleRadio = document.querySelector('input[name="assignMode"][value="single"]');
    if (singleRadio) singleRadio.checked = true;
    toggleAssignMode("single");

    taskModalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600 mr-1.5"></i><span>Edit Tindakan: ${escapeHtmlSafe(task.taskName)}</span>`;
    toggleScheduleInputs();
    taskModal.classList.remove("hidden");
  };

  function closeTaskModal() {
    taskModal.classList.add("hidden");
  }

  if (openAddTaskModalBtn) openAddTaskModalBtn.addEventListener("click", () => window.openAddTaskModal());
  if (closeTaskModalBtn) closeTaskModalBtn.addEventListener("click", closeTaskModal);
  if (cancelTaskModalBtn) cancelTaskModalBtn.addEventListener("click", closeTaskModal);
  if (taskModal) {
    taskModal.addEventListener("click", (e) => {
      if (e.target === taskModal) closeTaskModal();
    });
  }

  function toggleScheduleInputs() {
    const type = taskScheduleTypeSelect.value;
    if (type === "hourly") {
      intervalHoursContainer.classList.remove("hidden");
      specificTimeContainer.classList.add("hidden");
    } else if (type === "specific") {
      intervalHoursContainer.classList.add("hidden");
      specificTimeContainer.classList.remove("hidden");
    } else {
      // Daily
      intervalHoursContainer.classList.add("hidden");
      specificTimeContainer.classList.add("hidden");
    }
  }

  taskScheduleTypeSelect.addEventListener("change", toggleScheduleInputs);

  // Form Submit (Create / Multi-Create / Update)
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = taskIdInput.value;
    const taskName = taskNameInput.value.trim();
    if (!taskName) {
      if (typeof Toast !== "undefined") Toast.warning("Peringatan", "Nama tindakan wajib diisi.");
      return;
    }

    const assignMode = (document.querySelector('input[name="assignMode"]:checked') || {}).value || "single";
    const saveBtn = document.getElementById("saveTaskBtn");
    const origHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Menyimpan...`;

    try {
      if (id) {
        // Update existing task
        const adminUser = taskAdminSelect.value;
        let adminName = "Semua Admin";
        if (adminUser !== "all") {
          const u = usersList.find(x => x.username === adminUser);
          adminName = u ? (u.name || u.username) : `@${adminUser}`;
        }

        const taskPayload = {
          taskName,
          adminUser,
          adminName,
          priority: taskPrioritySelect.value,
          scheduleType: taskScheduleTypeSelect.value,
          intervalHours: Number(taskIntervalHoursSelect.value) || 1,
          specificTime: taskSpecificTimeInput.value || "09:00",
          total: taskTotalInput.value.trim(),
          status: taskStatusSelect.value,
          link: taskLinkInput.value.trim(),
          notes: taskNotesInput.value.trim(),
          lastResetDate: getTodayDateString()
        };

        await API.updateAdminTask(id, taskPayload);
        tasksData = tasksData.map(t => (t.id === id ? { ...t, ...taskPayload } : t));
        if (typeof Toast !== "undefined") Toast.success("Tersimpan!", "Tugas admin berhasil diperbarui.");
      } else {
        // Create new task(s)
        if (assignMode === "multi") {
          // Multi-Admin Batch Creation
          const selectedCheckboxes = document.querySelectorAll('input[name="multiAdminUser"]:checked');
          if (selectedCheckboxes.length === 0) {
            if (typeof Toast !== "undefined") Toast.warning("Peringatan", "Silakan centang setidaknya 1 admin untuk penugasan.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = origHtml;
            return;
          }

          let createdCount = 0;
          for (const cb of selectedCheckboxes) {
            const adminUser = cb.value;
            const u = usersList.find(x => x.username === adminUser);
            const adminName = u ? (u.name || u.username) : `@${adminUser}`;

            const taskPayload = {
              taskName,
              adminUser,
              adminName,
              priority: taskPrioritySelect.value,
              scheduleType: taskScheduleTypeSelect.value,
              intervalHours: Number(taskIntervalHoursSelect.value) || 1,
              specificTime: taskSpecificTimeInput.value || "09:00",
              total: taskTotalInput.value.trim(),
              status: taskStatusSelect.value,
              link: taskLinkInput.value.trim(),
              notes: taskNotesInput.value.trim(),
              lastResetDate: getTodayDateString()
            };

            const res = await API.addAdminTask(taskPayload);
            const createdTask = res.data || { ...taskPayload, id: "TSK-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4) };
            tasksData.unshift(createdTask);
            createdCount++;
          }

          if (typeof Toast !== "undefined") {
            Toast.success("Multi-Penugasan Berhasil! 👥", `Berhasil membuat ${createdCount} tugas untuk admin terpilih.`);
          }
        } else {
          // Single / Shared Task Creation
          const adminUser = assignMode === "shared" ? "all" : taskAdminSelect.value;
          let adminName = "Semua Admin";
          if (adminUser !== "all") {
            const u = usersList.find(x => x.username === adminUser);
            adminName = u ? (u.name || u.username) : `@${adminUser}`;
          }

          const taskPayload = {
            taskName,
            adminUser,
            adminName,
            priority: taskPrioritySelect.value,
            scheduleType: taskScheduleTypeSelect.value,
            intervalHours: Number(taskIntervalHoursSelect.value) || 1,
            specificTime: taskSpecificTimeInput.value || "09:00",
            total: taskTotalInput.value.trim(),
            status: taskStatusSelect.value,
            link: taskLinkInput.value.trim(),
            notes: taskNotesInput.value.trim(),
            lastResetDate: getTodayDateString()
          };

          const res = await API.addAdminTask(taskPayload);
          const createdTask = res.data || { ...taskPayload, id: "TSK-" + Date.now() };
          tasksData.unshift(createdTask);
          if (typeof Toast !== "undefined") Toast.success("Berhasil!", `Tugas baru berhasil ditugaskan ke ${adminName}.`);
        }
      }

      closeTaskModal();
      renderTasks();
      updateStats();
    } catch (err) {
      console.error(err);
      if (typeof Toast !== "undefined") Toast.error("Gagal", "Terjadi kesalahan saat menyimpan tugas.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origHtml;
    }
  });

  // Direct Status Toggle via Checkbox Click
  window.toggleTaskStatusDirectly = async (id) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === "Selesai" ? "Belum Selesai" : "Selesai";
    task.status = newStatus;

    if (newStatus === "Selesai" && settingsData.soundNotification !== false) {
      playNotificationChime(true); // Success chime
    }

    renderTasks();
    updateStats();

    try {
      await API.updateAdminTask(id, { status: newStatus });
      if (typeof Toast !== "undefined") {
        if (newStatus === "Selesai") {
          Toast.success("Selesai! 🎉", `Tugas "${task.taskName}" ditandai selesai.`);
        } else {
          Toast.info("Status Diperbarui", `Tugas "${task.taskName}" kembali ke 'Belum Selesai'.`);
        }
      }
    } catch (e) {
      console.warn("Failed to sync status update to server:", e);
    }
  };

  // Status Change via Select Dropdown
  window.updateTaskStatusValue = async (id, newStatus) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    task.status = newStatus;
    if (newStatus === "Selesai" && settingsData.soundNotification !== false) {
      playNotificationChime(true);
    }

    renderTasks();
    updateStats();

    try {
      await API.updateAdminTask(id, { status: newStatus });
      if (typeof Toast !== "undefined") {
        Toast.success("Status Diperbarui", `Status tugas "${task.taskName}" diubah ke ${newStatus}.`);
      }
    } catch (e) {
      console.warn("Failed to sync status update:", e);
    }
  };

  // Delete Task (Super Admin Only)
  window.deleteAdminTaskConfirm = async (id, name) => {
    if (!canDeleteTask) {
      if (typeof Toast !== "undefined") Toast.error("Akses Ditolak", "Hanya Super Admin yang dapat menghapus tugas.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus tugas "${name}"?`)) {
      return;
    }

    try {
      await API.deleteAdminTask(id);
      tasksData = tasksData.filter(t => t.id !== id);
      renderTasks();
      updateStats();
      if (typeof Toast !== "undefined") Toast.success("Terhapus", "Tugas berhasil dihapus.");
    } catch (err) {
      console.error(err);
      if (typeof Toast !== "undefined") Toast.error("Gagal", "Gagal menghapus tugas.");
    }
  };

  // Manual Reset Status Button (Super Admin Only)
  if (manualResetBtn) {
    manualResetBtn.addEventListener("click", async () => {
      if (!isSuperAdmin) {
        if (typeof Toast !== "undefined") Toast.error("Akses Ditolak", "Hanya Super Admin yang dapat melakukan reset manual.");
        return;
      }

      if (!confirm("Reset seluruh status tugas hari ini kembali ke 'Belum Selesai'?")) {
        return;
      }

      const today = getTodayDateString();
      tasksData = tasksData.map(t => ({
        ...t,
        status: "Belum Selesai",
        lastResetDate: today
      }));

      localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
      localStorage.setItem("fpmanager_admin_tasks_last_reset", today);

      renderTasks();
      updateStats();

      try {
        if (API.resetAdminTasksStatus) {
          await API.resetAdminTasksStatus();
        }
      } catch(e) {}

      if (typeof Toast !== "undefined") {
        Toast.success("Reset Berhasil", "Seluruh status tugas hari ini telah di-reset ke 'Belum Selesai'.");
      }
    });
  }

  // ==========================================
  // SUPER ADMIN SETTINGS MODAL
  // ==========================================
  function openSettingsModal() {
    if (!isSuperAdmin) {
      if (typeof Toast !== "undefined") Toast.error("Akses Ditolak", "Hanya Super Admin yang dapat mengubah pengaturan notifikasi.");
      return;
    }
    applySettingsToUI();
    settingsModal.classList.remove("hidden");
  }

  function closeSettingsModal() {
    settingsModal.classList.add("hidden");
  }

  if (openSettingsModalBtn) openSettingsModalBtn.addEventListener("click", openSettingsModal);
  if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
  if (cancelSettingsModalBtn) cancelSettingsModalBtn.addEventListener("click", closeSettingsModal);
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      settingsData = {
        defaultIntervalHours: Number(settingDefaultInterval.value) || 1,
        soundNotification: settingSoundToggle.checked,
        browserNotification: settingBrowserNotifToggle.checked,
        toastReminder: settingToastToggle.checked,
        autoDailyReset: settingAutoResetToggle.checked,
        resetHour: "00:00",
        lastResetDate: getTodayDateString()
      };

      const saveBtn = document.getElementById("saveSettingsBtn");
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Menyimpan...`;

      try {
        await API.saveAdminTaskSettings(settingsData);
        if (typeof Toast !== "undefined") Toast.success("Pengaturan Disimpan", "Setelan notifikasi dan interval tugas berhasil diperbarui.");
        closeSettingsModal();
        updateStats();
      } catch (err) {
        console.error(err);
        if (typeof Toast !== "undefined") Toast.error("Gagal", "Gagal menyimpan pengaturan notifikasi.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-save mr-1"></i> Simpan Setelan`;
      }
    });
  }

  // Test Chime Sound
  if (testChimeSoundBtn) {
    testChimeSoundBtn.addEventListener("click", () => {
      playNotificationChime(false);
      if (typeof Toast !== "undefined") {
        Toast.info("Uji Coba Suara", "Audio chime pengingat tugas berkala berhasil dibunyikan.");
      }
    });
  }

  // Request Browser Notification Permission
  if (requestBrowserNotifBtn) {
    requestBrowserNotifBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        if (typeof Toast !== "undefined") Toast.warning("Tidak Didukung", "Browser Anda tidak mendukung Web Notification.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("FPManager Notifikasi Aktif", {
          body: "Pengingat berkala tugas admin telah diizinkan pada browser ini.",
          icon: "./assets/img/icon-192.png"
        });
        if (typeof Toast !== "undefined") Toast.success("Izin Diberikan", "Notifikasi browser aktif!");
      } else {
        if (typeof Toast !== "undefined") Toast.warning("Izin Ditolak", "Izin notifikasi tidak diaktifkan oleh browser.");
      }
    });
  }

  // ==========================================
  // NOTIFICATION & TIMER INTERVAL SCHEDULER
  // ==========================================
  let lastNotificationTriggerTime = Date.now();

  function scheduleNotificationChecker() {
    // Check every 60 seconds
    setInterval(() => {
      checkPeriodicReminders();
    }, 60000);
  }

  function checkPeriodicReminders() {
    const intervalHours = Number(settingsData.defaultIntervalHours) || 1;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const now = Date.now();

    // Pending tasks assigned to current user or shared
    const pendingTasks = tasksData.filter(t => {
      if (t.status === "Selesai") return false;
      if (t.adminUser === "all" || t.adminUser === currentUser.username || isSuperAdmin) return true;
      return false;
    });

    if (pendingTasks.length === 0) return;

    if (now - lastNotificationTriggerTime >= intervalMs) {
      lastNotificationTriggerTime = now;
      triggerReminderAlert(pendingTasks);
    }
  }

  function triggerReminderAlert(pendingList) {
    const count = pendingList.length;
    const msg = `Ada ${count} tugas checklist harian admin yang belum selesai dikerjakan.`;

    // 1. Play Audio Chime
    if (settingsData.soundNotification !== false) {
      playNotificationChime(false);
    }

    // 2. In-App Floating Toast / Banner
    if (settingsData.toastReminder !== false && floatingReminderPopup) {
      floatingReminderMessage.innerText = `${msg} Silakan periksa daftar tugas Anda.`;
      floatingReminderPopup.classList.remove("hidden");
    }

    // 3. Browser System Notification (PWA)
    if (settingsData.browserNotification !== false && "Notification" in window && Notification.permission === "granted") {
      new Notification("Pengingat Tugas Admin FPManager", {
        body: msg,
        icon: "./assets/img/icon-192.png",
        badge: "./assets/img/icon-192.png",
        tag: "admin-task-reminder"
      });
    }
  }

  window.dismissFloatingReminder = () => {
    if (floatingReminderPopup) floatingReminderPopup.classList.add("hidden");
  };

  window.focusPendingTasks = () => {
    if (floatingReminderPopup) floatingReminderPopup.classList.add("hidden");
    filterStatusSelect.value = "Belum Selesai";
    renderTasks();
    const tableEl = document.querySelector("#taskTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: "smooth" });
  };

  // Search & Filter event listeners
  taskSearchInput.addEventListener("input", renderTasks);
  filterAdminSelect.addEventListener("change", (e) => {
    currentActiveAdminTab = e.target.value;
    renderAdminFilterTabs();
    renderTasks();
  });
  filterStatusSelect.addEventListener("change", renderTasks);
  filterScheduleSelect.addEventListener("change", renderTasks);

  // Initial Load
  loadAdminTasks();
});
