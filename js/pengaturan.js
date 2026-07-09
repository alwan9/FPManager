document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  if (typeof Auth !== 'undefined' && typeof Auth.checkLogin === 'function') {
    Auth.checkLogin();
  }

  // Set API status badge
  updateApiStatusBadge();

  // Render current logged-in device info
  renderDeviceInfo();

  // Get DOM elements
  const form = document.getElementById('settingsForm');
  const apiUrlInput = document.getElementById('apiUrl');
  const waTemplateInput = document.getElementById('waTemplate');
  const reminderIntervalSelect = document.getElementById('reminderInterval');
  const mockModeCheckbox = document.getElementById('mockMode');
  const notifStyleSelect = document.getElementById('notifStyle');
  const notifVibrateCheckbox = document.getElementById('notifVibrate');
  const notifSilentCheckbox = document.getElementById('notifSilent');
  const toastPositionSelect = document.getElementById('toastPosition');
  const toastDurationSelect = document.getElementById('toastDuration');
  const appLanguageSelect = document.getElementById('appLanguage');

  const btnTestNotif = document.getElementById('btnTestNotif');
  const btnReqNotif = document.getElementById('btnReqNotif');
  const btnTestToast = document.getElementById('btnTestToast');

  // Load saved configurations to inputs
  if (apiUrlInput) apiUrlInput.value = CONFIG.API_URL || '';
  if (waTemplateInput) waTemplateInput.value = CONFIG.WA_TEMPLATE || '';
  if (reminderIntervalSelect) reminderIntervalSelect.value = (CONFIG.REMINDER_INTERVAL || 18000000).toString();
  if (mockModeCheckbox) mockModeCheckbox.checked = !!CONFIG.MOCK_MODE;
  if (notifStyleSelect) notifStyleSelect.value = CONFIG.NOTIF_STYLE || 'casual';
  if (notifVibrateCheckbox) notifVibrateCheckbox.checked = CONFIG.NOTIF_VIBRATE !== false;
  if (notifSilentCheckbox) notifSilentCheckbox.checked = !!CONFIG.NOTIF_SILENT;
  if (toastPositionSelect) toastPositionSelect.value = CONFIG.TOAST_POSITION || 'top-right';
  if (toastDurationSelect) toastDurationSelect.value = (CONFIG.TOAST_DURATION || 4000).toString();
  if (appLanguageSelect) appLanguageSelect.value = CONFIG.LANG || 'id';

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    try {
      if (apiUrlInput) {
        CONFIG.API_URL = apiUrlInput.value.trim();
      }
      CONFIG.WA_TEMPLATE = waTemplateInput.value.trim();
      CONFIG.REMINDER_INTERVAL = parseInt(reminderIntervalSelect.value);
      CONFIG.MOCK_MODE = mockModeCheckbox.checked;
      if (notifStyleSelect) CONFIG.NOTIF_STYLE = notifStyleSelect.value;
      if (notifVibrateCheckbox) CONFIG.NOTIF_VIBRATE = notifVibrateCheckbox.checked;
      if (notifSilentCheckbox) CONFIG.NOTIF_SILENT = notifSilentCheckbox.checked;
      if (toastPositionSelect) CONFIG.TOAST_POSITION = toastPositionSelect.value;
      if (toastDurationSelect) CONFIG.TOAST_DURATION = parseInt(toastDurationSelect.value);

      let langChanged = false;
      if (appLanguageSelect) {
        const oldLang = CONFIG.LANG;
        const newLang = appLanguageSelect.value;
        if (oldLang !== newLang) {
          CONFIG.LANG = newLang;
          langChanged = true;
        }
      }

      updateApiStatusBadge();

      showToast({
        title: CONFIG.LANG === 'en' ? "Settings Saved" : "Pengaturan Disimpan",
        message: CONFIG.LANG === 'en' ? "All application settings have been successfully saved." : "Semua setelan aplikasi berhasil disimpan.",
        type: "success"
      });

      if (langChanged) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      showToast({
        title: "Gagal Menyimpan",
        message: "Terjadi kesalahan saat menyimpan pengaturan.",
        type: "error"
      });
    }
  });

  // Test Notification Trigger
  btnTestNotif.addEventListener('click', () => {
    if (!('Notification' in window)) {
      showToast({
        title: "Tidak Didukung",
        message: "Browser Anda tidak mendukung notifikasi push.",
        type: "error"
      });
      return;
    }

    if (Notification.permission === 'granted') {
      showNotification('FPManager Uji Coba Notifikasi 🔔', {
        body: 'Selamat! Push notification bekerja dengan baik di perangkat ini.',
        icon: './assets/img/icon-192.png'
      });
      showToast({
        title: "Notifikasi Terkirim",
        message: "Silakan periksa laci notifikasi perangkat Anda.",
        type: "success"
      });
    } else {
      showToast({
        title: "Izin Dibutuhkan",
        message: "Harap berikan izin notifikasi terlebih dahulu.",
        type: "warning"
      });
    }
  });

  // Request Notification Permission
  btnReqNotif.addEventListener('click', () => {
    if (!('Notification' in window)) {
      showToast({
        title: "Tidak Didukung",
        message: "Browser Anda tidak mendukung notifikasi push.",
        type: "error"
      });
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast({
          title: "Izin Diberikan",
          message: "Anda sekarang dapat menerima notifikasi pengingat deadline.",
          type: "success"
        });
        showNotification('Notifikasi Diaktifkan! 🔔', {
          body: 'Terima kasih telah mengaktifkan notifikasi untuk FPManager.',
          icon: './assets/img/icon-192.png'
        });
      } else {
        showToast({
          title: "Izin Ditolak",
          message: "Izin notifikasi ditolak. Anda harus mengaktifkannya secara manual dari setelan browser.",
          type: "warning"
        });
      }
    });
  });

  // Test In-App Notification (Toast)
  if (btnTestToast) {
    btnTestToast.addEventListener('click', () => {
      showToast({
        title: CONFIG.LANG === 'en' ? "In-App Notification Test" : "Uji Coba Alert Aplikasi 🔔",
        message: CONFIG.LANG === 'en' ? "Success! This in-app alert is working properly." : "Berhasil! Alert dalam aplikasi ini berfungsi dengan baik.",
        type: "success"
      });
    });
  }
});

// Helper update status badge on header
function updateApiStatusBadge() {
  const badge = document.getElementById('apiStatusBadge');
  if (badge) {
    if (CONFIG.MOCK_MODE) {
      badge.textContent = 'Mock Mode (Offline)';
      badge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800';
    } else {
      badge.textContent = 'Live API (Google sheets)';
      badge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    }
  }
}

// Reset Settings to Defaults
function resetDefaults() {
  if (confirm("Apakah Anda yakin ingin mengembalikan semua setelan ke nilai default bawaan?")) {
    localStorage.removeItem('cfg_api_url');
    localStorage.removeItem('cfg_api_key');
    localStorage.removeItem('cfg_wa_template');
    localStorage.removeItem('cfg_reminder_interval');
    localStorage.removeItem('cfg_mock_mode');
    localStorage.removeItem('cfg_notif_style');
    localStorage.removeItem('cfg_notif_vibrate');
    localStorage.removeItem('cfg_notif_silent');
    localStorage.removeItem('cfg_toast_position');
    localStorage.removeItem('cfg_toast_duration');
    localStorage.removeItem('cfg_lang');
    
    showToast({
      title: "Setelan Direset",
      message: "Mengembalikan konfigurasi default. Halaman akan dimuat ulang...",
      type: "success"
    });

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }
}

// Render current device and login time information
function renderDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  // OS detection
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("X11") !== -1) os = "UNIX";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

  // Browser detection
  if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Chromium") === -1) {
    if (ua.indexOf("Edg") !== -1) browser = "Microsoft Edge";
    else if (ua.indexOf("OPR") !== -1 || ua.indexOf("Opera") !== -1) browser = "Opera";
    else browser = "Google Chrome";
  } else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) {
    browser = "Safari";
  } else if (ua.indexOf("Firefox") !== -1) {
    browser = "Mozilla Firefox";
  } else if (ua.indexOf("MSIE") !== -1 || !!document.documentMode === true) {
    browser = "Internet Explorer";
  }

  // Get login time from sessionStorage (set it if not found)
  let loginTime = sessionStorage.getItem("login_time");
  if (!loginTime) {
    loginTime = new Date().toISOString();
    sessionStorage.setItem("login_time", loginTime);
  }
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const formattedTime = new Date(loginTime).toLocaleString(isEn ? 'en-US' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Set UI elements if they exist
  const osEl = document.getElementById('deviceOS');
  const browserEl = document.getElementById('deviceBrowser');
  const timeEl = document.getElementById('deviceLoginTime');
  const ipEl = document.getElementById('deviceIP');

  if (osEl) osEl.textContent = os;
  if (browserEl) browserEl.textContent = browser;
  if (timeEl) timeEl.textContent = formattedTime;

  // Connection/IP Address estimation
  if (ipEl) {
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
      ipEl.textContent = '127.0.0.1 (Localhost)';
    } else {
      ipEl.textContent = 'Online (Public Client)';
    }
  }
}

