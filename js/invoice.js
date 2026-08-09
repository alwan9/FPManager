const Invoice = {
    proyek: [],
    docType: 'invoice',
    showSignature: true,
    async init() {
        this.generateWatermark();
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        try {
            this.proyek = await API.getProyek();
            const id = new URLSearchParams(window.location.search).get("id");
            if (!id) {

                Toast.warning(
                    isEn ? "Invoice Not Found" : "Invoice Tidak Ditemukan",
                    isEn ? "Project ID not found." : "ID proyek tidak ditemukan."
                );

                return;

            }
            this.loadInvoice(id);
            this.setupEditable();
            document
                .getElementById("btnPDF")
                .addEventListener("click", () => {
                    this.exportPDF();
                });
        } catch (err) {

            console.error(err);

            Toast.error(
                isEn ? "Failed to Load Invoice" : "Gagal Memuat Invoice",
                err.message || (isEn ? "An error occurred while fetching invoice details." : "Terjadi kesalahan saat mengambil data invoice.")
            );

        }
    },
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

        // HEADER
        // ==========================
        document.getElementById("previewInvoiceNo").innerText =
            data.iDProyek;
        const dateLocale = isEn ? "en-US" : "id-ID";
        document.getElementById("previewTanggal").innerText =
            new Date().toLocaleDateString(dateLocale);
        // ==========================
        // CUSTOMER
        // ==========================
        document.getElementById("previewPelanggan").innerText =
            data.namaPelanggan || "-";
        document.getElementById("previewWA").innerText =
            data.nomorWA || "-";
        // ==========================
        // PRODUK
        // ==========================
        document.getElementById("previewProduk").innerText =
            data.produk || "-";
        document.getElementById("previewJumlah").innerText =
            `${data.jumlah} ${data.satuan}`;
        document.getElementById("previewHarga").innerText =
            this.format(data.hargaSatuan);
        document.getElementById("previewNominal").innerText =
            this.format(data.nominalProyek);
        // ==========================
        // TOTAL
        // ==========================
        document.getElementById("previewTotal").innerText =
            this.format(data.nominalProyek);
        document.getElementById("previewDP").innerText =
            this.format(data.dP);
        document.getElementById("previewSisa").innerText =
            this.format(data.sisaPembayaran);
        // ==========================
        // STATUS
        // ==========================
        const statusMap = isEn ? {
            'Menunggu': 'Waiting',
            'Sedang Dikerjakan': 'In Progress',
            'Revisi': 'Revision',
            'Selesai': 'Completed',
            'Belum Pembayaran': 'Unpaid',
            'Dibatalkan': 'Cancelled'
        } : {
            'Menunggu': 'Menunggu',
            'Sedang Dikerjakan': 'Sedang Dikerjakan',
            'Revisi': 'Revisi',
            'Selesai': 'Selesai',
            'Belum Pembayaran': 'Belum Pembayaran',
            'Dibatalkan': 'Dibatalkan'
        };
        const status = document.getElementById("previewStatus");
        if (status) {
            status.innerText = statusMap[data.status] || data.status;
            status.className = "px-4 py-1 rounded-full text-white";
            switch (data.status) {
                case "Menunggu":
                    status.classList.add("bg-yellow-500");
                    break;
                case "Sedang Dikerjakan":
                    status.classList.add("bg-blue-600");
                    break;
                case "Selesai":
                    status.classList.add("bg-green-600");
                    break;
                case "Belum Pembayaran":
                    status.classList.add("bg-red-600");
                    break;
                default:
                    status.classList.add("bg-gray-500");
            }
        }
        // ==========================
        // DEADLINE
        // ==========================
        const deadlineEl = document.getElementById("previewDeadline");
        if (deadlineEl) {
            deadlineEl.innerText = data.deadline || "-";
        }
        // ==========================
        // CATATAN
        // ==========================
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
                if (parsed.sisaHtml) document.getElementById('previewSisa').innerHTML = parsed.sisaHtml;
                if (parsed.catatanHtml) document.getElementById('previewCatatan').innerHTML = parsed.catatanHtml;
                if (parsed.signTitle) document.getElementById('previewSignTitle').innerText = parsed.signTitle;
                if (parsed.signName) document.getElementById('previewSignName').innerText = parsed.signName;
                if (parsed.docType) docType = parsed.docType;
                if (parsed.showSignature !== undefined) showSignature = parsed.showSignature;
            } catch (e) { console.error('Failed to parse saved invoice', e); }
        }

        this.setDocumentType(docType);
        this.toggleSignature(showSignature);
    },

    setupEditable() {
        const tableBody = document.getElementById('invoiceTableBody');
        const previewTotal = document.getElementById('previewTotal');
        const previewDP = document.getElementById('previewDP');
        const previewSisa = document.getElementById('previewSisa');

        const parseCurrency = (str) => {
            if (!str) return 0;
            let cleaned = str.replace(/[^0-9,.-]+/g, "");
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            return Number(cleaned) || 0;
        };

        const formatCurrency = (num) => {
            return this.format(num);
        };

        const recalculateTable = () => {
            let total = 0;
            const rows = tableBody.querySelectorAll('.invoice-row');
            rows.forEach(row => {
                const qtyCell = row.querySelector('.qty-cell');
                const priceCell = row.querySelector('.price-cell');
                const nominalCell = row.querySelector('.nominal-cell');

                if (qtyCell && priceCell && nominalCell) {
                    const qty = parseCurrency(qtyCell.innerText);
                    const price = parseCurrency(priceCell.innerText);

                    if (qty > 0 || price > 0) {
                        const nominal = qty * price;
                        if (document.activeElement !== nominalCell) {
                            nominalCell.innerText = formatCurrency(nominal);
                        }
                        total += nominal;
                    } else if (document.activeElement !== nominalCell) {
                        const explicitNominal = parseCurrency(nominalCell.innerText);
                        total += explicitNominal;
                    } else {
                        total += parseCurrency(nominalCell.innerText);
                    }
                }
            });

            if (document.activeElement !== previewTotal) {
                previewTotal.innerText = formatCurrency(total);
            }
            recalculateSisa();
        };

        const recalculateSisa = () => {
            const total = parseCurrency(previewTotal.innerText);
            const dp = parseCurrency(previewDP.innerText);
            const sisa = total - dp;
            if (document.activeElement !== previewSisa) {
                previewSisa.innerText = formatCurrency(sisa);
            }
        };

        if (tableBody) {
            tableBody.addEventListener('input', recalculateTable);
        }
        if (previewTotal) previewTotal.addEventListener('input', recalculateSisa);
        if (previewDP) previewDP.addEventListener('input', recalculateSisa);

        const btnSave = document.getElementById('btnSaveInvoice');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                this.saveEditedInvoice();
            });
        }

        const btnReset = document.getElementById('btnResetInvoice');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                const id = new URLSearchParams(window.location.search).get("id");
                if (id) {
                    if (confirm("Apakah Anda yakin ingin menghapus semua perubahan dan mengembalikan invoice ini seperti semula?")) {
                        localStorage.removeItem('invoice_edit_' + id);
                        window.location.reload();
                    }
                }
            });
        }

        // Setup Document Type switcher listeners
        const btnInvoice = document.getElementById('btnTypeInvoice');
        const btnNota = document.getElementById('btnTypeNota');
        if (btnInvoice) {
            btnInvoice.addEventListener('click', () => {
                this.setDocumentType('invoice');
            });
        }
        if (btnNota) {
            btnNota.addEventListener('click', () => {
                this.setDocumentType('nota');
            });
        }

        // Setup Signature toggle listener
        const chkShowSignature = document.getElementById('chkShowSignature');
        if (chkShowSignature) {
            chkShowSignature.addEventListener('change', (e) => {
                this.toggleSignature(e.target.checked);
            });
        }

        recalculateTable();
    },

    saveEditedInvoice() {
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) return;

        const tableBody = document.getElementById('invoiceTableBody');
        const previewTotal = document.getElementById('previewTotal');
        const previewDP = document.getElementById('previewDP');
        const previewSisa = document.getElementById('previewSisa');
        const previewCatatan = document.getElementById('previewCatatan');
        const previewSignTitle = document.getElementById('previewSignTitle');
        const previewSignName = document.getElementById('previewSignName');
        const chkShowSignature = document.getElementById('chkShowSignature');

        const dataToSave = {
            tableHtml: tableBody ? tableBody.innerHTML : '',
            totalHtml: previewTotal ? previewTotal.innerHTML : '',
            dpHtml: previewDP ? previewDP.innerHTML : '',
            sisaHtml: previewSisa ? previewSisa.innerHTML : '',
            catatanHtml: previewCatatan ? previewCatatan.innerHTML : '',
            signTitle: previewSignTitle ? previewSignTitle.innerText : 'Hormat Kami,',
            signName: previewSignName ? previewSignName.innerText : 'Premium Desain',
            showSignature: chkShowSignature ? chkShowSignature.checked : true,
            docType: this.docType || 'invoice'
        };

        localStorage.setItem('invoice_edit_' + id, JSON.stringify(dataToSave));
        if (typeof Toast !== 'undefined') Toast.success('Tersimpan', 'Perubahan invoice berhasil disimpan di penyimpanan lokal browser.');
    },

    format(angka) {
        return Number(angka || 0).toLocaleString(
            "id-ID",
            {
                style: "currency",
                currency: "IDR"
            }
        );
    },
    exportPDF() {
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        const invoice = document.getElementById("invoiceArea");
        const invNo = document.getElementById("previewInvoiceNo") ? document.getElementById("previewInvoiceNo").innerText : 'FPManager';
        const prefix = (this.docType === 'nota') ? 'Nota' : 'Invoice';
        const fileName = `${prefix}-${invNo}.pdf`;

        if (typeof Toast !== 'undefined') {
            Toast.info(
                isEn ? "Generating PDF..." : `Membuat PDF ${prefix}...`,
                isEn ? "Please wait while your PDF is rendered offline." : `Mohon tunggu, file PDF ${prefix} sedang diproses secara offline.`
            );
        }

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set({
                margin: 0.2,
                filename: fileName,
                image: {
                    type: "jpeg",
                    quality: 1
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false
                },
                jsPDF: {
                    unit: "in",
                    format: "a4",
                    orientation: "portrait"
                }
            }).from(invoice).save().then(() => {
                if (typeof Toast !== 'undefined') {
                    Toast.success(
                        isEn ? "PDF Exported" : "PDF Berhasil Diunduh",
                        isEn ? `${prefix} ${fileName} has been generated.` : `File ${fileName} berhasil disimpan.`
                    );
                }
            }).catch(err => {
                console.error("html2pdf export error:", err);
                window.print();
            });
        } else {
            window.print();
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
                btnInvoice.className = "flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-all text-sm text-zinc-600 hover:text-zinc-900";
            }
            if (btnNota) {
                btnNota.className = "flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-all text-sm bg-indigo-600 text-white shadow-sm";
            }
        } else {
            if (titleEl) titleEl.innerText = "INVOICE";
            if (labelEl) labelEl.innerText = "No Invoice :";
            if (btnInvoice) {
                btnInvoice.className = "flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-all text-sm bg-indigo-600 text-white shadow-sm";
            }
            if (btnNota) {
                btnNota.className = "flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-all text-sm text-zinc-600 hover:text-zinc-900";
            }
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

        const logoWidth = 120; // Enlarge watermark logos by 50%
        const gap = 180;      // Proportionally larger gap/margin for clean spacing

        // Populate enough cols and rows to cover typical A4 height
        const cols = 8;
        const rows = 12;

        for (let r = 0; r < rows; r++) {
            // Stagger alternate rows to form a beautiful diamond watermark mesh
            const stagger = (r % 2 === 0) ? (gap / 2) : 0;
            for (let c = 0; c < cols; c++) {
                const img = document.createElement('img');
                img.src = 'assets/img/logo.png';
                img.style.position = 'absolute';
                img.style.width = `${logoWidth}px`;
                img.style.height = 'auto';
                img.style.opacity = '0.08'; // Clearly visible watermark
                img.style.pointerEvents = 'none';
                img.style.left = `${c * gap + stagger - 30}px`;
                img.style.top = `${r * gap - 20}px`;
                img.style.transform = 'rotate(-20deg)';
                img.setAttribute('data-html2canvas-ignore', 'false'); // Force html2pdf to render it
                grid.appendChild(img);
            }
        }
    }
};
document.addEventListener("DOMContentLoaded", () => {
    Invoice.init();
});
