/**
 * Freelance Project Manager (FPManager)
 * Modul: History Invoice (Arsip Riwayat Invoice)
 */

const HistoryInvoice = {
  invoices: [],
  table: null,
  pendingDeleteId: null,

  async init() {
    // 1. Inisialisasi User Profile & Sidebar Info
    if (typeof Auth !== 'undefined') {
      const user = Auth.getUser();
      if (user) {
        const avatarEl = document.getElementById('userAvatarText');
        const nameEl = document.getElementById('userNameText');
        const rawAvatar = user.avatar || user.url_profile || user.urlprofile || user.foto || user.photo || user.avatar_url || user.avatarUrl || user.urlProfile || user.Url_profile || '';
        const avatarUrl = (typeof Auth.formatAvatarUrl === 'function') ? Auth.formatAvatarUrl(rawAvatar) : (rawAvatar || '');
        const initial = (user.name || user.username || 'A').charAt(0).toUpperCase();
        if (avatarEl) {
          avatarEl.classList.add('overflow-hidden');
          if (avatarUrl) {
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${initial}" class="h-full w-full object-cover rounded-xl" onerror="this.outerHTML='${initial}'">`;
          } else {
            avatarEl.textContent = initial;
          }
        }
        if (nameEl) nameEl.textContent = user.name || user.username || 'User';
      }
    }

    // 2. Setup Profile Dropdown & Search Handlers
    this.setupUIHandlers();

    // 3. Load Data Invoices
    await this.loadData();
  },

  setupUIHandlers() {
    const profileBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', () => {
        if (!profileDropdown.classList.contains('hidden')) {
          profileDropdown.classList.add('hidden');
        }
      });
    }

    const searchInput = document.getElementById('customSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keyup', () => {
        if (this.table) {
          this.table.search(searchInput.value).draw();
        }
      });
    }
  },

  formatRupiah(val) {
    if (val === null || val === undefined || val === '') return 'Rp. 0';
    const num = Number(val) || 0;
    return 'Rp. ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  async loadData(forceRefresh = false) {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    try {
      this.invoices = await API.getInvoices(forceRefresh);
      this.updateStats();
      this.renderTable();
    } catch (err) {
      console.error("Gagal memuat history invoice:", err);
      if (typeof Toast !== 'undefined') {
        Toast.error("Gagal Memuat", "Terjadi kesalahan saat memuat arsip invoice.");
      }
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
  },

  updateStats() {
    const items = this.invoices || [];
    let totalNominal = 0;
    let totalSisa = 0;
    let paidCount = 0;

    items.forEach(inv => {
      const tot = Number(inv.total || 0);
      const sisa = Number(inv.sisa !== undefined ? inv.sisa : (tot - (Number(inv.dp || 0) + Number(inv.pelunasan || 0))));
      totalNominal += tot;
      totalSisa += sisa;

      const st = String(inv.status || '').toLowerCase();
      if (st.includes('lunas') || sisa <= 0) {
        paidCount++;
      }
    });

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setEl('statTotalCount', items.length);
    setEl('statTotalNominal', this.formatRupiah(totalNominal));
    setEl('statPaidCount', paidCount);
    setEl('statTotalSisa', this.formatRupiah(totalSisa));
  },

  renderTable() {
    const data = this.invoices || [];
    const emptyState = document.getElementById('historyEmptyState');
    const tableWrapper = document.getElementById('historyInvoiceTable');

    if (data.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
    }

    if ($.fn.DataTable.isDataTable('#historyInvoiceTable')) {
      $('#historyInvoiceTable').DataTable().destroy();
    }
    $('#historyInvoiceTable tbody').empty();

    const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

    this.table = $('#historyInvoiceTable').DataTable({
      autoWidth: false,
      data: data,
      order: [[1, 'desc']], // Urutkan berdasarkan nomor invoice terbaru
      columns: [
        {
          data: null,
          className: 'text-center w-12 font-semibold text-zinc-500',
          render: function (data, type, row, meta) {
            return meta.row + 1;
          }
        },
        {
          data: 'invoice_id',
          render: (data, type, row) => {
            const invNo = escapeHtml(data || row.id || row.iDInvoice || '-');
            const docType = String(row.doc_type || 'invoice').toLowerCase();
            const badgeType = docType === 'nota'
              ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase ml-1.5">Nota</span>`
              : `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase ml-1.5">Invoice</span>`;

            return `
              <div>
                <div class="flex items-center gap-1">
                  <span onclick="copyTextToClipboard('${invNo}', 'No Invoice')" class="px-2 py-0.5 text-xs font-mono font-bold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors" title="Klik untuk salin No Invoice">${invNo}</span>
                  ${badgeType}
                </div>
              </div>
            `;
          }
        },
        {
          data: 'tanggal',
          render: (data) => {
            if (!data) return '-';
            const cleanDate = String(data).split('T')[0];
            return `<span class="font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">${cleanDate}</span>`;
          }
        },
        {
          data: 'customer_name',
          render: (data, type, row) => {
            const custName = escapeHtml(data || row.namaPelanggan || '-');
            const phone = escapeHtml(row.customer_phone || row.nomorWA || '');
            let phoneHtml = '';
            if (phone && phone !== '-') {
              phoneHtml = `<div class="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5"><i class="fa-brands fa-whatsapp text-emerald-500"></i><span>+${phone}</span></div>`;
            }
            return `<div><div class="font-bold text-zinc-900 dark:text-white">${custName}</div>${phoneHtml}</div>`;
          }
        },
        {
          data: null,
          render: (data, type, row) => {
            const items = row.items || [];
            let mainProduct = '-';
            let extraCount = 0;

            if (items.length > 0) {
              mainProduct = items[0].produk || items[0].namaProyek || `Item 1`;
              if (items.length > 1) {
                extraCount = items.length - 1;
              }
            } else if (row.project_id || row.iDProyek) {
              mainProduct = `Projek: ${row.project_id || row.iDProyek}`;
            }

            let badgeExtra = '';
            if (extraCount > 0) {
              badgeExtra = `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ml-1.5">+${extraCount} item</span>`;
            }

            return `<div class="max-w-[200px] sm:max-w-xs truncate font-medium text-zinc-800 dark:text-zinc-200" title="${escapeHtml(mainProduct)}">${escapeHtml(mainProduct)}${badgeExtra}</div>`;
          }
        },
        {
          data: 'total',
          className: 'text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap',
          render: (data) => {
            return this.formatRupiah(data);
          }
        },
        {
          data: 'sisa',
          className: 'text-right font-semibold whitespace-nowrap',
          render: (data) => {
            const val = Number(data) || 0;
            if (val <= 0) {
              return `<span class="text-emerald-600 dark:text-emerald-400">Rp. 0</span>`;
            }
            return `<span class="text-rose-600 dark:text-rose-400 font-bold">${this.formatRupiah(val)}</span>`;
          }
        },
        {
          data: 'status',
          className: 'text-center whitespace-nowrap',
          render: (data, type, row) => {
            const tot = Number(row.total || 0);
            const sisa = Number(row.sisa !== undefined ? row.sisa : 0);
            let status = data || (sisa <= 0 ? 'Lunas' : 'Belum Bayar');
            const stLower = String(status).toLowerCase();

            if (stLower.includes('lunas') || sisa <= 0) {
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><i class="fa-solid fa-circle-check mr-1 text-[10px]"></i> Lunas</span>`;
            } else if (stLower.includes('sebagian') || (Number(row.dp || 0) > 0 || Number(row.pelunasan || 0) > 0)) {
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><i class="fa-solid fa-clock mr-1 text-[10px]"></i> Ada Sisa</span>`;
            } else {
              return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><i class="fa-solid fa-circle-xmark mr-1 text-[10px]"></i> Belum Bayar</span>`;
            }
          }
        },
        {
          data: null,
          orderable: false,
          className: 'text-center whitespace-nowrap',
          render: (data) => {
            const invId = data.invoice_id || data.id || data.iDInvoice;
            return `
              <div class="flex items-center justify-center space-x-1.5">
                <a href="invoice.html?invoiceId=${encodeURIComponent(invId)}" class="p-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors" title="Lihat & Edit Invoice">
                  <i class="fa-solid fa-eye"></i>
                </a>
                <a href="invoice.html?invoiceId=${encodeURIComponent(invId)}" target="_blank" class="p-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition-colors" title="Buka di Tab Baru">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
                <button onclick="HistoryInvoice.promptDelete('${invId}')" class="p-1.5 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors" title="Hapus Invoice">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            `;
          }
        }
      ],
      language: isEn ? {
        search: "Search:",
        lengthMenu: "Show _MENU_ invoices",
        info: "Showing _START_ to _END_ of _TOTAL_ invoices",
        infoEmpty: "Showing 0 to 0 of 0 invoices",
        paginate: { first: "First", last: "Last", next: "Next", previous: "Prev" },
        zeroRecords: "No matching invoices found"
      } : {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ invoice",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ invoice",
        infoEmpty: "Menampilkan 0 sampai 0 dari 0 invoice",
        paginate: { first: "Pertama", last: "Terakhir", next: "Lanjut", previous: "Sebelum" },
        zeroRecords: "Tidak ada invoice yang sesuai"
      }
    });
  },

  applyFilters() {
    if (!this.table) return;

    const statusVal = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
    const typeVal = document.getElementById('filterType') ? document.getElementById('filterType').value : 'all';

    // Status filter
    if (statusVal === 'all') {
      this.table.column(7).search('').draw();
    } else if (statusVal === 'Lunas') {
      this.table.column(7).search('Lunas', true, false).draw();
    } else if (statusVal === 'Sebagian') {
      this.table.column(7).search('Sisa|Sebagian', true, false).draw();
    } else if (statusVal === 'Belum Bayar') {
      this.table.column(7).search('Belum Bayar', true, false).draw();
    }

    // Type filter
    if (typeVal === 'all') {
      this.table.column(1).search('').draw();
    } else {
      this.table.column(1).search(typeVal, true, false).draw();
    }
  },

  promptDelete(invId) {
    this.pendingDeleteId = invId;
    const label = document.getElementById('deleteInvoiceIdLabel');
    if (label) label.textContent = invId;

    const modal = document.getElementById('modalDeleteInvoice');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  },

  closeDeleteModal() {
    this.pendingDeleteId = null;
    const modal = document.getElementById('modalDeleteInvoice');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  },

  async confirmDelete() {
    const id = this.pendingDeleteId;
    if (!id) return;

    const btn = document.getElementById('btnConfirmDeleteInvoice');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Menghapus...';
    }

    try {
      const res = await API.deleteInvoice(id);
      if (res && res.success) {
        if (typeof Toast !== 'undefined') {
          Toast.success("Berhasil Dihapus", `Invoice ${id} telah dihapus dari history.`);
        }
        this.closeDeleteModal();
        await this.loadData();
      } else {
        if (typeof Toast !== 'undefined') {
          Toast.error("Gagal", res ? res.message : "Gagal menghapus invoice.");
        }
      }
    } catch (err) {
      console.error(err);
      if (typeof Toast !== 'undefined') {
        Toast.error("Error", "Terjadi kesalahan saat menghapus invoice.");
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  HistoryInvoice.init();
});
