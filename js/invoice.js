const Invoice = {
    proyek: [],
    docType: 'invoice',
    showSignature: true,
    invoiceTheme: 'light',
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
        const dateRaw = new Date();
        const formatter = new Intl.DateTimeFormat(dateLocale, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            timeZone: "Asia/Jakarta"
        });
        document.getElementById("previewTanggal").innerText = formatter.format(dateRaw);
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
        // TOTAL, DP, PELUNASAN, SISA
        // ==========================
        document.getElementById("previewTotal").innerText =
            this.format(data.nominalProyek);
        document.getElementById("previewDP").innerText =
            this.format(data.dP);
        const pelunasanVal = this.getRawNumber(data.pelunasan);
        const pelunasanEl = document.getElementById("previewPelunasan");
        if (pelunasanEl) {
            pelunasanEl.innerText = this.format(pelunasanVal);
        }
        document.getElementById("previewSisa").innerText =
            this.format(data.sisaPembayaran);
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
            btnSave.addEventListener('click', () => {
                this.saveEditedInvoice();
            });
        }

        const btnReset = document.getElementById('btnResetInvoice');
        if (btnReset) {
            btnReset.addEventListener('click', async () => {
                const id = new URLSearchParams(window.location.search).get("id");
                if (id) {
                    if (await showConfirmModal({
                        title: "Reset Perubahan Invoice",
                        message: "Apakah Anda yakin ingin menghapus semua perubahan dan mengembalikan invoice ini seperti semula?",
                        type: "warning",
                        confirmText: "Kembalikan Semula"
                    })) {
                        localStorage.removeItem('invoice_edit_' + id);
                        localStorage.removeItem('invoice_theme');
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
        const previewPelunasan = document.getElementById('previewPelunasan');
        const previewSisa = document.getElementById('previewSisa');
        const previewCatatan = document.getElementById('previewCatatan');
        const previewSignTitle = document.getElementById('previewSignTitle');
        const previewSignName = document.getElementById('previewSignName');
        const chkShowSignature = document.getElementById('chkShowSignature');

        // Data murni (hanya numbering saja tanpa Rp. dan tanda baca)
        const rawData = {
            total: this.getRawNumber(previewTotal ? previewTotal.innerText : 0),
            dp: this.getRawNumber(previewDP ? previewDP.innerText : 0),
            pelunasan: this.getRawNumber(previewPelunasan ? previewPelunasan.innerText : 0),
            sisa: this.getRawNumber(previewSisa ? previewSisa.innerText : 0),
            items: []
        };

        if (tableBody) {
            const rows = tableBody.querySelectorAll('.invoice-row');
            rows.forEach((row, idx) => {
                const prod = row.querySelector('.editable-cell:not(.qty-cell):not(.price-cell):not(.nominal-cell)');
                const qty = row.querySelector('.qty-cell');
                const price = row.querySelector('.price-cell');
                const nom = row.querySelector('.nominal-cell');
                rawData.items.push({
                    no: idx + 1,
                    produk: prod ? prod.innerText.trim() : '',
                    qty: qty ? this.getRawNumber(qty.innerText) : 0,
                    harga: price ? this.getRawNumber(price.innerText) : 0,
                    nominal: nom ? this.getRawNumber(nom.innerText) : 0
                });
            });
        }

        const dataToSave = {
            tableHtml: tableBody ? tableBody.innerHTML : '',
            totalHtml: previewTotal ? previewTotal.innerHTML : '',
            dpHtml: previewDP ? previewDP.innerHTML : '',
            pelunasanHtml: previewPelunasan ? previewPelunasan.innerHTML : '',
            sisaHtml: previewSisa ? previewSisa.innerHTML : '',
            catatanHtml: previewCatatan ? previewCatatan.innerHTML : '',
            signTitle: previewSignTitle ? previewSignTitle.innerText : 'Hormat Kami,',
            signName: previewSignName ? previewSignName.innerText : '@premium_dz',
            showSignature: chkShowSignature ? chkShowSignature.checked : true,
            docType: this.docType || 'invoice',
            invoiceTheme: this.invoiceTheme || 'light',
            rawData: rawData
        };

        localStorage.setItem('invoice_edit_' + id, JSON.stringify(dataToSave));
        if (typeof Toast !== 'undefined') Toast.success('Tersimpan', 'Perubahan invoice berhasil disimpan di penyimpanan lokal browser.');
    },

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
        const invNo = document.getElementById("previewInvoiceNo") ? document.getElementById("previewInvoiceNo").innerText : 'FPManager';
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

        if (typeof html2pdf !== 'undefined') {
            const isDark = (this.invoiceTheme === 'dark');
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
                    logging: false,
                    backgroundColor: isDark ? '#121215' : '#ffffff'
                },
                jsPDF: {
                    unit: "in",
                    format: "a4",
                    orientation: "portrait"
                }
            }).from(invoice).save().then(() => {
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
