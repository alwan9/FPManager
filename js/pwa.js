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

// Request Notification Permission on load if not already handled
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

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
            // Check if we already notified today to prevent spam
            const notifKey = `notified_${proyek.id || proyek.namaProyek}_${today.getTime()}`;
            if (!localStorage.getItem(notifKey)) {
              showNotification('Deadline H-1: ' + proyek.namaProyek, {
                body: `Proyek untuk klien ${proyek.namaPelanggan} harus selesai besok!`,
                icon: './assets/img/favicon.png'
              });
              localStorage.setItem(notifKey, 'true');
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
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, options);
    });
  } else {
    new Notification(title, options);
  }
}

// Run check 5 seconds after load to not block UI rendering
setTimeout(checkDeadlines, 5000);
// Run check periodically (every 1 hour)
setInterval(checkDeadlines, 60 * 60 * 1000);
