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
      { val: 'Shopee', label: 'Shopee - @premium_dz (Toko Shopee)' },
      { val: 'ShopeePay', label: 'ShopeePay' },
      { val: 'QRIS', label: 'QRIS' },
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
        if (item.metodePembayaran) existing.metodePembayaran = item.metodePembayaran;
        if (item.tanggal) existing.tanggal = item.tanggal;
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
          catatanPelunasan: item.catatanPelunasan || ''
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
 * Global Helper: Calculate Summary Metrics (Total In, Total Out, Saldo Bersih)
 */
function calculateKeuanganSummary(mutasiList) {
  let totalIn = 0;
  let totalOut = 0;

  (mutasiList || []).forEach(item => {
    const st = String(item.statusPembayaran || '').toLowerCase();
    const isLunas = st.includes('lunas');
    const isUnpaid = st === 'belum';
    const total = Number(item.totalProyek) || Number(item.nominal) || 0;
    const dpVal = Number(item.dp !== undefined ? item.dp : (isUnpaid ? 0 : item.nominal)) || 0;
    const pelunasanVal = Number(item.pelunasan) || 0;
    const nominal = Number(item.nominal) || 0;

    let inVal = 0;
    let outVal = 0;

    if (item.jenis === 'Pemasukan') {
      if (isLunas) {
        inVal = (pelunasanVal > 0 && dpVal < total ? (dpVal + pelunasanVal) : (total > 0 ? total : nominal));
      } else if (!isUnpaid) {
        inVal = (dpVal > 0 ? dpVal : nominal);
      }
    } else if (item.jenis === 'Pengeluaran') {
      outVal = nominal;
    }

    totalIn += inVal;
    totalOut += outVal;
  });

  const saldo = totalIn - totalOut;
  return { totalIn, totalOut, saldo };
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
