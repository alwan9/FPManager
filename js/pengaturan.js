document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  if (typeof Auth !== 'undefined' && typeof Auth.checkLogin === 'function') {
    Auth.checkLogin();
  }

  // Set API status badge
  updateApiStatusBadge();

  // Get DOM elements
  const form = document.getElementById('settingsForm');
  const apiUrlInput = document.getElementById('apiUrl');
  const waTemplateInput = document.getElementById('waTemplate');
  const reminderIntervalSelect = document.getElementById('reminderInterval');
  const mockModeCheckbox = document.getElementById('mockMode');

  const btnTestNotif = document.getElementById('btnTestNotif');
  const btnReqNotif = document.getElementById('btnReqNotif');

  // Load saved configurations to inputs
  if (apiUrlInput) apiUrlInput.value = CONFIG.API_URL;
  if (waTemplateInput) waTemplateInput.value = CONFIG.WA_TEMPLATE;
  if (reminderIntervalSelect) reminderIntervalSelect.value = CONFIG.REMINDER_INTERVAL.toString();
  if (mockModeCheckbox) mockModeCheckbox.checked = CONFIG.MOCK_MODE;

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

      updateApiStatusBadge();

      showToast({
        title: "Pengaturan Disimpan",
        message: "Semua setelan aplikasi berhasil disimpan.",
        type: "success"
      });
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
