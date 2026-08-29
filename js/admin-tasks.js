/**
 * FREELANCE PROJEK MANAGER (FPManager)
 * Modul: Aktivitas & Checklist Harian Admin (Admin Tasks)
 * Arsitektur: Pemisahan Total Antara Kinerja UI Operasional & Sinkronisasi Cloud (Decoupled Background Sync)
 * Fitur: Zero-Latency Optimistic UI (0ms), Background Sync Queue, Auto-Reset 00:00 WIB,
 *        Audio Crystal Chime, In-App Floating Reminder & Global Interval Timer
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
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (admin_tasks:read) untuk melihat aktivitas admin.</p>
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
  const tableRecordCount = document.getElementById("tableRecordCount");
  const progressBarFill = document.getElementById("progressBarFill");
  const progressBarText = document.getElementById("progressBarText");
  const adminFilterTabsContainer = document.getElementById("adminFilterTabsContainer");
  const adminWorkloadContainer = document.getElementById("adminWorkloadContainer");
  const adminCountBadge = document.getElementById("adminCountBadge");

  // Sync Status DOM
  const syncStatusBadge = document.getElementById("syncStatusBadge");
  const syncStatusDot = document.getElementById("syncStatusDot");
  const syncStatusText = document.getElementById("syncStatusText");

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
  const taskAdminSelect = document.getElementById("taskAdminSelect");
  const taskTemplateSelect = document.getElementById("taskTemplateSelect");
  const taskNameInput = document.getElementById("taskNameInput");
  const taskPrioritySelect = document.getElementById("taskPrioritySelect");
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
  let serviceUsersList = [];
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

  // ==========================================
  // DECOUPLED SYNC STATUS MANAGER
  // ==========================================
  function updateSyncIndicator(state, message) {
    if (!syncStatusBadge || !syncStatusText || !syncStatusDot) return;

    if (state === "syncing") {
      syncStatusBadge.className = "inline-flex items-center space-x-1.5 bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-amber-300 border border-amber-400/30 transition-all";
      syncStatusDot.className = "h-2 w-2 rounded-full bg-amber-400 animate-ping";
      syncStatusText.innerText = message || "Menyinkronkan di Latar Belakang...";
    } else if (state === "error") {
      syncStatusBadge.className = "inline-flex items-center space-x-1.5 bg-rose-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-rose-300 border border-rose-400/30 transition-all";
      syncStatusDot.className = "h-2 w-2 rounded-full bg-rose-400";
      syncStatusText.innerText = message || "Tersimpan Lokal (Offline)";
    } else {
      // Synced / Ready
      syncStatusBadge.className = "inline-flex items-center space-x-1.5 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-emerald-300 border border-emerald-400/30 transition-all";
      syncStatusDot.className = "h-2 w-2 rounded-full bg-emerald-400";
      syncStatusText.innerText = message || "Cloud Tersinkronisasi";
    }
  }

  // ==========================================
  // DECOUPLED BACKGROUND SYNC ENGINE (NON-BLOCKING)
  // ==========================================
  const TaskSyncEngine = {
    syncQueue: [],
    isProcessing: false,

    // Dispatch background sync without blocking main thread
    dispatch: function(actionType, data) {
      this.syncQueue.push({ actionType, data, timestamp: Date.now() });
      updateSyncIndicator("syncing", "Menyinkronkan ke Cloud...");
      
      // Execute asynchronously on idle or next tick
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => this.processQueue());
      } else {
        setTimeout(() => this.processQueue(), 50);
      }
    },

    processQueue: async function() {
      if (this.isProcessing || this.syncQueue.length === 0) return;
      this.isProcessing = true;

      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        try {
          if (item.actionType === "updateStatus" || item.actionType === "updateTask") {
            await API.updateAdminTask(item.data.id, item.data.payload);
          } else if (item.actionType === "addTask") {
            await API.addAdminTask(item.data.payload);
          } else if (item.actionType === "deleteTask") {
            await API.deleteAdminTask(item.data.id);
          } else if (item.actionType === "saveSettings") {
            await API.saveAdminTaskSettings(item.data.payload);
          } else if (item.actionType === "resetStatus") {
            if (API.resetAdminTasksStatus) await API.resetAdminTasksStatus();
          }
        } catch (err) {
          console.warn("[Background Sync] Gagal mengirim data ke server:", err);
          updateSyncIndicator("error", "Tersimpan di Memori Lokal");
        }
      }

      this.isProcessing = false;
      updateSyncIndicator("synced", "Cloud Tersinkronisasi");
    }
  };

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

  function getSmartLinkTarget(link) {
    if (!link) return "_blank";
    const lower = String(link).toLowerCase().trim();
    if (lower.includes("whatsapp.com") || lower.includes("wa.me")) {
      return "FPManager_WhatsAppTab"; // Reuses the exact same running WhatsApp Web tab!
    }
    if (lower.includes("mail.google.com") || lower.includes("gmail.com")) {
      return "FPManager_GmailTab"; // Reuses existing Gmail tab
    }
    if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("//")) {
      return "_self";
    }
    return "_blank";
  }

  // Global Smart Link Opener that focuses existing tab
  window.openSmartLink = (url) => {
    if (!url) return;
    const clean = sanitizeTaskLink(url);
    const target = getSmartLinkTarget(clean);
    
    if (target === "_self") {
      window.location.href = clean;
      return;
    }

    const win = window.open(clean, target);
    if (win && typeof win.focus === "function") {
      try {
        win.focus();
      } catch (e) {}
    }
  };

  // Authorization Checker: Super Admin & Assigned Admin can check/uncheck
  function canUserCheckTask(task) {
    if (isSuperAdmin) return true;
    if (!currentUser || !currentUser.username) return false;

    const myUsername = String(currentUser.username || "").toLowerCase().trim();
    const assigned = String(task.adminUser || "").toLowerCase().trim();

    // If assigned specifically to this user
    if (assigned === myUsername) return true;

    // If assigned to 'service', 'all', or empty: any admin with role 'service' can check it
    if (!assigned || assigned === "service" || assigned === "all" || assigned === "tim_service") {
      return userRole === "service" || userRole.includes("service");
    }

    return false;
  }

  // Web Audio API Synthesized Crystal Chime
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

    const savedLastReset = localStorage.getItem("fpmanager_admin_tasks_last_reset") || settingsData.lastResetDate;

    if (savedLastReset && savedLastReset !== today && settingsData.autoDailyReset !== false) {
      console.log(`[Auto-Reset Harian] Pergantian tanggal terdeteksi (${savedLastReset} -> ${today}). Me-reset status checklist.`);
      
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
        Toast.info("✨ Hari Baru Dimulai!", "Seluruh checklist tugas harian admin telah di-reset otomatis ke 'Belum Selesai'.");
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
  // DATA LOAD & RENDER (OFFLINE-FIRST)
  // ==========================================
  async function loadAdminTasks() {
    try {
      // 1. Fast Cache Render: Tampilkan data dari localStorage seketika (0ms) jika ada
      const cachedTasks = localStorage.getItem("fpmanager_admin_tasks");
      if (cachedTasks) {
        try {
          tasksData = JSON.parse(cachedTasks);
          renderTasks();
          updateStats();
        } catch(e) {}
      } else if (taskTableBody) {
        taskTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-10 text-zinc-400">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-500"></i>
              <p class="font-medium">Memuat data aktivitas tindakan admin...</p>
            </td>
          </tr>
        `;
      }

      // 2. Fetch server updates in parallel background thread
      const [tasksRes, settingsRes, usersRes] = await Promise.allSettled([
        API.getAdminTasks(),
        API.getAdminTaskSettings(),
        API.getUsers()
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        settingsData = { ...settingsData, ...settingsRes.value };
      }

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value) && usersRes.value.length > 0) {
        serviceUsersList = usersRes.value.filter(u => {
          const r = String(u.role || '').toLowerCase().trim();
          const username = String(u.username || '').toLowerCase().trim();
          return (r === "service" || r.includes("service")) && r !== "super_admin" && r !== "superadmin" && username !== "wansmin";
        });
      } else {
        serviceUsersList = [
          { id: "USR-002", username: "service", name: "Admin Service", role: "service" }
        ];
      }

      populateUserDropdowns();

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        tasksData = tasksRes.value;
        localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
      }

      // Check daily auto-reset
      await checkAndApplyDailyAutoReset();

      renderTasks();
      updateStats();
      applySettingsToUI();
      scheduleNotificationChecker();
      updateSyncIndicator("synced", "Cloud Tersinkronisasi");
    } catch (err) {
      console.warn("Background load tasks issue:", err);
      updateSyncIndicator("error", "Mode Offline / Tersimpan Lokal");
    }
  }
  window.loadAdminTasks = loadAdminTasks;

  function populateUserDropdowns() {
    if (filterAdminSelect) {
      let filterOptionsHtml = `
        <option value="all">Semua Checklist Admin Service</option>
        <option value="mine">Tugas Saya Saja (@${escapeHtmlSafe(currentUser.username)})</option>
      `;

      serviceUsersList.forEach(u => {
        if (u.username) {
          filterOptionsHtml += `<option value="${escapeHtmlSafe(u.username)}">👤 ${escapeHtmlSafe(u.name || u.username)} (@${escapeHtmlSafe(u.username)})</option>`;
        }
      });
      filterAdminSelect.innerHTML = filterOptionsHtml;
    }

    if (taskAdminSelect) {
      let modalAdminOptionsHtml = `
        <option value="service">👥 Semua Tim Admin Service</option>
      `;
      serviceUsersList.forEach(u => {
        if (u.username) {
          modalAdminOptionsHtml += `<option value="${escapeHtmlSafe(u.username)}">👤 ${escapeHtmlSafe(u.name || u.username)} (@${escapeHtmlSafe(u.username)})</option>`;
        }
      });
      taskAdminSelect.innerHTML = modalAdminOptionsHtml;
    }

    if (adminCountBadge) {
      adminCountBadge.innerText = `${serviceUsersList.length} Admin Service Aktif`;
    }

    renderAdminFilterTabs();
    renderAdminWorkloadCards();
  }

  // ==========================================
  // ADMIN FILTER TABS & WORKLOAD MATRIX (SERVICE ONLY)
  // ==========================================
  function renderAdminFilterTabs() {
    if (!adminFilterTabsContainer) return;

    const totalAll = tasksData.length;
    const myDone = tasksData.filter(t => t.status === "Selesai").length;

    let tabsHtml = `
      <button onclick="setFilterAdmin('all')"
        class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${currentActiveAdminTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
        <i class="fa-solid fa-list-check text-[10px]"></i>
        <span>Checklist Admin Service</span>
        <span class="ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${currentActiveAdminTab === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}">${myDone}/${totalAll}</span>
      </button>
    `;

    serviceUsersList.forEach(u => {
      if (u.username) {
        const isActive = currentActiveAdminTab === u.username;
        tabsHtml += `
          <button onclick="setFilterAdmin('${escapeHtmlSafe(u.username)}')"
            class="admin-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'}">
            <i class="fa-solid fa-headset text-[10px]"></i>
            <span>${escapeHtmlSafe(u.name || u.username)}</span>
          </button>
        `;
      }
    });

    adminFilterTabsContainer.innerHTML = tabsHtml;
  }

  window.setFilterAdmin = (adminKey) => {
    currentActiveAdminTab = adminKey;
    if (filterAdminSelect) filterAdminSelect.value = adminKey;
    renderAdminFilterTabs();
    renderTasks();
  };

  function renderAdminWorkloadCards() {
    if (!adminWorkloadContainer) return;

    if (serviceUsersList.length === 0) {
      adminWorkloadContainer.innerHTML = `<div class="col-span-full text-center py-4 text-xs text-zinc-400">Tidak ada admin bertipe service.</div>`;
      return;
    }

    const total = tasksData.length;
    const done = tasksData.filter(t => t.status === "Selesai").length;
    const pending = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    let cardsHtml = `
      <!-- Card Checklist Tim Service -->
      <div class="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/30 dark:to-zinc-900/50 shadow-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2.5">
            <div class="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <i class="fa-solid fa-clipboard-list"></i>
            </div>
            <div>
              <div class="font-bold text-xs text-zinc-900 dark:text-white">Checklist Tim Admin Service</div>
              <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Notifikasi Tiap ${settingsData.defaultIntervalHours || 1} Jam</div>
            </div>
          </div>
          <span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 font-mono">${done}/${total} (${percent}%)</span>
        </div>
        
        <div class="space-y-1.5 mt-2">
          <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div class="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex justify-between items-center text-[11px]">
          <span class="${pending > 0 ? 'text-rose-500 font-semibold' : 'text-emerald-600 font-semibold'}">${pending} Belum Selesai</span>
          ${canCreateTask ? `
            <button onclick="openAddTaskModal()" class="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[10px] flex items-center gap-1">
              <i class="fa-solid fa-plus text-[9px]"></i> Tambah Tindakan
            </button>
          ` : ''}
        </div>
      </div>
    `;

    serviceUsersList.forEach(u => {
      const isMe = u.username === currentUser.username;
      const roleLabel = (u.role || 'Service').toUpperCase();

      cardsHtml += `
        <div class="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:shadow-md transition-all ${isMe ? 'ring-1 ring-indigo-500/50' : ''}">
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
            <span class="h-2 w-2 rounded-full bg-emerald-400" title="Aktif"></span>
          </div>

          <div class="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/80 flex justify-between items-center text-[11px]">
            <span class="text-zinc-500 dark:text-zinc-400">Pelaksana Tugas Service</span>
            <span class="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">${done}/${total} Selesai</span>
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
      if (adminWorkloadContainer) adminWorkloadContainer.classList.remove("hidden");
      if (textEl) textEl.innerText = "Sembunyikan Ringkasan";
      if (iconEl) iconEl.className = "fa-solid fa-chevron-up text-[10px]";
    } else {
      if (adminWorkloadContainer) adminWorkloadContainer.classList.add("hidden");
      if (textEl) textEl.innerText = "Tampilkan Ringkasan";
      if (iconEl) iconEl.className = "fa-solid fa-chevron-down text-[10px]";
    }
  };

  // ==========================================
  // TABLE RENDERING (HIGH-PERFORMANCE)
  // ==========================================
  function renderTasks() {
    if (!taskTableBody) return;
    const searchQuery = (taskSearchInput && taskSearchInput.value) ? taskSearchInput.value.toLowerCase().trim() : "";
    const statusFilter = (filterStatusSelect && filterStatusSelect.value) ? filterStatusSelect.value : "all";

    const filtered = tasksData.filter(task => {
      if (searchQuery) {
        const matchName = (task.taskName || "").toLowerCase().includes(searchQuery);
        const matchNotes = (task.notes || "").toLowerCase().includes(searchQuery);
        const matchTotal = (task.total || "").toLowerCase().includes(searchQuery);
        if (!matchName && !matchNotes && !matchTotal) return false;
      }

      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      taskTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-zinc-400">
            <div class="max-w-sm mx-auto space-y-2">
              <i class="fa-solid fa-clipboard-check text-4xl text-zinc-300 dark:text-zinc-600 block mb-1"></i>
              <p class="font-bold text-zinc-600 dark:text-zinc-300">Tidak ada tindakan yang sesuai.</p>
              <p class="text-xs text-zinc-400">Silakan sesuaikan filter pencarian atau buat tindakan baru.</p>
              ${canCreateTask ? `
                <button onclick="openAddTaskModal()" class="mt-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-all">
                  <i class="fa-solid fa-plus mr-1"></i> Tambah Tindakan Baru
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
      if (tableRecordCount) tableRecordCount.innerText = "Menampilkan 0 tugas";
      return;
    }

    if (tableRecordCount) tableRecordCount.innerText = `Menampilkan ${filtered.length} dari ${tasksData.length} tugas`;

    taskTableBody.innerHTML = filtered.map((task) => {
      const canCheck = canUserCheckTask(task);
      const isDone = task.status === "Selesai";
      const isProgress = task.status === "Sedang Dikerjakan";

      let statusBadgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      if (isDone) {
        statusBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      } else if (isProgress) {
        statusBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      }

      let priorityPill = `<span class="h-2 w-2 rounded-full bg-amber-400 mr-2 flex-shrink-0" title="Prioritas Sedang"></span>`;
      if (task.priority === "high") {
        priorityPill = `<span class="h-2 w-2 rounded-full bg-rose-500 mr-2 flex-shrink-0" title="Prioritas Tinggi"></span>`;
      } else if (task.priority === "low") {
        priorityPill = `<span class="h-2 w-2 rounded-full bg-emerald-400 mr-2 flex-shrink-0" title="Prioritas Ringan"></span>`;
      }

      const cleanLink = sanitizeTaskLink(task.link);
      const linkTarget = getSmartLinkTarget(cleanLink);
      const linkHtml = (task.link && cleanLink !== "#") ? `
        <a href="${cleanLink}" target="${linkTarget}" onclick="event.preventDefault(); openSmartLink('${escapeHtmlSafe(cleanLink)}');" rel="noopener noreferrer"
          class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors shadow-xs"
          title="Buka Tautan: ${escapeHtmlSafe(task.link)}">
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          <span>Buka</span>
        </a>
      ` : `<span class="text-zinc-300 dark:text-zinc-600 text-xs">-</span>`;

      // Admin Penugasan Badge
      let adminBadgeHtml = `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"><i class="fa-solid fa-users text-[10px]"></i><span>Semua Tim Service</span></span>`;
      if (task.adminUser && task.adminUser !== "service" && task.adminUser !== "all") {
        const isMyTask = (currentUser.username || "").toLowerCase() === task.adminUser.toLowerCase();
        adminBadgeHtml = `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${isMyTask ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 ring-1 ring-emerald-400/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'}"><i class="fa-solid fa-user-check text-[10px] text-indigo-500"></i><span>@${escapeHtmlSafe(task.adminUser)}</span></span>`;
      }

      // Checkbox button based on authorization
      let checkBtnHtml = '';
      if (canCheck) {
        checkBtnHtml = `
          <button onclick="toggleTaskStatusDirectly('${task.id}')"
            class="h-7 w-7 rounded-xl flex items-center justify-center transition-all transform active:scale-90 ${isDone ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600' : 'border-2 border-zinc-300 dark:border-zinc-600 text-transparent hover:border-indigo-500 hover:text-indigo-400'}"
            title="${isDone ? 'Klik untuk tandai Belum Selesai' : 'Klik untuk tandai Selesai'}">
            <i class="fa-solid fa-check text-xs font-bold"></i>
          </button>
        `;
      } else {
        checkBtnHtml = `
          <button onclick="toggleTaskStatusDirectly('${task.id}')"
            class="h-7 w-7 rounded-xl flex items-center justify-center transition-all opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-600"
            title="Tugas ini khusus untuk @${escapeHtmlSafe(task.adminUser || 'service')}. Hanya pelaksana terkait dan Super Admin yang dapat mencentang.">
            <i class="fa-solid fa-lock text-[10px]"></i>
          </button>
        `;
      }

      // Status dropdown based on authorization
      let statusSelectHtml = '';
      if (canCheck) {
        statusSelectHtml = `
          <select onchange="updateTaskStatusValue('${task.id}', this.value)"
            class="px-2.5 py-1 text-xs font-bold rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${statusBadgeClass}">
            <option value="Belum Selesai" ${task.status === 'Belum Selesai' ? 'selected' : ''}>🔴 Belum Selesai</option>
            <option value="Sedang Dikerjakan" ${task.status === 'Sedang Dikerjakan' ? 'selected' : ''}>🟡 Sedang Dikerjakan</option>
            <option value="Selesai" ${task.status === 'Selesai' ? 'selected' : ''}>🟢 Selesai</option>
          </select>
        `;
      } else {
        statusSelectHtml = `
          <select disabled
            class="px-2.5 py-1 text-xs font-bold rounded-full border opacity-60 cursor-not-allowed ${statusBadgeClass}"
            title="Khusus @${escapeHtmlSafe(task.adminUser || 'service')} atau Super Admin">
            <option value="Belum Selesai" ${task.status === 'Belum Selesai' ? 'selected' : ''}>🔴 Belum Selesai</option>
            <option value="Sedang Dikerjakan" ${task.status === 'Sedang Dikerjakan' ? 'selected' : ''}>🟡 Sedang Dikerjakan</option>
            <option value="Selesai" ${task.status === 'Selesai' ? 'selected' : ''}>🟢 Selesai</option>
          </select>
        `;
      }

      return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors ${isDone ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}">
          
          <!-- Checkbox Selesai Toggle -->
          <td class="px-4 py-3.5 text-center">
            ${checkBtnHtml}
          </td>

          <!-- Nama Tugas & Prioritas -->
          <td class="px-4 py-3.5 min-w-[200px]">
            <div class="flex items-center">
              ${priorityPill}
              <span class="font-bold text-zinc-800 dark:text-zinc-100 ${isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}">
                ${escapeHtmlSafe(task.taskName)}
              </span>
            </div>
          </td>

          <!-- Penugasan Admin Pelaksana -->
          <td class="px-4 py-3.5 whitespace-nowrap">
            ${adminBadgeHtml}
          </td>

          <!-- Status Dropdown / Badge -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            ${statusSelectHtml}
          </td>

          <!-- Total / Target Metrik (Opsional) -->
          <td class="px-4 py-3.5 whitespace-nowrap">
            ${task.total ? `
              <span class="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-xs">
                ${escapeHtmlSafe(task.total)}
              </span>
            ` : `<span class="text-zinc-400 text-xs">-</span>`}
          </td>

          <!-- Catatan / SOP (Opsional) -->
          <td class="px-4 py-3.5 max-w-[260px]">
            <p class="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2" title="${escapeHtmlSafe(task.notes || '-')}">
              ${escapeHtmlSafe(task.notes || '-')}
            </p>
          </td>

          <!-- Link (Opsional) -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            ${linkHtml}
          </td>

          <!-- Aksi (Edit for Admin CRU, Delete for Super Admin CRUD) -->
          <td class="px-4 py-3.5 text-center whitespace-nowrap">
            <div class="flex items-center justify-center space-x-1">
              <!-- Edit Button (CRU) -->
              <button onclick="openEditTaskModal('${task.id}')"
                class="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Edit Tugas">
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

  function updateStats() {
    const total = tasksData.length;
    const done = tasksData.filter(t => t.status === "Selesai").length;
    const pending = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    if (statTotalTasks) statTotalTasks.innerText = total;
    if (statDoneTasks) statDoneTasks.innerText = done;
    if (statPendingTasks) statPendingTasks.innerText = pending;
    if (statProgressPercent) statProgressPercent.innerText = `${percent}% tercapai`;

    if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    if (progressBarText) progressBarText.innerText = `${done}/${total} Selesai (${percent}%)`;

    if (statActiveInterval) statActiveInterval.innerText = `Tiap ${settingsData.defaultIntervalHours || 1} Jam`;

    renderAdminFilterTabs();
    renderAdminWorkloadCards();
  }

  function applySettingsToUI() {
    if (settingDefaultInterval) settingDefaultInterval.value = String(settingsData.defaultIntervalHours || 1);
    if (settingSoundToggle) settingSoundToggle.checked = settingsData.soundNotification !== false;
    if (settingBrowserNotifToggle) settingBrowserNotifToggle.checked = settingsData.browserNotification !== false;
    if (settingToastToggle) settingToastToggle.checked = settingsData.toastReminder !== false;
    if (settingAutoResetToggle) settingAutoResetToggle.checked = settingsData.autoDailyReset !== false;
  }

  // ==========================================
  // SOP PRESET TEMPLATES
  // ==========================================
  const SOP_TEMPLATES = {
    cs_wa: {
      taskName: "Follow-up Chat WhatsApp Klien",
      total: "15 Chat",
      link: "https://web.whatsapp.com",
      notes: "Balas semua chat calon klien dan tanyakan kelanjutan kebutuhan desain."
    },
    cs_inquiry: {
      taskName: "Respon Pesan & Tanya Jawab Masuk",
      total: "10 Pesan",
      link: "https://mail.google.com",
      notes: "Cek email masuk, inquiry formulir website, dan direct message."
    },
    cs_invoice: {
      taskName: "Kirim Tagihan & Invoice ke Klien",
      total: "5 Invoice",
      link: "invoice.html",
      notes: "Kirim invoice DP bagi projek baru dan pelunasan bagi projek selesai."
    },
    cs_review: {
      taskName: "Minta Review / Testimoni Klien Selesai",
      total: "3 Review",
      link: "proyek.html",
      notes: "Kirim pesan terima kasih dan form review bintang 5 ke klien yang telah tuntas."
    },
    fin_mutasi: {
      taskName: "Cek Mutasi & Rekening Pembayaran Masuk",
      total: "100% Cocok",
      link: "keuangan.html",
      notes: "Cek rekening bank dan verifikasi bukti transfer pembayaran."
    },
    fin_kas: {
      taskName: "Rekap Arus Kas & Pengeluaran Harian",
      total: "Rp 1.000.000",
      link: "keuangan.html",
      notes: "Input struk pengeluaran harian dan hitung total saldo kas penutupan."
    },
    fin_laporan: {
      taskName: "Verifikasi Pembukuan & Laporan Mingguan",
      link: "laporan.html",
      total: "100%",
      notes: "Periksa grafik omzet dan ekspor laporan keuangan ke format Excel."
    },
    soc_post: {
      taskName: "Posting Konten Feed / Story Harian",
      total: "1 Konten",
      link: "https://instagram.com",
      notes: "Posting konten edukasi desain beserta caption & hashtag yang relevan."
    },
    adm_briefing: {
      taskName: "Review Antrean Projek & Update Status",
      total: "10 Projek",
      link: "proyek.html",
      notes: "Cek deadline projek aktif dan pastikan status pengerjaan ter-update."
    },
    adm_eval: {
      taskName: "Evaluasi Capaian Harian Admin",
      total: "100%",
      notes: "Evaluasi checklist tindakan yang belum selesai dan siapkan target besok."
    }
  };

  window.applyTaskTemplate = (templateKey) => {
    if (!templateKey || !SOP_TEMPLATES[templateKey]) return;
    const tpl = SOP_TEMPLATES[templateKey];

    if (taskNameInput) taskNameInput.value = tpl.taskName || "";
    if (taskTotalInput) taskTotalInput.value = tpl.total || "";
    if (taskLinkInput) taskLinkInput.value = tpl.link || "";
    if (taskNotesInput) taskNotesInput.value = tpl.notes || "";

    if (typeof Toast !== "undefined") {
      Toast.info("Template Diterapkan", `Formulir otomatis terisi dengan template "${tpl.taskName}".`);
    }
  };

  // ==========================================
  // TASK CRUD ACTIONS (OPTIMISTIC & DECOUPLED)
  // ==========================================
  window.openAddTaskModal = () => {
    if (taskForm) taskForm.reset();
    if (taskIdInput) taskIdInput.value = "";
    if (taskModalTitle) taskModalTitle.innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-600 mr-1.5"></i><span>Tambah Tindakan / Tugas Baru</span>`;
    
    if (taskAdminSelect) taskAdminSelect.value = "service";
    if (taskStatusSelect) taskStatusSelect.value = "Belum Selesai";
    if (taskPrioritySelect) taskPrioritySelect.value = "medium";
    if (taskTemplateSelect) taskTemplateSelect.value = "";
    
    if (taskModal) taskModal.classList.remove("hidden");
  };

  window.openEditTaskModal = (id) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    if (taskIdInput) taskIdInput.value = task.id;
    if (taskNameInput) taskNameInput.value = task.taskName || "";
    if (taskAdminSelect) taskAdminSelect.value = task.adminUser || "service";
    if (taskPrioritySelect) taskPrioritySelect.value = task.priority || "medium";
    if (taskTotalInput) taskTotalInput.value = task.total || "";
    if (taskStatusSelect) taskStatusSelect.value = task.status || "Belum Selesai";
    if (taskLinkInput) taskLinkInput.value = task.link || "";
    if (taskNotesInput) taskNotesInput.value = task.notes || "";
    if (taskTemplateSelect) taskTemplateSelect.value = "";

    if (taskModalTitle) taskModalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600 mr-1.5"></i><span>Edit Tindakan: ${escapeHtmlSafe(task.taskName)}</span>`;
    if (taskModal) taskModal.classList.remove("hidden");
  };

  function closeTaskModal() {
    if (taskModal) taskModal.classList.add("hidden");
  }

  if (openAddTaskModalBtn) openAddTaskModalBtn.addEventListener("click", () => window.openAddTaskModal());
  if (closeTaskModalBtn) closeTaskModalBtn.addEventListener("click", closeTaskModal);
  if (cancelTaskModalBtn) cancelTaskModalBtn.addEventListener("click", closeTaskModal);
  if (taskModal) {
    taskModal.addEventListener("click", (e) => {
      if (e.target === taskModal) closeTaskModal();
    });
  }

  // Form Submit (Zero-latency optimistic update + Asynchronous Background Sync)
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const id = taskIdInput ? taskIdInput.value : "";
      const taskName = taskNameInput ? taskNameInput.value.trim() : "";
      if (!taskName) {
        if (typeof Toast !== "undefined") Toast.warning("Peringatan", "Nama tindakan wajib diisi.");
        return;
      }

      const selectedAdminUser = taskAdminSelect ? taskAdminSelect.value : "service";
      let assignedName = "Semua Tim Service";
      if (selectedAdminUser && selectedAdminUser !== "service" && selectedAdminUser !== "all") {
        const foundUser = serviceUsersList.find(u => u.username === selectedAdminUser);
        assignedName = foundUser ? (foundUser.name || foundUser.username) : selectedAdminUser;
      }

      const taskPayload = {
        taskName,
        adminUser: selectedAdminUser,
        adminName: assignedName,
        priority: taskPrioritySelect ? taskPrioritySelect.value : "medium",
        scheduleType: "hourly",
        intervalHours: Number(settingsData.defaultIntervalHours) || 1,
        total: taskTotalInput ? taskTotalInput.value.trim() : "",
        status: taskStatusSelect ? taskStatusSelect.value : "Belum Selesai",
        link: taskLinkInput ? taskLinkInput.value.trim() : "",
        notes: taskNotesInput ? taskNotesInput.value.trim() : "",
        lastResetDate: getTodayDateString()
      };

      // 1. INSTANT LOCAL UPDATE (0ms)
      if (id) {
        tasksData = tasksData.map(t => (t.id === id ? { ...t, ...taskPayload } : t));
        TaskSyncEngine.dispatch("updateTask", { id, payload: taskPayload });
        if (typeof Toast !== "undefined") Toast.success("Tersimpan!", "Tugas admin berhasil diperbarui.");
      } else {
        const newId = "TSK-" + Date.now();
        const createdTask = { ...taskPayload, id: newId, createdAt: new Date().toISOString() };
        tasksData.unshift(createdTask);
        TaskSyncEngine.dispatch("addTask", { payload: createdTask });
        if (typeof Toast !== "undefined") Toast.success("Berhasil!", "Tugas checklist baru berhasil ditambahkan.");
      }

      localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
      closeTaskModal();
      renderTasks();
      updateStats();
    });
  }

  // Direct Status Toggle (0ms Optimistic UI + Background Sync)
  window.toggleTaskStatusDirectly = (id) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    if (!canUserCheckTask(task)) {
      if (typeof Toast !== "undefined") {
        const targetAdmin = task.adminName || task.adminUser || "admin lain";
        Toast.warning("Akses Dibatasi", `Tugas ini ditugaskan untuk ${targetAdmin}. Hanya pelaksana terkait atau Super Admin yang dapat mencentang status.`);
      }
      return;
    }

    const newStatus = task.status === "Selesai" ? "Belum Selesai" : "Selesai";
    task.status = newStatus;

    if (newStatus === "Selesai" && settingsData.soundNotification !== false) {
      playNotificationChime(true);
    }

    // 1. Instant UI update
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
    renderTasks();
    updateStats();

    if (typeof Toast !== "undefined") {
      if (newStatus === "Selesai") {
        Toast.success("Selesai! 🎉", `Tugas "${task.taskName}" ditandai selesai.`);
      } else {
        Toast.info("Status Diperbarui", `Tugas "${task.taskName}" kembali ke 'Belum Selesai'.`);
      }
    }

    // 2. Offload to non-blocking background sync queue
    TaskSyncEngine.dispatch("updateStatus", { id, payload: { status: newStatus } });
  };

  // Status Change via Select Dropdown
  window.updateTaskStatusValue = (id, newStatus) => {
    const task = tasksData.find(t => t.id === id);
    if (!task) return;

    if (!canUserCheckTask(task)) {
      if (typeof Toast !== "undefined") {
        const targetAdmin = task.adminName || task.adminUser || "admin lain";
        Toast.warning("Akses Dibatasi", `Tugas ini ditugaskan untuk ${targetAdmin}. Hanya pelaksana terkait atau Super Admin yang dapat mengubah status.`);
      }
      renderTasks();
      return;
    }

    task.status = newStatus;
    if (newStatus === "Selesai" && settingsData.soundNotification !== false) {
      playNotificationChime(true);
    }

    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
    renderTasks();
    updateStats();

    if (typeof Toast !== "undefined") {
      Toast.success("Status Diperbarui", `Status tugas "${task.taskName}" diubah ke ${newStatus}.`);
    }

    TaskSyncEngine.dispatch("updateStatus", { id, payload: { status: newStatus } });
  };

  // Delete Task (Super Admin Only)
  window.deleteAdminTaskConfirm = (id, name) => {
    if (!canDeleteTask) {
      if (typeof Toast !== "undefined") Toast.error("Akses Ditolak", "Hanya Super Admin yang dapat menghapus tugas.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus tugas "${name}"?`)) {
      return;
    }

    tasksData = tasksData.filter(t => t.id !== id);
    localStorage.setItem("fpmanager_admin_tasks", JSON.stringify(tasksData));
    renderTasks();
    updateStats();
    if (typeof Toast !== "undefined") Toast.success("Terhapus", "Tugas berhasil dihapus.");

    TaskSyncEngine.dispatch("deleteTask", { id });
  };

  // Manual Reset Status Button (Super Admin Only)
  if (manualResetBtn) {
    manualResetBtn.addEventListener("click", () => {
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

      if (typeof Toast !== "undefined") {
        Toast.success("Reset Berhasil", "Seluruh status tugas hari ini telah di-reset ke 'Belum Selesai'.");
      }

      TaskSyncEngine.dispatch("resetStatus", {});
    });
  }

  // ==========================================
  // SUPER ADMIN SETTINGS MODAL (GLOBAL INTERVAL & NOTIF)
  // ==========================================
  function openSettingsModal() {
    if (!isSuperAdmin) {
      if (typeof Toast !== "undefined") Toast.error("Akses Ditolak", "Hanya Super Admin yang dapat mengubah pengaturan notifikasi.");
      return;
    }
    applySettingsToUI();
    if (settingsModal) settingsModal.classList.remove("hidden");
  }

  function closeSettingsModal() {
    if (settingsModal) settingsModal.classList.add("hidden");
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
    settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();

      settingsData = {
        defaultIntervalHours: Number(settingDefaultInterval ? settingDefaultInterval.value : 1) || 1,
        soundNotification: settingSoundToggle ? settingSoundToggle.checked : true,
        browserNotification: settingBrowserNotifToggle ? settingBrowserNotifToggle.checked : true,
        toastReminder: settingToastToggle ? settingToastToggle.checked : true,
        autoDailyReset: settingAutoResetToggle ? settingAutoResetToggle.checked : true,
        resetHour: "00:00",
        lastResetDate: getTodayDateString()
      };

      localStorage.setItem("fpmanager_admin_task_settings", JSON.stringify(settingsData));
      if (typeof Toast !== "undefined") Toast.success("Pengaturan Disimpan", `Interval pengingat global diatur ke Tiap ${settingsData.defaultIntervalHours} Jam.`);
      closeSettingsModal();
      updateStats();

      TaskSyncEngine.dispatch("saveSettings", { payload: settingsData });
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
          body: `Pengingat tugas admin aktif tiap ${settingsData.defaultIntervalHours || 1} jam.`,
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
    setInterval(() => {
      checkPeriodicReminders();
    }, 60000);
  }

  function checkPeriodicReminders() {
    const intervalHours = Number(settingsData.defaultIntervalHours) || 1;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const now = Date.now();

    const pendingTasks = tasksData.filter(t => t.status !== "Selesai");
    if (pendingTasks.length === 0) return;

    if (now - lastNotificationTriggerTime >= intervalMs) {
      lastNotificationTriggerTime = now;
      triggerReminderAlert(pendingTasks);
    }
  }

  function triggerReminderAlert(pendingList) {
    const count = pendingList.length;
    const msg = `Ada ${count} tindakan checklist admin service yang belum selesai hari ini.`;

    if (settingsData.soundNotification !== false) {
      playNotificationChime(false);
    }

    if (settingsData.toastReminder !== false && floatingReminderPopup) {
      if (floatingReminderMessage) floatingReminderMessage.innerText = `${msg} Silakan periksa daftar tugas Anda.`;
      floatingReminderPopup.classList.remove("hidden");
    }

    if (settingsData.browserNotification !== false && "Notification" in window && Notification.permission === "granted") {
      new Notification("Pengingat Tindakan Admin FPManager", {
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
    if (filterStatusSelect) filterStatusSelect.value = "Belum Selesai";
    renderTasks();
    const tableEl = document.querySelector("#taskTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: "smooth" });
  };

  // Search & Filter event listeners
  if (taskSearchInput) taskSearchInput.addEventListener("input", renderTasks);
  if (filterAdminSelect) {
    filterAdminSelect.addEventListener("change", (e) => {
      currentActiveAdminTab = e.target.value;
      renderAdminFilterTabs();
      renderTasks();
    });
  }
  if (filterStatusSelect) filterStatusSelect.addEventListener("change", renderTasks);

  // Initial Load
  loadAdminTasks();
});
