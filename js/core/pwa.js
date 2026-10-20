// Register Service Worker & Auto-Update Handling
if ('serviceWorker' in navigator) {
  let refreshing = false;

  // Reload page automatically when new Service Worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    const swPath = (window.location.pathname || '').includes('/pages/') ? '../sw.js' : './sw.js';
    navigator.serviceWorker.register(swPath)
      .then(registration => {

        // Force check for updates on load
        registration.update().catch(err => {
          console.debug('ServiceWorker update check skipped (offline or server unreachable):', err);
        });

        // Detect when a new Service Worker update is installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (typeof showToast === 'function') {
                  showToast({
                    title: 'Pembaruan Aplikasi',
                    message: 'Versi baru FPManager telah siap. Memuat ulang halaman...',
                    type: 'info'
                  });
                }
              }
            });
          }
        });
      })
      .catch(() => {});
  });

  // Check for SW updates whenever user switches back to the app window
  window.addEventListener('focus', () => {
    navigator.serviceWorker.ready.then(registration => {
      registration.update().catch(err => {
        console.debug('ServiceWorker update check skipped (offline or server unreachable):', err);
      });
    }).catch(() => {});
  });
}

// PWA Install Prompt Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  const installBtn = document.getElementById('pwaInstallBtn');
  const installBtnMobile = document.getElementById('pwaInstallBtnMobile');

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isDashboard = currentPath === 'index.html';

  const setupInstallBtn = (btn, isFlex) => {
    if (!btn) return;
    if (btn.id === 'pwaInstallBtn' && window.innerWidth < 768) {
      return;
    }
    btn.classList.remove('hidden');
    if (isFlex) btn.classList.add('flex');
    else btn.classList.add('block');

    btn.addEventListener('click', async () => {
      if (installBtn) {
        installBtn.classList.add('hidden');
        installBtn.classList.remove('flex');
      }
      if (installBtnMobile) {
        installBtnMobile.classList.add('hidden');
        installBtnMobile.classList.remove('block');
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    });
  };

  setupInstallBtn(installBtn, true);
  setupInstallBtn(installBtnMobile, false);
});

// Detect successful PWA installation
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;

  // Request notification permission and show welcome notification
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification('Selamat Bergabung di FPManager!', {
            body: 'Terima kasih telah menginstal aplikasi kami. Nikmati kemudahan melacak deadline, status projek, & laporan keuangan secara offline.',
            icon: './assets/img/icon-192.png'
          });
        }
      });
    } else if (Notification.permission === 'granted') {
      showNotification('Selamat Bergabung di FPManager!', {
        body: 'Terima kasih telah menginstal aplikasi kami. Nikmati kemudahan melacak deadline, status projek, & laporan keuangan secara offline.',
        icon: './assets/img/icon-192.png'
      });
    }
  }

  // Show Toast Success
  if (typeof showToast === 'function') {
    showToast({
      title: 'Selamat Bergabung!',
      message: 'Aplikasi FPManager berhasil terinstal di layar utama Anda.',
      type: 'success'
    });
  }
});

// Check for insecure context
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isSecure = window.location.protocol === 'https:' || isLocalhost;
if (!isSecure) {
  console.warn('PWA: Berjalan di origin yang tidak aman (HTTP). Service worker dan notifikasi mungkin tidak akan berfungsi di HP.');
}

// Function to create a floating prompt for notification permissions
function createNotificationPrompt() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  if (sessionStorage.getItem('pwa_notif_prompt_dismissed') === 'true') return;
  if (document.getElementById('pwa-notification-prompt')) return;

  const prompt = document.createElement('div');
  prompt.id = 'pwa-notification-prompt';
  prompt.className = 'fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-zinc-900 text-white rounded-2xl shadow-2xl p-5 border border-zinc-800 flex flex-col gap-4 z-[9998] transition-all duration-500 ease-out transform translate-y-10 opacity-0';

  prompt.innerHTML = `
    <div style="z-index: 99999;" class="flex items-start space-x-3">
      <div class="pwa-prompt-icon-container w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] aspect-square rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
        <i class="fa-solid fa-bell text-lg"></i>
      </div>
      <div>
        <h4 class="font-bold text-sm text-zinc-100 font-sans">Aktifkan Notifikasi</h4>
        <p class="text-xs text-zinc-400 mt-1 font-sans">Dapatkan pengingat deadline projek langsung di bar notifikasi HP Anda agar tidak ada yang terlewat.</p>
      </div>
    </div>
    <div class="flex space-x-2 justify-end">
      <button id="pwaNotifClose" class="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-all font-sans">Nanti</button>
      <button id="pwaNotifAllow" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all font-sans">Aktifkan</button>
    </div>
  `;

  document.body.appendChild(prompt);

  // Animate in
  setTimeout(() => {
    prompt.classList.remove('translate-y-10', 'opacity-0');
  }, 100);

  const closePrompt = () => {
    prompt.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => prompt.remove(), 500);
  };

  document.getElementById('pwaNotifClose').addEventListener('click', () => {
    closePrompt();
    sessionStorage.setItem('pwa_notif_prompt_dismissed', 'true');
  });

  document.getElementById('pwaNotifAllow').addEventListener('click', () => {
    Notification.requestPermission().then(permission => {
      closePrompt();
      if (permission === 'granted') {
        if (typeof showToast === 'function') {
          showToast({
            title: 'Notifikasi Aktif',
            message: 'Anda akan menerima pengingat deadline projek H-1.',
            type: 'success'
          });
        }
        // Show test notification
        showNotification('Pengingat Deadline Aktif', {
          body: 'Notifikasi berhasil diaktifkan untuk FPManager!',
          icon: './assets/img/icon-192.png'
        });
        checkDeadlines();
      } else if (permission === 'denied') {
        if (typeof showToast === 'function') {
          showToast({
            title: 'Izin Ditolak',
            message: 'Izin notifikasi ditolak. Anda dapat mengaktifkannya secara manual di pengaturan browser Anda.',
            type: 'warning'
          });
        }
      }
    });
  });
}

// Function to show iOS install instructions
function showIOSInstallPrompt(callback) {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath !== 'index.html' && currentPath !== '') {
    if (typeof callback === 'function') callback();
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isIOS && !isStandalone && sessionStorage.getItem('pwa_ios_prompt_dismissed') !== 'true') {
    const prompt = document.createElement('div');
    prompt.id = 'pwa-ios-prompt';
    prompt.className = 'fixed bottom-20 left-4 right-4 bg-zinc-900 text-white rounded-2xl shadow-2xl p-5 border border-zinc-800 flex flex-col gap-4 z-[9998] transition-all duration-500 ease-out transform translate-y-10 opacity-0';

    prompt.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3">
          <div class="pwa-prompt-icon-container w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] aspect-square rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <i class="fa-solid fa-circle-info text-lg"></i>
          </div>
          <div>
            <h4 class="font-bold text-sm text-zinc-100 font-sans">Instal Aplikasi di iPhone</h4>
            <p class="text-xs text-zinc-400 mt-1 font-sans">Tambahkan FPManager ke layar utama Anda untuk akses lebih cepat.</p>
          </div>
        </div>
        <button id="pwaIOSClose" class="text-zinc-400 hover:text-white transition-colors"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl leading-relaxed font-sans">
        1. Ketuk tombol <strong>Bagikan (Share)</strong> <i class="fa-solid fa-share-from-square text-indigo-400 mx-0.5"></i> di bagian bawah layar Safari.<br>
        2. Gulir ke bawah dan ketuk <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> <i class="fa-regular fa-square-plus text-indigo-400 mx-0.5"></i>.
      </div>
    `;

    document.body.appendChild(prompt);

    // Animate in
    setTimeout(() => {
      prompt.classList.remove('translate-y-10', 'opacity-0');
    }, 100);

    const closePrompt = () => {
      prompt.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => {
        prompt.remove();
        if (typeof callback === 'function') callback();
      }, 500);
    };

    document.getElementById('pwaIOSClose').addEventListener('click', () => {
      closePrompt();
      sessionStorage.setItem('pwa_ios_prompt_dismissed', 'true');
    });
  } else {
    if (typeof callback === 'function') callback();
  }
}

// Function to show Android / Desktop install instructions custom prompt
function showAndroidInstallPrompt(callback) {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath !== 'index.html' && currentPath !== '') {
    if (typeof callback === 'function') callback();
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  if (!isStandalone && deferredPrompt && sessionStorage.getItem('pwa_install_prompt_dismissed') !== 'true') {
    const prompt = document.createElement('div');
    prompt.id = 'pwa-android-prompt';
    prompt.className = 'fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-zinc-900 text-white rounded-2xl shadow-2xl p-5 border border-zinc-800 flex flex-col gap-4 z-[9998] transition-all duration-500 ease-out transform translate-y-10 opacity-0';

    prompt.innerHTML = `
      <div style="z-index: 99999;" class="flex items-start space-x-3">
        <div class="pwa-prompt-icon-container w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] max-w-[2.5rem] max-h-[2.5rem] aspect-square rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
          <i class="fa-solid fa-download text-lg"></i>
        </div>
        <div>
          <h4 class="font-bold text-sm text-zinc-100 font-sans">Instal Aplikasi FPManager</h4>
          <p class="text-xs text-zinc-400 mt-1 font-sans">Instal FPManager di perangkat Anda untuk akses lebih cepat, lancar, dan mendukung penggunaan offline.</p>
        </div>
      </div>
      <div class="flex space-x-2 justify-end">
        <button id="pwaAndroidClose" class="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-all font-sans">Nanti</button>
        <button id="pwaAndroidInstall" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all font-sans">Instal</button>
      </div>
    `;

    document.body.appendChild(prompt);

    // Animate in
    setTimeout(() => {
      prompt.classList.remove('translate-y-10', 'opacity-0');
    }, 100);

    const closePrompt = () => {
      prompt.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => {
        prompt.remove();
        if (typeof callback === 'function') callback();
      }, 500);
    };

    document.getElementById('pwaAndroidClose').addEventListener('click', () => {
      closePrompt();
      sessionStorage.setItem('pwa_install_prompt_dismissed', 'true');
    });

    document.getElementById('pwaAndroidInstall').addEventListener('click', async () => {
      closePrompt();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    });
  } else {
    if (typeof callback === 'function') callback();
  }
}

// Initialize chained prompts logic
function initPWAPrompts() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath !== 'index.html' && currentPath !== '') {
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Reset dismissed flags if the user just logged in to guarantee prompts appear
  const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
  if (justLoggedIn) {
    sessionStorage.removeItem('just_logged_in');
    sessionStorage.removeItem('pwa_install_prompt_dismissed');
    sessionStorage.removeItem('pwa_ios_prompt_dismissed');
    sessionStorage.removeItem('pwa_notif_prompt_dismissed');
  }

  const proceedToNotificationPrompt = () => {
    createNotificationPrompt();
  };

  if (isIOS) {
    showIOSInstallPrompt(proceedToNotificationPrompt);
  } else {
    showAndroidInstallPrompt(proceedToNotificationPrompt);
  }
}

// Run prompts after the page is loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    initPWAPrompts();
  }, 3000);
});

// App Badging API Helper
function updateAppBadge(count) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

// Calculate and update App Badge for urgent deadlines / unpaid projects
async function refreshAppBadge() {
  if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
    try {
      const proyekList = await API.getProyek();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let urgentCount = 0;
      proyekList.forEach(proyek => {
        const statusLower = (proyek.status || '').toLowerCase();
        if (statusLower === 'selesai' || statusLower === 'dibatalkan') return;

        if (statusLower === 'belum pembayaran') {
          urgentCount++;
          return;
        }

        if (proyek.deadline) {
          const deadlineDate = new Date(proyek.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          const diffTime = deadlineDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) { // Due today, tomorrow, or overdue
            urgentCount++;
          }
        }
      });

      updateAppBadge(urgentCount);
    } catch (err) {
      console.error('Failed to update app badge:', err);
    }
  }
}

// Online / Offline Status Listeners & Auto-Sync
window.addEventListener('online', async () => {
  if (typeof showToast === 'function') {
    showToast({
      title: 'Kembali Online',
      message: 'Perangkat Anda telah terhubung kembali. Memulai sinkronisasi data...',
      type: 'success'
    });
  }
  if (typeof API !== 'undefined' && typeof API.syncOfflineData === 'function') {
    await API.syncOfflineData();
  }
});

window.addEventListener('offline', () => {
  if (typeof showToast === 'function') {
    showToast({
      title: 'Mode Offline',
      message: 'Anda sedang offline. Perubahan data akan disimpan lokal & disinkronkan nanti.',
      type: 'warning'
    });
  }
});

// Service Worker message listener for Background Sync
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
      if (typeof API !== 'undefined' && typeof API.syncOfflineData === 'function') {
        await API.syncOfflineData();
      }
    }
  });
}

// Check for Deadlines (H-1) & Refresh Badge
async function checkDeadlines() {
  refreshAppBadge();
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      let proyekList = [];
      if (typeof FPManagerDB !== 'undefined' && typeof FPManagerDB.getAll === 'function') {
        proyekList = await FPManagerDB.getAll('proyek');
      }
      if (!proyekList || proyekList.length === 0) {
        if (Array.isArray(window.allProyekList) && window.allProyekList.length > 0) {
          proyekList = window.allProyekList;
        } else if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
          proyekList = await API.getProyek();
        }
      }
      if (!Array.isArray(proyekList) || proyekList.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

        proyekList.forEach(proyek => {
          const statusLower = (proyek.status || '').toLowerCase();
          if (statusLower === 'selesai' || statusLower === 'belum pembayaran' || statusLower === 'dibatalkan') {
            return;
          }

          if (!proyek.deadline) return;
          const deadlineDate = new Date(proyek.deadline);
          deadlineDate.setHours(0, 0, 0, 0);

          const diffTime = deadlineDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) { // H-1
            // Check if we already notified within the last 5 hours to prevent spam
            const notifKey = `notified_time_${proyek.iDProyek || proyek.id || proyek.namaProyek}`;
            const lastNotified = localStorage.getItem(notifKey);
            const now = Date.now();
            const intervalTime = CONFIG.REMINDER_INTERVAL;

            if (!lastNotified || (now - parseInt(lastNotified)) >= intervalTime) {
              let title = 'Deadline H-1: ' + proyek.namaProyek;
              let body = `Projek untuk klien ${proyek.namaPelanggan} harus selesai besok!`;

              const notifStyle = CONFIG.NOTIF_STYLE || 'casual';
              if (notifStyle === 'singkat') {
                title = 'Deadline H-1: ' + proyek.namaProyek;
                body = 'Sisa 1 hari lagi!';
              } else if (notifStyle === 'formal') {
                title = 'Pemberitahuan Tenggat Waktu: ' + proyek.namaProyek;
                body = `Mengingatkan bahwa proyek atas nama ${proyek.namaPelanggan} memiliki batas waktu penyelesaian besok.`;
              }

              showNotification(title, {
                body: body,
                icon: './assets/img/icon-192.png'
              });
              localStorage.setItem(notifKey, now.toString());
            }
          }
        });
      } catch (err) {
        console.error('Gagal mengecek deadline', err);
      }
    }
}

function showNotification(title, options) {
  const isInPages = (window.location.pathname || '').includes('/pages/');
  const prefix = isInPages ? '../' : './';

  const finalOptions = {
    badge: prefix + 'assets/img/favicon.png',
    icon: prefix + 'assets/img/icon-192.png',
    ...options
  };

  if (isInPages) {
    if (typeof finalOptions.icon === 'string' && finalOptions.icon.startsWith('./assets/')) {
      finalOptions.icon = '../' + finalOptions.icon.slice(2);
    } else if (typeof finalOptions.icon === 'string' && finalOptions.icon.startsWith('assets/')) {
      finalOptions.icon = '../' + finalOptions.icon;
    }
    if (typeof finalOptions.badge === 'string' && finalOptions.badge.startsWith('./assets/')) {
      finalOptions.badge = '../' + finalOptions.badge.slice(2);
    } else if (typeof finalOptions.badge === 'string' && finalOptions.badge.startsWith('assets/')) {
      finalOptions.badge = '../' + finalOptions.badge;
    }
  }

  // Set vibrate if enabled
  if (typeof CONFIG !== 'undefined' && CONFIG.NOTIF_VIBRATE) {
    finalOptions.vibrate = [200, 100, 200];
  } else {
    finalOptions.vibrate = [];
  }

  // Set silent if enabled
  if (typeof CONFIG !== 'undefined' && CONFIG.NOTIF_SILENT) {
    finalOptions.silent = true;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, finalOptions);
    }).catch(() => {
      try { new Notification(title, finalOptions); } catch (e) {}
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, finalOptions);
    } catch (e) {}
  }
}
window.showNotification = showNotification;

// Synthesizer Audio Chime untuk notifikasi penugasan baru (Web Audio API)
function playAssignmentChime() {
  if (typeof CONFIG !== 'undefined' && CONFIG.NOTIF_SILENT) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // Nada C5, E5, G5
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.18, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.35);
    });
  } catch (err) {}
}
window.playAssignmentChime = playAssignmentChime;

// Deteksi & Notifikasi Penugasan (Assign) Baru untuk user yang sedang aktif di perangkat ini
let isCheckingAssignments = false;
async function checkNewAssignments(incomingProyekList = null) {
  if (isCheckingAssignments) return;
  isCheckingAssignments = true;

  try {
    const currUser = (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function' ? Auth.getUser() : null) ||
                     (typeof API !== 'undefined' && typeof API.getCurrentUser === 'function' ? API.getCurrentUser() : null);
    if (!currUser) return;

    const rawId = String(currUser.id || currUser.userId || currUser.Id_user || '').trim().toLowerCase();
    const rawUname = String(currUser.username || '').trim().toLowerCase();
    const rawName = String(currUser.name || currUser.nama || '').trim().toLowerCase();
    const userIdentifiers = [rawId, rawUname, rawName].filter(Boolean);
    if (userIdentifiers.length === 0) return;

    let proyekList = incomingProyekList;
    if (!Array.isArray(proyekList) || proyekList.length === 0) {
      if (typeof FPManagerDB !== 'undefined' && typeof FPManagerDB.getAll === 'function') {
        proyekList = await FPManagerDB.getAll('proyek');
      }
      if (!proyekList || proyekList.length === 0) {
        if (Array.isArray(window.allProyekList) && window.allProyekList.length > 0) {
          proyekList = window.allProyekList;
        } else if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
          proyekList = await API.getProyek();
        }
      }
    }
    if (!Array.isArray(proyekList) || proyekList.length === 0) return;

    const storageKey = `fp_notified_assignments_${rawId || rawUname}`;
    let notifiedMap = {};
    const storedRaw = localStorage.getItem(storageKey);
    const isFirstTime = storedRaw === null;
    if (storedRaw) {
      try {
        notifiedMap = JSON.parse(storedRaw) || {};
      } catch (e) {
        notifiedMap = {};
      }
    }

    // Filter projek yang relevan untuk user ini
    const assignedProjects = proyekList.filter(p => {
      if (!p) return false;
      const st = String(p.status || '').toLowerCase().trim();
      if (st === 'selesai' || st === 'dibatalkan' || st === 'batal') return false;

      const desVal = String(
        p.designerId ||
        p.assignDesigner ||
        p.idDesigner ||
        p.assign ||
        p.id_designer ||
        p.Id_designer ||
        ''
      ).trim().toLowerCase();

      if (desVal && desVal !== '-- belum di-assign --' && desVal !== 'belum di-assign' && desVal !== 'unassigned') {
        return userIdentifiers.includes(desVal);
      }
      return false;
    });

    // Jika pengguna baru pertama kali login di perangkat ini, tandai projek-projek terdahulu agar tidak spam
    if (isFirstTime) {
      assignedProjects.forEach(p => {
        const pid = String(p.iDProyek || p.id || p.namaProyek || '').trim();
        const desVal = String(p.designerId || p.assignDesigner || '').trim();
        if (pid) notifiedMap[pid] = desVal;
      });
      localStorage.setItem(storageKey, JSON.stringify(notifiedMap));
      return;
    }

    let hasNewNotification = false;
    const isInPages = (window.location.pathname || '').includes('/pages/');
    const projectDetailPrefix = isInPages ? '' : 'pages/';

    for (const p of assignedProjects) {
      const pid = String(p.iDProyek || p.id || p.namaProyek || '').trim();
      if (!pid) continue;

      const currentAssignVal = String(p.designerId || p.assignDesigner || '').trim();

      // Jika projek belum pernah ternotifikasi atau baru saja di-assign ulang ke user ini
      if (!notifiedMap[pid] || notifiedMap[pid] !== currentAssignVal) {
        hasNewNotification = true;
        notifiedMap[pid] = currentAssignVal;

        const namaKlien = p.namaPelanggan || p.pelanggan || 'Klien';
        const namaPrj = p.namaProyek || 'Projek Desain';
        const deadlineStr = p.deadline ? (String(p.deadline).replace(/^'+/, '').split('T')[0]) : 'Segera';
        const targetUrl = `${projectDetailPrefix}proyek.html?id=${encodeURIComponent(pid)}`;

        const title = `🎨 Tugas Baru: ${namaPrj}`;
        const body = `Halo ${currUser.name || currUser.username}! Anda baru saja ditugaskan pada projek "${namaPrj}" (${namaKlien}). Deadline: ${deadlineStr}.`;

        // 1. Notifikasi Sistem HP / Browser via Web Notification / PWA Service Worker
        if ('Notification' in window && Notification.permission === 'granted') {
          showNotification(title, {
            body: body,
            tag: `assign-${pid}`,
            data: {
              url: targetUrl,
              proyekId: pid
            }
          });
        }

        // 2. Alert Toast di dalam aplikasi (jika user sedang aktif di layar aplikasi)
        if (typeof showToast === 'function') {
          showToast({
            title: "Tugas Baru Ditugaskan!",
            message: `Anda ditugaskan pada projek "${namaPrj}" (${namaKlien}).`,
            type: "info"
          });
        }
      }
    }

    if (hasNewNotification) {
      playAssignmentChime();
      localStorage.setItem(storageKey, JSON.stringify(notifiedMap));
      refreshAppBadge();
    }
  } catch (err) {
    console.warn("Gagal memeriksa assignment baru:", err);
  } finally {
    isCheckingAssignments = false;
  }
}
window.checkNewAssignments = checkNewAssignments;

// Jalankan pengecekan deadline & assignment setelah halaman termuat
setTimeout(checkDeadlines, 5000);
setTimeout(checkNewAssignments, 2500);

// Pengecekan berkala (interval)
setInterval(checkDeadlines, 30 * 60 * 1000);  // Setiap 30 menit untuk deadline H-1
setInterval(checkNewAssignments, 30 * 1000);   // Setiap 30 detik untuk mendeteksi penugasan baru

// Trigger seketika saat user membuka kembali tab / aplikasi FPManager di HP/Laptop
window.addEventListener('focus', () => {
  if (typeof checkNewAssignments === 'function') checkNewAssignments();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && typeof checkNewAssignments === 'function') {
    checkNewAssignments();
  }
});

