let toolsData = [];
let shortcutsData = [];

document.addEventListener('DOMContentLoaded', () => {

  // Update badge api status
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    if (CONFIG.MOCK_MODE) {
      apiStatusBadge.textContent = 'Mock Mode (Offline)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    } else {
      apiStatusBadge.textContent = 'Live API (Google Sheets)';
      apiStatusBadge.className = 'hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  }

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
  showToolsSkeletons();
  try {
    const [tools, shortcuts] = await Promise.all([
      API.getTools(),
      API.getShortcuts()
    ]);

    toolsData = tools || [];
    shortcutsData = shortcuts || [];

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
        <h4 class="font-bold text-zinc-800 dark:text-zinc-100 text-lg mb-1 truncate">${tool.title}</h4>
        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[5px] md:text-sm whitespace-pre-wrap font-mono mt-2">${tool.prompt}</div>
      </div>
      <div class="flex flex-wrap items-center gap-2 w-full md:w-auto mt-4 md:mt-0 justify-end shrink-0">
        <button onclick="copyPrompt('${tool.id}', 'id')" class="flex-1 md:flex-none px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1" title="Salin Prompt (ID)">
          <i class="fa-regular fa-copy"></i>
          <span>ID</span>
        </button>
        <button onclick="copyPrompt('${tool.id}', 'en')" class="flex-1 md:flex-none px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1" title="Salin Prompt (EN)">
          <i class="fa-regular fa-copy"></i>
          <span>EN</span>
        </button>
        <button onclick="editTool('${tool.id}')" class="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 font-semibold rounded-xl transition-colors flex items-center justify-center">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button onclick="deleteTool('${tool.id}')" class="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 font-semibold rounded-xl transition-colors flex items-center justify-center">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    container.appendChild(el);
  });
}

async function saveTool() {
  const btnSubmit = document.querySelector('#toolForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const idInput = document.getElementById('toolId').value;
  const title = document.getElementById('toolTitle').value;
  const prompt = document.getElementById('toolPrompt').value;
  const promptEn = document.getElementById('toolPromptEn') ? document.getElementById('toolPromptEn').value : '';

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

function openAddToolModal() {
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
    el.className = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 sm:p-4 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-500 transition-all flex flex-col items-center relative group w-full cursor-pointer';

    el.innerHTML = `
      <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center w-full text-center group-hover:text-emerald-600 transition-colors">
        <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-xl md:mb-2 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors overflow-hidden">
          <img src="${iconUrl}" alt="${shortcut.title}" class="w-full h-full object-cover">
        </div>
        <span class="font-bold text-zinc-800 dark:text-zinc-200 text-sm truncate w-full px-1 group-hover:text-emerald-600 hidden md:block">${shortcut.title}</span>
      </a>
      <div class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex justify-center items-center gap-1 sm:gap-2 pointer-events-none">
        <button onclick="editShortcut('${shortcut.id}')" class="w-8 h-8 pointer-events-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
          <i class="fa-solid fa-pen text-xs"></i>
        </button>
        <button onclick="deleteShortcut('${shortcut.id}')" class="w-8 h-8 pointer-events-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
          <i class="fa-solid fa-trash-can text-xs"></i>
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
}

async function saveShortcut() {
  const btnSubmit = document.querySelector('#shortcutForm button[type="submit"]');
  if (btnSubmit) {
    if (btnSubmit.disabled) return;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const idInput = document.getElementById('shortcutId').value;
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
