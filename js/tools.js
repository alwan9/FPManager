let toolsData = [];
let shortcutsData = [];

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

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase();
      renderTools(query);
    });
  }
});

async function loadData() {
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('tools:read')) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Anda tidak memiliki izin (tools:read) untuk melihat modul tools.</p>
        </div>
      `;
    }
    return;
  }
  showToolsSkeletons();
  try {
    const [tools, shortcuts] = await Promise.all([
      API.getTools(),
      API.getShortcuts()
    ]);

    const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (currUser && currUser.role !== 'super_admin') {
      toolsData = (tools || []).filter(t => !t.userId || t.userId === 'USR-001' || t.userId === 'super_admin' || t.userId === currUser.id);
      shortcutsData = (shortcuts || []).filter(s => !s.userId || s.userId === 'USR-001' || s.userId === 'super_admin' || s.userId === currUser.id);
    } else {
      toolsData = tools || [];
      shortcutsData = shortcuts || [];
    }

    renderTools();
    renderShortcuts();
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
}

// =====================================
// CRUD PROMPTS (TOOLS)
// =====================================

function renderTools(query = '') {
  const container = document.getElementById('toolsContainer');
  container.innerHTML = '';

  let filteredTools = toolsData;
  if (query) {
    filteredTools = toolsData.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.prompt.toLowerCase().includes(query)
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
          <h4 class="font-normal text-zinc-900 dark:text-zinc-100 text-lg truncate">${tool.title}</h4>
          <span class="px-2 py-0.5 text-xs font-mono font-normal rounded bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">${tool.userId || 'USR-001'}</span>
        </div>
        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-base font-normal leading-relaxed whitespace-pre-wrap font-mono mt-2">${tool.prompt}</div>
      </div>
      <div class="flex flex-wrap items-center gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end shrink-0">
        <button onclick="copyPrompt('${tool.id}', 'id')" class="flex-1 md:flex-none px-3.5 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-normal rounded-xl transition-colors flex items-center justify-center space-x-1 text-base" title="Salin Prompt (ID)">
          <i class="fa-regular fa-copy"></i>
          <span>ID</span>
        </button>
        <button onclick="copyPrompt('${tool.id}', 'en')" class="flex-1 md:flex-none px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-normal rounded-xl transition-colors flex items-center justify-center space-x-1 text-base" title="Salin Prompt (EN)">
          <i class="fa-regular fa-copy"></i>
          <span>EN</span>
        </button>
        ${(typeof Auth === 'undefined' || Auth.hasPermission('tools:update')) ? `
        <button onclick="editTool('${tool.id}')" class="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 font-normal rounded-xl transition-colors flex items-center justify-center" title="Edit Prompt">
          <i class="fa-solid fa-pen"></i>
        </button>
        ` : ''}
        ${(typeof Auth === 'undefined' || Auth.hasPermission('tools:delete')) ? `
        <button onclick="deleteTool('${tool.id}')" class="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 font-normal rounded-xl transition-colors flex items-center justify-center" title="Hapus Prompt">
          <i class="fa-solid fa-trash-can"></i>
        </button>
        ` : ''}
      </div>
    `;
    container.appendChild(el);
  });
}

async function saveTool() {
  const idInput = document.getElementById('toolId').value;
  const requiredPerm = idInput ? 'tools:update' : 'tools:create';
  if (typeof Auth !== 'undefined' && !Auth.hasPermission(requiredPerm)) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk mengelola Prompt.');
    return;
  }

  const btnSubmit = document.querySelector('#toolForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
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
  }

  if (loader) loader.classList.add('hidden');

  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = 'Simpan';
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
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('tools:delete')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus Prompt.');
    return;
  }
  if (confirm('Apakah Anda yakin ingin menghapus prompt ini?')) {
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
  const m5 = document.getElementById('imageUpscalerModal');
  const m6 = document.getElementById('logoPhilosophyModal');
  const m7 = document.getElementById('projectPreviewBlenderModal');

  if (m1) m1.classList.add('hidden');
  if (m2) m2.classList.add('hidden');
  if (m3) m3.classList.add('hidden');
  if (m4) m4.classList.add('hidden');
  if (m6) m6.classList.add('hidden');
  if (m7) m7.classList.add('hidden');

  if (typeof handleWmPasteEvent === 'function') document.removeEventListener('paste', handleWmPasteEvent);
  if (typeof handleLogoPasteEvent === 'function') document.removeEventListener('paste', handleLogoPasteEvent);
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

  navigator.clipboard.writeText(textToCopy).then(() => {
    if (typeof Toast !== 'undefined') Toast.success('Tersalin', `Prompt (${lang.toUpperCase()}) berhasil disalin!`);
  }).catch(err => {
    if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Gagal menyalin prompt.');
  });
}

// =====================================
// CRUD WEB SHORTCUTS
// =====================================

function renderShortcuts(query = '') {
  const container = document.getElementById('shortcutsContainer');
  container.innerHTML = '';

  let filteredShortcuts = [...shortcutsData];
  if (query) {
    filteredShortcuts = shortcutsData.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.url.toLowerCase().includes(query)
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
      <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center w-full text-center group-hover:text-indigo-600 transition-colors">
        <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl md:mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors overflow-hidden">
          <img src="${iconUrl}" alt="${shortcut.title}" class="w-full h-full object-cover">
        </div>
        <span class="font-normal text-zinc-900 dark:text-zinc-100 text-base truncate w-full px-1 group-hover:text-indigo-600 block mt-1">${shortcut.title}</span>
        <span class="px-2 py-0.5 text-xs font-mono font-normal rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mt-1">${shortcut.userId || 'USR-001'}</span>
      </a>
      <div class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex justify-center items-center gap-1 sm:gap-2 pointer-events-none">
        ${(typeof Auth === 'undefined' || Auth.hasPermission('tools:update')) ? `
        <button onclick="editShortcut('${shortcut.id}')" class="w-8 h-8 pointer-events-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg flex items-center justify-center shadow-sm hover:scale-110 transition-transform" title="Edit Shortcut">
          <i class="fa-solid fa-pen text-xs"></i>
        </button>
        ` : ''}
        ${(typeof Auth === 'undefined' || Auth.hasPermission('tools:delete')) ? `
        <button onclick="deleteShortcut('${shortcut.id}')" class="w-8 h-8 pointer-events-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg flex items-center justify-center shadow-sm hover:scale-110 transition-transform" title="Hapus Shortcut">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
        ` : ''}
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
}

async function saveShortcut() {
  const idInput = document.getElementById('shortcutId').value;
  const requiredPerm = idInput ? 'tools:update' : 'tools:create';
  if (typeof Auth !== 'undefined' && !Auth.hasPermission(requiredPerm)) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk mengelola Web Shortcut.');
    return;
  }

  const btnSubmit = document.querySelector('#shortcutForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
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
  }

  if (loader) loader.classList.add('hidden');

  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = 'Simpan';
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
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('tools:delete')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus Web Shortcut.');
    return;
  }
  if (confirm('Apakah Anda yakin ingin menghapus shortcut ini?')) {
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
// PANDUAN & KONVERSI UKURAN (NO PERMISSION)
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
// WATERMARK GENERATOR TOOL (NO PERMISSION)
// =====================================

let currentWmImage = null;

function openWatermarkModal() {
  closeAllModals();
  const modal = document.getElementById('watermarkGeneratorModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.addEventListener('paste', handleWmPasteEvent);
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

function handleWmPasteEvent(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        loadWmImageFromFile(blob);
        if (typeof Toast !== 'undefined') {
          Toast.success('Berhasil Paste!', 'Gambar dari clipboard berhasil dimuat.');
        }
        break;
      }
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

function updateWmCanvas() {
  if (!currentWmImage) return;

  const canvas = document.getElementById('wmCanvas');
  const ctx = canvas.getContext('2d');

  const imgW = currentWmImage.naturalWidth || currentWmImage.width;
  const imgH = currentWmImage.naturalHeight || currentWmImage.height;

  canvas.width = imgW;
  canvas.height = imgH;

  // Draw original image
  ctx.clearRect(0, 0, imgW, imgH);
  ctx.drawImage(currentWmImage, 0, 0, imgW, imgH);

  // Read controls
  const wmText = document.getElementById('wmText').value || 'Watermark';
  const position = document.getElementById('wmPosition').value;
  const colorName = document.getElementById('wmColor').value;
  const opacity = parseFloat(document.getElementById('wmOpacity').value) / 100;
  const fontSize = parseInt(document.getElementById('wmSize').value) || 32;
  const rotationDeg = parseInt(document.getElementById('wmRotate').value) || 0;

  // Configure text style
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `bold ${fontSize}px sans-serif`;

  let textColor = '#ffffff';
  switch (colorName) {
    case 'black': textColor = '#000000'; break;
    case 'red': textColor = '#ef4444'; break;
    case 'gold': textColor = '#eab308'; break;
    case 'white': default: textColor = '#ffffff'; break;
  }
  ctx.fillStyle = textColor;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;

  const textMetrics = ctx.measureText(wmText);
  const textW = textMetrics.width;

  if (position === 'tile') {
    // Pola Ulang Diagonal Grid Proofing
    const stepX = textW + 120;
    const stepY = fontSize + 100;
    const angleRad = (rotationDeg * Math.PI) / 180;

    for (let y = -imgH; y < imgH * 2; y += stepY) {
      for (let x = -imgW; x < imgW * 2; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        ctx.fillText(wmText, 0, 0);
        ctx.restore();
      }
    }
  } else {
    // Single Position
    ctx.save();
    let posX = imgW / 2;
    let posY = imgH / 2;

    if (position === 'bottom_right') {
      posX = imgW - textW - 30;
      posY = imgH - 30;
    } else if (position === 'bottom_left') {
      posX = 30;
      posY = imgH - 30;
    } else if (position === 'top_right') {
      posX = imgW - textW - 30;
      posY = fontSize + 30;
    }

    ctx.translate(posX, posY);
    if (rotationDeg !== 0) {
      ctx.rotate((rotationDeg * Math.PI) / 180);
    }
    ctx.fillText(wmText, 0, 0);
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
// AI LOGO PHILOSOPHY & BRAND STORY TOOL
// =====================================

let currentLogoImage = null;
let generatedPhilosophyResult = '';

function openLogoPhilosophyModal() {
  closeAllModals();
  const modal = document.getElementById('logoPhilosophyModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.addEventListener('paste', handleLogoPasteEvent);
  }
}

function closeLogoPhilosophyModal() {
  const modal = document.getElementById('logoPhilosophyModal');
  if (modal) {
    modal.classList.add('hidden');
    document.removeEventListener('paste', handleLogoPasteEvent);
  }
}

function triggerLogoFileInput() {
  const input = document.getElementById('logoFileInput');
  if (input) input.click();
}

function handleLogoFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (file) loadLogoImageFromFile(file);
}

function handleLogoPasteEvent(e) {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        loadLogoImageFromFile(blob);
        if (typeof Toast !== 'undefined') Toast.success('Berhasil Paste!', 'Gambar logo dimuat.');
        break;
      }
    }
  }
}

function loadLogoImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      currentLogoImage = img;
      const dropzone = document.getElementById('logoDropzone');
      const wrapper  = document.getElementById('logoPreviewWrapper');
      const display  = document.getElementById('logoDisplayImg');

      if (dropzone) dropzone.classList.add('hidden');
      if (wrapper)  wrapper.classList.remove('hidden');
      if (display)  display.src = evt.target.result;
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function resetLogoImage() {
  currentLogoImage = null;
  const input    = document.getElementById('logoFileInput');
  const dropzone = document.getElementById('logoDropzone');
  const wrapper  = document.getElementById('logoPreviewWrapper');
  if (input)    input.value = '';
  if (dropzone) dropzone.classList.remove('hidden');
  if (wrapper)  wrapper.classList.add('hidden');
}

let currentLogoIndustryMode = 'select';

function setLogoIndustryMode(mode) {
  currentLogoIndustryMode = mode;
  const selectWrapper = document.getElementById('logoIndustrySelectWrapper');
  const textWrapper = document.getElementById('logoIndustryTextWrapper');
  const btnSelect = document.getElementById('lblModeSelect');
  const btnText = document.getElementById('lblModeText');

  if (mode === 'text') {
    if (selectWrapper) selectWrapper.classList.add('hidden');
    if (textWrapper) textWrapper.classList.remove('hidden');
    if (btnText) btnText.className = 'px-3 py-1.5 rounded-xl border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-normal text-xs flex items-center justify-center gap-1.5 transition-all';
    if (btnSelect) btnSelect.className = 'px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal text-xs flex items-center justify-center gap-1.5 transition-all';
  } else {
    if (selectWrapper) selectWrapper.classList.remove('hidden');
    if (textWrapper) textWrapper.classList.add('hidden');
    if (btnSelect) btnSelect.className = 'px-3 py-1.5 rounded-xl border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-normal text-xs flex items-center justify-center gap-1.5 transition-all';
    if (btnText) btnText.className = 'px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal text-xs flex items-center justify-center gap-1.5 transition-all';
  }
}

/**
 * Main AI Generator function for Logo Philosophy
 */
async function generateLogoPhilosophy() {
  const brandName = 'Brand Anda';
  let industry = 'general';
  
  if (currentLogoIndustryMode === 'text') {
    industry = (document.getElementById('logoIndustryCustomText')?.value || '').trim() || 'Usaha / Bisnis Anda';
  } else {
    const selectEl = document.getElementById('logoIndustry');
    industry = selectEl ? (selectEl.options[selectEl.selectedIndex]?.text || selectEl.value) : 'general';
  }

  const userModelChoice = document.getElementById('logoGeminiModel')?.value || 'auto';
  const tone      = 'professional';
  const length    = document.getElementById('logoLength')?.value || 'medium';
  const catatan   = (document.getElementById('logoCatatan')?.value || '').trim();

  const btn   = document.getElementById('btnGeneratePhilosophy');
  const label = document.getElementById('labelGeneratePhilosophy');
  const box   = document.getElementById('philosophyResultBox');

  if (btn)   btn.disabled = true;
  if (label) label.textContent = '🧠 Menganalisis Gambar & Merangkai Filosofi...';

  if (box) {
    box.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center text-indigo-600 dark:text-indigo-400 py-12 space-y-3">
        <svg class="animate-spin w-9 h-9 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <p class="font-bold text-sm text-zinc-800 dark:text-zinc-100">AI Sedang Menganalisis Visual Logo...</p>
        <p class="text-xs text-zinc-400 max-w-xs">Mengidentifikasi objek gambar, psikologi warna &amp; karakter bidang usaha ${industry}</p>
      </div>
    `;
  }

  try {
    const apiKey = typeof getGeminiApiKey === 'function' ? getGeminiApiKey() : '';

    if (apiKey && currentLogoImage) {
      // Use Gemini Vision AI with strict visual detection prompt
      const textResult = await _generateWithGeminiVisionAPI(apiKey, brandName, industry, tone, length, userModelChoice, catatan);
      _renderPhilosophyResult(textResult, brandName);
    } else {
      // Use Smart Color & Visual Detection Local AI Engine
      await new Promise(res => setTimeout(res, 600));
      const localResult = _generateLocalSmartPhilosophy(brandName, industry, tone, length, currentLogoImage);
      _renderPhilosophyResult(localResult, brandName);
    }

    if (typeof Toast !== 'undefined') Toast.success('Filosofi Berhasil Dibuat! ✨', 'Narasi visual logo siap digunakan.');
  } catch (err) {
    console.error('Philosophy generation error:', err);
    // Fallback to local visual generator
    const fallbackResult = _generateLocalSmartPhilosophy(brandName, industry, tone, length, currentLogoImage);
    _renderPhilosophyResult(fallbackResult, brandName);
  } finally {
    if (btn)   btn.disabled = false;
    if (label) label.textContent = '✨ Generate Filosofi Logo';
  }
}

function filterLogoIndustries(query) {
  const select = document.getElementById('logoIndustry');
  if (!select) return;
  const q = (query || '').toLowerCase().trim();
  const options = select.options;
  let firstVisible = null;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const text = opt.text.toLowerCase();
    const val = opt.value.toLowerCase();
    if (!q || text.includes(q) || val.includes(q)) {
      opt.hidden = false;
      opt.style.display = '';
      if (!firstVisible) firstVisible = opt;
    } else {
      opt.hidden = true;
      opt.style.display = 'none';
    }
  }

  if (firstVisible && q) {
    select.value = firstVisible.value;
  }
}

async function _generateWithGeminiVisionAPI(apiKey, brandName, industry, tone, length, userModelChoice, catatan) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx    = tempCanvas.getContext('2d');
  tempCanvas.width  = Math.min(600, currentLogoImage.width);
  tempCanvas.height = Math.min(600, currentLogoImage.height);
  tempCtx.drawImage(currentLogoImage, 0, 0, tempCanvas.width, tempCanvas.height);
  const base64Data  = tempCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

  const lengthMap = {
    short:    'Mode Singkat: tulis sekitar 100 kata. Satu paragraf padat.',
    medium:   'Mode Sedang: tulis sekitar 200 kata. Dua hingga tiga paragraf mengalir.',
    long:     'Mode Panjang: tulis sekitar 350 kata. Analisis mendalam dengan beberapa paragraf.',
    verylong: 'Mode Sangat Detail: tulis 600 kata atau lebih. Uraikan setiap elemen secara komprehensif.'
  };
  const lengthInstruction = lengthMap[length] || lengthMap.medium;
  const catatanSection = catatan ? `\nCatatan dari klien: "${catatan}"` : '';

  const promptText = `
Kamu adalah seorang Senior Brand Strategist, Logo Analyst, dan Creative Director dengan pengalaman lebih dari 20 tahun di bidang branding, identitas visual, psikologi warna, semiotika desain, dan strategi merek.

Tugasmu bukan hanya mendeskripsikan logo, tetapi menganalisis makna visual secara mendalam layaknya seorang konsultan branding profesional.

INPUT:
- Bidang Usaha: ${industry}
- Nama Brand: ${brandName || 'tidak disebutkan'}${catatanSection}

ANALISIS:
Amati logo yang diberikan dan analisis seluruh aspek berikut dengan mendalam:
1. Bentuk utama logo: jelaskan bentuk, simbol, ikon, atau elemen visual yang terlihat dan makna psikologisnya.
2. Warna: identifikasi semua warna yang ada, jelaskan psikologi warna, emosi, kesan, dan relevansinya dengan bidang usaha.
3. Tipografi: jika ada teks/tulisan, jelaskan karakter font dan kesan yang dibangunnya (modern, elegan, friendly, dll).
4. Komposisi: jelaskan keseimbangan visual, fokus utama, dan proporsi elemen.
5. Kesesuaian dengan bidang usaha: hubungkan elemen visual dengan nilai-nilai yang relevan dengan ${industry}.
6. Nilai brand: hubungkan dengan kepercayaan, inovasi, profesionalisme, kualitas, dan pelayanan.
7. Makna keseluruhan: buat kesimpulan yang kuat dan menginspirasi.

GAYA PENULISAN:
- Natural, elegan, dan profesional.
- Tulis dalam paragraf mengalir, JANGAN menggunakan poin atau bullet.
- Tidak terdengar seperti robot atau template.
- Jangan menggunakan kata: "Mungkin", "Kemungkinan", "Sepertinya", "Tampaknya", "Asumsi".
- Fokus pada analisis desain, jangan mengarang sejarah atau visi perusahaan.
- DILARANG MENGGUNAKAN EMOJI.

PANJANG OUTPUT: ${lengthInstruction}

FORMAT OUTPUT:

### Filosofi & Identitas Visual
(Analisis bentuk, simbol, elemen visual, warna, tipografi, dan komposisi dalam paragraf mengalir)

### Makna & Relevansi Brand
(Hubungkan elemen visual dengan bidang usaha dan nilai brand dalam paragraf mengalir)

### Esensi & Karakter Merek
(Kesimpulan kuat tentang karakter, positioning, dan kesan yang dibangun logo ini)
`;

  let modelsToTry = [
    'gemini-3.0-flash',
    'gemini-3.0-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  if (userModelChoice && userModelChoice !== 'auto') {
    modelsToTry = [userModelChoice, ...modelsToTry.filter(m => m !== userModelChoice)];
  }
  let lastErr = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('API Response Error');
}

/**
 * Smart Color & Industry Pattern Local Philosophy Generator (Offline / Smart Fallback)
 */
function _generateLocalSmartPhilosophy(brandName, industryKey, toneKey, lengthKey, imgObj) {
  const details = _extractLogoImageDetails(imgObj, industryKey);

  const industryDict = {
    fnb: { name: 'Kuliner & Minuman (F&B)', vibe: 'kehangatan, cita rasa lezat, dan kebersamaan', vision: 'menyajikan pengalaman rasa terbaik yang mempererat silaturahmi sesama' },
    snack: { name: 'Makanan Ringan & Bakery', vibe: 'kelezatan camilan berkualitas, keceriaan santai, dan kehangatan', vision: 'menghadirkan kelezatan camilan di setiap momen kebahagiaan' },
    coffee: { name: 'Kedai Kopi & Coffee Shop', vibe: 'aroma khas seduhan kopi, ketenangan ruang kumpul, dan inspirasi', vision: 'menjadi tempat singgah favorit yang menyajikan kopi nikmat bertaraf tinggi' },
    tech: { name: 'Teknologi & Digital Startup', vibe: 'inovasi masa depan, efisiensi cerdas, dan konektivitas modern', vision: 'menciptakan solusi pintar berteknologi tinggi yang mempermudah kehidupan' },
    software: { name: 'Software & Aplikasi', vibe: 'presisi kode, fungsionalitas cerdas, dan keandalan sistem', vision: 'menghadirkan perangkat lunak yang andal, aman, dan siap tumbuh' },
    fashion: { name: 'Fashion & Apparel', vibe: 'gaya hidup berkelas, ekspresi diri, dan estetika memikat', vision: 'menghadirkan identitas gaya yang memancarkan rasa percaya diri' },
    hijab: { name: 'Hijab & Busana Muslim', vibe: 'keanggunan syari, kesopanan, dan kelembutan bahan', vision: 'menghadirkan busana muslimah yang anggun, nyaman, dan bernilai luhur' },
    beauty: { name: 'Kecantikan & Skincare', vibe: 'kemurnian, kesegaran alami, dan keindahan terpancar', vision: 'merawat keindahan alami dan memberikan kenyamanan sejati' },
    salon: { name: 'Barbershop & Spa', vibe: 'kesegaran penampilan, relaksasi raga, dan perawatan berkelas', vision: 'memberikan transformasi gaya dan kesegaran raga secara maksimal' },
    property: { name: 'Properti & Kontraktor', vibe: 'kekuatan struktur, kenyamanan hunian, dan jaminan investasi', vision: 'membangun ruang hunian yang kokoh, nyaman, dan berwibawa' },
    architecture: { name: 'Arsitektur & Desain Interior', vibe: 'keharmonisan bentuk, tata ruang presisi, dan estetika', vision: 'merancang karya arsitektural yang fungsional dan bernilai seni tinggi' },
    automotive: { name: 'Otomotif & Bengkel', vibe: 'kecepatan performa, keandalan mesin, dan ketegasan karakter', vision: 'menjadi jaminan keamanan dan kenyamanan berkendara di setiap perjalanan' },
    creative: { name: 'Studio Kreatif & Desain', vibe: 'imajinasi tanpa batas, visualisasi memukau, dan keunikan seni', vision: 'mengubah ide abstrak menjadi karya visual yang menginspirasi' },
    media: { name: 'Media & Production House', vibe: 'narasi mendalam, sinematografi memikat, dan jangkauan pesan', vision: 'menyajikan konten audio-visual berkualitas tinggi yang mengedukasi' },
    finance: { name: 'Keuangan & Fintech', vibe: 'kepercayaan mutlak, transparansi transaksi, dan pertumbuhan aset', vision: 'menjadi mitra terpercaya dalam mengelola potensi keuangan' },
    consultant: { name: 'Konsultan Bisnis & Hukum', vibe: 'kebijaksanaan strategi, kepastian hukum, dan pemikiran solutif', vision: 'memberikan panduan navigasi bisnis yang tepat sasaran' },
    health: { name: 'Kesehatan & Klinik', vibe: 'kepedulian tulus, pemulihan vitalitas, dan higienitas medis', vision: 'memberikan layanan kesehatan terbaik dengan dedikasi penuh' },
    sports: { name: 'Olahraga & E-Sports', vibe: 'daya tahan stamina, kompetisi sportif, dan pencapaian juara', vision: 'membangun semangat pantang menyerah dalam setiap tantangan' },
    agri: { name: 'Pertanian & Agribisnis', vibe: 'kesuburan bumi, hasil alam murni, dan keberlanjutan pangan', vision: 'mengembangkan potensi hasil bumi yang menyejahterakan' },
    logistics: { name: 'Logistik & Ekspedisi', vibe: 'ketepatan waktu pengiriman, jangkauan luas, dan ketertiban', vision: 'menghubungkan setiap sudut tujuan secara aman meyakinkan' },
    education: { name: 'Pendidikan & Kursus', vibe: 'penerangan wawasan, keahlian masa depan, dan kecerdasan', vision: 'membuka gerbang pengetahuan dan mencetak generasi unggul' },
    event: { name: 'Event Organizer & Wedding', vibe: 'momen berkesan, koordinasi sempurna, dan kemeriahan suasana', vision: 'merancang perayaan impian yang tak terlupakan dan penuh kenangan' },
    community: { name: 'Komunitas & Yayasan', vibe: 'kebersamaan solidaritas, kepedulian sosial, dan dampak nyata', vision: 'menjadi wadah kolaborasi positif yang membawa perubahan' },
    retail: { name: 'UMKM & Toko Online', vibe: 'kemudahan belanja, kualitas terjamin, dan pelayanan ramah', vision: 'menyediakan produk-produk pilihan yang memenuhi kebutuhan konsumen' },
    general: { name: 'Bisnis & Jasa Profesional', vibe: 'integritas tinggi, kualitas utama, dan komitmen pelayanan', vision: 'menghadirkan standar keunggulan yang konsisten dan berkelanjutan' }
  };

  const ind = industryDict[industryKey] || { name: industryKey || 'Bisnis & Jasa Profesional', vibe: 'integritas tinggi dan kualitas utama', vision: 'menghadirkan pelayanan terbaik' };

  const mainParagraph = `Logo ini menggambarkan bentuk ${details.shapeDesc} dengan perpaduan warna ${details.colorDesc} yang memiliki arti ${details.meaningDesc}. Kehadiran elemen visual ini sangat selaras dengan usaha ${ind.name}, memberikan kesan ${ind.vibe} yang siap membangun rasa percaya bagi siapapun yang melihatnya.`;

  const visionParagraph = `Perpaduan simbol dan nuansa warna tersebut menegaskan identitas usaha sebagai brand yang profesional, berkarakter, serta berdedikasi penuh untuk ${ind.vision}.`;

  return `### Filosofi & Makna Logo
${mainParagraph}

---

### Esensi & Visi Brand
${visionParagraph}`;
}

function _extractLogoImageDetails(imgObj, industryKey) {
  const defaultObjectHints = {
    fnb: 'lambang kehangatan sajian dan resep warisan',
    coffee: 'lambang cangkir seduhan kopi hangat',
    snack: 'lambang camilan lezat dan kebahagiaan rasa',
    tech: 'lambang sirkuit digital dan konektivitas cerdas',
    software: 'lambang inisial presisi dan modul terintegrasi',
    fashion: 'lambang lekukan gaya estetis dan keanggunan',
    hijab: 'lambang lekukan pita keanggunan syari',
    beauty: 'lambang helai daun alami dan kemurnian',
    salon: 'lambang mahkota gaya dan kesegaran raga',
    property: 'lambang hunian kokoh dan pilar investasi',
    architecture: 'lambang tata ruang presisi dan keharmonisan bentuk',
    automotive: 'lambang garis dinamis dan kecepatan performa',
    health: 'lambang perisai kepedulian tulus dan kesehatan',
    sports: 'lambang mahkota juara dan daya tahan stamina',
    agri: 'lambang tunas tanaman murni dan kesuburan bumi',
    logistics: 'lambang panah pengiriman dan jangkauan luas',
    education: 'lambang buku penerangan wawasan dan simbol ilmu',
    general: 'lambang ikonik berimbang yang berwibawa'
  };

  const defaultHint = defaultObjectHints[industryKey] || 'lambang simbol visual yang berimbang';

  if (!imgObj) {
    return {
      shapeDesc: defaultHint,
      colorDesc: 'warna biru utama dan aksen putih bersih',
      meaningDesc: 'keseimbangan, integritas, dan profesionalitas brand',
    };
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = imgObj.width || 100;
    const h = imgObj.height || 100;

    canvas.width = 60;
    canvas.height = 60;
    ctx.drawImage(imgObj, 0, 0, 60, 60);

    const imgData = ctx.getImageData(0, 0, 60, 60).data;

    let totalPixels = 0;
    let nonTransparent = 0;
    let colorCounts = { dark: 0, white: 0, red: 0, green: 0, blue: 0, gold: 0, orange: 0, purple: 0 };

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      totalPixels++;
      if (a > 30) {
        nonTransparent++;

        if (r < 50 && g < 50 && b < 50) colorCounts.dark++;
        else if (r > 200 && g > 200 && b > 200) colorCounts.white++;
        else if (r > g + 35 && r > b + 35) colorCounts.red++;
        else if (g > r + 25 && g > b + 25) colorCounts.green++;
        else if (b > r + 25 && b > g + 25) colorCounts.blue++;
        else if (r > 150 && g > 120 && b < 100) colorCounts.gold++;
        else if (r > 150 && g > 70 && b < 70) colorCounts.orange++;
        else if (r > 110 && b > 110 && g < 90) colorCounts.purple++;
      }
    }

    const fillRatio = nonTransparent / totalPixels;
    const ratio = w / h;

    let shapeDesc = '';
    let meaningDesc = '';

    if (ratio > 1.4) {
      shapeDesc = 'lambang monogram ikonik yang elegan';
      meaningDesc = 'keluwesan, kemudahan mengenali identitas brand, serta konektivitas yang luas';
    } else if (ratio < 0.7) {
      shapeDesc = 'lambang simbolik vertikal yang berwibawa';
      meaningDesc = 'ketegasan, pondasi usaha yang kokoh, dan nilai wibawa tinggi';
    } else if (fillRatio < 0.25) {
      shapeDesc = 'lukisan garis minimalis yang modern dan bersih';
      meaningDesc = 'kejernihan ide, keanggunan, dan efisiensi masa depan';
    } else {
      shapeDesc = defaultHint;
      meaningDesc = 'keharmonisan, profesionalisme, dan komitmen keunggulan yang konsisten';
    }

    const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
    const colorNames = {
      blue: 'biru yang menenangkan',
      red: 'merah bergelora dan berani',
      green: 'hijau alami yang segar',
      gold: 'kuning keemasan yang hangat dan bernilai',
      purple: 'ungu yang elegan dan mewah',
      dark: 'hitam solid yang berwibawa dan kuat',
      orange: 'oranye yang penuh energi dan optimisme',
      white: 'putih murni'
    };

    const c1 = colorNames[sortedColors[0]] || 'biru yang menenangkan';
    const c2 = colorNames[sortedColors[1]] || 'putih murni';

    const colorDesc = `${c1} dipadukan dengan aksen ${c2}`;

    return {
      shapeDesc,
      colorDesc,
      meaningDesc
    };
  } catch (e) {
    return {
      shapeDesc: defaultHint,
      colorDesc: 'warna hangat yang harmonis',
      meaningDesc: 'keharmonisan dan profesionalitas brand'
    };
  }
}

/**
 * Extract main color theme from image using canvas
 */
function _extractDominantColorCategory(imgObj) {
  if (!imgObj) return 'blue';
  try {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = 40;
    canvas.height = 40;
    ctx.drawImage(imgObj, 0, 0, 40, 40);
    const data   = ctx.getImageData(0, 0, 40, 40).data;

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3];
      if (alpha > 50) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }
    }
    if (count === 0) return 'blue';
    const r = rSum / count, g = gSum / count, b = bSum / count;

    if (r < 50 && g < 50 && b < 50) return 'dark';
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r > g + 40 && r > b + 40) return 'red';
    if (g > r + 30 && g > b + 30) return 'green';
    if (b > r + 30 && b > g + 30) return 'blue';
    if (r > 160 && g > 130 && b < 100) return 'gold';
    if (r > 160 && g > 70 && b < 70) return 'orange';
    if (r > 120 && b > 120 && g < 100) return 'purple';
    return 'blue';
  } catch (e) {
    return 'blue';
  }
}

function _renderPhilosophyResult(mdText, brandName) {
  generatedPhilosophyResult = mdText;
  const box = document.getElementById('philosophyResultBox');
  const copyBtn = document.getElementById('btnCopyPhilosophy');
  const dlBtn   = document.getElementById('btnDownloadPhilosophy');

  if (copyBtn) copyBtn.disabled = false;
  if (dlBtn)   dlBtn.disabled   = false;

  if (box) {
    // Simple markdown to HTML formatter with text-xl/text-2xl headers & text-base body (no bold font)
    let html = mdText
      .replace(/^### (.*$)/gim, '<h4 class="text-xl md:text-2xl font-normal text-indigo-600 dark:text-indigo-400 mt-4 mb-2 flex items-center gap-2">$1</h4>')
      .replace(/^---\s*$/gim, '<hr class="border-zinc-200 dark:border-zinc-800 my-3"/>')
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-normal text-zinc-900 dark:text-zinc-100">$1</span>')
      .replace(/\*(.*?)\*/g, '<em class="italic font-normal">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-zinc-700 dark:text-zinc-300 my-1 text-base font-normal">$1</li>')
      .replace(/\n\n/g, '</p><p class="my-2 leading-relaxed text-base font-normal text-zinc-700 dark:text-zinc-300">');

    box.innerHTML = `<div class="prose dark:prose-invert max-w-none text-base font-normal font-sans text-zinc-800 dark:text-zinc-100"><p class="my-2 leading-relaxed text-base font-normal">${html}</p></div>`;
  }
}

function copyPhilosophyText() {
  if (!generatedPhilosophyResult) return;
  const cleanText = generatedPhilosophyResult.replace(/### |---|\*\*/g, '');
  navigator.clipboard.writeText(cleanText).then(() => {
    if (typeof Toast !== 'undefined') Toast.success('Disalin!', 'Filosofi logo berhasil disalin ke clipboard.');
  }).catch(() => {
    if (typeof Toast !== 'undefined') Toast.error('Gagal', 'Tidak dapat menyalin teks.');
  });
}

function downloadPhilosophyDoc() {
  if (!generatedPhilosophyResult) return;
  const cleanText = generatedPhilosophyResult.replace(/### |---|\*\*/g, '');
  const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `filosofi-logo-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof Toast !== 'undefined') Toast.success('Diunduh!', 'File teks filosofi logo berhasil diunduh.');
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

function handlePbPasteEvent(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        loadPbImageFromFile(blob, pbActiveSlot);
        if (typeof Toast !== 'undefined') {
          Toast.success('Berhasil Paste!', `Gambar dimuat ke slot ${pbActiveSlot === 'mockup' ? 'Mockup' : 'Desain Utama'}.`);
        }
        break;
      }
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
  if (wmText) wmText.value = 'FPManager - Confidential';
  
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
    const wmText = document.getElementById('pbWmText').value || 'Watermark';
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





