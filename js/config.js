const CONFIG = {
  // Helper functions to get/set settings in LocalStorage

  get API_URL() {
    return localStorage.getItem('cfg_api_url') || 'https://script.google.com/macros/s/AKfycbyaZZrCQtMX9zNjl7KKKS_ne86m5q4_Ma534x6knNbZ9xsWik7DJRtwaF0KzbWU0KUtxQ/exec';
  },
  set API_URL(val) {
    localStorage.setItem('cfg_api_url', val);
  },

  get API_KEY() {
    return '3e9fB2YcALL8458a1fd92ab9d1c772e6bcda';
  },

  get GEMINI_API_KEY() {
    return localStorage.getItem('cfg_gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '';
  },
  set GEMINI_API_KEY(val) {
    localStorage.setItem('cfg_gemini_api_key', val);
  },

  get WA_TEMPLATE() {
    return localStorage.getItem('cfg_wa_template') || 'gimana kak? apakah sudah sesuai? atau bagai mana ya kak?';
  },
  set WA_TEMPLATE(val) {
    localStorage.setItem('cfg_wa_template', val);
  },

  get REMINDER_INTERVAL() {
    // default is 5 hours (in milliseconds)
    return parseInt(localStorage.getItem('cfg_reminder_interval')) || (5 * 60 * 60 * 1000);
  },
  set REMINDER_INTERVAL(val) {
    localStorage.setItem('cfg_reminder_interval', val);
  },

  get NOTIF_SILENT() {
    return localStorage.getItem('cfg_notif_silent') === 'true';
  },
  set NOTIF_SILENT(val) {
    localStorage.setItem('cfg_notif_silent', val);
  },

  get NOTIF_VIBRATE() {
    const val = localStorage.getItem('cfg_notif_vibrate');
    return val === null ? true : val === 'true';
  },
  set NOTIF_VIBRATE(val) {
    localStorage.setItem('cfg_notif_vibrate', val);
  },

  get NOTIF_STYLE() {
    return localStorage.getItem('cfg_notif_style') || 'casual';
  },
  set NOTIF_STYLE(val) {
    localStorage.setItem('cfg_notif_style', val);
  },

  get TOAST_POSITION() {
    return localStorage.getItem('cfg_toast_position') || 'top-right';
  },
  set TOAST_POSITION(val) {
    localStorage.setItem('cfg_toast_position', val);
  },

  get TOAST_DURATION() {
    return parseInt(localStorage.getItem('cfg_toast_duration')) || 4000;
  },
  set TOAST_DURATION(val) {
    localStorage.setItem('cfg_toast_duration', val);
  },

  get LANG() {
    return localStorage.getItem('cfg_lang') || 'id';
  },
  set LANG(val) {
    localStorage.setItem('cfg_lang', val);
  },

  PAYMENT_ACCOUNTS: [
    {
      id: 'dana',
      name: 'DANA',
      number: '0883216760774',
      holder: 'Hafiz Alwan',
      type: 'E-Wallet',
      icon: 'fa-solid fa-wallet text-sky-500',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400'
    },
    {
      id: 'gopay',
      name: 'GoPay',
      number: '085117651702',
      holder: 'Pasya Putri',
      type: 'E-Wallet',
      icon: 'fa-solid fa-money-bill-wave text-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
    },
    {
      id: 'spay',
      name: 'ShopeePay (SPay)',
      number: '0883216760774',
      holder: 'Hafiz Alwan',
      type: 'E-Wallet',
      icon: 'fa-solid fa-bag-shopping text-orange-500',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400'
    },
    {
      id: 'bsi',
      name: 'BSI (Bank Syariah Indonesia)',
      number: '7312337627',
      holder: 'Hafiz Alwan',
      type: 'Transfer Bank',
      icon: 'fa-solid fa-building-columns text-teal-600',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400'
    },
    {
      id: 'bank_jago',
      name: 'Bank Jago',
      number: '104873618392',
      holder: 'Hafiz Alwan',
      type: 'Transfer Bank',
      icon: 'fa-solid fa-credit-card text-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
    }
  ]
};

// Global Payment Accounts Modal & Copy Helper (Clean Minimal Design)
function showPaymentAccountsModal(highlightName = '') {
  let modal = document.getElementById('globalPaymentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'globalPaymentModal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 transition-opacity';
    document.body.appendChild(modal);
  }

  const accounts = CONFIG.PAYMENT_ACCOUNTS || [];
  const searchLower = String(highlightName || '').toLowerCase();

  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 class="font-bold text-zinc-900 dark:text-zinc-100 text-base">Info Rekening & E-Wallet</h3>
          <p class="text-xs text-zinc-400 mt-0.5">Klik nomor untuk menyalin ke clipboard</p>
        </div>
        <button onclick="document.getElementById('globalPaymentModal').classList.add('hidden')" class="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Clean List -->
      <div class="divide-y divide-zinc-100 dark:divide-zinc-800">
        ${accounts.map(acc => {
          const isHighlighted = searchLower && (acc.name.toLowerCase().includes(searchLower) || acc.id.toLowerCase().includes(searchLower));
          const highlightBg = isHighlighted ? 'bg-indigo-50/50 dark:bg-indigo-950/30 -mx-2 px-2 rounded-xl' : '';

          return `
            <div class="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 ${highlightBg}">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">${acc.name}</span>
                  <span class="text-[11px] text-zinc-400 font-medium">· ${acc.type}</span>
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">a.n. ${acc.holder}</div>
                <div onclick="copyTextToClipboard('${acc.number}', '${acc.name}')" class="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 tracking-wide select-all" title="Klik untuk salin">
                  ${acc.number}
                </div>
              </div>

              <button onclick="copyTextToClipboard('${acc.number}', '${acc.name}')" class="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 shrink-0">
                <i class="fa-regular fa-copy text-xs"></i>
                <span>Salin No</span>
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <button onclick="copyAllPaymentAccounts()" class="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Salin Format WA</span>
        </button>

        <button onclick="document.getElementById('globalPaymentModal').classList.add('hidden')" class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition">
          Tutup
        </button>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
}

function copyAllPaymentAccounts() {
  const accounts = CONFIG.PAYMENT_ACCOUNTS || [];
  const lines = accounts.map(a => `🔹 ${a.name}: ${a.number} (a.n. ${a.holder})`).join('\n');
  const fullText = `📋 INFO REKENING & METODE PEMBAYARAN:\n\n${lines}\n\nMohon kirimkan bukti transfer setelah pembayaran ya kak. Terima kasih!`;
  copyTextToClipboard(fullText, 'Seluruh Daftar Rekening');
}

// Hide Global Loader when page loaded
window.addEventListener('load', () => {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.classList.add('opacity-0');
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 500); // Wait for the transition to finish
  }
});
