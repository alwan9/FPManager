// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
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
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
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
  console.log('FPManager PWA was installed successfully');

  // Request notification permission and show welcome notification
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification('Selamat Bergabung di FPManager! 🎉', {
            body: 'Terima kasih telah menginstal aplikasi kami. Nikmati kemudahan melacak deadline, status projek, & laporan keuangan secara offline.',
            icon: './assets/img/icon-192.png'
          });
        }
      });
    } else if (Notification.permission === 'granted') {
      showNotification('Selamat Bergabung di FPManager! 🎉', {
        body: 'Terima kasih telah menginstal aplikasi kami. Nikmati kemudahan melacak deadline, status projek, & laporan keuangan secara offline.',
        icon: './assets/img/icon-192.png'
      });
    }
  }

  // Show Toast Success
  if (typeof showToast === 'function') {
    showToast({
      title: 'Selamat Bergabung! 🎉',
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
      <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
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
          <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
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
        2. Gulir ke bawah dan ketuk <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> <i class="fa-regular fa-square-plus text-emerald-400 mx-0.5"></i>.
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
        <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
          <i class="fa-solid fa-download text-lg"></i>
        </div>
        <div>
          <h4 class="font-bold text-sm text-zinc-100 font-sans">Instal Aplikasi FPManager</h4>
          <p class="text-xs text-zinc-400 mt-1 font-sans">Instal FPManager di perangkat Anda untuk akses lebih cepat, lancar, dan mendukung penggunaan offline.</p>
        </div>
      </div>
      <div class="flex space-x-2 justify-end">
        <button id="pwaAndroidClose" class="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-all font-sans">Nanti</button>
        <button id="pwaAndroidInstall" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-all font-sans">Instal</button>
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

// Check for Deadlines (H-1)
async function checkDeadlines() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
      try {
        const proyekList = await API.getProyek();
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
}

function showNotification(title, options) {
  const finalOptions = {
    badge: './assets/img/favicon.png',
    ...options
  };

  // Set vibrate if enabled
  if (CONFIG.NOTIF_VIBRATE) {
    finalOptions.vibrate = [200, 100, 200];
  } else {
    finalOptions.vibrate = [];
  }

  // Set silent if enabled
  if (CONFIG.NOTIF_SILENT) {
    finalOptions.silent = true;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, finalOptions);
    });
  } else {
    new Notification(title, finalOptions);
  }
}

// Run check 5 seconds after load to not block UI rendering
setTimeout(checkDeadlines, 5000);
// Run check periodically (every 30 minutes)
setInterval(checkDeadlines, 30 * 60 * 1000);
