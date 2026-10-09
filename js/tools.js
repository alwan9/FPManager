// Global Helpers for escaping HTML & sanitizing URLs
if (typeof window !== 'undefined' && typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[m];
    });
  };
}

if (typeof window !== 'undefined' && typeof window.sanitizeUrl !== 'function') {
  window.sanitizeUrl = function (url) {
    if (!url) return '#';
    var clean = String(url).trim();
    if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|blob:|data:image\/)/i.test(clean)) {
      return clean;
    }
    return 'https://' + clean;
  };
}

let toolsData = [];
let shortcutsData = [];
let referencesData = [];

document.addEventListener('DOMContentLoaded', () => {

  loadData();

  document.getElementById('toolForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    await saveTool();
  });

  document.getElementById('shortcutForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    await saveShortcut();
  });

  const refForm = document.getElementById('refSubmitForm');
  if (refForm) {
    refForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      await saveReference();
    });
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase();
      renderTools(query);
    });
  }

  // Apply Shortcut Visibility on initial load
  applyShortcutsVisibility(isShortcutsVisible());

  // Initialize Tools Hero Banner Slider
  initToolBannerSlider();
});

async function loadData() {
  if (typeof Auth !== 'undefined' && typeof Auth.canAccessTools === 'function' && !Auth.canAccessTools()) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Halaman Tools & Prompts hanya dapat diakses oleh Super Admin dan Designer.</p>
        </div>
      `;
    }
    return;
  }

  showToolsSkeletons();
  try {
    const [tools, shortcuts, references] = await Promise.all([
      API.getTools(),
      API.getShortcuts(),
      API.getReferences()
    ]);

    toolsData = tools || [];
    shortcutsData = shortcuts || [];
    referencesData = references || [];

    renderTools();
    renderShortcuts();
    renderReferences();
    if (typeof Toast !== 'undefined') Toast.info('Info', 'Data Tools berhasil dimuat');
  } catch (error) {
    console.error(error);
    if (typeof Toast !== 'undefined') Toast.error('Error', 'Gagal memuat data.');
  }
}

function showToolsSkeletons() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.add('hidden');

  const toolsContainer = document.getElementById('toolsContainer');
  const shortcutsContainer = document.getElementById('shortcutsContainer');
  const tableBody = document.getElementById('refTableBody');

  if (toolsContainer) {
    toolsContainer.innerHTML = Array(6).fill(`
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 animate-pulse flex flex-col h-full">
        <div class="h-5 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded mb-3"></div>
        <div class="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-1"></div>
        <div class="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded mb-4"></div>
        <div class="mt-auto pt-4 border-t border-zinc-100 flex gap-2">
          <div class="h-8 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
          <div class="h-8 w-1/4 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
          <div class="h-8 w-1/4 bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
        </div>
      </div>
    `).join('');
  }

  if (shortcutsContainer) {
    shortcutsContainer.innerHTML = Array(6).fill(`
      <div class="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-zinc-200 animate-pulse">
        <div class="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-2xl mb-3"></div>
        <div class="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      </div>
    `).join('');
  }

  if (tableBody) {
    tableBody.innerHTML = Array(3).fill(`
      <tr class="animate-pulse">
        <td class="px-6 py-4"><div class="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="px-6 py-4"><div class="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div></td>
        <td class="px-6 py-4 text-right"><div class="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded ml-auto"></div></td>
      </tr>
    `).join('');
  }
}

// Helper: Filter data tools agar sesuai ID User yang Login + Super Admin
function getAccessibleTools(items) {
  if (!items || !Array.isArray(items)) return [];
  const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
  if (!user) return items;

  const role = (user.role || "").toLowerCase().trim();
  const isSuperAdmin = (
    user.username === "wansmin" ||
    role === "super_admin" ||
    role === "super admin" ||
    role === "superadmin" ||
    role.includes("super_admin") ||
    role.includes("superadmin") ||
    role.includes("admin")
  );
  if (isSuperAdmin) return items;

  const currentUserId = String(user.id || "").trim();
  const currentUsername = String(user.username || "").toLowerCase().trim();

  return items.filter(item => {
    const itemUserId = String(item.userId || item.Id_user || item.id_user || item.user_id || "").trim();
    const itemUsername = String(item.username || item.author || "").toLowerCase().trim();

    // 1. Dibuat oleh user yang sedang login
    if (itemUserId && currentUserId && itemUserId === currentUserId) return true;
    if (itemUsername && currentUsername && itemUsername === currentUsername) return true;

    // 2. Dibuat oleh Super Admin (USR-001 / wansmin / admin) atau template bawaan
    if (itemUserId === "USR-001" || itemUserId === "1" || itemUsername === "wansmin" || itemUsername === "admin") return true;

    // 3. Jika tidak memiliki ID pemilik khusus (publik)
    if (!itemUserId && !itemUsername) return true;

    return false;
  });
}

// =====================================
// CRUD PROMPTS (TOOLS)
// =====================================

function renderTools(query = '') {
  const container = document.getElementById('toolsContainer');
  container.innerHTML = '';

  const baseTools = getAccessibleTools(toolsData);
  let filteredTools = baseTools;
  if (query) {
    filteredTools = baseTools.filter(t =>
      (t.title || '').toLowerCase().includes(query) ||
      (t.prompt || '').toLowerCase().includes(query)
    );
  }

  if (!filteredTools || filteredTools.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <i class="fa-solid fa-folder-open text-4xl text-zinc-300 mb-3"></i>
        <p class="text-zinc-500 font-medium">${query ? 'Tidak ditemukan.' : 'Belum ada prompt yang disimpan.'}</p>
      </div>
    `;
    return;
  }

  filteredTools.forEach(tool => {
    const el = document.createElement('div');
    el.className = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between';

    el.innerHTML = `
      <div class="flex-1 w-full min-w-0">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h4 class="font-normal text-zinc-900 dark:text-zinc-100 text-lg truncate">${escapeHtml(tool.title)}</h4>
          <span class="px-2 py-0.5 text-xs font-mono font-normal rounded bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">${escapeHtml(tool.userId || 'USR-001')}</span>
        </div>
        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-base font-normal leading-relaxed whitespace-pre-wrap font-mono mt-2">${escapeHtml(tool.prompt)}</div>
      </div>
      <div class="flex flex-wrap items-center gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end shrink-0">
        <button onclick="copyPrompt('${tool.id}', 'id')" class="flex-1 md:flex-none px-3.5 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-normal rounded-xl transition-colors flex items-center justify-center space-x-1 text-base" title="Salin Prompt (ID)">
          <i class="fa-regular fa-copy"></i>
          <span>ID</span>
        </button>
        <button onclick="copyPrompt('${tool.id}', 'en')" class="flex-1 md:flex-none px-3.5 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-normal rounded-xl transition-colors flex items-center justify-center space-x-1 text-base" title="Salin Prompt (EN)">
          <i class="fa-regular fa-copy"></i>
          <span>EN</span>
        </button>
        <button onclick="editTool('${tool.id}')" class="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-1" title="Edit Prompt">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button onclick="deleteTool('${tool.id}')" class="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-1" title="Hapus Prompt">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(el);
  });
}

async function saveTool() {
  const idInput = document.getElementById('toolId').value;

  const btnSubmit = document.querySelector('#toolForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
  }

  const title = document.getElementById('toolTitle').value;
  const prompt = document.getElementById('toolPrompt').value;
  const promptEnInput = document.getElementById('toolPromptEn');
  const promptEn = promptEnInput ? promptEnInput.value : '';

  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  let res;
  try {
    if (idInput) {
      res = await API.updateTool(idInput, { title, prompt, promptEn });
    } else {
      res = await API.addTool({ title, prompt, promptEn });
    }
  } catch (err) {
    console.error(err);
    res = { success: false, message: 'Terjadi kesalahan sistem' };
  } finally {
    if (loader) loader.classList.add('hidden');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      btnSubmit.innerHTML = 'Simpan';
    }
  }

  if (res && res.success) {
    if (typeof Toast !== 'undefined') Toast.success('Berhasil', res.message);
    closeToolModal();
    loadData();
  } else {
    if (typeof Toast !== 'undefined') Toast.error('Gagal', res ? res.message : 'Terjadi kesalahan');
  }
}

function editTool(id) {
  closeAllModals();
  const tool = toolsData.find(t => String(t.id) === String(id));
  if (!tool) return;
  document.getElementById('modalTitle').textContent = 'Edit Prompt';
  document.getElementById('toolId').value = tool.id;
  document.getElementById('toolTitle').value = tool.title;
  document.getElementById('toolPrompt').value = tool.prompt;
  if (document.getElementById('toolPromptEn')) {
    document.getElementById('toolPromptEn').value = tool.promptEn || '';
  }
  document.getElementById('addToolModal').classList.remove('hidden');
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Form edit prompt dibuka');
}

async function deleteTool(id) {
  const confirmFn = typeof showConfirmModal === 'function' 
    ? showConfirmModal 
    : (typeof window !== 'undefined' && window.showConfirmModal ? window.showConfirmModal : (async (opts) => confirm(typeof opts === 'string' ? opts : (opts.message || 'Apakah Anda yakin?'))));

  if (await confirmFn({
    title: 'Hapus Prompt',
    message: 'Apakah Anda yakin ingin menghapus prompt ini?',
    type: 'danger',
    confirmText: 'Hapus Prompt'
  })) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.remove('hidden');

    const res = await API.deleteTool(id);

    if (loader) loader.classList.add('hidden');

    if (res && res.success) {
      if (typeof Toast !== 'undefined') Toast.success('Dihapus', res.message);
      loadData();
    } else {
      if (typeof Toast !== 'undefined') Toast.error('Gagal', res ? res.message : 'Gagal menghapus');
    }
  }
}

function closeAllModals() {
  const m1 = document.getElementById('addToolModal');
  const m2 = document.getElementById('addShortcutModal');
  const m3 = document.getElementById('sizeCheatSheetModal');
  const m4 = document.getElementById('watermarkGeneratorModal');
  const m7 = document.getElementById('projectPreviewBlenderModal');
  const m8 = document.getElementById('referencesModal');
  const m9 = document.getElementById('importShortcutModal');
  const m10 = document.getElementById('importToolModal');
  const m11 = document.getElementById('toolsExcelHubModal');

  if (m1) m1.classList.add('hidden');
  if (m2) m2.classList.add('hidden');
  if (m3) m3.classList.add('hidden');
  if (m4) m4.classList.add('hidden');
  if (m7) m7.classList.add('hidden');
  if (m8) m8.classList.add('hidden');
  if (m9) { m9.classList.add('hidden'); m9.classList.remove('flex'); }
  if (m10) { m10.classList.add('hidden'); m10.classList.remove('flex'); }
  if (m11) { m11.classList.add('hidden'); m11.classList.remove('flex'); }

  if (typeof handleWmPasteEvent === 'function') document.removeEventListener('paste', handleWmPasteEvent);
  if (typeof handlePbPasteEvent === 'function') document.removeEventListener('paste', handlePbPasteEvent);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeAllModals();
});

function openAddToolModal() {
  closeAllModals();
  document.getElementById('modalTitle').textContent = 'Tambah Prompt';
  document.getElementById('toolId').value = '';
  document.getElementById('toolForm').reset();
  document.getElementById('addToolModal').classList.remove('hidden');
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Form tambah prompt dibuka');
}

function closeToolModal() {
  document.getElementById('addToolModal').classList.add('hidden');
  document.getElementById('toolForm').reset();
  document.getElementById('toolId').value = '';
  document.getElementById('modalTitle').textContent = 'Tambah Prompt';
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Proses dibatalkan');
}

async function copyPrompt(id, lang = 'id') {
  const tool = toolsData.find(t => String(t.id) === String(id));
  if (!tool) return;

  let textToCopy = tool.prompt;

  if (lang === 'en') {
    if (tool.promptEn) {
      textToCopy = tool.promptEn;
    } else {
      if (typeof Toast !== 'undefined') Toast.info('Menerjemahkan...', 'Sedang menerjemahkan prompt ke Bahasa Inggris...');
      try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(tool.prompt)}&langpair=id|en`);
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          textToCopy = data.responseData.translatedText;
        } else {
          throw new Error('Translation API error');
        }
      } catch (err) {
        console.error('Translation error:', err);
        if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Gagal menerjemahkan teks.');
        return;
      }
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (typeof Toast !== 'undefined') Toast.success('Tersalin', `Prompt (${lang.toUpperCase()}) berhasil disalin!`);
    }).catch(() => {
      _fallbackCopyPrompt(textToCopy, lang);
    });
  } else {
    _fallbackCopyPrompt(textToCopy, lang);
  }
}

function _fallbackCopyPrompt(textToCopy, lang) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    if (typeof Toast !== 'undefined') Toast.success('Tersalin', `Prompt (${(lang || 'ID').toUpperCase()}) berhasil disalin!`);
  } catch (err) {
    console.error('Fallback copy failed: ', err);
    if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Gagal menyalin prompt.');
  }
}

// =====================================
// CRUD WEB SHORTCUTS
// =====================================

function renderShortcuts(query = '') {
  const container = document.getElementById('shortcutsContainer');
  container.innerHTML = '';

  const baseShortcuts = getAccessibleTools(shortcutsData);
  let filteredShortcuts = [...baseShortcuts];
  if (query) {
    filteredShortcuts = baseShortcuts.filter(s =>
      (s.title || '').toLowerCase().includes(query) ||
      (s.url || '').toLowerCase().includes(query)
    );
  } else {
    try {
      const savedOrder = JSON.parse(localStorage.getItem('shortcutsOrder'));
      if (savedOrder && Array.isArray(savedOrder)) {
        filteredShortcuts.sort((a, b) => {
          const idxA = savedOrder.indexOf(String(a.id));
          const idxB = savedOrder.indexOf(String(b.id));
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }
    } catch (e) { }
  }

  if (!filteredShortcuts || filteredShortcuts.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <p class="text-zinc-500 text-sm font-medium">${query ? 'Tidak ditemukan.' : 'Belum ada web shortcut.'}</p>
      </div>
    `;
    return;
  }

  filteredShortcuts.forEach(shortcut => {
    let iconUrl = (shortcut.icon && shortcut.icon.trim() !== '') ? shortcut.icon.trim() : 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png';
    if (iconUrl.startsWith('fa-') || (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:'))) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png';
    }
    const linkUrl = shortcut.url || shortcut.uRL || shortcut.Url || '#';

    const el = document.createElement('div');
    el.setAttribute('data-id', shortcut.id);
    el.className = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 sm:p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all flex flex-col items-center relative group w-full cursor-pointer';

    el.innerHTML = `
      <a href="${sanitizeUrl(linkUrl)}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center w-full text-center group-hover:text-indigo-600 transition-colors">
        <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl md:mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors overflow-hidden">
          <img src="${sanitizeUrl(iconUrl)}" alt="${escapeHtml(shortcut.title)}" class="w-full h-full object-cover">
        </div>
        <span class="font-normal text-zinc-900 dark:text-zinc-100 text-base truncate w-full px-1 group-hover:text-indigo-600 block mt-1">${escapeHtml(shortcut.title)}</span>
        <span class="px-2 py-0.5 text-xs font-mono font-normal rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mt-1">${escapeHtml(shortcut.userId || 'USR-001')}</span>
      </a>
      <div class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex justify-center items-center gap-1 sm:gap-2 pointer-events-none">
        <button onclick="editShortcut('${shortcut.id}')" class="px-2 py-1 pointer-events-auto bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold flex items-center justify-center shadow-sm hover:scale-110 transition-all" title="Edit Shortcut">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button onclick="deleteShortcut('${shortcut.id}')" class="px-2 py-1 pointer-events-auto bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold flex items-center justify-center shadow-sm hover:scale-110 transition-all" title="Hapus Shortcut">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(el);
  });

  if (!query && typeof Sortable !== 'undefined') {
    if (container.sortableInstance) {
      container.sortableInstance.destroy();
    }
    container.sortableInstance = new Sortable(container, {
      animation: 150,
      ghostClass: 'opacity-50',
      onEnd: function () {
        const order = Array.from(container.children).map(child => child.getAttribute('data-id'));
        localStorage.setItem('shortcutsOrder', JSON.stringify(order));
        if (typeof Toast !== 'undefined') Toast.success('Tersimpan', 'Urutan shortcut berhasil disimpan!');
      }
    });
  }

  // Ensure visibility state is respected after render
  applyShortcutsVisibility(isShortcutsVisible());
}

// =====================================// =====================================
// SHORTCUT VISIBILITY VIA COOKIE
// =====================================
function getShortcutCookie() {
  const match = document.cookie.match(new RegExp('(^|;\\s*)show_shortcuts=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setShortcutCookie(val) {
  const d = new Date();
  d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
  document.cookie = `show_shortcuts=${encodeURIComponent(val)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function isShortcutsVisible() {
  const cookieVal = getShortcutCookie();
  // Default is ON (true) if cookie is not set or not 'off'
  return cookieVal !== 'off';
}

function toggleShortcutsState() {
  const currentVisible = isShortcutsVisible();
  const nextVisible = !currentVisible;
  setShortcutCookie(nextVisible ? 'on' : 'off');
  applyShortcutsVisibility(nextVisible);
  if (typeof Toast !== 'undefined') {
    if (nextVisible) {
      Toast.success('Shortcuts Ditampilkan', 'Web shortcuts aktif.');
    } else {
      Toast.info('Shortcuts Disembunyikan', 'Web shortcuts dinonaktifkan.');
    }
  }
}

function applyShortcutsVisibility(visible) {
  const container = document.getElementById('shortcutsContainer');
  const hr = document.getElementById('shortcutsHr');

  const icon = document.getElementById('shortcutsToggleIcon');
  const badge = document.getElementById('shortcutsToggleBadge');

  const iconMobile = document.getElementById('shortcutsToggleIconMobile');
  const badgeMobile = document.getElementById('shortcutsToggleBadgeMobile');

  if (icon) {
    icon.className = visible ? 'fa-solid fa-eye text-xs text-emerald-300' : 'fa-solid fa-eye-slash text-xs text-white/50';
  }
  if (badge) {
    badge.textContent = visible ? 'ON' : 'OFF';
    badge.className = visible
      ? 'px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
      : 'px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white/10 text-white/50 border border-white/10';
  }

  if (iconMobile) {
    iconMobile.className = visible ? 'fa-solid fa-eye text-emerald-500 text-xs' : 'fa-solid fa-eye-slash text-zinc-400 text-xs';
  }
  if (badgeMobile) {
    badgeMobile.textContent = visible ? 'ON' : 'OFF';
    badgeMobile.className = visible
      ? 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5'
      : 'text-[10px] font-bold text-zinc-400 dark:text-zinc-500 ml-0.5';
  }

  if (container) {
    if (visible) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  if (hr) {
    if (visible) {
      hr.classList.remove('hidden');
    } else {
      hr.classList.add('hidden');
    }
  }
}

// =====================================
// TOOLS HERO BANNER SLIDER LOGIC
// =====================================
let currentToolSlide = 0;
let toolSlideTimer = null;
const toolSlideInterval = 7000;

function showToolBannerSlide(index) {
  const slides = document.querySelectorAll('.tool-banner-slide');
  const dots = document.querySelectorAll('.tool-banner-dot');
  if (slides.length === 0) return;

  currentToolSlide = (index + slides.length) % slides.length;

  slides.forEach((slide, i) => {
    if (i === currentToolSlide) {
      slide.classList.remove('opacity-0', 'translate-x-8', 'pointer-events-none', 'absolute');
      slide.classList.add('opacity-100', 'translate-x-0', 'relative');
    } else {
      slide.classList.remove('opacity-100', 'translate-x-0', 'relative');
      slide.classList.add('opacity-0', 'translate-x-8', 'pointer-events-none', 'absolute');
    }
  });

  dots.forEach((dot, i) => {
    if (i === currentToolSlide) {
      dot.className = 'tool-banner-dot w-6 h-1.5 rounded-full bg-white transition-all duration-300 focus:outline-none';
    } else {
      dot.className = 'tool-banner-dot w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300 focus:outline-none';
    }
  });
}

function nextToolBannerSlide() {
  showToolBannerSlide(currentToolSlide + 1);
}

function prevToolBannerSlide() {
  showToolBannerSlide(currentToolSlide - 1);
}

function goToToolBannerSlide(index) {
  stopToolSlideShow();
  showToolBannerSlide(index);
  startToolSlideShow();
}

function startToolSlideShow() {
  stopToolSlideShow();
  toolSlideTimer = setInterval(nextToolBannerSlide, toolSlideInterval);
}

function stopToolSlideShow() {
  if (toolSlideTimer) {
    clearInterval(toolSlideTimer);
    toolSlideTimer = null;
  }
}

function initToolBannerSlider() {
  const sliderEl = document.getElementById('toolsHeroSlider');
  if (sliderEl) {
    showToolBannerSlide(0);
    startToolSlideShow();
    sliderEl.addEventListener('mouseenter', stopToolSlideShow);
    sliderEl.addEventListener('mouseleave', startToolSlideShow);
  }
}

async function saveShortcut() {
  const idInput = document.getElementById('shortcutId').value;

  const btnSubmit = document.querySelector('#shortcutForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
  }

  const title = document.getElementById('shortcutTitle').value;
  const url = document.getElementById('shortcutUrl').value;
  const icon = document.getElementById('shortcutIcon').value;

  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  let res;
  try {
    if (idInput) {
      res = await API.updateShortcut(idInput, { title, url, icon });
    } else {
      res = await API.addShortcut({ title, url, icon });
    }
  } catch (err) {
    console.error(err);
    res = { success: false, message: 'Terjadi kesalahan sistem' };
  } finally {
    if (loader) loader.classList.add('hidden');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      btnSubmit.innerHTML = 'Simpan';
    }
  }

  if (res && res.success) {
    if (typeof Toast !== 'undefined') Toast.success('Berhasil', res.message);
    closeShortcutModal();
    loadData();
  } else {
    if (typeof Toast !== 'undefined') Toast.error('Gagal', res ? res.message : 'Terjadi kesalahan');
  }
}

function editShortcut(id) {
  closeAllModals();
  const shortcut = shortcutsData.find(s => String(s.id) === String(id));
  if (!shortcut) return;
  document.getElementById('shortcutModalTitle').textContent = 'Edit Web Shortcut';
  document.getElementById('shortcutId').value = shortcut.id;
  document.getElementById('shortcutTitle').value = shortcut.title;
  document.getElementById('shortcutUrl').value = shortcut.url;
  document.getElementById('shortcutIcon').value = shortcut.icon;
  document.getElementById('addShortcutModal').classList.remove('hidden');
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Form edit shortcut dibuka');
}

async function deleteShortcut(id) {
  const confirmFn = typeof showConfirmModal === 'function' 
    ? showConfirmModal 
    : (typeof window !== 'undefined' && window.showConfirmModal ? window.showConfirmModal : (async (opts) => confirm(typeof opts === 'string' ? opts : (opts.message || 'Apakah Anda yakin?'))));

  if (await confirmFn({
    title: 'Hapus Web Shortcut',
    message: 'Apakah Anda yakin ingin menghapus shortcut ini?',
    type: 'danger',
    confirmText: 'Hapus Shortcut'
  })) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.remove('hidden');

    const res = await API.deleteShortcut(id);

    if (loader) loader.classList.add('hidden');

    if (res && res.success) {
      if (typeof Toast !== 'undefined') Toast.success('Dihapus', res.message);
      loadData();
    } else {
      if (typeof Toast !== 'undefined') Toast.error('Gagal', res ? res.message : 'Gagal menghapus');
    }
  }
}

function openAddShortcutModal() {
  closeAllModals();
  document.getElementById('shortcutModalTitle').textContent = 'Tambah Web Shortcut';
  document.getElementById('shortcutId').value = '';
  document.getElementById('shortcutForm').reset();
  document.getElementById('addShortcutModal').classList.remove('hidden');
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Form tambah shortcut dibuka');
}

function closeShortcutModal() {
  document.getElementById('addShortcutModal').classList.add('hidden');
  document.getElementById('shortcutForm').reset();
  document.getElementById('shortcutId').value = '';
  document.getElementById('shortcutModalTitle').textContent = 'Tambah Web Shortcut';
  if (typeof Toast !== 'undefined') Toast.info('Info', 'Proses dibatalkan');
}

// =====================================
// PANDUAN & KONVERSI UKURAN
// =====================================

const SIZE_CATEGORIES = [
  { id: 'print', name: 'Kertas Standard (Print)', icon: 'fa-solid fa-print', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
  { id: 'ig_tiktok', name: 'Instagram & TikTok', icon: 'fa-brands fa-instagram', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' },
  { id: 'youtube', name: 'YouTube & Video', icon: 'fa-brands fa-youtube', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  { id: 'social_other', name: 'Facebook, Twitter & LinkedIn', icon: 'fa-solid fa-share-nodes', badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' }
];

const MEDIA_SIZES = [
  // Kertas Standard (Print)
  { id: 'a4', name: 'A4', category: 'print', widthMm: 210, heightMm: 297, desc: 'Dokumen, surat, brosur, & flyer' },
  { id: 'a3', name: 'A3', category: 'print', widthMm: 297, heightMm: 420, desc: 'Poster sedang, gambar teknik, & majalah' },
  { id: 'a5', name: 'A5', category: 'print', widthMm: 148, heightMm: 210, desc: 'Buku saku, memo, & flyer kecil' },
  { id: 'f4', name: 'F4 / Folio', category: 'print', widthMm: 215, heightMm: 330, desc: 'Dokumen kantor Indonesia & ijazah' },
  { id: 'letter', name: 'Letter (Kuarto)', category: 'print', widthMm: 215.9, heightMm: 279.4, desc: 'Standar dokumen AS / Internasional' },
  { id: 'legal', name: 'Legal', category: 'print', widthMm: 215.9, heightMm: 355.6, desc: 'Dokumen hukum & akta' },
  { id: 'b5', name: 'B5', category: 'print', widthMm: 176, heightMm: 250, desc: 'Buku bacaan, komik, & notebook' },
  { id: 'kartu_nama', name: 'Kartu Nama', category: 'print', widthMm: 90, heightMm: 55, desc: 'Kartu nama standar Indonesia' },
  { id: 'poster_a2', name: 'Poster A2 (40x60 cm)', category: 'print', widthMm: 420, heightMm: 594, desc: 'Poster promosi & baliho indoor' },

  // Instagram & TikTok
  { id: 'ig_square', name: 'Feed IG Square (1:1)', category: 'ig_tiktok', widthMm: 381, heightMm: 381, pxBase72: { w: 1080, h: 1080 }, desc: 'Konten postingan Instagram kotak' },
  { id: 'ig_portrait', name: 'Feed IG Portrait (4:5)', category: 'ig_tiktok', widthMm: 381, heightMm: 476.25, pxBase72: { w: 1080, h: 1350 }, desc: 'Rasio postingan Instagram optimal' },
  { id: 'ig_landscape', name: 'Feed IG Landscape (1.91:1)', category: 'ig_tiktok', widthMm: 381, heightMm: 199.68, pxBase72: { w: 1080, h: 566 }, desc: 'Postingan horizontal Instagram' },
  { id: 'ig_story', name: 'IG Story / Reels / TikTok (9:16)', category: 'ig_tiktok', widthMm: 381, heightMm: 677.33, pxBase72: { w: 1080, h: 1920 }, desc: 'Layar penuh HP / Shorts / Story' },

  // YouTube & Video
  { id: 'yt_thumb', name: 'Thumbnail YouTube (16:9)', category: 'youtube', widthMm: 451.56, heightMm: 254, pxBase72: { w: 1280, h: 720 }, desc: 'Gambar sampul video YouTube' },
  { id: 'yt_banner', name: 'Banner YouTube Channel', category: 'youtube', widthMm: 903.11, heightMm: 508, pxBase72: { w: 2560, h: 1440 }, desc: 'Sampul channel YouTube (Desktop/TV)' },

  // Facebook, Twitter & LinkedIn
  { id: 'fb_cover', name: 'Facebook Cover Desktop', category: 'social_other', widthMm: 289.28, heightMm: 110.07, pxBase72: { w: 820, h: 312 }, desc: 'Sampul halaman/profil Facebook' },
  { id: 'tw_header', name: 'Header Twitter / X', category: 'social_other', widthMm: 529.17, heightMm: 176.39, pxBase72: { w: 1500, h: 500 }, desc: 'Header profil Twitter / X' },
  { id: 'linkedin_banner', name: 'LinkedIn Banner Cover', category: 'social_other', widthMm: 558.8, heightMm: 139.7, pxBase72: { w: 1584, h: 396 }, desc: 'Sampul profil profesional LinkedIn' }
];

let currentSizeUnit = 'px_300';
let currentSizeSearchQuery = '';

// Track accordion expanded states (All closed by default initially)
let openCategoriesState = {
  'print': false,
  'ig_tiktok': false,
  'youtube': false,
  'social_other': false
};

// Track item description toggle states (Hidden by default)
let openItemDescState = {};

function toggleCategoryAccordion(catId) {
  openCategoriesState[catId] = !openCategoriesState[catId];
  renderSizeCheatSheet();
}

function toggleItemDesc(itemId, event) {
  if (event) event.stopPropagation();
  openItemDescState[itemId] = !openItemDescState[itemId];
  renderSizeCheatSheet();
}

function openSizeCheatSheetModal() {
  closeAllModals();
  const modal = document.getElementById('sizeCheatSheetModal');
  if (modal) {
    modal.classList.remove('hidden');
    renderSizeCheatSheet();
  }
}

function closeSizeCheatSheetModal() {
  const modal = document.getElementById('sizeCheatSheetModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function changeSizeUnit(unit) {
  currentSizeUnit = unit;
  renderSizeCheatSheet();
}

function onSizeSearchInput(query) {
  currentSizeSearchQuery = (query || '').toLowerCase().trim();
  renderSizeCheatSheet();
}

function calculateDimension(item, unit) {
  let wVal, hVal, uSuffix;

  if (unit === 'px_72' && item.pxBase72) {
    wVal = item.pxBase72.w;
    hVal = item.pxBase72.h;
    uSuffix = 'px';
  } else {
    const mmW = item.widthMm;
    const mmH = item.heightMm;

    switch (unit) {
      case 'cm': {
        wVal = (mmW / 10).toLocaleString('id-ID', { maximumFractionDigits: 2 });
        hVal = (mmH / 10).toLocaleString('id-ID', { maximumFractionDigits: 2 });
        uSuffix = 'cm';
        break;
      }
      case 'mm': {
        wVal = mmW.toLocaleString('id-ID', { maximumFractionDigits: 1 });
        hVal = mmH.toLocaleString('id-ID', { maximumFractionDigits: 1 });
        uSuffix = 'mm';
        break;
      }
      case 'inch': {
        wVal = (mmW / 25.4).toLocaleString('id-ID', { maximumFractionDigits: 2 });
        hVal = (mmH / 25.4).toLocaleString('id-ID', { maximumFractionDigits: 2 });
        uSuffix = 'in';
        break;
      }
      case 'px_72': {
        wVal = Math.round(mmW / 25.4 * 72);
        hVal = Math.round(mmH / 25.4 * 72);
        uSuffix = 'px';
        break;
      }
      case 'px_300':
      default: {
        wVal = Math.round(mmW / 25.4 * 300);
        hVal = Math.round(mmH / 25.4 * 300);
        uSuffix = 'px';
        break;
      }
    }
  }

  return {
    widthVal: wVal,
    heightVal: hVal,
    unitSuffix: uSuffix,
    widthStr: `${wVal} ${uSuffix}`,
    heightStr: `${hVal} ${uSuffix}`,
    fullStr: `${wVal} × ${hVal} ${uSuffix}`
  };
}

function renderSizeCheatSheet() {
  const container = document.getElementById('sizeItemsContainer');
  if (!container) return;

  let filtered = MEDIA_SIZES;

  if (currentSizeSearchQuery) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(currentSizeSearchQuery) ||
      item.desc.toLowerCase().includes(currentSizeSearchQuery)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-zinc-400">
        <i class="fa-solid fa-magnifying-glass text-3xl mb-2 opacity-50"></i>
        <p class="text-xs font-semibold">Ukuran "${currentSizeSearchQuery}" tidak ditemukan.</p>
      </div>
    `;
    return;
  }

  let html = '<div class="space-y-3">';

  SIZE_CATEGORIES.forEach(cat => {
    const categoryItems = filtered.filter(item => item.category === cat.id);
    if (categoryItems.length === 0) return; // Skip empty category when filtering

    // Auto-expand if searching, otherwise use openCategoriesState
    const isExpanded = currentSizeSearchQuery ? true : !!openCategoriesState[cat.id];

    html += `
      <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden transition-all shadow-2xs">
        <!-- Accordion Header (Ultra Clean) -->
        <button onclick="toggleCategoryAccordion('${cat.id}')" 
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs ${cat.badgeClass} shrink-0">
              <i class="${cat.icon}"></i>
            </div>
            <span class="text-xs md:text-sm font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">${cat.name}</span>
            <span class="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">${categoryItems.length}</span>
          </div>
          <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-zinc-400 transition-transform"></i>
        </button>

        <!-- Accordion Body (Ultra Compact & Space-Efficient) -->
        ${isExpanded ? `
          <div class="p-2.5 md:p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-1.5">
            ${categoryItems.map(item => {
              const dim = calculateDimension(item, currentSizeUnit);
              const isDescOpen = currentSizeSearchQuery || !!openItemDescState[item.id];

              return `
                <div class="bg-white dark:bg-zinc-800/90 rounded-xl px-3 py-2 border border-zinc-200/60 dark:border-zinc-700/60 transition-all">
                  
                  <div class="flex items-center justify-between gap-2">
                    <!-- Left Side: Title (Larger font, click to toggle desc) -->
                    <div onclick="toggleItemDesc('${item.id}', event)" 
                      class="min-w-0 flex-1 flex items-center space-x-1.5 cursor-pointer group select-none" 
                      title="Klik untuk lihat/sembunyikan keterangan">
                      <h5 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm md:text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${item.name}</h5>
                      <i class="fa-solid fa-circle-info text-xs ${isDescOpen ? 'text-indigo-500' : 'text-zinc-300 dark:text-zinc-600'} group-hover:text-indigo-500 transition-colors"></i>
                    </div>

                    <!-- Right Side: Compact Clickable Lebar & Tinggi Pills -->
                    <div class="flex items-center space-x-2 shrink-0">
                      
                      <!-- Clickable Lebar (L) Pill -->
                      <button onclick="copySingleValue('${item.name}', 'Lebar', '${dim.widthVal}', '${dim.unitSuffix}')" 
                        class="group bg-zinc-50 dark:bg-zinc-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-zinc-200/70 dark:border-zinc-700/60 hover:border-indigo-400 dark:hover:border-indigo-500 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center space-x-1.5 text-xs focus:outline-none" 
                        title="Klik untuk menyalin angka Lebar (${dim.widthVal})">
                        <span class="text-[10px] font-extrabold uppercase text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">L:</span>
                        <span class="font-mono font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${dim.widthStr}</span>
                        <i class="fa-regular fa-copy text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </button>

                      <!-- Clickable Tinggi (T) Pill -->
                      <button onclick="copySingleValue('${item.name}', 'Tinggi', '${dim.heightVal}', '${dim.unitSuffix}')" 
                        class="group bg-zinc-50 dark:bg-zinc-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-zinc-200/70 dark:border-zinc-700/60 hover:border-indigo-400 dark:hover:border-indigo-500 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center space-x-1.5 text-xs focus:outline-none" 
                        title="Klik untuk menyalin angka Tinggi (${dim.heightVal})">
                        <span class="text-[10px] font-extrabold uppercase text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">T:</span>
                        <span class="font-mono font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${dim.heightStr}</span>
                        <i class="fa-regular fa-copy text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </button>

                    </div>
                  </div>

                  <!-- Expandable Description (Font size text-sm as requested) -->
                  ${isDescOpen ? `
                    <div class="mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5">
                      <i class="fa-solid fa-info-circle text-xs text-indigo-500 shrink-0"></i>
                      <span class="font-normal">${item.desc}</span>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function copySingleValue(itemName, sideName, rawVal, unitSuffix) {
  const textToCopy = String(rawVal);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (typeof Toast !== 'undefined') {
        Toast.success('Angka Disalin!', `${sideName} ${itemName} (${textToCopy} ${unitSuffix || ''}) disalin ke clipboard.`);
      }
    }).catch(() => {
      fallbackCopyText(itemName, sideName, textToCopy, unitSuffix);
    });
  } else {
    fallbackCopyText(itemName, sideName, textToCopy, unitSuffix);
  }
}

function fallbackCopyText(itemName, sideName, textToCopy, unitSuffix) {
  const textArea = document.createElement('textarea');
  textArea.value = textToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  if (typeof Toast !== 'undefined') {
    Toast.success('Angka Disalin!', `${sideName} ${itemName} (${textToCopy} ${unitSuffix || ''}) disalin ke clipboard.`);
  }
}

// =====================================
// WATERMARK GENERATOR TOOL (IMAGE BASED & AUTO CONTRAST)
// =====================================

let currentWmImage = null;
let selectedWmVariant = 'auto'; // 'auto' | 'white' | 'black' | 'warna' | 'custom'

const WM_PRESETS = {
  white: 'assets/watermark/wm_white.png',
  black: 'assets/watermark/wm_black.png',
  warna: 'assets/watermark/wm_warna.png'
};

const wmImages = {
  white: new Image(),
  black: new Image(),
  warna: new Image(),
  custom: null
};

// Preload watermark images
wmImages.white.src = WM_PRESETS.white;
wmImages.black.src = WM_PRESETS.black;
wmImages.warna.src = WM_PRESETS.warna;

// Re-render canvas when watermarks finish loading
[wmImages.white, wmImages.black, wmImages.warna].forEach(img => {
  img.onload = () => {
    if (currentWmImage) updateWmCanvas();
  };
});

function openWatermarkModal() {
  closeAllModals();
  const modal = document.getElementById('watermarkGeneratorModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.addEventListener('paste', handleWmPasteEvent);
    toggleWmSpacingField();
  }
}

function closeWatermarkModal() {
  const modal = document.getElementById('watermarkGeneratorModal');
  if (modal) {
    modal.classList.add('hidden');
    document.removeEventListener('paste', handleWmPasteEvent);
  }
}

function triggerWmFileInput() {
  const fileInput = document.getElementById('wmFileInput');
  if (fileInput) fileInput.click();
}

function handleWmFileSelect(e) {
  const files = e.target.files;
  if (files && files[0]) {
    loadWmImageFromFile(files[0]);
  }
}

function handleWmDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById('wmDropzone');
  if (dz) {
    dz.classList.add('border-indigo-500', 'bg-indigo-50/50', 'dark:bg-indigo-950/30');
  }
}

function handleWmDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById('wmDropzone');
  if (dz) {
    dz.classList.remove('border-indigo-500', 'bg-indigo-50/50', 'dark:bg-indigo-950/30');
  }
}

function handleWmDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  handleWmDragLeave(e);
  const files = e.dataTransfer ? e.dataTransfer.files : null;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type && file.type.startsWith('image/')) {
      loadWmImageFromFile(file);
      if (typeof Toast !== 'undefined') {
        Toast.success('Gambar Dimuat!', 'Gambar berhasil di-drop dan dimuat.');
      }
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error('Format Tidak Didukung', 'Harap masukkan file gambar valid (PNG, JPG, WEBP, dll).');
      }
    }
  }
}

// Robust clipboard image extractor (supports screenshot buffers, copied files, and direct blobs)
function extractImageFromClipboard(e) {
  const cData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData) || window.clipboardData;
  if (!cData) return null;

  // 1. Direct File Objects from items
  if (cData.items && cData.items.length > 0) {
    for (let i = 0; i < cData.items.length; i++) {
      const item = cData.items[i];
      if (item && item.type && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) return blob;
      }
    }
  }

  // 2. Direct Files array (from OS copy-paste)
  if (cData.files && cData.files.length > 0) {
    for (let i = 0; i < cData.files.length; i++) {
      const file = cData.files[i];
      if (file && (file.type ? file.type.startsWith('image/') : /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name || ''))) {
        return file;
      }
    }
  }

  return null;
}

function handleWmPasteEvent(e) {
  const imageBlob = extractImageFromClipboard(e);
  if (imageBlob) {
    e.preventDefault();
    e.stopPropagation();
    loadWmImageFromFile(imageBlob);
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Paste!', 'Gambar dari clipboard berhasil dimuat.');
    }
  }
}

function loadWmImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      currentWmImage = img;
      const dropzone = document.getElementById('wmDropzone');
      const previewWrapper = document.getElementById('wmPreviewWrapper');
      if (dropzone) dropzone.classList.add('hidden');
      if (previewWrapper) previewWrapper.classList.remove('hidden');

      document.getElementById('wmCopyBtn').disabled = false;
      document.getElementById('wmDownloadBtn').disabled = false;

      // Update UI & Render
      updateWmAutoUi();
      updateWmCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function resetWmImage() {
  currentWmImage = null;
  document.getElementById('wmFileInput').value = '';
  const dropzone = document.getElementById('wmDropzone');
  const previewWrapper = document.getElementById('wmPreviewWrapper');
  if (dropzone) dropzone.classList.remove('hidden');
  if (previewWrapper) previewWrapper.classList.add('hidden');

  document.getElementById('wmCopyBtn').disabled = true;
  document.getElementById('wmDownloadBtn').disabled = true;
}

// Detect average brightness / luminance of the loaded image
function detectImageLuminance(img) {
  if (!img) return 128;
  try {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 64;
    sampleCanvas.height = 64;
    const sCtx = sampleCanvas.getContext('2d');
    sCtx.drawImage(img, 0, 0, 64, 64);
    const data = sCtx.getImageData(0, 0, 64, 64).data;
    let total = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 30) {
        // ITU-R BT.709 perceived luminance
        total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        count++;
      }
    }
    return count > 0 ? (total / count) : 128;
  } catch (e) {
    console.warn('Luminance error:', e);
    return 128;
  }
}

function selectWmVariant(variant) {
  selectedWmVariant = variant;

  // Update button active styles
  const variants = ['auto', 'white', 'black', 'warna', 'custom'];
  variants.forEach(v => {
    const btn = document.getElementById(`wmVariantBtn-${v}`);
    if (btn) {
      if (v === variant) {
        btn.className = 'wm-variant-btn active px-2 py-1.5 rounded-xl border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs';
      } else {
        btn.className = 'wm-variant-btn px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:border-zinc-300 dark:hover:border-zinc-600 flex items-center justify-center gap-1.5 transition-all';
      }
    }
  });

  updateWmAutoUi();
  updateWmCanvas();
}

function handleCustomWmFile(e) {
  const files = e.target.files;
  if (files && files[0]) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        wmImages.custom = img;
        selectWmVariant('custom');
        if (typeof Toast !== 'undefined') {
          Toast.success('Watermark Dimuat!', 'Foto watermark kustom berhasil digunakan.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(files[0]);
  }
}

function updateWmAutoUi() {
  const isDark = currentWmImage ? (detectImageLuminance(currentWmImage) < 135) : false;
  const thumb = document.getElementById('wmActiveThumb');
  const nameEl = document.getElementById('wmActiveName');
  const statusEl = document.getElementById('wmActiveStatus');
  const autoBadge = document.getElementById('wmAutoBadge');

  if (selectedWmVariant === 'auto') {
    if (isDark) {
      if (thumb) thumb.src = WM_PRESETS.white;
      if (nameEl) nameEl.textContent = 'Watermark Putih (Auto)';
      if (statusEl) statusEl.textContent = 'Kontras: Gambar Gelap';
      if (autoBadge) {
        autoBadge.textContent = 'Auto: Putih';
        autoBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60';
      }
    } else {
      if (thumb) thumb.src = WM_PRESETS.black;
      if (nameEl) nameEl.textContent = 'Watermark Hitam (Auto)';
      if (statusEl) statusEl.textContent = 'Kontras: Gambar Terang';
      if (autoBadge) {
        autoBadge.textContent = 'Auto: Hitam';
        autoBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700';
      }
    }
  } else if (selectedWmVariant === 'white') {
    if (thumb) thumb.src = WM_PRESETS.white;
    if (nameEl) nameEl.textContent = 'Watermark Putih';
    if (statusEl) statusEl.textContent = 'Mode Manual';
    if (autoBadge) autoBadge.textContent = 'Manual: Putih';
  } else if (selectedWmVariant === 'black') {
    if (thumb) thumb.src = WM_PRESETS.black;
    if (nameEl) nameEl.textContent = 'Watermark Hitam';
    if (statusEl) statusEl.textContent = 'Mode Manual';
    if (autoBadge) autoBadge.textContent = 'Manual: Hitam';
  } else if (selectedWmVariant === 'warna') {
    if (thumb) thumb.src = WM_PRESETS.warna;
    if (nameEl) nameEl.textContent = 'Watermark Berwarna';
    if (statusEl) statusEl.textContent = 'Mode Manual';
    if (autoBadge) autoBadge.textContent = 'Manual: Berwarna';
  } else if (selectedWmVariant === 'custom') {
    if (thumb && wmImages.custom) thumb.src = wmImages.custom.src;
    if (nameEl) nameEl.textContent = 'Watermark Kustom';
    if (statusEl) statusEl.textContent = 'Upload Pengguna';
    if (autoBadge) autoBadge.textContent = 'Kustom';
  }
}

function toggleWmSpacingField() {
  const pos = document.getElementById('wmPosition')?.value;
  const spacingWrapper = document.getElementById('wmSpacingWrapper');
  if (spacingWrapper) {
    if (pos === 'tile') {
      spacingWrapper.classList.remove('hidden');
    } else {
      spacingWrapper.classList.add('hidden');
    }
  }
}

function getActiveWatermarkImage() {
  if (selectedWmVariant === 'white') return wmImages.white;
  if (selectedWmVariant === 'black') return wmImages.black;
  if (selectedWmVariant === 'warna') return wmImages.warna;
  if (selectedWmVariant === 'custom') return wmImages.custom || wmImages.white;

  // 'auto' mode
  const isDark = currentWmImage ? (detectImageLuminance(currentWmImage) < 135) : false;
  return isDark ? wmImages.white : wmImages.black;
}

function updateWmCanvas() {
  if (!currentWmImage) return;

  const canvas = document.getElementById('wmCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const imgW = currentWmImage.naturalWidth || currentWmImage.width;
  const imgH = currentWmImage.naturalHeight || currentWmImage.height;

  canvas.width = imgW;
  canvas.height = imgH;

  // Draw base original image
  ctx.clearRect(0, 0, imgW, imgH);
  ctx.drawImage(currentWmImage, 0, 0, imgW, imgH);

  // Read watermark parameters
  const activeWmImg = getActiveWatermarkImage();
  if (!activeWmImg || !activeWmImg.complete) {
    updateWmAutoUi();
    return;
  }

  updateWmAutoUi();

  const position = document.getElementById('wmPosition')?.value || 'tile';
  const opacity = (parseFloat(document.getElementById('wmOpacity')?.value) || 11) / 100;
  const scalePercent = (parseInt(document.getElementById('wmSize')?.value) || 15) / 100;
  const rotateVal = document.getElementById('wmRotate')?.value;
  const rotationDeg = (rotateVal !== undefined && !isNaN(rotateVal) && rotateVal !== '') ? parseInt(rotateVal) : -10;
  const spacing = parseInt(document.getElementById('wmSpacing')?.value) || 170;

  // Compute proportional watermark size relative to image dimensions
  const baseDim = Math.min(imgW, imgH);
  const wmAspect = (activeWmImg.naturalHeight && activeWmImg.naturalWidth)
    ? (activeWmImg.naturalHeight / activeWmImg.naturalWidth)
    : 0.35;

  const wmWidth = Math.max(40, baseDim * scalePercent);
  const wmHeight = wmWidth * wmAspect;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (position === 'tile') {
    // Staggered Diamond Grid Tiling
    const stepX = wmWidth + spacing;
    const stepY = wmHeight + spacing * 0.8;
    const angleRad = (rotationDeg * Math.PI) / 180;

    let row = 0;
    for (let y = -imgH * 0.5; y < imgH * 1.8; y += stepY) {
      row++;
      const rowOffset = (row % 2 === 0) ? stepX / 2 : 0;
      for (let x = -imgW * 0.5; x < imgW * 1.8; x += stepX) {
        ctx.save();
        ctx.translate(x + rowOffset, y);
        if (rotationDeg !== 0) ctx.rotate(angleRad);
        ctx.drawImage(activeWmImg, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
        ctx.restore();
      }
    }
  } else {
    // Single Placement
    ctx.save();
    let posX = imgW / 2;
    let posY = imgH / 2;
    const padX = Math.max(30, imgW * 0.04);
    const padY = Math.max(30, imgH * 0.04);

    if (position === 'bottom_right') {
      posX = imgW - (wmWidth / 2) - padX;
      posY = imgH - (wmHeight / 2) - padY;
    } else if (position === 'bottom_left') {
      posX = (wmWidth / 2) + padX;
      posY = imgH - (wmHeight / 2) - padY;
    } else if (position === 'top_right') {
      posX = imgW - (wmWidth / 2) - padX;
      posY = (wmHeight / 2) + padY;
    } else if (position === 'top_left') {
      posX = (wmWidth / 2) + padX;
      posY = (wmHeight / 2) + padY;
    }

    ctx.translate(posX, posY);
    if (rotationDeg !== 0) {
      ctx.rotate((rotationDeg * Math.PI) / 180);
    }
    ctx.drawImage(activeWmImg, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
    ctx.restore();
  }

  ctx.restore();
}

function copyWatermarkedImage() {
  const canvas = document.getElementById('wmCanvas');
  if (!canvas) return;

  canvas.toBlob(function (blob) {
    if (!blob) return;

    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        if (typeof Toast !== 'undefined') {
          Toast.success('Disalin!', 'Gambar ber-watermark berhasil disalin ke clipboard.');
        }
      }).catch(err => {
        console.error(err);
        if (typeof Toast !== 'undefined') {
          Toast.error('Gagal', 'Browser menolak akses clipboard. Gunakan tombol Unduh.');
        }
      });
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error('Tidak Didukung', 'Browser ini tidak mendukung Salin Gambar. Gunakan tombol Unduh.');
      }
    }
  }, 'image/png');
}

function downloadWatermarkedImage() {
  const canvas = document.getElementById('wmCanvas');
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `watermark-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  if (typeof Toast !== 'undefined') {
    Toast.success('Diunduh!', 'Gambar ber-watermark berhasil diunduh.');
  }
}


// =====================================
// PROJECT PREVIEW & MOCKUP BLENDER TOOL
// =====================================

let pbMockupImage = null;
let pbDesignImage = null;
let pbActiveSlot = 'mockup'; // Default active slot for paste
let pbIsDragging = false;
let pbDragStartX = 0;
let pbDragStartY = 0;
let pbInitX = 0;
let pbInitY = 0;

// Default values for sliders
let pbParams = {
  X: 50,       // % of canvas width (centered by default)
  Y: 50,       // % of canvas height (centered by default)
  Scale: 50,   // % size
  Rotate: 0,   // degrees
  Radius: 0,   // border radius in pixels
  Opacity: 100,// opacity percentage
  Gap: 10,     // collage gap
  WmSize: 30,  // watermark text size in pixels
  WmSpacing: 120, // watermark spacing in pixels
  WmOpacity: 30// watermark text transparency %
};

function openProjectPreviewBlenderModal() {
  closeAllModals();
  const modal = document.getElementById('projectPreviewBlenderModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.addEventListener('paste', handlePbPasteEvent);
    initPbEventListeners();
    selectPbSlot(pbActiveSlot);
    checkAndTogglePbView();
  }
}

function closeProjectPreviewBlenderModal() {
  const modal = document.getElementById('projectPreviewBlenderModal');
  if (modal) {
    modal.classList.add('hidden');
    document.removeEventListener('paste', handlePbPasteEvent);
  }
}

function selectPbSlot(slot) {
  pbActiveSlot = slot;
  
  const slotMockup = document.getElementById('pbSlotMockup');
  const slotDesign = document.getElementById('pbSlotDesign');
  const badgeMockup = document.getElementById('pbBadgeMockup');
  const badgeDesign = document.getElementById('pbBadgeDesign');
  const btnTargetMockup = document.getElementById('pbTargetMockupBtn');
  const btnTargetDesign = document.getElementById('pbTargetDesignBtn');

  // Reset classes
  if (slotMockup) {
    slotMockup.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
    slotMockup.classList.add('border-zinc-300', 'dark:border-zinc-700');
  }
  if (slotDesign) {
    slotDesign.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
    slotDesign.classList.add('border-zinc-300', 'dark:border-zinc-700');
  }
  if (badgeMockup) {
    badgeMockup.textContent = 'Klik untuk mengaktifkan';
    badgeMockup.className = 'absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
  }
  if (badgeDesign) {
    badgeDesign.textContent = 'Klik untuk mengaktifkan';
    badgeDesign.className = 'absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
  }
  if (btnTargetMockup) {
    btnTargetMockup.className = 'flex-1 py-1 px-2 border rounded-lg text-[10px] font-bold text-center transition-all bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400';
  }
  if (btnTargetDesign) {
    btnTargetDesign.className = 'flex-1 py-1 px-2 border rounded-lg text-[10px] font-bold text-center transition-all bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400';
  }

  // Set active classes
  if (slot === 'mockup') {
    if (slotMockup) {
      slotMockup.classList.add('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
      slotMockup.classList.remove('border-zinc-300', 'dark:border-zinc-700');
    }
    if (badgeMockup) {
      badgeMockup.textContent = 'Aktif (Tekan Ctrl+V)';
      badgeMockup.className = 'absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-500 text-white';
    }
    if (btnTargetMockup) {
      btnTargetMockup.className = 'flex-1 py-1 px-2 border rounded-lg text-[10px] font-bold text-center transition-all bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400';
    }
  } else {
    if (slotDesign) {
      slotDesign.classList.add('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
      slotDesign.classList.remove('border-zinc-300', 'dark:border-zinc-700');
    }
    if (badgeDesign) {
      badgeDesign.textContent = 'Aktif (Tekan Ctrl+V)';
      badgeDesign.className = 'absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-500 text-white';
    }
    if (btnTargetDesign) {
      btnTargetDesign.className = 'flex-1 py-1 px-2 border rounded-lg text-[10px] font-bold text-center transition-all bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400';
    }
  }
}

function triggerPbFileInput(slot) {
  const input = document.getElementById(slot === 'mockup' ? 'pbMockupInput' : 'pbDesignInput');
  if (input) input.click();
}

function handlePbFileSelect(e, target) {
  const files = e.target.files;
  if (files && files[0]) {
    loadPbImageFromFile(files[0], target);
  }
}

function handlePbSlotDragOver(e, slot) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.getElementById(slot === 'mockup' ? 'pbSlotMockup' : 'pbSlotDesign');
  if (el) {
    el.classList.add('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/40');
  }
}

function handlePbSlotDragLeave(e, slot) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.getElementById(slot === 'mockup' ? 'pbSlotMockup' : 'pbSlotDesign');
  if (el) {
    el.classList.remove('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/40');
  }
}

function handlePbSlotDrop(e, slot) {
  e.preventDefault();
  e.stopPropagation();
  handlePbSlotDragLeave(e, slot);
  const files = e.dataTransfer ? e.dataTransfer.files : null;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type && file.type.startsWith('image/')) {
      selectPbSlot(slot);
      loadPbImageFromFile(file, slot);
      if (typeof Toast !== 'undefined') {
        Toast.success('Gambar Dimuat!', `Gambar ${slot === 'mockup' ? 'Mockup' : 'Desain Utama'} berhasil di-drop.`);
      }
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error('Format Tidak Didukung', 'Harap masukkan file gambar valid (PNG, JPG, WEBP, dll).');
      }
    }
  }
}

function handlePbCanvasDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handlePbCanvasDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handlePbCanvasDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer ? e.dataTransfer.files : null;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type && file.type.startsWith('image/')) {
      const targetSlot = pbActiveSlot || 'design';
      loadPbImageFromFile(file, targetSlot);
      if (typeof Toast !== 'undefined') {
        Toast.success('Gambar Diperbarui!', `Gambar ${targetSlot === 'mockup' ? 'Mockup' : 'Desain Utama'} berhasil diperbarui.`);
      }
    }
  }
}

function handlePbPasteEvent(e) {
  const imageBlob = extractImageFromClipboard(e);
  if (imageBlob) {
    e.preventDefault();
    e.stopPropagation();
    loadPbImageFromFile(imageBlob, pbActiveSlot);
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Paste!', `Gambar dimuat ke slot ${pbActiveSlot === 'mockup' ? 'Mockup' : 'Desain Utama'}.`);
    }
  }
}

function loadPbImageFromFile(file, target) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      if (target === 'mockup') {
        pbMockupImage = img;
        const wrapper = document.getElementById('pbThumbMockupWrapper');
        const thumbImg = document.getElementById('pbThumbMockup');
        const nameSpan = document.getElementById('pbNameMockup');
        if (thumbImg) thumbImg.src = event.target.result;
        if (nameSpan) nameSpan.textContent = file.name || 'Mockup pasted';
        if (wrapper) wrapper.classList.remove('hidden');
      } else {
        pbDesignImage = img;
        const wrapper = document.getElementById('pbThumbDesignWrapper');
        const thumbImg = document.getElementById('pbThumbDesign');
        const nameSpan = document.getElementById('pbNameDesign');
        if (thumbImg) thumbImg.src = event.target.result;
        if (nameSpan) nameSpan.textContent = file.name || 'Desain pasted';
        if (wrapper) wrapper.classList.remove('hidden');
      }
      
      checkAndTogglePbView();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function checkAndTogglePbView() {
  const uploadContainer = document.getElementById('pbUploadContainer');
  const canvasWrapper = document.getElementById('pbCanvasWrapper');
  const copyBtn = document.getElementById('pbCopyBtn');
  const dlBtn = document.getElementById('pbDownloadBtn');

  if (pbMockupImage && pbDesignImage) {
    if (uploadContainer) uploadContainer.classList.add('hidden');
    if (canvasWrapper) canvasWrapper.classList.remove('hidden');
    if (copyBtn) copyBtn.disabled = false;
    if (dlBtn) dlBtn.disabled = false;
    
    // Auto-center overlay design if on initial load
    if (pbParams.X === 50 && pbParams.Y === 50 && pbParams.Scale === 50) {
      const mockW = pbMockupImage.naturalWidth || pbMockupImage.width;
      const designW = pbDesignImage.naturalWidth || pbDesignImage.width;
      if (designW > mockW) {
        pbParams.Scale = Math.round((mockW / designW) * 80);
      }
      pbParams.X = 50;
      pbParams.Y = 50;
      
      document.getElementById('pbRangeScale').value = pbParams.Scale;
      document.getElementById('pbValScale').textContent = pbParams.Scale + '%';
    }

    updatePbCanvas();
  } else {
    if (uploadContainer) uploadContainer.classList.remove('hidden');
    if (canvasWrapper) canvasWrapper.classList.add('hidden');
    if (copyBtn) copyBtn.disabled = true;
    if (dlBtn) dlBtn.disabled = true;
  }
}

function resetPbSlot(target) {
  if (target === 'mockup') {
    pbMockupImage = null;
    document.getElementById('pbMockupInput').value = '';
    const wrapper = document.getElementById('pbThumbMockupWrapper');
    if (wrapper) wrapper.classList.add('hidden');
  } else {
    pbDesignImage = null;
    document.getElementById('pbDesignInput').value = '';
    const wrapper = document.getElementById('pbThumbDesignWrapper');
    if (wrapper) wrapper.classList.add('hidden');
  }
  checkAndTogglePbView();
}

function resetPbAll() {
  pbMockupImage = null;
  pbDesignImage = null;
  document.getElementById('pbMockupInput').value = '';
  document.getElementById('pbDesignInput').value = '';
  
  const w1 = document.getElementById('pbThumbMockupWrapper');
  const w2 = document.getElementById('pbThumbDesignWrapper');
  if (w1) w1.classList.add('hidden');
  if (w2) w2.classList.add('hidden');
  
  pbParams.X = 50;
  pbParams.Y = 50;
  pbParams.Scale = 50;
  pbParams.Rotate = 0;
  pbParams.Radius = 0;
  pbParams.Opacity = 100;
  pbParams.Gap = 10;
  pbParams.WmSize = 30;
  pbParams.WmSpacing = 120;
  pbParams.WmOpacity = 30;
  
  document.getElementById('pbRangeScale').value = 50;
  document.getElementById('pbValScale').textContent = '50%';
  document.getElementById('pbRangeRadius').value = 0;
  document.getElementById('pbValRadius').textContent = '0px';
  document.getElementById('pbRangeOpacity').value = 100;
  document.getElementById('pbValOpacity').textContent = '100%';
  document.getElementById('pbRangeGap').value = 10;
  document.getElementById('pbValGap').textContent = '10px';



  // Reset Stroke Color & Enable Status
  const strokePicker = document.getElementById('pbStrokeColorPicker');
  if (strokePicker) strokePicker.value = '#ffffff';
  updatePbStrokeColor('#ffffff');

  const strokeEnable = document.getElementById('pbEnableStroke');
  if (strokeEnable) strokeEnable.checked = true;

  // Reset Watermark settings
  const enableWm = document.getElementById('pbEnableWm');
  if (enableWm) enableWm.checked = false;
  
  const wmText = document.getElementById('pbWmText');
  if (wmText) wmText.value = '@premium_dz';
  
  const wmPicker = document.getElementById('pbWmColorPicker');
  if (wmPicker) wmPicker.value = '#ffffff';
  updatePbWmColor('#ffffff');
  
  const bgPicker = document.getElementById('pbBgColorPicker');
  if (bgPicker) bgPicker.value = '#ffffff';
  updatePbBgColor('#ffffff');
  
  const wmSizeRange = document.getElementById('pbRangeWmSize');
  if (wmSizeRange) wmSizeRange.value = 30;
  
  const wmSizeVal = document.getElementById('pbValWmSize');
  if (wmSizeVal) wmSizeVal.textContent = '30px';
  
  const wmSpacingRange = document.getElementById('pbRangeWmSpacing');
  if (wmSpacingRange) wmSpacingRange.value = 120;
  
  const wmSpacingVal = document.getElementById('pbValWmSpacing');
  if (wmSpacingVal) wmSpacingVal.textContent = '120px';

  const wmOpRange = document.getElementById('pbRangeWmOpacity');
  if (wmOpRange) wmOpRange.value = 30;
  
  const wmOpVal = document.getElementById('pbValWmOpacity');
  if (wmOpVal) wmOpVal.textContent = '30%';

  // Collapse Advanced settings by default
  const advPanel = document.getElementById('pbAdvancedOverlaySettings');
  const advIcon = document.getElementById('pbAdvancedToggleIcon');
  if (advPanel) advPanel.classList.add('hidden');
  if (advIcon) advIcon.className = 'fa-solid fa-chevron-down text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';

  // Collapse Watermark settings by default
  const wmPanel = document.getElementById('pbWmPanel');
  const wmIcon = document.getElementById('pbWmToggleIcon');
  if (wmPanel) wmPanel.classList.add('hidden');
  if (wmIcon) wmIcon.className = 'fa-solid fa-chevron-down text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';

  checkAndTogglePbView();
}

function updatePbVal(param) {
  const range = document.getElementById(`pbRange${param}`);
  const val = document.getElementById(`pbVal${param}`);
  if (range && val) {
    let suffix = '%';
    if (param === 'Rotate') suffix = '°';
    if (param === 'Radius' || param === 'Gap' || param === 'WmSize' || param === 'WmSpacing') suffix = 'px';
    
    pbParams[param] = parseFloat(range.value);
    val.textContent = range.value + suffix;
  }
}

function changePbLayoutMode(mode) {
  const overlayPanel = document.getElementById('pbOverlaySettings');
  const collagePanel = document.getElementById('pbCollageSettings');
  
  if (mode === 'overlay') {
    if (overlayPanel) overlayPanel.classList.remove('hidden');
    if (collagePanel) collagePanel.classList.add('hidden');
  } else {
    if (overlayPanel) overlayPanel.classList.add('hidden');
    if (collagePanel) collagePanel.classList.remove('hidden');
  }
  
  updatePbCanvas();
}

function togglePbAdvancedOverlay() {
  const panel = document.getElementById('pbAdvancedOverlaySettings');
  const icon = document.getElementById('pbAdvancedToggleIcon');
  
  if (panel) {
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      if (icon) icon.className = 'fa-solid fa-chevron-up text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';
    } else {
      panel.classList.add('hidden');
      if (icon) icon.className = 'fa-solid fa-chevron-down text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';
    }
  }
}

function updatePbStrokeColor(val) {
  const swatch = document.getElementById('pbStrokeColorSwatch');
  const text = document.getElementById('pbStrokeColorText');
  if (swatch) swatch.style.backgroundColor = val;
  if (text) text.textContent = val;
  updatePbCanvas();
}

function updatePbWmColor(val) {
  const swatch = document.getElementById('pbWmColorSwatch');
  const text = document.getElementById('pbWmColorText');
  if (swatch) swatch.style.backgroundColor = val;
  if (text) text.textContent = val;
  updatePbCanvas();
}

function updatePbBgColor(val) {
  const swatch = document.getElementById('pbBgColorSwatch');
  const text = document.getElementById('pbBgColorText');
  if (swatch) swatch.style.backgroundColor = val;
  if (text) text.textContent = val;
  updatePbCanvas();
}

function togglePbWmPanel() {
  const panel = document.getElementById('pbWmPanel');
  const icon = document.getElementById('pbWmToggleIcon');
  if (!panel) return;

  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    if (icon) icon.className = 'fa-solid fa-chevron-up text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';
  } else {
    panel.classList.add('hidden');
    if (icon) icon.className = 'fa-solid fa-chevron-down text-xs text-zinc-400 dark:text-zinc-500 transition-transform duration-300';
  }
}

function updatePbCanvas() {
  if (!pbMockupImage || !pbDesignImage) return;

  const canvas = document.getElementById('pbCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const mode = document.getElementById('pbLayoutMode').value;
  const mockW = pbMockupImage.naturalWidth || pbMockupImage.width;
  const mockH = pbMockupImage.naturalHeight || pbMockupImage.height;
  const designW = pbDesignImage.naturalWidth || pbDesignImage.width;
  const designH = pbDesignImage.naturalHeight || pbDesignImage.height;

  // Create temporary in-memory canvas for natural resolution rendering
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  if (mode === 'overlay') {
    tempCanvas.width = mockW;
    tempCanvas.height = mockH;

    tempCtx.clearRect(0, 0, mockW, mockH);
    tempCtx.drawImage(pbMockupImage, 0, 0, mockW, mockH);

    const scaleFactor = pbParams.Scale / 100;
    const drawW = designW * scaleFactor;
    const drawH = designH * scaleFactor;

    const posX = (pbParams.X / 100) * mockW;
    const posY = (pbParams.Y / 100) * mockH;

    tempCtx.save();
    tempCtx.globalAlpha = pbParams.Opacity / 100;
    tempCtx.globalCompositeOperation = document.getElementById('pbBlendMode').value || 'source-over';

    tempCtx.translate(posX, posY);
    if (pbParams.Rotate !== 0) {
      tempCtx.rotate((pbParams.Rotate * Math.PI) / 180);
    }

    if (pbParams.Radius > 0) {
      tempCtx.beginPath();
      const x = -drawW / 2;
      const y = -drawH / 2;
      const r = Math.min(pbParams.Radius, drawW / 2, drawH / 2);
      
      tempCtx.moveTo(x + r, y);
      tempCtx.lineTo(x + drawW - r, y);
      tempCtx.quadraticCurveTo(x + drawW, y, x + drawW, y + r);
      tempCtx.lineTo(x + drawW, y + drawH - r);
      tempCtx.quadraticCurveTo(x + drawW, y + drawH, x + drawW - r, y + drawH);
      tempCtx.lineTo(x + r, y + drawH);
      tempCtx.quadraticCurveTo(x, y + drawH, x, y + drawH - r);
      tempCtx.lineTo(x, y + r);
      tempCtx.quadraticCurveTo(x, y, x + r, y);
      tempCtx.closePath();

      // Clip and draw image
      tempCtx.save();
      tempCtx.clip();
      tempCtx.drawImage(pbDesignImage, -drawW / 2, -drawH / 2, drawW, drawH);
      tempCtx.restore();

      // Draw border stroke
      const enableStroke = document.getElementById('pbEnableStroke') ? document.getElementById('pbEnableStroke').checked : true;
      if (enableStroke) {
        const strokeCol = document.getElementById('pbStrokeColorPicker') ? document.getElementById('pbStrokeColorPicker').value : '#ffffff';
        tempCtx.strokeStyle = strokeCol;
        tempCtx.lineWidth = 3.5;
        tempCtx.stroke();
      }
    } else {
      tempCtx.drawImage(pbDesignImage, -drawW / 2, -drawH / 2, drawW, drawH);

      // Draw simple rectangular stroke
      const enableStroke = document.getElementById('pbEnableStroke') ? document.getElementById('pbEnableStroke').checked : true;
      if (enableStroke) {
        const strokeCol = document.getElementById('pbStrokeColorPicker') ? document.getElementById('pbStrokeColorPicker').value : '#ffffff';
        tempCtx.strokeStyle = strokeCol;
        tempCtx.lineWidth = 3.5;
        tempCtx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
      }
    }
    
    tempCtx.restore();

  } else if (mode === 'side_by_side_h') {
    const ratio = mockH / designH;
    const scaledDesignW = designW * ratio;
    const gap = pbParams.Gap;

    tempCanvas.width = mockW + scaledDesignW + gap;
    tempCanvas.height = mockH;

    const bgCol = document.getElementById('pbBgColorPicker') ? document.getElementById('pbBgColorPicker').value : '#ffffff';
    tempCtx.fillStyle = bgCol;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(pbMockupImage, 0, 0, mockW, mockH);
    tempCtx.drawImage(pbDesignImage, mockW + gap, 0, scaledDesignW, mockH);

  } else if (mode === 'side_by_side_v') {
    const ratio = mockW / designW;
    const scaledDesignH = designH * ratio;
    const gap = pbParams.Gap;

    tempCanvas.width = mockW;
    tempCanvas.height = mockH + scaledDesignH + gap;

    const bgCol = document.getElementById('pbBgColorPicker') ? document.getElementById('pbBgColorPicker').value : '#ffffff';
    tempCtx.fillStyle = bgCol;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(pbMockupImage, 0, 0, mockW, mockH);
    tempCtx.drawImage(pbDesignImage, 0, mockH + gap, mockW, scaledDesignH);
  }

  // Determine final canvas size and render from tempCanvas
  canvas.width = tempCanvas.width;
  canvas.height = tempCanvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tempCanvas, 0, 0);

  // Apply Watermark if enabled (on top of final resized canvas)
  const enableWmCheckbox = document.getElementById('pbEnableWm');
  if (enableWmCheckbox && enableWmCheckbox.checked) {
    const wmText = document.getElementById('pbWmText').value || '@premium_dz';
    const position = document.getElementById('pbWmPosition').value;
    const opacity = pbParams.WmOpacity / 100;
    const fontSize = pbParams.WmSize;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `bold ${fontSize}px sans-serif`;

    const wmColor = document.getElementById('pbWmColorPicker') ? document.getElementById('pbWmColorPicker').value : '#ffffff';
    ctx.fillStyle = wmColor;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;

    const textMetrics = ctx.measureText(wmText);
    const textW = textMetrics.width;

    if (position === 'tile') {
      const spacing = pbParams.WmSpacing || 120;
      const stepX = textW + spacing;
      const stepY = fontSize + spacing * 0.8;
      const angleRad = (-30 * Math.PI) / 180;

      for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
        for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angleRad);
          ctx.fillText(wmText, 0, 0);
          ctx.restore();
        }
      }
    } else {
      let posX = canvas.width / 2;
      let posY = canvas.height / 2;

      if (position === 'bottom_right') {
        posX = canvas.width - textW - 30;
        posY = canvas.height - 30;
      } else if (position === 'bottom_left') {
        posX = 30;
        posY = canvas.height - 30;
      } else if (position === 'center') {
        posX = canvas.width / 2 - textW / 2;
        posY = canvas.height / 2 + fontSize / 3;
      }
      ctx.fillText(wmText, posX, posY);
    }
    ctx.restore();
  }
}

function initPbEventListeners() {
  const canvas = document.getElementById('pbCanvas');
  if (!canvas) return;

  const slotMockup = document.getElementById('pbSlotMockup');
  const slotDesign = document.getElementById('pbSlotDesign');

  if (slotMockup) {
    slotMockup.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    slotMockup.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files[0]) loadPbImageFromFile(files[0], 'mockup');
    });
  }

  if (slotDesign) {
    slotDesign.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    slotDesign.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files[0]) loadPbImageFromFile(files[0], 'design');
    });
  }

  // Canvas Mouse events
  canvas.removeEventListener('mousedown', onPbMouseDown);
  canvas.addEventListener('mousedown', onPbMouseDown);
  
  canvas.removeEventListener('mousemove', onPbMouseMove);
  canvas.addEventListener('mousemove', onPbMouseMove);
  
  window.removeEventListener('mouseup', onPbMouseUp);
  window.addEventListener('mouseup', onPbMouseUp);

  // Canvas Touch events
  canvas.removeEventListener('touchstart', onPbTouchStart);
  canvas.addEventListener('touchstart', onPbTouchStart, { passive: false });
  
  canvas.removeEventListener('touchmove', onPbTouchMove);
  canvas.addEventListener('touchmove', onPbTouchMove, { passive: false });
  
  window.removeEventListener('touchend', onPbTouchEnd);
  window.addEventListener('touchend', onPbTouchEnd);
}

function onPbMouseDown(e) {
  const mode = document.getElementById('pbLayoutMode').value;
  if (mode !== 'overlay') return;

  pbIsDragging = true;
  pbDragStartX = e.clientX;
  pbDragStartY = e.clientY;
  pbInitX = pbParams.X;
  pbInitY = pbParams.Y;
}

function onPbMouseMove(e) {
  if (!pbIsDragging) return;

  const canvas = document.getElementById('pbCanvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const dx = e.clientX - pbDragStartX;
  const dy = e.clientY - pbDragStartY;

  const canvasDx = dx * scaleX;
  const canvasDy = dy * scaleY;

  const dxPercent = (canvasDx / canvas.width) * 100;
  const dyPercent = (canvasDy / canvas.height) * 100;

  pbParams.X = Math.round((pbInitX + dxPercent) * 10) / 10;
  pbParams.Y = Math.round((pbInitY + dyPercent) * 10) / 10;

  pbParams.X = Math.max(-100, Math.min(200, pbParams.X));
  pbParams.Y = Math.max(-100, Math.min(200, pbParams.Y));

  updatePbCanvas();
}

function onPbMouseUp() {
  pbIsDragging = false;
}

function onPbTouchStart(e) {
  const mode = document.getElementById('pbLayoutMode').value;
  if (mode !== 'overlay') return;

  if (e.touches.length === 1) {
    e.preventDefault();
    pbIsDragging = true;
    pbDragStartX = e.touches[0].clientX;
    pbDragStartY = e.touches[0].clientY;
    pbInitX = pbParams.X;
    pbInitY = pbParams.Y;
  }
}

function onPbTouchMove(e) {
  if (!pbIsDragging) return;

  if (e.touches.length === 1) {
    e.preventDefault();
    const canvas = document.getElementById('pbCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const dx = e.touches[0].clientX - pbDragStartX;
    const dy = e.touches[0].clientY - pbDragStartY;

    const canvasDx = dx * scaleX;
    const canvasDy = dy * scaleY;

    const dxPercent = (canvasDx / canvas.width) * 100;
    const dyPercent = (canvasDy / canvas.height) * 100;

    pbParams.X = Math.round((pbInitX + dxPercent) * 10) / 10;
    pbParams.Y = Math.round((pbInitY + dyPercent) * 10) / 10;

    pbParams.X = Math.max(-100, Math.min(200, pbParams.X));
    pbParams.Y = Math.max(-100, Math.min(200, pbParams.Y));

    updatePbCanvas();
  }
}

function onPbTouchEnd() {
  pbIsDragging = false;
}

function copyPbImage() {
  const canvas = document.getElementById('pbCanvas');
  if (!canvas) return;

  if (typeof Toast !== 'undefined') Toast.info('Menyalin...', 'Sedang memproses gambar gabungan...');
  
  canvas.toBlob((blob) => {
    if (!blob) {
      if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Gagal memproses gambar untuk disalin.');
      return;
    }
    
    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        if (typeof Toast !== 'undefined') Toast.success('Disalin!', 'Gambar mockup berhasil disalin ke clipboard.');
      }).catch((err) => {
        console.error('Clipboard copy failed: ', err);
        if (typeof Toast !== 'undefined') Toast.error('Gagal Menyalin', 'Browser Anda memblokir salinan ClipboardItem secara langsung.');
      });
    } else {
      if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Fitur clipboard modern tidak didukung browser Anda.');
    }
  }, 'image/png');
}

function downloadPbImage() {
  const canvas = document.getElementById('pbCanvas');
  if (!canvas) return;

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `mockup-blender-${Date.now()}.png`;
  a.click();
  
  if (typeof Toast !== 'undefined') Toast.success('Diunduh!', 'Gambar mockup berhasil diunduh.');
}

// =====================================
// CRUD REFERENCES
// =====================================

function searchReferences(query) {
  renderReferences(query.toLowerCase());
}

function renderReferences(query = '') {
  const tableBody = document.getElementById('refTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  const baseRefs = getAccessibleTools(referencesData);
  let filtered = baseRefs || [];
  if (query) {
    filtered = baseRefs.filter(r => 
      (r.title || '').toLowerCase().includes(query) || 
      (r.source || '').toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-8 text-zinc-400 dark:text-zinc-500">
          <i class="fa-solid fa-bookmark text-2xl mb-1.5 block"></i>
          Tidak ada referensi ditemukan.
        </td>
      </tr>
    `;
    return;
  }

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  const sourceIcons = {
    'Pinterest': '<i class="fa-brands fa-pinterest text-red-600 text-base"></i>',
    'Freepik': '<i class="fa-solid fa-vector-square text-blue-500 text-base"></i>',
    'Behance': '<i class="fa-brands fa-behance text-blue-600 text-base"></i>',
    'Dribbble': '<i class="fa-brands fa-dribbble text-pink-500 text-base"></i>',
    'Lainnya': '<i class="fa-solid fa-bookmark text-zinc-500 text-base"></i>'
  };

  filtered.forEach(ref => {
    const icon = sourceIcons[ref.source] || sourceIcons['Lainnya'];
    
    // Capitalize each word (Title Case) for display
    const displayTitle = (ref.title || '').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const tr = document.createElement('tr');
    tr.className = 'bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50';
    tr.innerHTML = `
      <td class="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">${escapeHtml(displayTitle)}</td>
      <td class="px-4 py-3">
        <a href="${sanitizeUrl(ref.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1.5 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md font-bold transition" title="Buka tautan referensi">
          ${icon}
          <span>${escapeHtml(ref.source)}</span>
        </a>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end space-x-1.5">
          <button onclick="editReference('${ref.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold transition-colors" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteReference('${ref.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold transition-colors" title="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openReferencesModal() {
  closeAllModals();
  const modal = document.getElementById('referencesModal');
  if (modal) modal.classList.remove('hidden');
  resetRefForm();
  renderReferences();
}

function closeReferencesModal() {
  const modal = document.getElementById('referencesModal');
  if (modal) modal.classList.add('hidden');
}

function resetRefForm() {
  const title = document.getElementById('refFormTitle');
  const idInput = document.getElementById('refFormId');
  const titleInput = document.getElementById('refFormTitleInput');
  const urlInput = document.getElementById('refFormUrlInput');
  const sourceInput = document.getElementById('refFormSourceInput');
  const cancelBtn = document.getElementById('refCancelEditBtn');

  if (title) title.textContent = 'Tambah Referensi';
  if (idInput) idInput.value = '';
  if (titleInput) titleInput.value = '';
  if (urlInput) urlInput.value = '';
  if (sourceInput) sourceInput.value = 'Pinterest';
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function saveReference() {
  const idInput = document.getElementById('refFormId').value;

  const btnSubmit = document.querySelector('#refSubmitForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';
  }

  let title = document.getElementById('refFormTitleInput').value;
  // Capitalize each word (Title Case)
  title = (title || '').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const url = document.getElementById('refFormUrlInput').value;
  const source = document.getElementById('refFormSourceInput').value;

  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  let res;
  try {
    if (idInput) {
      res = await API.updateReference(idInput, { title, url, source });
    } else {
      res = await API.addReference({ title, url, source });
    }
  } catch (err) {
    console.error(err);
    res = { success: false, message: 'Terjadi kesalahan sistem' };
  } finally {
    if (loader) loader.classList.add('hidden');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      btnSubmit.innerHTML = 'Simpan Data Referensi';
    }
  }

  if (res.success) {
    if (typeof Toast !== 'undefined') Toast.success('Berhasil', res.message || 'Referensi berhasil disimpan');
    resetRefForm();
    
    // Reload references
    try {
      const references = await API.getReferences();
      referencesData = references || [];
      renderReferences();
    } catch(err) {
      console.error(err);
    }
  } else {
    if (typeof Toast !== 'undefined') Toast.error('Gagal', res.message || 'Gagal menyimpan referensi');
  }
}

function editReference(id) {
  const ref = referencesData.find(r => String(r.id) === String(id));
  if (!ref) return;

  document.getElementById('refFormTitle').textContent = 'Edit Referensi';
  document.getElementById('refFormId').value = ref.id;
  document.getElementById('refFormTitleInput').value = ref.title;
  document.getElementById('refFormUrlInput').value = ref.url;
  document.getElementById('refFormSourceInput').value = ref.source;

  const cancelBtn = document.getElementById('refCancelEditBtn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
}

async function deleteReference(id) {

  const confirmFn = typeof showConfirmModal === 'function' 
    ? showConfirmModal 
    : (typeof window !== 'undefined' && window.showConfirmModal ? window.showConfirmModal : (async (opts) => confirm(typeof opts === 'string' ? opts : (opts.message || 'Apakah Anda yakin?'))));

  if (await confirmFn({
    title: 'Hapus Referensi',
    message: 'Apakah Anda yakin ingin menghapus referensi desain ini?',
    type: 'danger',
    confirmText: 'Hapus Referensi'
  })) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.remove('hidden');

    try {
      const res = await API.deleteReference(id);
      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.success('Berhasil', 'Referensi berhasil dihapus');
        
        // Reload references
        const references = await API.getReferences();
        referencesData = references || [];
        renderReferences();
      } else {
        if (typeof Toast !== 'undefined') Toast.error('Gagal', res.message || 'Gagal menghapus referensi');
      }
    } catch (err) {
      console.error(err);
      if (typeof Toast !== 'undefined') Toast.error('Error', 'Terjadi kesalahan sistem');
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.scrollTo({ top: 0, behavior: 'smooth' });
  const mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Global paste listener for the Tools page - automatically routes pasted photos to active tool or Watermark Generator
function handleGlobalToolsPaste(e) {
  // If active element is a text input and no image is in clipboard, let text paste happen
  const activeEl = document.activeElement;
  const isTextInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
  
  const imageBlob = extractImageFromClipboard(e);
  if (!imageBlob) return; // No image detected, standard behavior

  e.preventDefault();
  e.stopPropagation();

  const pbModal = document.getElementById('projectPreviewBlenderModal');
  const isPbOpen = pbModal && !pbModal.classList.contains('hidden');

  const wmModal = document.getElementById('watermarkGeneratorModal');
  const isWmOpen = wmModal && !wmModal.classList.contains('hidden');

  if (isPbOpen) {
    loadPbImageFromFile(imageBlob, pbActiveSlot);
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Paste!', `Gambar dimuat ke slot ${pbActiveSlot === 'mockup' ? 'Mockup' : 'Desain Utama'}.`);
    }
  } else if (isWmOpen) {
    loadWmImageFromFile(imageBlob);
    if (typeof Toast !== 'undefined') {
      Toast.success('Berhasil Paste!', 'Gambar dari clipboard berhasil dimuat.');
    }
  } else {
    // If no tool modal is currently open, automatically open Watermark Generator and populate image
    openWatermarkModal();
    loadWmImageFromFile(imageBlob);
    if (typeof Toast !== 'undefined') {
      Toast.success('Gambar Dimuat!', 'Membuka Watermark Generator dengan gambar dari clipboard.');
    }
  }
}

// Initialize Global Paste on Tools page
document.removeEventListener('paste', handleGlobalToolsPaste);
document.addEventListener('paste', handleGlobalToolsPaste);
