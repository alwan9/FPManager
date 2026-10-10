document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth !== 'undefined' && typeof Auth.canAddProject === 'function' && !Auth.canAddProject()) {
    const mainArea = document.querySelector('main section') || document.querySelector('main');
    if (mainArea) {
      mainArea.innerHTML = `
        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center my-8 shadow-sm">
          <i class="fa-solid fa-lock text-4xl text-rose-500 mb-3"></i>
          <h3 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">Akses Ditolak</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Halaman Tambah Projek hanya dapat diakses oleh Super Admin dan Service.</p>
        </div>
      `;
    }
    return;
  }

  const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
  // Update status badge API
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  if (apiStatusBadge) {
    apiStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-800 shadow-sm shadow-emerald-500/50 animate-pulse"></span>';
    apiStatusBadge.className = 'absolute bottom-0 right-0 z-20 flex items-center justify-center pointer-events-none';
    apiStatusBadge.title = 'Live Google Sheets Connected';
  }

  // Localize Dropdowns
  if (isEn) {
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
      const statusMap = {
        'Menunggu': 'Waiting',
        'Sedang Dikerjakan': 'In Progress',
        'Revisi': 'Revision',
        'Selesai': 'Completed',
        'Belum Pembayaran': 'Unpaid',
        'Dibatalkan': 'Cancelled'
      };
      Array.from(statusSelect.options).forEach(opt => {
        if (statusMap[opt.value]) {
          opt.textContent = statusMap[opt.value];
        }
      });
    }

    const satuanSelect = document.getElementById('satuan');
    if (satuanSelect) {
      const satuanMap = {
        'pcs': 'pcs',
        'lembar': 'sheet',
        'meter': 'meter',
        'dus': 'box',
        'paket': 'package',
        'rim': 'ream',
        'buku': 'book'
      };
      Array.from(satuanSelect.options).forEach(opt => {
        if (satuanMap[opt.value]) {
          opt.textContent = satuanMap[opt.value];
        }
      });
    }
  }
  // Ambil element form
  const form = document.getElementById('proyekForm');
  const namaProyekInput = document.getElementById('namaProyek');
  const namaProyekPreview = document.getElementById('namaProyekPreview');
  const pelangganInput = document.getElementById('pelanggan');
  const waInput = document.getElementById('wa');
  const produkInput = document.getElementById('produk');
  const jumlahInput = document.getElementById('jumlah');
  const satuanInput = document.getElementById('satuan');
  const hargaSatuanInput = document.getElementById('hargaSatuan');
  const nominalInput = document.getElementById('nominal');
  const dpInput = document.getElementById('dp');
  const sisaInput = document.getElementById('sisa');
  const deadlineInput = document.getElementById('deadline');
  const todayBtn = document.getElementById('todayBtn');
  const tomorrowBtn = document.getElementById('tomorrowBtn');
  const threeDaysBtn = document.getElementById('threeDaysBtn');
  const sevenDaysBtn = document.getElementById('sevenDaysBtn');
  const fourteenDaysBtn = document.getElementById('fourteenDaysBtn');
  const thirtyDaysBtn = document.getElementById('thirtyDaysBtn');
  const statusInput = document.getElementById('status');
  const sumberInput = document.getElementById('sumber');
  const metodePembayaranInput = document.getElementById('metodePembayaran');
  const assignDesignerSelect = document.getElementById('assignDesigner');
  const catatanInput = document.getElementById('catatan');
  const gdriveLinkInput = document.getElementById('gdriveLink');
  const createDriveFolderCheckbox = document.getElementById('createDriveFolder');
  const manualGDriveContainer = document.getElementById('manualGDriveContainer');
  const deadlineWarning = document.getElementById('deadlineWarning');
  const submitBtn = document.getElementById('submitBtn');
  let currentPelunasan = 0;
  let cachedSelectedDesignerId = "";

  // Helper: Memuat daftar Designer secara dinamis dari database pengguna
  async function loadDesignersDropdown(selectedId = "") {
    if (!assignDesignerSelect) return;
    if (selectedId) cachedSelectedDesignerId = selectedId;
    try {
      let users = [];
      if (typeof API !== 'undefined' && typeof API.getUsers === 'function') {
        users = await API.getUsers();
      }
      const designers = (Array.isArray(users) ? users : []).filter(u => {
        const r = String(u.role || '').toLowerCase().trim();
        const uname = String(u.username || '').toLowerCase().trim();
        const uid = String(u.id || u.userId || '').toUpperCase().trim();
        return r === 'designer' || r === 'desainer' || uname === 'wansmin' || uid === 'USR-001';
      });

      const currentVal = cachedSelectedDesignerId || assignDesignerSelect.value;
      assignDesignerSelect.innerHTML = '<option value="">-- Belum di-assign --</option>';

      designers.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        const dName = d.name || d.nama || d.username || d.id;
        opt.textContent = dName;
        if (String(d.id) === String(currentVal) || String(d.username || '').toLowerCase() === String(currentVal).toLowerCase()) {
          opt.selected = true;
        }
        assignDesignerSelect.appendChild(opt);
      });

      if (currentVal) {
        assignDesignerSelect.value = currentVal;
      }
    } catch (err) {
      console.warn("Gagal memuat daftar Designer:", err);
    }
  }

  // Panggil pemuatan awal data Designer
  loadDesignersDropdown();

  // Toggle visibilitas input link manual berdasarkan status checkbox
  if (createDriveFolderCheckbox && manualGDriveContainer) {
    createDriveFolderCheckbox.addEventListener('change', () => {
      if (createDriveFolderCheckbox.checked) {
        manualGDriveContainer.classList.add('hidden');
      } else {
        manualGDriveContainer.classList.remove('hidden');
      }
    });
  }

  // Auto-format Nomor WA (08... -> 628...)
  if (waInput) {
    waInput.addEventListener('blur', () => {
      let val = waInput.value.trim().replace(/\D/g, '');
      if (val.startsWith('0')) {
        val = '62' + val.substring(1);
      }
      if (val) waInput.value = val;
    });
  }

  const ALL_PAYMENT_METHODS = [
    { val: 'QRIS', label: 'QRIS' },
    { val: 'Shopee', label: 'Shopee - @premium_dz (Toko Shopee)' },
    { val: 'BSI', label: 'BSI (Bank Syariah Indonesia)' },
    { val: 'Transfer Bank', label: 'Transfer Bank (BCA / Mandiri / BRI)' },
    { val: 'ShopeePay', label: 'ShopeePay' },
    { val: 'Saldo Shopee', label: 'Saldo Penjual Shopee' },
    { val: 'Fiverr', label: 'Fiverr (Direct / Balance)' },
    { val: 'PayPal', label: 'PayPal' },
    { val: 'Payoneer', label: 'Payoneer / Transfer' },
    { val: 'Cash', label: 'Tunai / Cash' }
  ];

  function ensureMetodePembayaranOptions(selectedVal) {
    if (!metodePembayaranInput) return;
    const current = String(selectedVal || (metodePembayaranInput ? metodePembayaranInput.value : '') || 'QRIS').trim();
    const exists = ALL_PAYMENT_METHODS.some(opt => opt.val.toLowerCase() === current.toLowerCase());
    
    const escapeFn = (typeof escapeHtml === 'function') ? escapeHtml : (str => String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
    
    let html = '';
    if (current && !exists) {
      html += `<option value="${escapeFn(current)}" selected>${escapeFn(current)}</option>`;
    }
    ALL_PAYMENT_METHODS.forEach(opt => {
      const isSelected = (opt.val.toLowerCase() === current.toLowerCase());
      html += `<option value="${opt.val}" ${isSelected ? 'selected' : ''}>${opt.label}</option>`;
    });
    metodePembayaranInput.innerHTML = html;
  }

  // Helper: Sinkronisasi Dinamis Opsi Metode Pembayaran & Input Kontak berdasarkan Sumber Projek
  function syncSumberUI(sumberVal, preferredMetode) {
    const s = String(sumberVal || (sumberInput ? sumberInput.value : 'WhatsApp') || 'WhatsApp').trim().toLowerCase();
    
    let targetMetode = preferredMetode;
    if (targetMetode === undefined || targetMetode === null || targetMetode === '') {
      if (s === 'shopee') targetMetode = 'Shopee';
      else if (s === 'fiverr') targetMetode = 'Fiverr';
      else targetMetode = 'QRIS';
    }

    ensureMetodePembayaranOptions(targetMetode);

    // Sinkronisasi label & validasi input kontak
    const waLabel = document.querySelector('label[for="wa"]');
    const waSub = document.querySelector('[data-i18n="add-label-wa-sub"]');
    if (waLabel) {
      if (s === 'shopee') {
        waLabel.innerHTML = `${isEn ? 'Shopee Contact / WA' : 'Kontak / WhatsApp Shopee'} <span class="text-xs font-normal text-zinc-400">(${isEn ? 'Optional' : 'Opsional'})</span>`;
        if (waInput) waInput.required = false;
        if (waSub) waSub.textContent = isEn ? 'Enter buyer WhatsApp or Shopee username.' : 'Nomor WhatsApp atau username akun Shopee pembeli.';
      } else if (s === 'fiverr') {
        waLabel.innerHTML = `${isEn ? 'Fiverr Username / Contact' : 'Username / Kontak Fiverr'} <span class="text-xs font-normal text-zinc-400">(${isEn ? 'Optional' : 'Opsional'})</span>`;
        if (waInput) waInput.required = false;
        if (waSub) waSub.textContent = isEn ? 'Enter client Fiverr username.' : 'Username akun Fiverr klien.';
      } else {
        waLabel.innerHTML = `${isEn ? 'WhatsApp Number*' : 'Nomor WhatsApp*'}`;
        if (waInput) waInput.required = true;
        if (waSub) waSub.textContent = isEn ? 'Use country code (62) without + or spaces.' : 'Gunakan kode negara (62) tanpa karakter + atau spasi.';
      }
    }
  }

  if (sumberInput) {
    sumberInput.addEventListener('change', () => {
      syncSumberUI(sumberInput.value);
    });
  }

  // Deteksi mode Edit vs Tambah
  const urlParams = new URLSearchParams(window.location.search);
  const proyekId = urlParams.get('id');
  let isEditMode = false;
  let currentGDriveLink = "";

  // Handle perubahan status ke Selesai -> Munculkan popup Metode Pelunasan
  let previousStatusValue = statusInput ? statusInput.value : 'Menunggu';
  if (statusInput) {
    statusInput.addEventListener('focus', () => {
      previousStatusValue = statusInput.value;
    });

    statusInput.addEventListener('change', async () => {
      const newStatus = statusInput.value;
      if (newStatus === 'Selesai') {
        const qty = parseFloat(jumlahInput ? jumlahInput.value : 1) || 1;
        const price = parseFloat(hargaSatuanInput ? hargaSatuanInput.value : 0) || 0;
        const nominal = parseFloat(nominalInput ? nominalInput.value : (qty * price)) || 0;
        const dp = parseFloat(dpInput ? dpInput.value : 0) || 0;
        const sisa = Math.max(0, nominal - dp);

        const result = await promptMetodePelunasanModal({
          proyekId: proyekId || '',
          namaPelanggan: pelangganInput ? pelangganInput.value : '',
          namaProyek: namaProyekInput ? namaProyekInput.value : '',
          nominal: nominal,
          dp: dp,
          sisa: sisa,
          currentMetode: metodePembayaranInput ? metodePembayaranInput.value : 'Shopee'
        });

        if (!result || !result.confirmed) {
          // Batal -> kembalikan ke status sebelumnya
          statusInput.value = previousStatusValue;
          return;
        }

        // Set metode pembayaran sesuai yang dipilih di popup
        if (metodePembayaranInput && result.metode) {
          metodePembayaranInput.value = result.metode;
        }

        if (result.catatan && catatanInput) {
          catatanInput.value = catatanInput.value
            ? `${catatanInput.value}\n[Pelunasan]: ${result.catatan}`
            : `[Pelunasan]: ${result.catatan}`;
        }

        previousStatusValue = 'Selesai';
      } else {
        previousStatusValue = newStatus;
      }
    });
  }

    // Handle Web Share Target API parameters
    const shareTitle = urlParams.get('share_title') || urlParams.get('title');
    const shareText = urlParams.get('share_text') || urlParams.get('text');
    const shareUrl = urlParams.get('share_url') || urlParams.get('url');

    if (shareTitle || shareText || shareUrl) {
      if (namaProyekInput && shareTitle) {
        namaProyekInput.value = shareTitle;
      } else if (namaProyekInput && shareText) {
        const firstLine = shareText.split('\n')[0];
        namaProyekInput.value = firstLine.substring(0, 60);
      }
      if (catatanInput) {
        let combinedNotes = '';
        if (shareText) combinedNotes += shareText;
        if (shareUrl) combinedNotes += (combinedNotes ? '\n\nLink: ' : '') + shareUrl;
        catatanInput.value = combinedNotes;
      }
      if (typeof Toast !== 'undefined') {
        Toast.success(
          isEn ? 'Shared Brief Received' : 'Brief Berhasil Diterima',
          isEn ? 'Project details were populated from shared content.' : 'Detail brief dari aplikasi lain telah diisikan ke formulir.'
        );
      }
    }

    const currUser = typeof Auth !== 'undefined' ? Auth.getUser() : { id: 'USR-001' };
    const displayUserIdEl = document.getElementById('displayUserId');
    if (displayUserIdEl) {
      displayUserIdEl.textContent = currUser ? currUser.id : 'USR-001';
    }

    if (proyekId) {
      isEditMode = true;
      const pageTitleEl = document.getElementById('pageTitle') || document.getElementById('pageTitleHeader');
      if (pageTitleEl) {
        pageTitleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600"></i> <span>${isEn ? 'Edit Project' : 'Edit Projek'} ${proyekId}</span>`;
      }
      const formTitleEl = document.getElementById('formTitle');
      if (formTitleEl) {
        formTitleEl.textContent = isEn ? `Modify Project Details (${proyekId})` : `Ubah Rincian Projek (${proyekId})`;
      }
      document.title = isEn ? `Edit Project ${proyekId} - FPManager` : `Edit Projek ${proyekId} - FPManager`;
      if (submitBtn) {
        submitBtn.textContent = isEn ? 'Save Changes' : 'Simpan Perubahan';
      }
      // Ubah sidebar active link ke Data Proyek daripada Tambah Proyek
      const sidebarAddLink = document.getElementById('sidebarAddLink');
      if (sidebarAddLink) {
        sidebarAddLink.className = 'sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100';
        sidebarAddLink.innerHTML = `<i class="fa-solid fa-circle-plus w-5"></i><span>${isEn ? 'Add Project' : 'Tambah Projek'}</span>`;
      }

      // Sembunyikan opsi buat folder otomatis saat mode Edit, tampilkan langsung input link Google Drive
      const createDriveFolderRow = document.getElementById('createDriveFolderRow');
      if (createDriveFolderRow) {
        createDriveFolderRow.classList.add('hidden');
      }
      if (createDriveFolderCheckbox) {
        createDriveFolderCheckbox.checked = false;
      }
      if (manualGDriveContainer) {
        manualGDriveContainer.classList.remove('hidden', 'pt-3', 'border-t', 'border-indigo-100/80');
      }

      // Populate data function
      const populateFormData = (proyek) => {
        if (!proyek) return;
        currentPelunasan = Number(proyek.pelunasan) || 0;
        if (displayUserIdEl) {
          displayUserIdEl.textContent = proyek.userId || (currUser ? currUser.id : 'USR-001');
        }
        if (namaProyekInput) namaProyekInput.value = proyek.namaProyek || proyek.iDProyek || '';
        if (pelangganInput) pelangganInput.value = proyek.namaPelanggan || proyek.pelanggan || '';

        const nomorWA = String(proyek.nomorWA || proyek.wa || '');
        if (waInput) {
          waInput.value = nomorWA.startsWith("62") ? nomorWA.slice(2) : nomorWA;
        }
        if (produkInput) produkInput.value = proyek.produk || '';
        if (jumlahInput) jumlahInput.value = proyek.jumlah || 1;
        if (satuanInput) satuanInput.value = proyek.satuan || 'pcs';

        const qty = parseFloat(proyek.jumlah) || 1;
        const nominalVal = parseFloat(proyek.nominalProyek !== undefined ? proyek.nominalProyek : (proyek.nominal || 0));
        const priceVal = parseFloat(proyek.hargaSatuan !== undefined ? proyek.hargaSatuan : (qty > 0 ? Math.round(nominalVal / qty) : 0));
        if (hargaSatuanInput) hargaSatuanInput.value = priceVal;

        const dpVal = parseFloat(proyek.dP !== undefined ? proyek.dP : (proyek.dp || 0));
        if (dpInput) dpInput.value = dpVal;

        if (deadlineInput && proyek.deadline) {
          let dl = (typeof window.parseSafeDateString === 'function')
            ? window.parseSafeDateString(proyek.deadline)
            : String(proyek.deadline).replace(/^'+/, '').split('T')[0];
          deadlineInput.value = dl;
          checkDeadline(dl);
        }
        if (statusInput && proyek.status) {
          statusInput.value = proyek.status;
          previousStatusValue = proyek.status;
        }
        if (sumberInput) {
          sumberInput.value = proyek.sumber || 'WhatsApp';
        }
        const assignedDesId = proyek.designerId || proyek.assignDesigner || proyek.idDesigner || proyek.assign || "";
        cachedSelectedDesignerId = assignedDesId;
        if (assignDesignerSelect) {
          assignDesignerSelect.value = assignedDesId;
        }
        loadDesignersDropdown(assignedDesId);
        const initialMetode = proyek.metodePembayaran || proyek.metode || '';
        syncSumberUI(proyek.sumber || 'WhatsApp', initialMetode);
        if (metodePembayaranInput && initialMetode) {
          metodePembayaranInput.value = initialMetode;
        }
        if (catatanInput) {
          catatanInput.value = proyek.catatan || "";
        }
        currentGDriveLink = proyek.gdriveLink || "";
        if (gdriveLinkInput) {
          gdriveLinkInput.value = proyek.gdriveLink || "";
        }
        if (createDriveFolderCheckbox) {
          createDriveFolderCheckbox.checked = false;
        }
        kalkulasiNominalDanSisa();
        if (typeof updateNamaProyekPreview === 'function') {
          updateNamaProyekPreview();
        }
      };

      // 1. Coba populate instan dari sessionStorage cache jika ada
      let populated = false;
      try {
        const cached = sessionStorage.getItem('cached_edit_proyek');
        if (cached) {
          const cachedObj = JSON.parse(cached);
          if (cachedObj) {
            const pid = String(cachedObj.iDProyek || '').trim();
            const rawTargetId = String(proyekId || '').trim();
            const decodedTargetId = decodeURIComponent(rawTargetId).trim();
            if (pid === rawTargetId || pid === decodedTargetId || pid.toLowerCase() === decodedTargetId.toLowerCase() || pid.startsWith(decodedTargetId + '-') || decodedTargetId.startsWith(pid + '-')) {
              populateFormData(cachedObj);
              populated = true;
            }
          }
        }
      } catch (err) {
        console.warn("Gagal membaca cached edit proyek:", err);
      }

      // 2. Fetch fresh data dari API
      try {
        const projects = await API.getProyek();
        const rawTargetId = String(proyekId || '').trim();
        const decodedTargetId = decodeURIComponent(rawTargetId).trim();

        const proyek = (projects || []).find(p => {
          if (!p) return false;
          const pid = String(p.iDProyek || '').trim();
          const pNama = String(p.namaProyek || '').trim();
          return (
            pid === rawTargetId ||
            pid === decodedTargetId ||
            pid.toLowerCase() === decodedTargetId.toLowerCase() ||
            pid.startsWith(decodedTargetId + '-') ||
            decodedTargetId.startsWith(pid + '-') ||
            (pNama && pNama.toLowerCase() === decodedTargetId.toLowerCase())
          );
        });

        if (proyek) {
          populateFormData(proyek);
        } else if (!populated) {
          if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error(isEn ? "Project Data" : "Data Projek", isEn ? "Project not found or unable to load." : "Data projek tidak ditemukan.");
          } else if (typeof showToast === 'function') {
            showToast({
              title: isEn ? "Project Data" : "Data Projek",
              message: isEn ? "Project not found." : "Projek tidak ditemukan.",
              type: "warning"
            });
          }
        }
      } catch (e) {
        console.error("Gagal mengambil data proyek untuk diedit:", e);
        if (!populated) {
          if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error("Error", isEn ? "Failed to retrieve project details for editing." : "Gagal mengambil data projek untuk diedit.");
          } else if (typeof showToast === 'function') {
            showToast({
              title: "Error",
              message: isEn ? "Failed to retrieve project details for editing." : "Gagal mengambil data projek untuk diedit.",
              type: "error"
            });
          }
        }
      }
    }
    // Hitung Nominal Proyek & Sisa secara Dinamis
    function kalkulasiNominalDanSisa() {
      const qty = parseFloat(jumlahInput.value) || 0;
      const price = parseFloat(hargaSatuanInput.value) || 0;
      const dp = parseFloat(dpInput.value) || 0;
      const nominal = Math.round(qty * price);
      const sisa = Math.max(0, Math.round(nominal - dp - (isEditMode ? (Number(currentPelunasan) || 0) : 0)));
      nominalInput.value = formatRupiah(nominal);
      sisaInput.value = formatRupiah(sisa);

      // Update live previews
      const hargaSatuanPreview = document.getElementById('hargaSatuanPreview');
      const dpPreview = document.getElementById('dpPreview');
      if (hargaSatuanPreview) {
        hargaSatuanPreview.textContent = hargaSatuanInput.value ? formatRupiah(price) : '';
      }
      if (dpPreview) {
        dpPreview.textContent = dpInput.value ? formatRupiah(dp) : '';
      }
    };
    function getLocalDateString(offsetDays = 0) {
      const d = new Date();
      d.setHours(12, 0, 0, 0); // Hindari pergantian tanggal akibat tengah malam atau offset zona waktu
      d.setDate(d.getDate() + offsetDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function parseLocalDate(dateStr) {
      if (!dateStr) return null;
      const cleanStr = (typeof window.parseSafeDateString === 'function')
        ? window.parseSafeDateString(dateStr)
        : String(dateStr).replace(/^'+/, '').split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length !== 3) return new Date(dateStr);
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
    }

    function formatDate(date) {
      if (!date) return '';
      if (typeof date === 'string') {
        const parsed = parseLocalDate(date);
        if (parsed && !isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, "0");
          const day = String(parsed.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
        return date;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function updateDeadlinePresetHighlight(selectedDateStr) {
      const cleanDateStr = String(selectedDateStr || '').split('T')[0];
      const presets = [
        { id: 'todayBtn', offset: 0 },
        { id: 'tomorrowBtn', offset: 1 },
        { id: 'threeDaysBtn', offset: 3 },
        { id: 'sevenDaysBtn', offset: 7 },
        { id: 'fourteenDaysBtn', offset: 14 },
        { id: 'thirtyDaysBtn', offset: 30 }
      ];

      presets.forEach(p => {
        const btn = document.getElementById(p.id);
        if (!btn) return;
        const targetStr = getLocalDateString(p.offset);
        const isActive = cleanDateStr && cleanDateStr === targetStr;

        if (isActive) {
          btn.className = 'deadline-preset-btn px-3 py-1 text-sm font-bold rounded-lg transition-all shadow-md bg-indigo-800 text-white ring-2 ring-indigo-300 dark:ring-indigo-400 active:scale-95';
        } else {
          btn.className = 'deadline-preset-btn px-3 py-1 text-sm font-medium rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95';
        }
      });
    }

    function setDeadlineWithOffset(offsetDays, e) {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      const targetStr = getLocalDateString(offsetDays);
      if (deadlineInput) {
        deadlineInput.value = targetStr;
        checkDeadline(targetStr);
        deadlineInput.dispatchEvent(new Event('input', { bubbles: true }));
        deadlineInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (!isEditMode) {
      const defaultDateStr = getLocalDateString(0);
      deadlineInput.value = defaultDateStr;
      deadlineInput.min = defaultDateStr;
      checkDeadline(defaultDateStr);

      // Pre-fill fields from URL query params (useful for Pricelist redirect)
      const produkParam = urlParams.get('produk');
      const hargaParam = urlParams.get('harga');
      if (produkParam) {
        produkInput.value = decodeURIComponent(produkParam);
      }
      if (hargaParam) {
        hargaSatuanInput.value = parseFloat(hargaParam) || 0;
      }
    }

    // Initial calculation and preview setup
    kalkulasiNominalDanSisa();

    jumlahInput.addEventListener('input', kalkulasiNominalDanSisa);
    hargaSatuanInput.addEventListener('input', kalkulasiNominalDanSisa);
    dpInput.addEventListener('input', kalkulasiNominalDanSisa);

    // Auto-deduction helper of category from project name
    // Auto-deduction helper of category and client name from project name
    function autoDeductCategoryAndClient(projectName) {
      if (!projectName || !projectName.trim()) {
        return {
          category: "",
          client: ""
        };
      }
      const name = projectName.toLowerCase();

      const categories = [
        { label: "Banner", keywords: ["banner", "spanduk", "baliho", "backdrop", "mmt", "x-banner", "y-banner", "roll-up banner"] },
        { label: "Poster/Brosur", keywords: ["poster", "flyer", "brosur", "leaflet", "pamflet", "brosur a5", "brosur a4"] },
        { label: "Kartu Nama", keywords: ["kartu nama", "id card", "kartunama", "nametag", "id-card"] },
        { label: "Stiker", keywords: ["stiker", "sticker", "label", "decal"] },
        { label: "Merchandise", keywords: ["kaos", "baju", "jersey", "tshirt", "t-shirt", "mug", "gantungan", "sablon", "pin", "topi", "totebag"] },
        { label: "Desain", keywords: ["desain", "logo", "branding", "desain logo", "sertifikat", "feeds", "feed"] }
      ];

      let matchedCategory = "Lainnya";
      let matchedKeyword = "";

      for (const cat of categories) {
        for (const kw of cat.keywords) {
          if (name.includes(kw)) {
            matchedCategory = cat.label;
            matchedKeyword = kw;
            break;
          }
        }
        if (matchedKeyword) break;
      }

      // Extract client name
      let clientName = projectName;
      if (matchedKeyword) {
        const regex = new RegExp(`\\b(${matchedKeyword}|cetak|buat|desain|print|custom)\\b`, 'gi');
        clientName = projectName.replace(regex, '').replace(/\s+/g, ' ').trim();
      } else {
        const regex = new RegExp(`\\b(cetak|buat|desain|print|custom)\\b`, 'gi');
        clientName = projectName.replace(regex, '').replace(/\s+/g, ' ').trim();
      }

      // Capitalize first letter of each word
      if (clientName) {
        clientName = clientName.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        clientName = "Klien";
      }

      return {
        category: matchedCategory,
        client: clientName
      };
    }

    let userManuallyEditedProduct = false;
    let userManuallyEditedClient = false;

    function updateNamaProyekPreview() {
      if (!namaProyekInput || !produkInput || !pelangganInput || !namaProyekPreview) return;

      let prefix = "PRJ-XXX";
      if (isEditMode) {
        const prefixMatch = proyekId.match(/^(PRJ-\d+)/i);
        prefix = prefixMatch ? prefixMatch[1] : proyekId;
      }

      const cleanProd = (produkInput.value || '').trim().toLowerCase().replace(/\s+/g, '');
      const cleanPel = (pelangganInput.value || '').trim().toLowerCase().replace(/\s+/g, '');
      const suffix = (cleanProd + cleanPel) || '';

      const generatedId = prefix + (suffix ? '-' + suffix : '');
      namaProyekPreview.textContent = `ID Proyek Preview: ${generatedId}`;
    }

    function handleNamaProyekInput() {
      if (!namaProyekInput) return;
      const rawVal = namaProyekInput.value;

      if (!isEditMode) {
        const deduction = autoDeductCategoryAndClient(rawVal);
        if (!userManuallyEditedProduct && produkInput) {
          produkInput.value = deduction.category;
        }
        if (!userManuallyEditedClient && pelangganInput) {
          pelangganInput.value = deduction.client;
        }
      }

      updateNamaProyekPreview();
    }

    if (namaProyekInput) {
      namaProyekInput.addEventListener('input', handleNamaProyekInput);
    }

    if (produkInput) {
      produkInput.addEventListener('input', () => {
        userManuallyEditedProduct = true;
        updateNamaProyekPreview();
      });
    }
    if (pelangganInput) {
      pelangganInput.addEventListener('input', () => {
        userManuallyEditedClient = true;
        updateNamaProyekPreview();
      });
    }

    // Call initial preview setup
    updateNamaProyekPreview();
    // Cek Tanggal Deadline
    if (deadlineInput) {
      deadlineInput.addEventListener('change', (e) => {
        checkDeadline(e.target.value);
      });
      deadlineInput.addEventListener('input', (e) => {
        checkDeadline(e.target.value);
      });
    }

    if (todayBtn) todayBtn.addEventListener("click", (e) => setDeadlineWithOffset(0, e));
    if (tomorrowBtn) tomorrowBtn.addEventListener("click", (e) => setDeadlineWithOffset(1, e));
    if (threeDaysBtn) threeDaysBtn.addEventListener("click", (e) => setDeadlineWithOffset(3, e));
    if (sevenDaysBtn) sevenDaysBtn.addEventListener("click", (e) => setDeadlineWithOffset(7, e));
    if (fourteenDaysBtn) fourteenDaysBtn.addEventListener("click", (e) => setDeadlineWithOffset(14, e));
    if (thirtyDaysBtn) thirtyDaysBtn.addEventListener("click", (e) => setDeadlineWithOffset(30, e));

    function checkDeadline(dateStr) {
      const cleanDateStr = (typeof window.parseSafeDateString === 'function')
        ? window.parseSafeDateString(dateStr)
        : String(dateStr || '').replace(/^'+/, '').split('T')[0];
      updateDeadlinePresetHighlight(cleanDateStr);
      const infoBox = document.getElementById('deadlineInfoBox');
      if (deadlineWarning) deadlineWarning.classList.add('hidden');

      if (!cleanDateStr) {
        if (infoBox) infoBox.innerHTML = '';
        return;
      }

      const deadlineDate = parseLocalDate(cleanDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!deadlineDate || isNaN(deadlineDate.getTime())) {
        if (infoBox) infoBox.innerHTML = '';
        return;
      }

      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

      if (infoBox) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDateName = deadlineDate.toLocaleDateString(isEn ? 'en-US' : 'id-ID', options);

        if (diffDays < 0) {
          infoBox.innerHTML = `<span class="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-circle-exclamation"></i> ${isEn ? `Deadline passed (${Math.abs(diffDays)} days ago) · ${formattedDateName}` : `Tanggal deadline sudah lewat (${Math.abs(diffDays)} hari lalu) · ${formattedDateName}`}</span>`;
        } else if (diffDays === 0) {
          infoBox.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> ${isEn ? `Deadline is TODAY · ${formattedDateName}` : `Deadline HARI INI · ${formattedDateName}`}</span>`;
        } else if (diffDays === 1) {
          infoBox.innerHTML = `<span class="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5"><i class="fa-solid fa-clock"></i> ${isEn ? `Deadline is TOMORROW · ${formattedDateName}` : `Deadline BESOK · ${formattedDateName}`}</span>`;
        } else if (diffDays <= 3) {
          infoBox.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-hourglass-half"></i> ${isEn ? `Deadline in ${diffDays} days · ${formattedDateName}` : `Deadline ${diffDays} hari lagi · ${formattedDateName}`}</span>`;
        } else {
          infoBox.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5"><i class="fa-solid fa-calendar-check"></i> ${isEn ? `Target: ${formattedDateName} (${diffDays} days remaining)` : `Target: ${formattedDateName} (sisa ${diffDays} hari)`}</span>`;
        }
      }
    }
    // Format ke Rupiah helper untuk input baca-saja
    function formatRupiah(number) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(number);
    }
    // Submit Handler
    let isSubmitting = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting || (submitBtn && submitBtn.disabled)) return;
      isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      }
      const origBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>${isEn ? 'Saving...' : 'Menyimpan...'}</span>`;
      }

      // Validasi & Format Kontak / WA berdasarkan Sumber Projek
      const currentSumber = sumberInput ? (sumberInput.value || 'WhatsApp') : 'WhatsApp';
      const isWhatsApp = currentSumber.toLowerCase() === 'whatsapp';
      let rawWA = waInput ? waInput.value.trim() : '';
      let cleanWA = '';
      if (rawWA) {
        const digitsOnly = rawWA.replace(/\D/g, '');
        if (digitsOnly.length > 0) {
          if (digitsOnly.startsWith('0')) {
            cleanWA = '62' + digitsOnly.slice(1);
          } else if (!digitsOnly.startsWith('62')) {
            cleanWA = '62' + digitsOnly;
          } else {
            cleanWA = digitsOnly;
          }
        } else {
          cleanWA = rawWA;
        }
      } else if (isWhatsApp) {
        cleanWA = '62';
      } else {
        cleanWA = '-';
      }
      const qty = parseFloat(jumlahInput.value) || 0;
      const price = parseFloat(hargaSatuanInput.value) || 0;
      const dp = parseFloat(dpInput.value) || 0;
      const nominal = Math.round(qty * price);
      const sisa = Math.max(0, Math.round(nominal - dp - (isEditMode ? (Number(currentPelunasan) || 0) : 0)));

      if (!isEditMode) {
        const inputDate = parseLocalDate(deadlineInput.value);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (inputDate && inputDate < todayDate) {
          if (typeof Toast !== 'undefined') {
            Toast.warning(isEn ? "Warning" : "Peringatan", isEn ? "Deadline cannot be in the past!" : "Tanggal deadline tidak boleh sebelum hari ini!");
          } else if (typeof showToast === 'function') {
            showToast({ title: isEn ? "Warning" : "Peringatan", message: isEn ? "Deadline cannot be in the past!" : "Tanggal deadline tidak boleh sebelum hari ini!", type: "warning" });
          }
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            submitBtn.innerHTML = origBtnText;
          }
          return;
        }
      }

      const payload = {
        namaProyek: namaProyekInput.value,
        pelanggan: pelangganInput.value,
        wa: cleanWA,
        produk: produkInput.value,
        jumlah: qty,
        satuan: satuanInput.value,
        hargaSatuan: price,
        nominal: nominal,
        dp: dp,
        pelunasan: isEditMode ? (Number(currentPelunasan) || 0) : 0,
        sisa: sisa,
        deadline: deadlineInput.value,
        status: statusInput.value,
        sumber: sumberInput ? (sumberInput.value || 'WhatsApp') : 'WhatsApp',
        metodePembayaran: metodePembayaranInput ? (metodePembayaranInput.value || 'QRIS') : 'QRIS',
        catatan: catatanInput.value,
        createDriveFolder: createDriveFolderCheckbox ? createDriveFolderCheckbox.checked : false,
        gdriveLink: gdriveLinkInput ? gdriveLinkInput.value.trim() : currentGDriveLink,
        designerId: assignDesignerSelect ? assignDesignerSelect.value : "",
        assignDesigner: assignDesignerSelect ? assignDesignerSelect.value : "",
        userId: displayUserIdEl ? displayUserIdEl.textContent : (currUser ? currUser.id : 'USR-001')
      };
      try {
        let result;
        if (isEditMode) {
          result = await API.updateProyek(proyekId, payload);

          // Auto-sync ke Mutasi Keuangan saat Update / Edit Projek
          if (result.success) {
            try {
              const keuanganList = await API.getKeuangan();
              const rawTargetId = String(proyekId || '').trim();
              const decodedTargetId = decodeURIComponent(rawTargetId).trim();
              const clientName = String(payload.pelanggan || '').trim().toLowerCase();

              // Cari transaksi keuangan yang terhubung dengan projek ini
              const linkedTx = (keuanganList || []).find(k => {
                if (!k) return false;
                const kIdPrj = String(k.idProyek || '').trim();
                const ket = String(k.keterangan || '').trim();
                const ketLower = ket.toLowerCase();
                return (
                  (kIdPrj && (kIdPrj === rawTargetId || kIdPrj === decodedTargetId)) ||
                  ket.includes(rawTargetId) ||
                  ket.includes(decodedTargetId) ||
                  (clientName && ketLower.includes(clientName) && (ketLower.includes('dp') || ketLower.includes('pelunasan') || ketLower.includes('pembayaran') || ketLower.includes('tagihan')))
                );
              });

              const isLunas = sisa <= 0 && nominal > 0;
              const statusBayar = isLunas ? 'Lunas' : (dp > 0 ? 'DP' : 'Belum');
              const realCash = isLunas ? (currentPelunasan > 0 && dp < nominal ? currentPelunasan : nominal) : dp;
              const updatedDesc = isLunas
                ? `Pembayaran Lunas - ${payload.pelanggan} (${proyekId})`
                : (statusBayar === 'DP'
                  ? `Pembayaran DP - ${payload.pelanggan} (${proyekId})`
                  : `Tagihan Projek - ${payload.pelanggan} (${proyekId})`);

              if (linkedTx) {
                await API.updateKeuangan(linkedTx.id, {
                  nominal: realCash,
                  dp: dp,
                  pelunasan: Number(currentPelunasan) || 0,
                  sisa: sisa,
                  totalProyek: nominal,
                  statusPembayaran: statusBayar,
                  metodePembayaran: payload.metodePembayaran,
                  keterangan: updatedDesc,
                  jenis: 'Pemasukan'
                });
              } else {
                const newTx = {
                  tanggal: new Date().toISOString().split('T')[0],
                  jenis: 'Pemasukan',
                  keterangan: updatedDesc,
                  nominal: realCash,
                  dp: dp,
                  pelunasan: Number(currentPelunasan) || 0,
                  sisa: sisa,
                  totalProyek: nominal,
                  statusPembayaran: statusBayar,
                  metodePembayaran: payload.metodePembayaran,
                  idProyek: proyekId
                };
                await API.addKeuangan(newTx);
              }
            } catch (syncErr) {
              console.warn("Gagal menyinkronkan data keuangan:", syncErr);
            }
          }
        } else {
          result = await API.addProyek(payload);
        }
        if (result.success) {

          showToast({
            title: isEn ? "Success" : "Berhasil",
            message: isEditMode
              ? (isEn ? "Project updated successfully." : "Projek berhasil diperbarui.")
              : (isEn ? "New project added successfully." : "Projek baru berhasil ditambahkan."),
            type: "success"
          });

          setTimeout(() => {
            window.location.href = "proyek.html";
          }, 1500);

        } else {

          showToast({
            title: isEn ? "Failed" : "Gagal",
            message: result.message,
            type: "error"
          });
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            submitBtn.textContent = isEditMode
              ? (isEn ? 'Save Changes' : 'Simpan Perubahan')
              : (isEn ? 'Save Project' : 'Simpan Projek');
          }

        }
      } catch (err) {

        console.error(err);

        showToast({
          title: "Error",
          message: isEn ? "An error occurred while saving project data." : "Terjadi kesalahan saat menyimpan data.",
          type: "error"
        });
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
          submitBtn.textContent = isEditMode
            ? (isEn ? 'Save Changes' : 'Simpan Perubahan')
            : (isEn ? 'Save Project' : 'Simpan Projek');
        }

      }
    });

    // Inisialisasi awal opsi sumber untuk mode tambah baru
    if (!isEditMode && sumberInput) {
      syncSumberUI(sumberInput.value || 'WhatsApp');
    }
  });
