const Invoice = {
    proyek: [],
    currentInvoiceId: null,
    currentProjectIds: [],
    currentCustomerName: '',
    docType: 'invoice',
    showSignature: true,
    invoiceTheme: 'light',
    draggedRow: null,

    async init() {
        // Inisialisasi tema invoice - default selalu putih (light)
        const savedTheme = localStorage.getItem('invoice_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            this.setInvoiceTheme(savedTheme, false);
        } else {
            this.setInvoiceTheme('light', false);
        }

        this.generateWatermark();
        this.setupThemeListeners();

        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const urlParams = new URLSearchParams(window.location.search);
        const invoiceId = urlParams.get("invoiceId");
        const fromSelection = urlParams.get("fromSelection");
        const id = urlParams.get("id");
        const isBlank = urlParams.get("blank") === 'true' || urlParams.get("blank") === '1' || urlParams.get("mode") === 'blank';

        try {
            this.proyek = (await API.getProyek()) || [];

            if (invoiceId) {
                // Skenario 1: Membuka dari History Invoice
                await this.loadInvoiceRecord(invoiceId);
            } else if (fromSelection === 'true' || fromSelection === '1') {
                // Skenario 2: Membuka dari Checklist Terpilih
                this.loadFromSelectionPayload(id);
            } else if (id) {
                // Skenario 3: Membuka dari 1 Proyek Existing (backward compatible)
                this.loadInvoice(id);
            } else if (isBlank || (!invoiceId && !fromSelection && !id)) {
                // Skenario 4: Membuka Blank Invoice (Invoice Kosong Manual)
                this.loadBlankInvoice();
            } else {
                Toast.warning(
                    isEn ? "Invoice Not Found" : "Invoice Tidak Ditemukan",
                    isEn ? "No project or invoice specified." : "ID proyek atau invoice tidak ditemukan."
                );
            }

            this.setupEditable();
            this.setupDragAndDrop();

            const btnPDF = document.getElementById("btnPDF");
            if (btnPDF) {
                btnPDF.addEventListener("click", () => {
                    this.exportPDF();
                });
            }

            const btnPNG = document.getElementById("btnPNG");
            if (btnPNG) {
                btnPNG.addEventListener("click", () => {
                    this.exportPNG();
                });
            }
        } catch (err) {
            console.error(err);
            Toast.error(
                isEn ? "Failed to Load Invoice" : "Gagal Memuat Invoice",
                err.message || (isEn ? "An error occurred while fetching invoice details." : "Terjadi kesalahan saat mengambil data invoice.")
            );
        }
    },

    // Format harga/angka di UI: "Rp. " diikuti titik setelah tiap 3 digit
    format(val) {
        if (val === null || val === undefined || val === '') return 'Rp. 0';
        const digits = String(val).replace(/\D/g, '');
        if (!digits) return 'Rp. 0';
        const num = parseInt(digits, 10) || 0;
        return 'Rp. ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    // Ambil data murni (hanya numbering saja tanpa Rp. dan titik)
    getRawNumber(val) {
        if (val === null || val === undefined || val === '') return 0;
        const digits = String(val).replace(/\D/g, '');
        return digits ? parseInt(digits, 10) : 0;
    },

    // Helper: Buat Nomor Invoice Unik
    generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `INV-${year}${month}${day}-${random}`;
    },

    // ==========================================
    // SKENARIO 1: LOAD DARI CHECKLIST SELECTION
    // ==========================================
    loadFromSelectionPayload(fallbackId) {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        let payload = null;
        try {
            const raw = sessionStorage.getItem('pending_invoice_payload');
            if (raw) payload = JSON.parse(raw);
        } catch (e) {
            console.error("Gagal parse pending_invoice_payload:", e);
        }

        // Jika payload tidak ada, fallback ke loadInvoice biasa
        if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
            if (fallbackId) {
                this.loadInvoice(fallbackId);
                return;
            }
            Toast.warning("Data Kosong", "Tidak ada item checklist yang dipilih.");
            return;
        }

        const dateLocale = isEn ? "en-US" : "id-ID";
        const dateRaw = new Date();
        const formatter = new Intl.DateTimeFormat(dateLocale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            timeZone: "Asia/Jakarta"
        });

        // 1. Header
        const autoInvNo = this.generateInvoiceNumber();
        this.currentInvoiceId = autoInvNo;
        this.currentProjectIds = payload.projectIds || [];
        this.currentCustomerName = payload.customerName || 'Pelanggan';

        document.getElementById("previewInvoiceNo").innerText = autoInvNo;
        document.getElementById("previewTanggal").innerText = formatter.format(dateRaw);

        // 2. Customer
        document.getElementById("previewPelanggan").innerText = payload.customerName || "-";
        document.getElementById("previewWA").innerText = payload.customerPhone || "-";

        // Urutkan item berdasarkan sort_order jika ada
        const sortedItems = payload.items.slice().sort((a, b) => (Number(a.sort_order || a.no || 0) - Number(b.sort_order || b.no || 0)));

        // 3. Populate Tabel Invoice dengan item terpilih (hingga 10 baris)
        const tableBody = document.getElementById("invoiceTableBody");
        if (tableBody) {
            let html = '';
            for (let i = 0; i < 10; i++) {
                const item = sortedItems[i];
                const rowNo = i + 1;
                if (item) {
                    const prodName = escapeHtml(item.produk || '');
                    const qtySatuan = `${escapeHtml(String(item.jumlah || item.qty || 1))} ${escapeHtml(item.satuan || '')}`.trim();
                    const hargaFormatted = this.format(item.hargaSatuan || item.harga || item.nominal || 0);
                    const nomFormatted = this.format(item.nominal || 0);

                    html += `
                        <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                            <td class="border p-1 md:p-3 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                    <span class="row-num">${rowNo}</span>
                                </div>
                            </td>
                            <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewProduk' : ''}">${prodName}</td>
                            <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewJumlah' : ''}">${qtySatuan}</td>
                            <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewHarga' : ''}">${hargaFormatted}</td>
                            <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewNominal' : ''}">${nomFormatted}</td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                            <td class="border p-1 md:p-3 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                    <span class="row-num">${rowNo}</span>
                                </div>
                            </td>
                            <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true"></td>
                        </tr>
                    `;
                }
            }
            tableBody.innerHTML = html;
        }

        // 4. Total, DP, Pelunasan, Sisa
        document.getElementById("previewTotal").innerText = this.format(payload.totalNominal || 0);
        document.getElementById("previewDP").innerText = this.format(payload.totalDp || 0);
        const pelunasanEl = document.getElementById("previewPelunasan");
        if (pelunasanEl) {
            pelunasanEl.innerText = this.format(payload.totalPelunasan || 0);
        }
        document.getElementById("previewSisa").innerText = this.format(payload.totalSisa || 0);

        // 5. Catatan
        document.getElementById("previewCatatan").innerText = payload.catatan || "-";

        this.setDocumentType("invoice");
        this.toggleSignature(true);
    },

    // ==========================================
    // SKENARIO 2: LOAD DARI RECORD HISTORY INVOICE
    // ==========================================
    async loadInvoiceRecord(invId) {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const record = await API.getInvoiceById(invId);
        if (!record) {
            Toast.warning(
                isEn ? "Invoice Not Found" : "Invoice Tidak Ditemukan",
                isEn ? "Selected invoice is unavailable." : "Invoice yang dipilih tidak ditemukan."
            );
            return;
        }

        this.currentInvoiceId = record.invoice_id || record.id || invId;
        this.currentProjectIds = Array.isArray(record.project_ids) ? record.project_ids : (record.project_id ? [record.project_id] : []);
        this.currentCustomerName = record.customer_name || record.namaPelanggan || 'Pelanggan';

        // 1. Header
        document.getElementById("previewInvoiceNo").innerText = this.currentInvoiceId;
        document.getElementById("previewTanggal").innerText = record.tanggal || "-";

        // 2. Customer
        document.getElementById("previewPelanggan").innerText = record.customer_name || record.namaPelanggan || "-";
        document.getElementById("previewWA").innerText = record.customer_phone || record.nomorWA || "-";

        // 3. Tabel items
        const tableBody = document.getElementById("invoiceTableBody");
        if (tableBody) {
            if (record.tableHtml) {
                tableBody.innerHTML = record.tableHtml;
            } else if (Array.isArray(record.items) && record.items.length > 0) {
                // Urutkan item berdasarkan sort_order
                const sortedItems = record.items.slice().sort((a, b) => (Number(a.sort_order || a.no || 0) - Number(b.sort_order || b.no || 0)));
                let html = '';
                for (let i = 0; i < 10; i++) {
                    const item = sortedItems[i];
                    const rowNo = i + 1;
                    if (item) {
                        const prodName = escapeHtml(item.produk || item.namaProyek || '');
                        const qtyStr = item.qty !== undefined ? String(item.qty) : `${item.jumlah || 1} ${item.satuan || 'pcs'}`;
                        const hargaVal = item.harga !== undefined ? item.harga : (item.hargaSatuan || 0);
                        const nomVal = item.nominal !== undefined ? item.nominal : (item.nominalProyek || 0);

                        html += `
                            <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                                <td class="border p-1 md:p-3 text-center">
                                    <div class="flex items-center justify-center gap-1">
                                        <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                        <span class="row-num">${rowNo}</span>
                                    </div>
                                </td>
                                <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewProduk' : ''}">${prodName}</td>
                                <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewJumlah' : ''}">${escapeHtml(qtyStr)}</td>
                                <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewHarga' : ''}">${this.format(hargaVal)}</td>
                                <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true" id="${rowNo === 1 ? 'previewNominal' : ''}">${this.format(nomVal)}</td>
                            </tr>
                        `;
                    } else {
                        html += `
                            <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                                <td class="border p-1 md:p-3 text-center">
                                    <div class="flex items-center justify-center gap-1">
                                        <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                        <span class="row-num">${rowNo}</span>
                                    </div>
                                </td>
                                <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true"></td>
                                <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true"></td>
                                <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true"></td>
                                <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true"></td>
                            </tr>
                        `;
                    }
                }
                tableBody.innerHTML = html;
            }
        }

        // 4. Totals
        document.getElementById("previewTotal").innerText = this.format(record.total);
        document.getElementById("previewDP").innerText = this.format(record.dp);
        const pelunasanEl = document.getElementById("previewPelunasan");
        if (pelunasanEl) {
            pelunasanEl.innerText = this.format(record.pelunasan);
        }
        document.getElementById("previewSisa").innerText = this.format(record.sisa);

        // 5. Notes & Sign
        document.getElementById("previewCatatan").innerText = record.catatan || "-";
        if (record.sign_title || record.signTitle) {
            document.getElementById("previewSignTitle").innerText = record.sign_title || record.signTitle;
        }
        if (record.sign_name || record.signName) {
            document.getElementById("previewSignName").innerText = record.sign_name || record.signName;
        }

        if (record.doc_type || record.docType) {
            this.setDocumentType(record.doc_type || record.docType);
        }
        if (record.show_signature !== undefined || record.showSignature !== undefined) {
            this.toggleSignature(record.show_signature !== undefined ? record.show_signature : record.showSignature);
        }
        if (record.invoice_theme || record.invoiceTheme) {
            this.setInvoiceTheme(record.invoice_theme || record.invoiceTheme, false);
        }
    },

    // ==========================================
    // SKENARIO 3: LOAD DARI 1 PROYEK EXISTING
    // ==========================================
    loadInvoice(id) {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const data = this.proyek.find(
            p => String(p.iDProyek).trim() === String(id).trim()
        );
        if (!data) {
            Toast.warning(
                isEn ? "Data Not Found" : "Data Tidak Ditemukan",
                isEn ? "Selected project is unavailable or has been deleted." : "Proyek yang dipilih tidak tersedia atau sudah dihapus."
            );
            return;
        }

        this.currentInvoiceId = data.iDProyek;
        this.currentProjectIds = [data.iDProyek];
        this.currentCustomerName = data.namaPelanggan || 'Pelanggan';

        // HEADER
        document.getElementById("previewInvoiceNo").innerText = data.iDProyek;
        const dateLocale = isEn ? "en-US" : "id-ID";
        const dateRaw = new Date();
        const formatter = new Intl.DateTimeFormat(dateLocale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            timeZone: "Asia/Jakarta"
        });
        document.getElementById("previewTanggal").innerText = formatter.format(dateRaw);

        // CUSTOMER
        document.getElementById("previewPelanggan").innerText = data.namaPelanggan || "-";
        document.getElementById("previewWA").innerText = data.nomorWA || "-";

        // PRODUK
        document.getElementById("previewProduk").innerText = data.produk || data.namaProyek || "-";
        document.getElementById("previewJumlah").innerText = `${data.jumlah || 1} ${data.satuan || 'pcs'}`;
        document.getElementById("previewHarga").innerText = this.format(data.hargaSatuan || data.nominalProyek);
        document.getElementById("previewNominal").innerText = this.format(data.nominalProyek);

        // TOTAL, DP, PELUNASAN, SISA
        document.getElementById("previewTotal").innerText = this.format(data.nominalProyek);
        document.getElementById("previewDP").innerText = this.format(data.dP);
        const pelunasanVal = this.getRawNumber(data.pelunasan);
        const pelunasanEl = document.getElementById("previewPelunasan");
        if (pelunasanEl) {
            pelunasanEl.innerText = this.format(pelunasanVal);
        }
        document.getElementById("previewSisa").innerText = this.format(data.sisaPembayaran);

        // CATATAN
        document.getElementById("previewCatatan").innerText = data.catatan || "-";

        let docType = "invoice";
        let showSignature = true;

        const savedData = localStorage.getItem('invoice_edit_' + id);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.tableHtml) document.getElementById('invoiceTableBody').innerHTML = parsed.tableHtml;
                if (parsed.totalHtml) document.getElementById('previewTotal').innerHTML = parsed.totalHtml;
                if (parsed.dpHtml) document.getElementById('previewDP').innerHTML = parsed.dpHtml;
                if (parsed.pelunasanHtml && document.getElementById('previewPelunasan')) {
                    document.getElementById('previewPelunasan').innerHTML = parsed.pelunasanHtml;
                }
                if (parsed.sisaHtml) document.getElementById('previewSisa').innerHTML = parsed.sisaHtml;
                if (parsed.catatanHtml) document.getElementById('previewCatatan').innerHTML = parsed.catatanHtml;
                if (parsed.signTitle) document.getElementById('previewSignTitle').innerText = parsed.signTitle;
                if (parsed.signName) document.getElementById('previewSignName').innerText = parsed.signName;
                if (parsed.docType) docType = parsed.docType;
                if (parsed.showSignature !== undefined) showSignature = parsed.showSignature;
                if (parsed.invoiceTheme) this.setInvoiceTheme(parsed.invoiceTheme, false);
            } catch (e) { console.error('Failed to parse saved invoice', e); }
        }

        this.setDocumentType(docType);
        this.toggleSignature(showSignature);
    },

    // ==========================================
    // SKENARIO 4: LOAD BLANK INVOICE (INVOICE KOSONG MANUAL)
    // ==========================================
    loadBlankInvoice() {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const autoInvNo = this.generateInvoiceNumber();
        this.currentInvoiceId = autoInvNo;
        this.currentProjectIds = [];
        this.currentCustomerName = '';

        const dateLocale = isEn ? "en-US" : "id-ID";
        const dateRaw = new Date();
        const formatter = new Intl.DateTimeFormat(dateLocale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            timeZone: "Asia/Jakarta"
        });

        // 1. Header
        const invNoEl = document.getElementById("previewInvoiceNo");
        if (invNoEl) invNoEl.innerText = autoInvNo;
        const tglEl = document.getElementById("previewTanggal");
        if (tglEl) tglEl.innerText = formatter.format(dateRaw);

        // 2. Customer Placeholder (Editable)
        const plgEl = document.getElementById("previewPelanggan");
        if (plgEl) plgEl.innerText = isEn ? "[Client Name]" : "[Nama Pelanggan]";
        const waEl = document.getElementById("previewWA");
        if (waEl) waEl.innerText = isEn ? "[Phone / WhatsApp]" : "[Nomor WA / Telp]";

        // 3. Tabel Invoice: 10 baris editable kosong
        const tableBody = document.getElementById("invoiceTableBody");
        if (tableBody) {
            let html = '';
            for (let i = 0; i < 10; i++) {
                const rowNo = i + 1;
                if (rowNo === 1) {
                    html += `
                        <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                            <td class="border p-1 md:p-3 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                    <span class="row-num">${rowNo}</span>
                                </div>
                            </td>
                            <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true" id="previewProduk">${isEn ? 'Service / Product Name' : 'Nama Produk / Jasa'}</td>
                            <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true" id="previewJumlah">1 pcs</td>
                            <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true" id="previewHarga">Rp. 0</td>
                            <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true" id="previewNominal">Rp. 0</td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr class="invoice-row" draggable="true" data-sort-order="${rowNo}">
                            <td class="border p-1 md:p-3 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                                    <span class="row-num">${rowNo}</span>
                                </div>
                            </td>
                            <td class="border p-1 md:p-3 editable-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center editable-cell qty-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center editable-cell price-cell cursor-text" contenteditable="true"></td>
                            <td class="border text-center font-bold nominal-cell editable-cell cursor-text" contenteditable="true"></td>
                        </tr>
                    `;
                }
            }
            tableBody.innerHTML = html;
        }

        // 4. Totals
        const totalEl = document.getElementById("previewTotal");
        if (totalEl) totalEl.innerText = "Rp. 0";
        const dpEl = document.getElementById("previewDP");
        if (dpEl) dpEl.innerText = "Rp. 0";
        const pelunasanEl = document.getElementById("previewPelunasan");
        if (pelunasanEl) pelunasanEl.innerText = "Rp. 0";
        const sisaEl = document.getElementById("previewSisa");
        if (sisaEl) sisaEl.innerText = "Rp. 0";

        // 5. Catatan & Signature
        const catEl = document.getElementById("previewCatatan");
        if (catEl) catEl.innerText = isEn ? "Thank you for your business." : "Terima kasih atas kerja samanya.";

        this.setDocumentType("invoice");
        this.toggleSignature(true);
        this.setupDragAndDrop();

        // Update URL query param secara bersih tanpa reload
        try {
            const newUrl = `${window.location.pathname}?blank=true`;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        } catch (e) {}

        if (typeof Toast !== 'undefined') {
            Toast.info(
                isEn ? "Blank Invoice Ready" : "Blank Invoice Siap",
                isEn ? "You can directly click and type to edit all details." : "Format invoice kosong siap digunakan. Klik langsung pada teks untuk mengedit."
            );
        }
    },

    // ==========================================
    // DRAG AND DROP ITEM SORTING IMPLEMENTATION
    // ==========================================
    setupDragAndDrop() {
        const tableBody = document.getElementById('invoiceTableBody');
        if (!tableBody) return;

        // Pastikan setiap row memiliki elemen handle dan nomor urut
        const rows = tableBody.querySelectorAll('.invoice-row');
        rows.forEach((row, idx) => {
            row.setAttribute('draggable', 'true');
            row.setAttribute('data-sort-order', idx + 1);

            const firstCell = row.cells[0];
            if (firstCell && !firstCell.querySelector('.drag-handle')) {
                const rowNo = idx + 1;
                firstCell.innerHTML = `
                    <div class="flex items-center justify-center gap-1">
                        <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                        <span class="row-num">${rowNo}</span>
                    </div>
                `;
            }

            // Dragstart listener
            row.addEventListener('dragstart', (e) => {
                this.draggedRow = row;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', row.innerHTML);
            });

            // Dragover listener
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (!this.draggedRow || this.draggedRow === row) return;

                const bounding = row.getBoundingClientRect();
                const offset = e.clientY - bounding.top;

                // Paruh atas vs bawah
                if (offset < bounding.height / 2) {
                    row.classList.add('drag-over-top');
                    row.classList.remove('drag-over-bottom');
                } else {
                    row.classList.add('drag-over-bottom');
                    row.classList.remove('drag-over-top');
                }
            });

            // Dragleave listener
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            // Drop listener
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over-top', 'drag-over-bottom');

                if (!this.draggedRow || this.draggedRow === row) return;

                const bounding = row.getBoundingClientRect();
                const offset = e.clientY - bounding.top;

                if (offset < bounding.height / 2) {
                    tableBody.insertBefore(this.draggedRow, row);
                } else {
                    tableBody.insertBefore(this.draggedRow, row.nextSibling);
                }

                // Perbarui penomoran & kalkulasi
                this.reindexRows();
                this.setupEditable();
                this.saveEditedInvoice(true); // Silent auto-save urutan baru
            });

            // Dragend listener
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
                this.draggedRow = null;
            });
        });
    },

    // Perbarui nomor urut (1, 2, 3...) pada seluruh baris tabel
    reindexRows() {
        const tableBody = document.getElementById('invoiceTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('.invoice-row');
        rows.forEach((row, idx) => {
            const rowNo = idx + 1;
            row.setAttribute('data-sort-order', rowNo);

            const numSpan = row.querySelector('.row-num');
            if (numSpan) {
                numSpan.textContent = rowNo;
            } else if (row.cells[0]) {
                row.cells[0].innerHTML = `
                    <div class="flex items-center justify-center gap-1">
                        <span class="drag-handle text-zinc-400 dark:text-zinc-500 mr-0.5 select-none no-print" title="Geser untuk mengubah urutan baris"><i class="fa-solid fa-grip-vertical text-[10px]"></i></span>
                        <span class="row-num">${rowNo}</span>
                    </div>
                `;
            }

            // Sync ID first-row elements
            const prodCell = row.querySelector('.editable-cell:not(.qty-cell):not(.price-cell):not(.nominal-cell)');
            const qtyCell = row.querySelector('.qty-cell');
            const priceCell = row.querySelector('.price-cell');
            const nomCell = row.querySelector('.nominal-cell');

            if (rowNo === 1) {
                if (prodCell) prodCell.id = 'previewProduk';
                if (qtyCell) qtyCell.id = 'previewJumlah';
                if (priceCell) priceCell.id = 'previewHarga';
                if (nomCell) nomCell.id = 'previewNominal';
            } else {
                if (prodCell && prodCell.id === 'previewProduk') prodCell.removeAttribute('id');
                if (qtyCell && qtyCell.id === 'previewJumlah') qtyCell.removeAttribute('id');
                if (priceCell && priceCell.id === 'previewHarga') priceCell.removeAttribute('id');
                if (nomCell && nomCell.id === 'previewNominal') nomCell.removeAttribute('id');
            }
        });
    },

    setupEditable() {
        const tableBody = document.getElementById('invoiceTableBody');
        const previewTotal = document.getElementById('previewTotal');
        const previewDP = document.getElementById('previewDP');
        const previewPelunasan = document.getElementById('previewPelunasan');
        const previewSisa = document.getElementById('previewSisa');

        const recalculateSisa = () => {
            const total = this.getRawNumber(previewTotal ? previewTotal.innerText : 0);
            const dp = this.getRawNumber(previewDP ? previewDP.innerText : 0);
            const pelunasan = this.getRawNumber(previewPelunasan ? previewPelunasan.innerText : 0);
            const sisa = total - dp - pelunasan;
            if (previewSisa && document.activeElement !== previewSisa) {
                previewSisa.innerText = this.format(sisa);
            }
        };

        const recalculateTable = () => {
            let total = 0;
            let hasCalculatedItems = false;
            if (tableBody) {
                const rows = tableBody.querySelectorAll('.invoice-row');
                rows.forEach(row => {
                    const qtyCell = row.querySelector('.qty-cell');
                    const priceCell = row.querySelector('.price-cell');
                    const nominalCell = row.querySelector('.nominal-cell');

                    if (qtyCell && priceCell && nominalCell) {
                        const qty = this.getRawNumber(qtyCell.innerText);
                        const price = this.getRawNumber(priceCell.innerText);

                        if (qty > 0 && price > 0) {
                            const nominal = qty * price;
                            if (document.activeElement !== nominalCell) {
                                nominalCell.innerText = this.format(nominal);
                            }
                            total += nominal;
                            hasCalculatedItems = true;
                        } else {
                            const directNominal = this.getRawNumber(nominalCell.innerText);
                            if (directNominal > 0) {
                                total += directNominal;
                                hasCalculatedItems = true;
                            }
                        }
                    }
                });
            }

            if (hasCalculatedItems && previewTotal && document.activeElement !== previewTotal) {
                previewTotal.innerText = this.format(total);
            }
            recalculateSisa();
        };

        // Event listener blur untuk memformat angka dengan Rp. dan titik secara rapi
        const bindBlurFormatter = (el) => {
            if (!el) return;
            el.addEventListener('blur', () => {
                const raw = this.getRawNumber(el.innerText);
                el.innerText = this.format(raw);
                recalculateTable();
            });
        };

        // Pasang blur formatter pada total, DP, pelunasan, sisa
        bindBlurFormatter(previewTotal);
        bindBlurFormatter(previewDP);
        bindBlurFormatter(previewPelunasan);
        bindBlurFormatter(previewSisa);

        // Pasang blur formatter pada sel harga & nominal di tabel
        if (tableBody) {
            const bindRowFormatters = () => {
                const priceCells = tableBody.querySelectorAll('.price-cell');
                const nominalCells = tableBody.querySelectorAll('.nominal-cell');
                priceCells.forEach(cell => bindBlurFormatter(cell));
                nominalCells.forEach(cell => bindBlurFormatter(cell));
            };
            bindRowFormatters();

            tableBody.addEventListener('input', recalculateTable);
        }

        if (previewTotal) previewTotal.addEventListener('input', recalculateSisa);
        if (previewDP) previewDP.addEventListener('input', recalculateSisa);
        if (previewPelunasan) previewPelunasan.addEventListener('input', recalculateSisa);

        const btnSave = document.getElementById('btnSaveInvoice');
        if (btnSave) {
            btnSave.onclick = async () => {
                await this.saveEditedInvoice(false);
            };
        }

        const btnReset = document.getElementById('btnResetInvoice');
        if (btnReset) {
            btnReset.onclick = async () => {
                const id = this.currentInvoiceId || new URLSearchParams(window.location.search).get("id") || new URLSearchParams(window.location.search).get("invoiceId");
                if (await showConfirmModal({
                    title: "Reset Perubahan Invoice",
                    message: "Apakah Anda yakin ingin menghapus semua perubahan dan mengembalikan invoice ini seperti semula?",
                    type: "warning",
                    confirmText: "Kembalikan Semula"
                })) {
                    if (id) {
                        localStorage.removeItem('invoice_edit_' + id);
                    }
                    sessionStorage.removeItem('pending_invoice_payload');
                    localStorage.removeItem('invoice_theme');
                    window.location.reload();
                }
            };
        }

        // Setup Document Type switcher listeners
        const btnInvoice = document.getElementById('btnTypeInvoice');
        const btnNota = document.getElementById('btnTypeNota');
        if (btnInvoice) {
            btnInvoice.onclick = () => {
                this.setDocumentType('invoice');
            };
        }
        if (btnNota) {
            btnNota.onclick = () => {
                this.setDocumentType('nota');
            };
        }

        // Setup Signature toggle listener
        const chkShowSignature = document.getElementById('chkShowSignature');
        if (chkShowSignature) {
            chkShowSignature.onchange = (e) => {
                this.toggleSignature(e.target.checked);
            };
        }

        recalculateTable();
    },

    async saveEditedInvoice(isSilent = false) {
        const previewInvNo = document.getElementById('previewInvoiceNo');
        let invNo = previewInvNo ? previewInvNo.innerText.trim() : '';
        if (!invNo || invNo === '-') {
            invNo = this.generateInvoiceNumber();
            if (previewInvNo) previewInvNo.innerText = invNo;
        }

        const tableBody = document.getElementById('invoiceTableBody');
        const previewTanggal = document.getElementById('previewTanggal');
        const previewPelanggan = document.getElementById('previewPelanggan');
        const previewWA = document.getElementById('previewWA');
        const previewTotal = document.getElementById('previewTotal');
        const previewDP = document.getElementById('previewDP');
        const previewPelunasan = document.getElementById('previewPelunasan');
        const previewSisa = document.getElementById('previewSisa');
        const previewCatatan = document.getElementById('previewCatatan');
        const previewSignTitle = document.getElementById('previewSignTitle');
        const previewSignName = document.getElementById('previewSignName');
        const chkShowSignature = document.getElementById('chkShowSignature');

        const totalVal = this.getRawNumber(previewTotal ? previewTotal.innerText : 0);
        const dpVal = this.getRawNumber(previewDP ? previewDP.innerText : 0);
        const pelunasanVal = this.getRawNumber(previewPelunasan ? previewPelunasan.innerText : 0);
        const sisaVal = this.getRawNumber(previewSisa ? previewSisa.innerText : 0);

        const itemsList = [];
        if (tableBody) {
            const rows = tableBody.querySelectorAll('.invoice-row');
            rows.forEach((row, idx) => {
                const prod = row.querySelector('.editable-cell:not(.qty-cell):not(.price-cell):not(.nominal-cell)');
                const qty = row.querySelector('.qty-cell');
                const price = row.querySelector('.price-cell');
                const nom = row.querySelector('.nominal-cell');
                const prodText = prod ? prod.innerText.trim() : '';

                if (prodText || this.getRawNumber(nom ? nom.innerText : 0) > 0) {
                    itemsList.push({
                        sort_order: idx + 1,
                        no: idx + 1,
                        produk: prodText,
                        qty: qty ? qty.innerText.trim() : '1 pcs',
                        harga: price ? this.getRawNumber(price.innerText) : 0,
                        nominal: nom ? this.getRawNumber(nom.innerText) : 0
                    });
                }
            });
        }

        const invoiceRecord = {
            id: invNo,
            invoice_id: invNo,
            iDInvoice: invNo,
            project_ids: this.currentProjectIds && this.currentProjectIds.length > 0 ? this.currentProjectIds : [invNo],
            customer_name: previewPelanggan ? previewPelanggan.innerText.trim() : (this.currentCustomerName || 'Pelanggan'),
            customer_phone: previewWA ? previewWA.innerText.trim() : '',
            tanggal: previewTanggal ? previewTanggal.innerText.trim() : new Date().toISOString().split('T')[0],
            total: totalVal,
            dp: dpVal,
            pelunasan: pelunasanVal,
            sisa: sisaVal,
            doc_type: this.docType || 'invoice',
            invoice_theme: this.invoiceTheme || 'light',
            show_signature: chkShowSignature ? chkShowSignature.checked : true,
            sign_title: previewSignTitle ? previewSignTitle.innerText.trim() : 'Hormat Kami,',
            sign_name: previewSignName ? previewSignName.innerText.trim() : 'Premium Designz',
            catatan: previewCatatan ? previewCatatan.innerText.trim() : '-',
            items: itemsList,
            tableHtml: tableBody ? tableBody.innerHTML : '',
            status: (sisaVal <= 0) ? 'Lunas' : ((dpVal > 0 || pelunasanVal > 0) ? 'Sebagian' : 'Belum Bayar')
        };

        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');

        const btnSave = document.getElementById('btnSaveInvoice');
        const origHtml = btnSave ? btnSave.innerHTML : '';
        if (btnSave && !isSilent) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Menyimpan...';
        }

        try {
            await API.saveInvoice(invoiceRecord);
            this.currentInvoiceId = invNo;

            // Update URL query params agar reload tetap di invoice yang tersimpan
            try {
                const newUrl = `${window.location.pathname}?invoiceId=${encodeURIComponent(invNo)}`;
                window.history.replaceState({ path: newUrl }, '', newUrl);
            } catch (e) {}

            if (!isSilent && typeof Toast !== 'undefined') {
                Toast.success(
                    'Invoice Tersimpan!',
                    `Invoice ${invNo} berhasil disimpan. Anda dapat melihatnya kapan saja di menu History Invoice.`
                );
            }
        } catch (err) {
            console.error("Gagal simpan invoice:", err);
            if (!isSilent && typeof Toast !== 'undefined') {
                Toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan data invoice.');
            }
        } finally {
            if (btnSave && !isSilent) {
                btnSave.disabled = false;
                btnSave.innerHTML = origHtml;
            }
        }
    },

    // ==========================================
    // EXPORT PDF DENGAN LAYOUT BERSIH & PROPORSIONAL
    // ==========================================
    exportPDF() {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const btnPDF = document.getElementById("btnPDF");
        if (btnPDF && btnPDF.disabled) return;

        const origHtml = btnPDF ? btnPDF.innerHTML : '';
        if (btnPDF) {
            btnPDF.disabled = true;
            btnPDF.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            btnPDF.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> ' + (isEn ? 'Exporting...' : 'Mengunduh PDF...');
        }

        const invoice = document.getElementById("invoiceArea");
        const invNo = document.getElementById("previewInvoiceNo") ? document.getElementById("previewInvoiceNo").innerText.trim() : 'FPManager';
        const prefix = (this.docType === 'nota') ? 'Nota' : 'Invoice';
        const fileName = `${prefix}-${invNo}.pdf`;

        const resetBtn = () => {
            if (btnPDF) {
                btnPDF.disabled = false;
                btnPDF.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
                btnPDF.innerHTML = origHtml;
            }
        };

        if (typeof Toast !== 'undefined') {
            Toast.info(
                isEn ? "Generating PDF..." : `Membuat PDF ${prefix}...`,
                isEn ? "Please wait while your PDF is rendered offline." : `Mohon tunggu, file PDF ${prefix} sedang diproses secara offline.`
            );
        }

        // Scroll window ke paling atas untuk mencegah viewport scroll offset issue pada html2canvas
        window.scrollTo(0, 0);

        if (typeof html2pdf !== 'undefined') {
            const isDark = (this.invoiceTheme === 'dark');
            const opt = {
                margin: [6, 6, 6, 6], // Margin seimbang di 4 sisi (mm)
                filename: fileName,
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: isDark ? '#121215' : '#ffffff',
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    avoid: ['.invoice-row', '#previewTotalBox', '#signatureSection', '.invoice-header-border']
                }
            };

            html2pdf().set(opt).from(invoice).save().then(() => {
                resetBtn();
                if (typeof Toast !== 'undefined') {
                    Toast.success(
                        isEn ? "PDF Exported" : "PDF Berhasil Diunduh",
                        isEn ? `${prefix} ${fileName} has been generated.` : `File ${fileName} berhasil disimpan.`
                    );
                }
            }).catch(err => {
                resetBtn();
                console.error("html2pdf export error:", err);
                window.print();
            });
        } else {
            resetBtn();
            window.print();
        }
    },

    exportPNG() {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const btnPNG = document.getElementById("btnPNG");
        if (btnPNG && btnPNG.disabled) return;

        const origHtml = btnPNG ? btnPNG.innerHTML : '';
        if (btnPNG) {
            btnPNG.disabled = true;
            btnPNG.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            btnPNG.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> ' + (isEn ? 'Exporting...' : 'Mengunduh PNG...');
        }

        const invoice = document.getElementById("invoiceArea");
        const invNo = document.getElementById("previewInvoiceNo") ? document.getElementById("previewInvoiceNo").innerText.trim() : 'FPManager';
        const prefix = (this.docType === 'nota') ? 'Nota' : 'Invoice';
        const fileName = `${prefix}-${invNo}.png`;

        const resetBtn = () => {
            if (btnPNG) {
                btnPNG.disabled = false;
                btnPNG.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
                btnPNG.innerHTML = origHtml;
            }
        };

        if (typeof Toast !== 'undefined') {
            Toast.info(
                isEn ? "Generating PNG..." : `Membuat Gambar ${prefix}...`,
                isEn ? "Please wait while your PNG image is being generated." : `Mohon tunggu, file gambar ${prefix} sedang diproses.`
            );
        }

        // Scroll window ke atas sebelum capture
        window.scrollTo(0, 0);

        const isDark = (this.invoiceTheme === 'dark');

        if (typeof html2canvas !== 'undefined') {
            html2canvas(invoice, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: isDark ? '#121215' : '#ffffff',
                scrollY: 0,
                scrollX: 0
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
                resetBtn();
                if (typeof Toast !== 'undefined') {
                    Toast.success(
                        isEn ? "PNG Exported" : "PNG Berhasil Diunduh",
                        isEn ? `${prefix} ${fileName} has been saved.` : `File gambar ${fileName} berhasil disimpan.`
                    );
                }
            }).catch(err => {
                resetBtn();
                console.error("html2canvas export error:", err);
                if (typeof Toast !== 'undefined') {
                    Toast.error(
                        isEn ? "Export Failed" : "Gagal Mengunduh PNG",
                        err.message || (isEn ? "Could not generate PNG image." : "Tidak dapat membuat file PNG.")
                    );
                }
            });
        } else {
            resetBtn();
            if (typeof Toast !== 'undefined') Toast.error('Error', 'Library html2canvas tidak ditemukan.');
        }
    },

    setDocumentType(type) {
        this.docType = type;
        const titleEl = document.getElementById("previewDocTitle");
        const labelEl = document.getElementById("previewDocNoLabel");
        const btnInvoice = document.getElementById("btnTypeInvoice");
        const btnNota = document.getElementById("btnTypeNota");

        if (type === "nota") {
            if (titleEl) titleEl.innerText = "NOTA";
            if (labelEl) labelEl.innerText = "No Nota :";
            if (btnInvoice) {
                btnInvoice.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white";
            }
            if (btnNota) {
                btnNota.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm bg-indigo-600 text-white shadow-sm";
            }
        } else {
            if (titleEl) titleEl.innerText = "INVOICE";
            if (labelEl) labelEl.innerText = "No Invoice :";
            if (btnInvoice) {
                btnInvoice.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm bg-indigo-600 text-white shadow-sm";
            }
            if (btnNota) {
                btnNota.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white";
            }
        }
    },

    setupThemeListeners() {
        const btnLight = document.getElementById('btnThemeLight');
        const btnDark = document.getElementById('btnThemeDark');
        if (btnLight) {
            btnLight.addEventListener('click', () => {
                this.setInvoiceTheme('light', true);
            });
        }
        if (btnDark) {
            btnDark.addEventListener('click', () => {
                this.setInvoiceTheme('dark', true);
            });
        }

        // Sinkronkan bila tombol toggle mode gelap di header diklik
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                setTimeout(() => {
                    const isDark = document.documentElement.classList.contains('dark');
                    this.setInvoiceTheme(isDark ? 'dark' : 'light', true);
                }, 50);
            });
        }

        // Cetak dengan background gelap jika tema invoice gelap
        window.addEventListener('beforeprint', () => {
            if (this.invoiceTheme === 'dark') {
                document.body.classList.add('print-dark-mode');
            } else {
                document.body.classList.remove('print-dark-mode');
            }
        });
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('print-dark-mode');
        });
    },

    setInvoiceTheme(theme, save = true) {
        this.invoiceTheme = theme;
        const invoice = document.getElementById('invoiceArea');
        const btnLight = document.getElementById('btnThemeLight');
        const btnDark = document.getElementById('btnThemeDark');
        const logoEl = document.getElementById('previewLogo');

        if (logoEl) {
            logoEl.src = (theme === 'dark') ? 'assets/watermark/wm_white.png' : 'assets/watermark/wm_warna.png';
        }

        if (theme === 'dark') {
            if (invoice) {
                invoice.classList.add('invoice-dark-mode');
                invoice.classList.remove('invoice-light-mode');
            }
            if (btnDark) {
                btnDark.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm bg-indigo-600 text-white shadow-sm flex items-center gap-1.5";
            }
            if (btnLight) {
                btnLight.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5";
            }
        } else {
            if (invoice) {
                invoice.classList.remove('invoice-dark-mode');
                invoice.classList.add('invoice-light-mode');
            }
            if (btnLight) {
                btnLight.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm bg-indigo-600 text-white shadow-sm flex items-center gap-1.5";
            }
            if (btnDark) {
                btnDark.className = "px-3.5 py-1.5 rounded-lg font-semibold transition-all text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5";
            }
        }

        this.generateWatermark();

        if (save) {
            localStorage.setItem('invoice_theme', theme);
        }
    },

    toggleSignature(show) {
        this.showSignature = show;
        const signatureSection = document.getElementById("signatureSection");
        const checkbox = document.getElementById("chkShowSignature");

        if (checkbox) checkbox.checked = show;
        if (signatureSection) {
            if (show) {
                signatureSection.style.display = "";
            } else {
                signatureSection.style.display = "none";
            }
        }
    },

    generateWatermark() {
        const grid = document.getElementById('watermarkGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const logoWidth = 120; // Ukuran logo watermark
        const gap = 180;      // Jarak antar watermark

        const cols = 8;
        const rows = 12;

        const isDark = (this.invoiceTheme === 'dark');

        for (let r = 0; r < rows; r++) {
            const stagger = (r % 2 === 0) ? (gap / 2) : 0;
            for (let c = 0; c < cols; c++) {
                const img = document.createElement('img');
                img.src = isDark ? 'assets/watermark/wm_white.png' : 'assets/watermark/wm_warna.png';
                img.style.position = 'absolute';
                img.style.width = `${logoWidth}px`;
                img.style.height = 'auto';
                if (isDark) {
                    img.style.opacity = '0.04';
                } else {
                    img.style.opacity = '0.08';
                }
                img.style.pointerEvents = 'none';
                img.style.left = `${c * gap + stagger - 30}px`;
                img.style.top = `${r * gap - 20}px`;
                img.style.transform = 'rotate(-20deg)';
                img.setAttribute('data-html2canvas-ignore', 'false');
                grid.appendChild(img);
            }
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Invoice.init();
});
