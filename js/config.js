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
    return parseInt(localStorage.getItem('cfg_toast_duration')) || 1000;
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
      id: 'shopee',
      name: 'Shopee',
      number: 'https://shopee.co.id/premium_dz?categoryId=100642&entryPoint=ShopByPDP&itemId=55317597618',
      displayNumber: '@premium_dz (Toko Shopee)',
      holder: 'Hafiz Alwan / @premium_dz',
      type: 'Marketplace',
      url: 'https://shopee.co.id/premium_dz?categoryId=100642&entryPoint=ShopByPDP&itemId=55317597618',
      icon: 'fa-solid fa-bag-shopping text-orange-500',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400'
    },
    {
      id: 'qris',
      name: 'QRIS',
      number: 'QRIS All Payment',
      displayNumber: 'QRIS (All E-Wallet / Bank)',
      holder: 'Hafiz Alwan',
      type: 'QRIS',
      icon: 'fa-solid fa-qrcode text-indigo-500',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400'
    },
    {
      id: 'bsi',
      name: 'BSI',
      number: 'Bank Syariah Indonesia',
      displayNumber: 'BSI (Bank Syariah Indonesia)',
      holder: 'Hafiz Alwan',
      type: 'Bank Syariah',
      icon: 'fa-solid fa-building-columns text-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
    }
  ]
};

// Global Helper: HTML & URL Sanitizers for Universal XSS Prevention
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

function sanitizeUrl(url) {
  if (!url) return '#';
  const clean = String(url).trim();
  if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
    return '#';
  }
  return clean;
}
window.sanitizeUrl = sanitizeUrl;

// Global Helper: Clipboard Copy Utility
function copyTextToClipboard(text, label = "Teks") {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof Toast !== 'undefined') {
        Toast.success('Berhasil Disalin!', `${label} "${text}" telah disalin ke clipboard.`);
      }
    }).catch(err => {
      console.error("Gagal menyalin via navigator.clipboard:", err);
      fallbackCopyText(text, label);
    });
  } else {
    fallbackCopyText(text, label);
  }
}
function fallbackCopyText(text, label = "Teks") {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Disalin!', `${label} "${text}" telah disalin ke clipboard.`);
    }
  } catch (e) {
    if (typeof Toast !== 'undefined') Toast.error('Gagal Menyalin', 'Perangkat tidak mendukung penyalinan otomatis.');
  }
  document.body.removeChild(textarea);
}
window.copyTextToClipboard = copyTextToClipboard;


// Global Helper: Check if modal has filled/dirty user inputs
function isModalInputFilled(modal) {
  const el = typeof modal === 'string' ? document.getElementById(modal) : modal;
  if (!el) return false;

  // 1. Check all text-based inputs, numbers, and textareas (exclude buttons, hidden, submit, reset, checkbox, radio)
  const inputs = el.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea');
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (input.type === 'file') {
      if (input.files && input.files.length > 0) return true;
    } else if (input.id === 'tahun') {
      // Ignore static export year input default
      continue;
    } else if (input.value && input.value.trim() !== '') {
      return true;
    }
  }

  // 2. Check for tool-specific active state
  if (el.id === 'watermarkGeneratorModal') {
    if (typeof wmSourceImg !== 'undefined' && wmSourceImg) return true;
  }
  if (el.id === 'projectPreviewBlenderModal') {
    if (typeof pbMockupImg !== 'undefined' && (pbMockupImg || pbDesignImg)) return true;
  }
  if (el.id === 'logoPhilosophyModal') {
    if (typeof logoSourceImg !== 'undefined' && logoSourceImg) return true;
  }

  return false;
}
window.isModalInputFilled = isModalInputFilled;

// Global Helper: Universal Modal Exclusivity Manager
// Automatically ensures only ONE popup/modal is active at any time.
function closeAllOpenModals(exceptModal = null) {
  // Only query actual modal overlays: elements that are full-screen fixed overlays (.fixed.inset-0)
  const allModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');

  allModals.forEach((el) => {
    if (!el || el === exceptModal) return;
    if (exceptModal && (exceptModal.contains(el) || el.contains(exceptModal))) return;

    const id = el.id || '';
    if (
      id === 'globalLoader' ||
      id === 'toast-container' ||
      id === 'navMenu' ||
      id === 'splashScreen' ||
      id.startsWith('toast-') ||
      el.classList.contains('sidebar-link')
    ) {
      return;
    }

    // Only close true modal overlays (must be top-level fixed inset-0 containers)
    if (el.classList.contains('fixed') && el.classList.contains('inset-0')) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });

  // Global paste event listener cleanups (tools module)
  if (typeof handleWmPasteEvent === 'function') document.removeEventListener('paste', handleWmPasteEvent);
  if (typeof handleLogoPasteEvent === 'function') document.removeEventListener('paste', handleLogoPasteEvent);
  if (typeof handlePbPasteEvent === 'function') document.removeEventListener('paste', handlePbPasteEvent);

  // Close profile dropdown if open
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileDropdown && profileDropdown !== exceptModal && !profileDropdown.classList.contains('hidden')) {
    profileDropdown.classList.add('hidden');
  }
}
window.closeAllOpenModals = closeAllOpenModals;
window.closeAllModals = closeAllOpenModals;

// Automatic MutationObserver: ensures that whenever ANY modal opens, other open modals automatically close
(function initGlobalModalExclusivity() {
  let isClosingOtherModals = false;
  const observer = new MutationObserver((mutations) => {
    if (isClosingOtherModals) return;
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (!target || !target.classList) continue;

        const id = target.id || '';
        if (
          id === 'globalLoader' ||
          id === 'toast-container' ||
          id === 'navMenu' ||
          id === 'splashScreen' ||
          id.startsWith('toast-') ||
          target.classList.contains('sidebar-link')
        ) {
          continue;
        }

        // A modal overlay MUST be a top-level fullscreen overlay (fixed AND inset-0)
        // that is an actual modal container, not an arbitrary child element with 'modal' in its ID!
        const isModalOverlay = (
          target.classList.contains('fixed') &&
          target.classList.contains('inset-0') &&
          (id.toLowerCase().endsWith('modal') || target.hasAttribute('data-modal-overlay') || target.getAttribute('role') === 'dialog')
        );

        if (isModalOverlay && !target.classList.contains('hidden')) {
          isClosingOtherModals = true;
          try {
            closeAllOpenModals(target);
          } finally {
            isClosingOtherModals = false;
          }
        }
      }
    }
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();

/**
 * Global Custom Confirmation Modal
 * Replaces native JavaScript confirm() with a modern, glassmorphic UI modal.
 * @param {Object|string} options - Configuration object or message string
 * @returns {Promise<boolean>} Resolves to true on confirm, false on cancel/backdrop click
 */
function showConfirmModal(options) {
  return new Promise((resolve) => {
    let opts = {};
    if (typeof options === 'string') {
      opts = {
        title: 'Konfirmasi',
        message: options,
        type: 'danger',
        confirmText: 'Ya, Lanjutkan',
        cancelText: 'Batal'
      };
    } else {
      opts = {
        title: options.title || 'Konfirmasi',
        message: options.message || 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
        type: options.type || 'danger', // 'danger' | 'warning' | 'info' | 'success'
        confirmText: options.confirmText || (options.type === 'danger' ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
        cancelText: options.cancelText || 'Batal'
      };
    }

    let modal = document.getElementById('globalConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'globalConfirmModal';
      document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-[999999] flex items-center justify-center p-4 transition-all duration-200';

    // Theme icons & colors
    const typeConfigs = {
      danger: {
        icon: 'fa-solid fa-trash-can',
        iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95'
      },
      warning: {
        icon: 'fa-solid fa-triangle-exclamation',
        iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-95'
      },
      info: {
        icon: 'fa-solid fa-circle-question',
        iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60',
        confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
      },
      success: {
        icon: 'fa-solid fa-circle-check',
        iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60',
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95'
      }
    };

    const cfg = typeConfigs[opts.type] || typeConfigs.danger;

    modal.innerHTML = `
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 transform transition-all text-zinc-800 dark:text-zinc-100">
        <div class="flex items-start space-x-4">
          <div class="w-12 h-12 rounded-2xl ${cfg.iconBg} flex items-center justify-center text-xl shrink-0">
            <i class="${cfg.icon}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg text-zinc-900 dark:text-white leading-tight">${opts.title}</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">${opts.message}</p>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button id="gConfirmCancelBtn" class="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs md:text-sm transition-all cursor-pointer">
            ${opts.cancelText}
          </button>
          <button id="gConfirmOkBtn" class="px-5 py-2.5 rounded-xl ${cfg.confirmBtn} font-semibold text-xs md:text-sm transition-all cursor-pointer">
            ${opts.confirmText}
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    function cleanup(result) {
      window.removeEventListener('keydown', handleKey);
      modal.onclick = null;
      modal.classList.add('hidden');
      resolve(result);
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup(true);
      }
    }

    window.addEventListener('keydown', handleKey);

    const cancelBtn = modal.querySelector('#gConfirmCancelBtn');
    const okBtn = modal.querySelector('#gConfirmOkBtn');

    if (cancelBtn) cancelBtn.onclick = () => cleanup(false);
    if (okBtn) okBtn.onclick = () => cleanup(true);

    modal.onclick = (e) => {
      if (e.target === modal) cleanup(false);
    };

    if (opts.type === 'danger' && cancelBtn) {
      cancelBtn.focus();
    } else if (okBtn) {
      okBtn.focus();
    }
  });
}
function formatRupiah(number) {
  const num = parseFloat(number) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
}
window.formatRupiah = formatRupiah;

/**
 * Global Pelunasan Payment Method Modal
 * Displays a popup to select payment method when project status is changed to Selesai / settlement.
 * @param {Object} options - { proyekId, namaPelanggan, namaProyek, nominal, dp, sisa, currentMetode }
 * @returns {Promise<{ confirmed: boolean, metode: string, catatan: string }>}
 */
function promptMetodePelunasanModal(options = {}) {
  return new Promise((resolve) => {
    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
    const nominal = Number(options.nominal) || 0;
    const dp = Number(options.dp) || 0;
    const sisa = options.sisa !== undefined ? Number(options.sisa) : Math.max(0, nominal - dp);
    const currentMetode = String(options.currentMetode || 'Shopee').trim();

    let modal = document.getElementById('globalPelunasanModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'globalPelunasanModal';
      document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-[999999] flex items-center justify-center p-4 transition-all duration-200';

    const paymentOptions = [
      { val: 'QRIS', label: 'QRIS' },
      { val: 'Shopee', label: 'Shopee - @premium_dz (Toko Shopee)' },
      { val: 'BSI', label: 'BSI (Bank Syariah Indonesia)' },
      { val: 'ShopeePay', label: 'ShopeePay' },
      { val: 'Transfer Bank', label: 'Transfer Bank (BCA / Mandiri / BRI)' },
      { val: 'Fiverr', label: 'Fiverr (Direct / Balance)' },
      { val: 'PayPal', label: 'PayPal' },
      { val: 'Cash', label: 'Tunai / Cash' }
    ];

    let selectOptionsHtml = paymentOptions.map(opt => {
      const isSelected = (currentMetode.toLowerCase().includes(opt.val.toLowerCase()) || opt.val.toLowerCase() === currentMetode.toLowerCase()) ? 'selected' : '';
      return `<option value="${opt.val}" ${isSelected}>${opt.label}</option>`;
    }).join('');

    // If current method is something else not in the list
    if (currentMetode && !paymentOptions.some(p => currentMetode.toLowerCase().includes(p.val.toLowerCase()) || p.val.toLowerCase() === currentMetode.toLowerCase())) {
      selectOptionsHtml = `<option value="${escapeHtml(currentMetode)}" selected>${escapeHtml(currentMetode)}</option>` + selectOptionsHtml;
    }

    const clientInfo = (options.namaPelanggan || options.namaProyek) ? `
      <div class="p-3 bg-zinc-50 dark:bg-zinc-800/70 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 text-xs space-y-1.5">
        <div class="flex justify-between items-center text-zinc-600 dark:text-zinc-300">
          <span>${isEn ? 'Client / Project' : 'Pelanggan / Projek'}:</span>
          <span class="font-semibold text-zinc-800 dark:text-zinc-100 text-right truncate max-w-[200px]">${escapeHtml(options.namaPelanggan || '')} ${options.namaProyek ? '(' + escapeHtml(options.namaProyek) + ')' : ''}</span>
        </div>
        ${sisa > 0 ? `
        <div class="flex justify-between items-center pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
          <span class="text-zinc-600 dark:text-zinc-400">${isEn ? 'Remaining Balance' : 'Sisa Pelunasan'}:</span>
          <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">${formatRupiah(sisa)}</span>
        </div>` : ''}
      </div>
    ` : '';

    modal.innerHTML = `
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 transform transition-all text-zinc-800 dark:text-zinc-100">
        <div class="flex items-start space-x-3.5">
          <div class="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-money-bill-transfer"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base sm:text-lg text-zinc-900 dark:text-white leading-tight">${isEn ? 'Settlement Payment Method' : 'Metode Pelunasan'}</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">${isEn ? 'Status changed to Completed. Select the payment method used for settlement.' : 'Status diubah ke Selesai. Pilih rekening atau metode pelunasan yang diterima.'}</p>
          </div>
        </div>

        ${clientInfo}

        <div class="space-y-3">
          <div>
            <label for="pelunasanMetodeSelectInput" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              ${isEn ? 'Payment Method / Account*' : 'Pilih Rekening / Metode Pelunasan*'}
            </label>
            <select id="pelunasanMetodeSelectInput"
              class="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              ${selectOptionsHtml}
            </select>
          </div>

          <div>
            <label for="pelunasanCatatanModalInput" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              ${isEn ? 'Settlement Note (Optional)' : 'Catatan Pelunasan (Opsional)'}
            </label>
            <input type="text" id="pelunasanCatatanModalInput"
              placeholder="${isEn ? 'e.g. Paid in full via Shopee / QRIS' : 'Contoh: Sudah lunas via Shopee / QRIS'}"
              class="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button id="pelunasanModalCancelBtn" class="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer">
            ${isEn ? 'Cancel' : 'Batal'}
          </button>
          <button id="pelunasanModalConfirmBtn" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5">
            <i class="fa-solid fa-check"></i>
            <span>${isEn ? 'Confirm & Finish' : 'Simpan & Lunaskan'}</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    const selectEl = modal.querySelector('#pelunasanMetodeSelectInput');
    const noteEl = modal.querySelector('#pelunasanCatatanModalInput');
    const cancelBtn = modal.querySelector('#pelunasanModalCancelBtn');
    const confirmBtn = modal.querySelector('#pelunasanModalConfirmBtn');

    function cleanup(result) {
      window.removeEventListener('keydown', handleKey);
      modal.onclick = null;
      modal.classList.add('hidden');
      resolve(result);
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup({ confirmed: false });
      }
    }

    window.addEventListener('keydown', handleKey);

    if (cancelBtn) {
      cancelBtn.onclick = () => cleanup({ confirmed: false });
    }

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const chosenMetode = selectEl ? selectEl.value : 'Shopee';
        const chosenNote = noteEl ? noteEl.value.trim() : '';
        cleanup({
          confirmed: true,
          metode: chosenMetode,
          catatan: chosenNote
        });
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal) cleanup({ confirmed: false });
    };

    if (selectEl) selectEl.focus();
  });
}
window.promptMetodePelunasanModal = promptMetodePelunasanModal;

// Global Helper: Format tanggal & waktu dari timestamp ISO / Date (menggunakan created_at yang sudah ada)
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return String(dateStr);
    }
    const day = d.getDate();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (e) {
    return String(dateStr);
  }
}
window.formatDateTime = formatDateTime;

// Global Helper: Render Badge Metode Pembayaran
function renderPaymentMethodBadge(rawMethod, fallbackSumber) {
  const m = normalizePaymentMethod(rawMethod, fallbackSumber);
  if (m === 'Shopee') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-800" title="Metode: Shopee"><i class="fa-solid fa-bag-shopping text-orange-500 text-[10px]"></i> Shopee</span>`;
  } else if (m === 'QRIS') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="Metode: QRIS"><i class="fa-solid fa-qrcode text-indigo-500 text-[10px]"></i> QRIS</span>`;
  } else if (m === 'BSI') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Metode: BSI"><i class="fa-solid fa-building-columns text-emerald-500 text-[10px]"></i> BSI</span>`;
  } else if (m === 'Fiverr') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Metode: Fiverr"><i class="fa-solid fa-bolt text-emerald-500 text-[10px]"></i> Fiverr</span>`;
  } else if (m === 'Transfer Bank') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800" title="Metode: Transfer Bank"><i class="fa-solid fa-building-columns text-blue-500 text-[10px]"></i> Bank</span>`;
  } else if (m === 'Tunai') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800" title="Metode: Tunai"><i class="fa-solid fa-money-bill-wave text-teal-500 text-[10px]"></i> Tunai</span>`;
  }
  const cleanName = escapeHtml(rawMethod || 'QRIS');
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700" title="Metode: ${cleanName}"><i class="fa-solid fa-credit-card text-zinc-500 text-[10px]"></i> ${cleanName}</span>`;
}
window.renderPaymentMethodBadge = renderPaymentMethodBadge;

// Global Helper: Normalisasi nama akun pembayaran
function normalizePaymentMethod(rawMetode, fallbackSumber) {
  const m = String(rawMetode || '').trim().toLowerCase();
  const s = String(fallbackSumber || '').trim().toLowerCase();

  if (m.includes('bsi') || s.includes('bsi') || m.includes('syariah')) return 'BSI';
  if (m.includes('shopee') || s.includes('shopee')) return 'Shopee';
  if (m.includes('qris')) return 'QRIS';
  if (m.includes('fiverr') || s.includes('fiverr')) return 'Fiverr';
  if (m.includes('paypal') || s.includes('paypal')) return 'PayPal';
  if (m.includes('bca') || m.includes('bank') || m.includes('transfer') || m.includes('mandiri') || m.includes('bri') || m.includes('bni')) return 'Transfer Bank';
  if (m.includes('tunai') || m.includes('cash')) return 'Tunai';
  if (rawMetode && String(rawMetode).trim()) return String(rawMetode).trim();
  if (s.includes('shopee')) return 'Shopee';
  if (s.includes('fiverr')) return 'Fiverr';
  return 'QRIS';
}
window.normalizePaymentMethod = normalizePaymentMethod;

/**
 * Global Helper: Consolidate Financial Mutasi List (1 Project = 1 Consolidated Row)
 */
function consolidateKeuanganList(list) {
  if (!Array.isArray(list)) return [];
  const projectMap = new Map();
  const result = [];

  list.forEach(item => {
    if (!item) return;
    const ket = String(item.keterangan || '');
    const match = ket.match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || String(item.id || '').match(/PRJ-\d+[-a-zA-Z0-9_]*/i) || (item.idProyek ? String(item.idProyek).match(/PRJ-\d+[-a-zA-Z0-9_]*/i) : null);
    const prjId = match ? match[0] : (item.idProyek ? String(item.idProyek) : '');

    // Jika tertaut ke ID Projek dan bertipe Pemasukan
    if (prjId && item.jenis === 'Pemasukan') {
      if (projectMap.has(prjId)) {
        const existing = projectMap.get(prjId);
        const exTotal = Number(existing.totalProyek) || Number(existing.nominal) || 0;
        const curTotal = Number(item.totalProyek) || Number(item.nominal) || 0;
        const finalTotal = Math.max(exTotal, curTotal);

        const exDp = Number(existing.dp) || 0;
        const curDp = Number(item.dp) || 0;
        const finalDp = Math.max(exDp, curDp);

        const exPelunasan = Number(existing.pelunasan) || 0;
        const curPelunasan = Number(item.pelunasan) || 0;
        const finalPelunasan = Math.max(exPelunasan, curPelunasan);

        const isLunas = String(item.statusPembayaran || '').toLowerCase().includes('lunas') || String(existing.statusPembayaran || '').toLowerCase().includes('lunas') || (finalDp + finalPelunasan >= finalTotal && finalTotal > 0);
        const finalSisa = isLunas ? 0 : Math.max(0, finalTotal - finalDp - finalPelunasan);
        const finalStatus = isLunas ? 'Lunas' : (finalDp > 0 ? 'DP' : 'Belum');

        existing.totalProyek = finalTotal;
        existing.dp = finalDp;
        existing.pelunasan = finalPelunasan;
        existing.sisa = finalSisa;
        existing.statusPembayaran = finalStatus;
        existing.nominal = isLunas ? (finalPelunasan > 0 && finalDp < finalTotal ? finalPelunasan : finalTotal) : finalDp;
        if (item.catatanPelunasan) existing.catatanPelunasan = item.catatanPelunasan;
        if (item.metodeBayarDp) existing.metodeBayarDp = item.metodeBayarDp;
        if (item.metodeBayarPelunasan) existing.metodeBayarPelunasan = item.metodeBayarPelunasan;
        if (item.metodePembayaran) existing.metodePembayaran = item.metodePembayaran;
        if (item.sumber) existing.sumber = item.sumber;
        if (item.tanggal) existing.tanggal = item.tanggal;
        if (item.createdAt) existing.createdAt = item.createdAt;
      } else {
        const total = Number(item.totalProyek) || Number(item.nominal) || 0;
        const dp = Number(item.dp !== undefined ? item.dp : (String(item.statusPembayaran || '').toLowerCase() === 'belum' ? 0 : item.nominal)) || 0;
        const pelunasan = Number(item.pelunasan) || 0;
        const isLunas = String(item.statusPembayaran || '').toLowerCase().includes('lunas') || ((dp + pelunasan) >= total && total > 0);
        const sisa = isLunas ? 0 : (item.sisa !== undefined ? Number(item.sisa) : Math.max(0, total - dp - pelunasan));
        const status = isLunas ? 'Lunas' : (dp > 0 ? 'DP' : 'Belum');

        const consolidated = {
          ...item,
          idProyek: prjId,
          totalProyek: total,
          dp: dp,
          pelunasan: pelunasan,
          sisa: sisa,
          statusPembayaran: status,
          nominal: isLunas ? (pelunasan > 0 && dp < total ? pelunasan : total) : dp,
          catatanPelunasan: item.catatanPelunasan || '',
          metodeBayarDp: item.metodeBayarDp || item.metodePembayaran || '',
          metodeBayarPelunasan: item.metodeBayarPelunasan || item.metodePembayaran || '',
          sumber: item.sumber || '',
          createdAt: item.createdAt || item.tanggal || ''
        };
        projectMap.set(prjId, consolidated);
        result.push(consolidated);
      }
    } else {
      result.push(item);
    }
  });

  return result;
}
window.consolidateKeuanganList = consolidateKeuanganList;

/**
 * Global Helper: Calculate Summary Metrics & Accounts Breakdown (Source of Truth)
 */
function calculateKeuanganSummary(mutasiList) {
  let totalIn = 0;
  let totalOut = 0;

  // Pre-configured payment accounts map matching Keuangan module
  const accountsMap = {
    'QRIS': { name: 'QRIS', group: 'ewallet', groupName: 'QRIS & E-Wallet', type: 'QRIS', number: 'All Payment', holder: 'Hafiz Alwan', icon: 'fa-solid fa-qrcode text-indigo-500', bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', totalIn: 0, totalOut: 0, txCount: 0 },
    'Shopee': { name: 'Shopee', group: 'market', groupName: 'Marketplace', type: 'Marketplace', number: '@premium_dz', holder: 'Toko Shopee', icon: 'fa-solid fa-bag-shopping text-orange-500', bgClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800', totalIn: 0, totalOut: 0, txCount: 0 },
    'BSI': { name: 'BSI', group: 'bank', groupName: 'Bank Syariah Indonesia', type: 'Bank Syariah', number: 'Bank Syariah', holder: 'Hafiz Alwan', icon: 'fa-solid fa-building-columns text-emerald-500', bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', totalIn: 0, totalOut: 0, txCount: 0 }
  };

  function ensureAccountExists(key) {
    if (!accountsMap[key]) {
      const kLower = key.toLowerCase();
      const isMarket = kLower.includes('shopee') || kLower.includes('fiverr') || kLower.includes('paypal');
      const isBank = kLower.includes('bsi') || kLower.includes('bank') || kLower.includes('bca') || kLower.includes('mandiri');
      accountsMap[key] = {
        name: key,
        group: isMarket ? 'market' : (isBank ? 'bank' : 'ewallet'),
        groupName: isMarket ? 'Marketplace' : (isBank ? 'Bank Syariah / Rekening' : 'QRIS & E-Wallet'),
        type: isMarket ? 'Platform' : 'Rekening',
        number: '-',
        holder: 'Hafiz Alwan',
        icon: isMarket ? 'fa-solid fa-bag-shopping text-orange-500' : (isBank ? 'fa-solid fa-building-columns text-emerald-500' : 'fa-solid fa-credit-card text-indigo-500'),
        bgClass: isMarket ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800' : (isBank ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'),
        totalIn: 0,
        totalOut: 0,
        txCount: 0
      };
    }
    return accountsMap[key];
  }

  (mutasiList || []).forEach(item => {
    if (!item) return;

    if (item.jenis === 'Pemasukan') {
      const st = String(item.statusPembayaran || '').toLowerCase();
      const isLunas = st.includes('lunas');
      const isUnpaid = st === 'belum';
      const total = Number(item.totalProyek) || Number(item.nominal) || 0;
      const dpVal = Number(item.dp !== undefined ? item.dp : (isUnpaid ? 0 : item.nominal)) || 0;
      const pelunasanVal = Number(item.pelunasan) || 0;
      const nominal = Number(item.nominal) || 0;

      let dpIn = 0;
      let pelunasanIn = 0;

      if (isLunas) {
        if (dpVal > 0 && pelunasanVal > 0) {
          dpIn = dpVal;
          pelunasanIn = pelunasanVal;
        } else if (dpVal > 0 && pelunasanVal === 0) {
          dpIn = dpVal;
          pelunasanIn = Math.max(0, total - dpVal);
        } else {
          dpIn = total > 0 ? total : nominal;
          pelunasanIn = 0;
        }
      } else if (!isUnpaid) {
        dpIn = dpVal > 0 ? dpVal : nominal;
        pelunasanIn = 0;
      }

      // 1. Alokasi DP ke akun metode pembayaran DP yang sesuai (Shopee, QRIS, BSI, dll)
      if (dpIn > 0) {
        const dpMethodKey = normalizePaymentMethod(item.metodeBayarDp || item.metodePembayaran, item.sumber);
        const acc = ensureAccountExists(dpMethodKey);
        acc.totalIn += dpIn;
        acc.txCount += 1;
        totalIn += dpIn;
      }

      // 2. Alokasi Pelunasan ke akun metode pembayaran Pelunasan yang sesuai
      if (pelunasanIn > 0) {
        const pelMethodKey = normalizePaymentMethod(item.metodeBayarPelunasan || item.metodePembayaran || item.metodeBayarDp, item.sumber);
        const acc = ensureAccountExists(pelMethodKey);
        acc.totalIn += pelunasanIn;
        acc.txCount += 1;
        totalIn += pelunasanIn;
      }

    } else if (item.jenis === 'Pengeluaran') {
      const outVal = Number(item.nominal) || 0;
      const outMethodKey = normalizePaymentMethod(item.metodePembayaran || item.metode, item.sumber);
      const acc = ensureAccountExists(outMethodKey);
      acc.totalOut += outVal;
      acc.txCount += 1;
      totalOut += outVal;

    } else if (item.jenis === 'Mutasi' || item.jenis === 'Pindah Saldo') {
      // Pemindahan Saldo Antar Metode Pembayaran:
      // Saldo asal berkurang, saldo tujuan bertambah.
      // Tidak merubah total pemasukan maupun total pengeluaran global.
      const mutasiVal = Number(item.nominal) || 0;
      const asalMethodKey = normalizePaymentMethod(item.metodeBayarDp || item.metodeAsal || item.sumber, 'QRIS');
      const tujuanMethodKey = normalizePaymentMethod(item.metodeBayarPelunasan || item.metodeTujuan || item.tujuan, 'BSI');

      if (mutasiVal > 0) {
        const accAsal = ensureAccountExists(asalMethodKey);
        accAsal.totalOut += mutasiVal;
        accAsal.txCount += 1;

        const accTujuan = ensureAccountExists(tujuanMethodKey);
        accTujuan.totalIn += mutasiVal;
        accTujuan.txCount += 1;
      }
    }
  });

  const saldo = totalIn - totalOut;
  return { totalIn, totalOut, saldo, accountsMap };
}
window.calculateKeuanganSummary = calculateKeuanganSummary;

window.showConfirmModal = showConfirmModal;
window.CustomConfirm = showConfirmModal;


// Global Payment Accounts Modal & Copy Helper (Clean Minimal Design)
function showPaymentAccountsModal(highlightName = '') {
  let modal = document.getElementById('globalPaymentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'globalPaymentModal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 transition-opacity';
    modal.onclick = function (e) {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    };
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
          <p class="text-xs text-zinc-400 mt-0.5">Klik nomor atau tombol untuk menyalin info rekening</p>
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
    const copyValue = acc.holder ? `${acc.number} a.n. ${acc.holder}` : acc.number;
    const escapedCopyValue = copyValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedAccName = (acc.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const targetUrl = acc.url || (String(acc.number || '').startsWith('http') ? acc.number : '');

    return `
            <div class="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 ${highlightBg}">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">${acc.name}</span>
                  <span class="text-[11px] text-zinc-400 font-medium shrink-0">· ${acc.type}</span>
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">a.n. ${acc.holder}</div>
                <div onclick="copyTextToClipboard('${escapedCopyValue}', '${escapedAccName}')" class="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 tracking-wide select-all truncate" title="Klik untuk salin nomor & a.n.">
                  ${acc.displayNumber || acc.number}
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                ${targetUrl ? `
                  <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs" title="Buka Toko ${acc.name}">
                    <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    <span>Buka</span>
                  </a>
                ` : ''}
                <button onclick="copyTextToClipboard('${escapedCopyValue}', '${escapedAccName}')" class="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 shrink-0" title="Salin nomor & a.n.">
                  <i class="fa-regular fa-copy text-xs"></i>
                  <span>Salin</span>
                </button>
              </div>
            </div>
          `;
  }).join('')}
      </div>

      <!-- Footer -->
      <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-3">
          <button onclick="copyAllPaymentAccounts()" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
            <i class="fa-brands fa-whatsapp"></i>
            <span>Salin Format WA</span>
          </button>

          <a href="https://shopee.co.id/premium_dz?categoryId=100642&entryPoint=ShopByPDP&itemId=55317597618" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1" title="Kunjungi Toko Shopee">
            <i class="fa-solid fa-bag-shopping"></i>
            <span>Toko Shopee</span>
          </a>
        </div>

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

/**
 * Global Shortcut Handler: Ctrl + 1
 * Clears web cache, offline cache, non-auth session/cookies, and temporary history,
 * while strictly preserving the user's active login session and essential preferences.
 */
async function clearWebCacheAndHistory(keepLogin = true) {
  try {
    // 1. Backup login session and core configuration
    const authKeys = ['token', 'user', 'currentUser', 'fp_auth_token', 'fp_auth_user', 'auth_login_time'];
    const configKeys = [
      'cfg_api_url', 'cfg_api_key', 'cfg_gemini_api_key', 'cfg_wa_template',
      'cfg_reminder_interval', 'cfg_notif_style', 'cfg_notif_vibrate',
      'cfg_notif_silent', 'cfg_toast_position', 'cfg_toast_duration',
      'cfg_lang', 'theme', 'sidebar_collapsed', 'shortcutsOrder', 'last_daily_cleanup'
    ];

    const savedSession = {};
    const savedLocal = {};

    if (keepLogin) {
      authKeys.forEach(k => {
        const sVal = sessionStorage.getItem(k);
        if (sVal !== null) savedSession[k] = sVal;
        const lVal = localStorage.getItem(k);
        if (lVal !== null) savedLocal[k] = lVal;
      });

      configKeys.forEach(k => {
        const lVal = localStorage.getItem(k);
        if (lVal !== null) savedLocal[k] = lVal;
      });
    }

    // 2. Clear SessionStorage and restore auth keys
    sessionStorage.clear();
    if (keepLogin) {
      Object.keys(savedSession).forEach(k => {
        sessionStorage.setItem(k, savedSession[k]);
      });
    }

    // 3. Clear LocalStorage and restore auth + config keys
    localStorage.clear();
    if (keepLogin) {
      Object.keys(savedLocal).forEach(k => {
        localStorage.setItem(k, savedLocal[k]);
      });
    }

    // 4. Delete non-login cookies
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      const loginCookieNames = ['token', 'user', 'fp_auth_token', 'fp_auth_user', 'auth', 'session', 'PHPSESSID', 'login'];

      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = (eqPos > -1 ? cookie.substr(0, eqPos) : cookie).trim();
        if (!name) return;

        const isLoginCookie = loginCookieNames.some(lc => name.toLowerCase().includes(lc.toLowerCase()));
        if (!isLoginCookie || !keepLogin) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        }
      });
    }

    // 5. Purge CacheStorage (ServiceWorker / PWA caches)
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      } catch (err) {
        console.warn('CacheStorage cleanup warning:', err);
      }
    }

    // 6. Clear in-memory / API Cache if active
    if (typeof APICache !== 'undefined' && typeof APICache.clear === 'function') {
      APICache.clear();
    }

    // 7. Clear history state if applicable
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', window.location.href);
    }

    // 8. Visual feedback & notification
    if (typeof showToast === 'function') {
      showToast({
        title: 'Cache & Riwayat Web Dibersihkan (Ctrl+1)',
        message: 'Cache browser dan riwayat berhasil dibersihkan tanpa menghapus cookie/sesi login Anda. Memuat ulang...',
        type: 'success'
      });
    } else if (typeof Toast !== 'undefined' && typeof Toast.success === 'function') {
      Toast.success('Cache & Riwayat Web Dibersihkan (Ctrl+1)', 'Cookie login Anda tetap aman. Memuat ulang...');
    }

    // 9. Reload page to apply fresh state
    setTimeout(() => {
      window.location.reload();
    }, 800);

    return true;
  } catch (error) {
    console.error('Error clearing web cache and history:', error);
    if (typeof showToast === 'function') {
      showToast({
        title: 'Pembersihan Sebagian Berhasil',
        message: 'Beberapa cache telah dibersihkan. Cookie login tetap aman.',
        type: 'warning'
      });
    }
    return false;
  }
}

window.clearWebCacheAndHistory = clearWebCacheAndHistory;

// Global Keyboard Shortcut: Ctrl + 1 or Cmd + 1
window.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.code === 'Digit1' || e.keyCode === 49)) {
    e.preventDefault();
    clearWebCacheAndHistory(true);
  }
});

