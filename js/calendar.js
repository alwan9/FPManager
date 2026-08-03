// Calendar Sync Helper for Google Calendar & iCal Export (.ics)
const CalendarSync = {
  formatDateForICal(dateStr) {
    if (!dateStr) {
      const d = new Date();
      return d.toISOString().replace(/[-:]/g, '').split('T')[0];
    }
    return dateStr.replace(/-/g, '');
  },

  getNextDayForICal(dateStr) {
    if (!dateStr) return this.formatDateForICal();
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  },

  getGoogleCalendarUrl(proyek) {
    if (!proyek) return '#';
    const title = encodeURIComponent(`Deadline Proyek: ${proyek.namaProyek || 'Proyek'} (${proyek.namaPelanggan || 'Klien'})`);
    const details = encodeURIComponent(
      `Projek: ${proyek.namaProyek}\n` +
      `Klien: ${proyek.namaPelanggan || '-'} (+${proyek.nomorWA || '-'})\n` +
      `Produk: ${proyek.produk || '-'} (${proyek.jumlah || 1} ${proyek.satuan || 'pcs'})\n` +
      `Nominal: Rp ${Number(proyek.nominalProyek || 0).toLocaleString('id-ID')}\n` +
      `Sisa Tagihan: Rp ${Number(proyek.sisaPembayaran || 0).toLocaleString('id-ID')}\n` +
      `Status: ${proyek.status || '-'}\n` +
      `Catatan: ${proyek.catatan || '-'}`
    );
    const startDay = this.formatDateForICal(proyek.deadline);
    const endDay = this.getNextDayForICal(proyek.deadline);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startDay}/${endDay}`;
  },

  downloadICal(proyek) {
    if (!proyek) return;
    const startDay = this.formatDateForICal(proyek.deadline);
    const endDay = this.getNextDayForICal(proyek.deadline);
    const title = `Deadline Proyek: ${proyek.namaProyek || 'Proyek'} (${proyek.namaPelanggan || 'Klien'})`;
    const details = (
      `Projek: ${proyek.namaProyek}\n` +
      `Klien: ${proyek.namaPelanggan || '-'} (+${proyek.nomorWA || '-'})\n` +
      `Produk: ${proyek.produk || '-'} (${proyek.jumlah || 1} ${proyek.satuan || 'pcs'})\n` +
      `Nominal: Rp ${Number(proyek.nominalProyek || 0).toLocaleString('id-ID')}\n` +
      `Sisa Tagihan: Rp ${Number(proyek.sisaPembayaran || 0).toLocaleString('id-ID')}\n` +
      `Status: ${proyek.status || '-'}\n` +
      `Catatan: ${proyek.catatan || '-'}`
    ).replace(/\n/g, '\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FPManager//Freelance Project Manager//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:proyek-${proyek.iDProyek || Date.now()}@fpmanager`,
      `DTSTAMP:${this.formatDateForICal()}T000000Z`,
      `DTSTART;VALUE=DATE:${startDay}`,
      `DTEND;VALUE=DATE:${endDay}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Deadline_${proyek.iDProyek || 'Proyek'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof Toast !== 'undefined') {
      Toast.success('File iCal Diunduh', 'File .ics berhasil diunduh. Buka file untuk menambahkan ke Apple/Outlook Calendar.');
    }
  },

  prompt(proyek) {
    if (!proyek) return;

    let modal = document.getElementById('calendarSyncModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'calendarSyncModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-[9999] p-4';
      document.body.appendChild(modal);
    }

    const gcalUrl = this.getGoogleCalendarUrl(proyek);
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

    modal.innerHTML = `
      <div class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 transform transition-all">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <i class="fa-solid fa-calendar-plus text-lg"></i>
            </div>
            <div>
              <h3 class="font-bold text-base">${isEn ? 'Sync Calendar' : 'Tambah ke Kalender'}</h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">${proyek.iDProyek} - ${proyek.namaProyek}</p>
            </div>
          </div>
          <button onclick="document.getElementById('calendarSyncModal').classList.add('hidden')" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg">&times;</button>
        </div>

        <p class="text-xs text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
          ${isEn ? 'Choose your calendar app to set deadline reminder:' : 'Pilih aplikasi kalender untuk memasang pengingat deadline projek ini:'}
        </p>

        <div class="space-y-3">
          <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" onclick="document.getElementById('calendarSyncModal').classList.add('hidden')" class="flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition text-blue-700 dark:text-blue-300 font-semibold text-sm">
            <div class="flex items-center space-x-3">
              <i class="fa-brands fa-google text-lg text-blue-600"></i>
              <span>Google Calendar</span>
            </div>
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </a>

          <button id="btnAppleICal" class="w-full flex items-center justify-between p-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl transition text-zinc-800 dark:text-zinc-100 font-semibold text-sm">
            <div class="flex items-center space-x-3">
              <i class="fa-brands fa-apple text-lg text-zinc-700 dark:text-zinc-300"></i>
              <span>Apple / iCal / Outlook (.ics)</span>
            </div>
            <i class="fa-solid fa-download text-xs"></i>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const btnApple = modal.querySelector('#btnAppleICal');
    if (btnApple) {
      btnApple.onclick = () => {
        modal.classList.add('hidden');
        this.downloadICal(proyek);
      };
    }
  }
};
