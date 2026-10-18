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
  const notifStyleSelect = document.getElementById('notifStyle');
  const notifVibrateCheckbox = document.getElementById('notifVibrate');
  const notifSilentCheckbox = document.getElementById('notifSilent');
  const toastPositionSelect = document.getElementById('toastPosition');
  const toastDurationSelect = document.getElementById('toastDuration');
  const appLanguageSelect = document.getElementById('appLanguage');

  const btnTestNotif = document.getElementById('btnTestNotif');
  const btnReqNotif = document.getElementById('btnReqNotif');
  const btnTestToast = document.getElementById('btnTestToast');

  const waTemplateCard = document.getElementById('waTemplateCard');
  if (waTemplateCard) {
    waTemplateCard.classList.remove('hidden');
  }

  // Load saved configurations to inputs
  if (apiUrlInput) apiUrlInput.value = CONFIG.API_URL || '';
  if (waTemplateInput) waTemplateInput.value = CONFIG.WA_TEMPLATE || '';
  if (reminderIntervalSelect) reminderIntervalSelect.value = (CONFIG.REMINDER_INTERVAL || 18000000).toString();
  if (notifStyleSelect) notifStyleSelect.value = CONFIG.NOTIF_STYLE || 'casual';
  if (notifVibrateCheckbox) notifVibrateCheckbox.checked = CONFIG.NOTIF_VIBRATE !== false;
  if (notifSilentCheckbox) notifSilentCheckbox.checked = !!CONFIG.NOTIF_SILENT;
  if (toastPositionSelect) toastPositionSelect.value = CONFIG.TOAST_POSITION || 'top-right';
  if (toastDurationSelect) toastDurationSelect.value = (CONFIG.TOAST_DURATION || 1000).toString();
  if (appLanguageSelect) appLanguageSelect.value = CONFIG.LANG || 'id';

  // Handle Form Submission
  let isSettingsSubmitting = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (isSettingsSubmitting || (submitBtn && submitBtn.disabled)) return;
    isSettingsSubmitting = true;

    const origBtnText = submitBtn ? submitBtn.innerHTML : "Simpan Pengaturan";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
    }

    try {
      if (apiUrlInput) {
        CONFIG.API_URL = apiUrlInput.value.trim();
      }
      if (waTemplateInput && waTemplateCard && !waTemplateCard.classList.contains('hidden')) {
        CONFIG.WA_TEMPLATE = waTemplateInput.value.trim();
      }
      CONFIG.REMINDER_INTERVAL = parseInt(reminderIntervalSelect.value);
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
    } finally {
      isSettingsSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.innerHTML = origBtnText;
      }
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
      showNotification('FPManager Uji Coba Notifikasi', {
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
        showNotification('Notifikasi Diaktifkan!', {
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
        title: CONFIG.LANG === 'en' ? "In-App Notification Test" : "Uji Coba Alert Aplikasi",
        message: CONFIG.LANG === 'en' ? "Success! This in-app alert is working properly." : "Berhasil! Alert dalam aplikasi ini berfungsi dengan baik.",
        type: "success"
      });
    });
  }
  // Handle Clear Cache & Session Button
  const btnClearStorageCache = document.getElementById('btnClearStorageCache');
  if (btnClearStorageCache) {
    btnClearStorageCache.addEventListener('click', async () => {
      if (await showConfirmModal({
        title: 'Bersihkan Cache & Riwayat',
        message: 'Apakah Anda yakin ingin membersihkan seluruh cache, cookie non-login, dan riwayat sementara aplikasi? (Sesi login Anda tidak akan terhapus). Shortcut: Ctrl + 1',
        type: 'warning',
        confirmText: 'Bersihkan Cache'
      })) {
        if (typeof clearWebCacheAndHistory === 'function') {
          await clearWebCacheAndHistory(true);
        } else {
          window.location.reload();
        }
      }
    });
  }

  // Khusus Super Admin: Tampilkan Card Backup Database & Inisialisasi
  const isSuperAdmin = typeof Auth !== 'undefined' && typeof Auth.isSuperAdmin === 'function' && Auth.isSuperAdmin();
  const superAdminBackupCard = document.getElementById('superAdminBackupCard');
  if (superAdminBackupCard) {
    if (isSuperAdmin) {
      superAdminBackupCard.classList.remove('hidden');
      initSuperAdminBackup();
    } else {
      superAdminBackupCard.classList.add('hidden');
    }
  }
});


// Helper update status badge on header
function updateApiStatusBadge() {
  const badge = document.getElementById('apiStatusBadge');
  if (badge) {
    badge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-800 shadow-sm shadow-emerald-500/50 animate-pulse"></span>';
    badge.className = 'absolute bottom-0 right-0 z-20 flex items-center justify-center pointer-events-none';
    badge.title = 'Live Google Sheets Connected';
  }
}

// Reset Settings to Defaults
async function resetDefaults() {
  if (await showConfirmModal({
    title: 'Reset Pengaturan Default',
    message: 'Apakah Anda yakin ingin mengembalikan semua setelan ke nilai default bawaan?',
    type: 'warning',
    confirmText: 'Kembalikan Default'
  })) {
    localStorage.removeItem('cfg_api_url');
    localStorage.removeItem('cfg_api_key');
    localStorage.removeItem('cfg_wa_template');
    localStorage.removeItem('cfg_reminder_interval');
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

  // Get login time from SessionManager / Storage
  let loginTimestamp = (typeof SessionManager !== 'undefined' && SessionManager.getLoginTime) 
    ? SessionManager.getLoginTime() 
    : (sessionStorage.getItem("auth_login_time") || sessionStorage.getItem("login_time") || Date.now());
  
  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const formattedTime = new Date(loginTimestamp).toLocaleString(isEn ? 'en-US' : 'id-ID', {
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

// =================================================================
// LOGIKA BACKUP DATABASE & GOOGLE DRIVE (KHUSUS SUPER ADMIN)
// =================================================================

function initSuperAdminBackup() {
  updateBackupStatusUI();

  // Tombol Backup Now (Unduh & Upload ke Drive) - Proteksi duplikasi event listener
  const btnBackupNow = document.getElementById('btnBackupNow');
  if (btnBackupNow && !btnBackupNow.dataset.bound) {
    btnBackupNow.dataset.bound = 'true';
    btnBackupNow.addEventListener('click', handleBackupNowClick);
  }


  // Modal Close Button
  const btnBackupModalClose = document.getElementById('btnBackupModalClose');
  const backupSuccessModal = document.getElementById('backupSuccessModal');
  if (btnBackupModalClose && backupSuccessModal) {
    btnBackupModalClose.addEventListener('click', () => {
      backupSuccessModal.classList.add('hidden');
      backupSuccessModal.classList.remove('flex');
    });

    backupSuccessModal.addEventListener('click', (e) => {
      if (e.target === backupSuccessModal) {
        backupSuccessModal.classList.add('hidden');
        backupSuccessModal.classList.remove('flex');
      }
    });
  }

  // Coba sinkronisasi info backup terbaru dari backend
  if (typeof API !== 'undefined' && typeof API.getBackupStatus === 'function') {
    API.getBackupStatus().then(res => {
      if (res && res.success && res.lastBackupTime) {
        localStorage.setItem('fpm_last_backup_time', res.lastBackupTime);
        if (res.lastBackupReadable) {
          localStorage.setItem('fpm_last_backup_readable', res.lastBackupReadable);
        }
        updateBackupStatusUI();
      }
    }).catch(e => console.warn('Pengecekan backup status server dilewati:', e));
  }
}

function updateBackupStatusUI() {
  const statusEl = document.getElementById('lastBackupStatusTime');
  if (!statusEl) return;

  const lastIso = localStorage.getItem('fpm_last_backup_time');
  const lastReadable = localStorage.getItem('fpm_last_backup_readable');

  if (lastReadable) {
    statusEl.textContent = lastReadable;
    statusEl.className = 'font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]';
    return;
  }

  if (lastIso) {
    try {
      const d = new Date(lastIso);
      const isEn = typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en';
      const formatted = d.toLocaleString(isEn ? 'en-US' : 'id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) + ' WIB';
      statusEl.textContent = formatted;
      statusEl.className = 'font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]';
      return;
    } catch (e) {}
  }

  statusEl.textContent = 'Belum pernah dicadangkan';
  statusEl.className = 'font-medium text-zinc-400 text-[11px] italic';
}

// Helper format nama file backup: FPManager_Backup_tgl-bln-thn_jam_hari.xlsx
function getFormattedBackupFileName() {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hari = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const ii = String(now.getMinutes()).padStart(2, '0');
  return `FPManager_Backup_${dd}-${mm}-${yyyy}_${hh}.${ii}_${hari}.xlsx`;
}

let isBackupProcessing = false;
let backupCooldownTimer = null;

async function handleBackupNowClick() {
  if (isBackupProcessing) {
    if (typeof showToast === 'function') {
      showToast({
        title: "Sedang Diproses",
        message: "Proses backup sedang berlangsung. Mohon tunggu...",
        type: "warning"
      });
    }
    return;
  }

  const btn = document.getElementById('btnBackupNow');
  if (!btn || btn.disabled) return;

  const origHtml = btn.innerHTML;
  isBackupProcessing = true;
  btn.disabled = true;
  btn.classList.add('opacity-75', 'cursor-not-allowed', 'pointer-events-none');
  btn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin text-base"></i>
    <span>Memproses Cadangan & Upload ke Drive...</span>
  `;

  try {
    const result = await API.backupDatabase({ triggerType: "Manual-SuperAdmin" });

    // Handle respon jika terdeteksi duplikasi request dari server atau API
    if (result && result.isDuplicate) {
      if (typeof showToast === 'function') {
        showToast({
          title: "Permintaan Ganda Dicegah",
          message: result.message || "Proses backup sedang berjalan atau baru saja dilakukan.",
          type: "warning"
        });
      }
      return;
    }

    if (!result || !result.success) {
      throw new Error((result && result.message) || "Gagal memproses backup spreadsheet.");
    }

    const targetFileName = result.fileName || getFormattedBackupFileName();

    // 1. Download spreadsheet (.xlsx) otomatis ke komputer
    let hasDownloaded = false;
    if (result.base64Data) {
      try {
        const byteCharacters = atob(result.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = targetFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        hasDownloaded = true;
      } catch (dlErr) {
        console.warn("Base64 direct download failed, fallback ke download link:", dlErr);
      }
    }

    if (!hasDownloaded && result.excelDownloadUrl) {
      const a = document.createElement('a');
      a.href = result.excelDownloadUrl;
      a.target = '_blank';
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // 2. Simpan waktu riwayat terakhir
    const nowIso = new Date().toISOString();
    localStorage.setItem('fpm_last_backup_time', nowIso);
    if (result.backupTime) {
      localStorage.setItem('fpm_last_backup_readable', result.backupTime);
    }
    if (result.excelDriveUrl || result.spreadsheetCopyUrl) {
      localStorage.setItem('fpm_last_backup_url', result.excelDriveUrl || result.spreadsheetCopyUrl);
    }
    updateBackupStatusUI();

    // 3. Tampilkan Modal Hasil Sukses
    const modal = document.getElementById('backupSuccessModal');
    const modalFileName = document.getElementById('backupModalFileName');
    const modalTime = document.getElementById('backupModalTime');
    const modalDriveLink = document.getElementById('backupModalDriveLink');

    if (modalFileName) modalFileName.textContent = targetFileName;
    if (modalTime) modalTime.textContent = result.backupTime || new Date().toLocaleString('id-ID');
    if (modalDriveLink) {
      modalDriveLink.href = result.excelDriveUrl || result.spreadsheetCopyUrl || result.folderUrl || "https://drive.google.com/drive/folders/111c2EllGHzFpHctklke2N-Dwi0gd-Vrc?usp=sharing";
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    if (typeof showToast === 'function') {
      showToast({
        title: "Backup Sukses!",
        message: "Data spreadsheet telah terdownload ke PC dan terupload ke Google Drive.",
        type: "success"
      });
    }

  } catch (err) {
    console.error("Backup error:", err);
    if (typeof showToast === 'function') {
      showToast({
        title: "Backup Gagal",
        message: err.message || "Terjadi kesalahan saat memproses backup.",
        type: "error"
      });
    }
  } finally {
    // Proteksi request ganda: Cooldown countdown 10 detik sebelum tombol dapat diklik kembali
    let remainingCooldown = 10;
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed', 'pointer-events-none');
    btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i> Tunggu (${remainingCooldown}s)...`;

    if (backupCooldownTimer) clearInterval(backupCooldownTimer);
    backupCooldownTimer = setInterval(() => {
      remainingCooldown -= 1;
      if (remainingCooldown > 0) {
        btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i> Tunggu (${remainingCooldown}s)...`;
      } else {
        clearInterval(backupCooldownTimer);
        backupCooldownTimer = null;
        isBackupProcessing = false;
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed', 'pointer-events-none');
        btn.innerHTML = origHtml;
      }
    }, 1000);
  }
}



