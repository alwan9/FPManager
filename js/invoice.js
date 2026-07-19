const Invoice = {
    proyek: [],
    async init() {
        this.generateWatermark();
        const isEn = (typeof CONFIG !== 'undefined' && CONFIG.LANG === 'en');
        try {
            this.proyek = await API.getProyek();
            console.log("DATA PROYEK =", this.proyek);
            const id = new URLSearchParams(window.location.search).get("id");
            console.log("ID URL =", id);
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
        console.log("Mencari ID :", id);
        const data = this.proyek.find(
            p => String(p.iDProyek).trim() === String(id).trim()
        );
        console.log("HASIL FIND =", data);
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

        const savedData = localStorage.getItem('invoice_edit_' + id);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.tableHtml) document.getElementById('invoiceTableBody').innerHTML = parsed.tableHtml;
                if (parsed.totalHtml) document.getElementById('previewTotal').innerHTML = parsed.totalHtml;
                if (parsed.dpHtml) document.getElementById('previewDP').innerHTML = parsed.dpHtml;
                if (parsed.sisaHtml) document.getElementById('previewSisa').innerHTML = parsed.sisaHtml;
            } catch(e) { console.error('Failed to parse saved invoice'); }
        }

    },
    
    setupEditable() {
        const tableBody = document.getElementById('invoiceTableBody');
        const previewTotal = document.getElementById('previewTotal');
        const previewDP = document.getElementById('previewDP');
        const previewSisa = document.getElementById('previewSisa');
        
        const parseCurrency = (str) => {
            if (!str) return 0;
            let cleaned = str.replace(/[^0-9,.-]+/g,"");
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
                        if(document.activeElement !== nominalCell) {
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
                    if(confirm("Apakah Anda yakin ingin menghapus semua perubahan dan mengembalikan invoice ini seperti semula?")) {
                        localStorage.removeItem('invoice_edit_' + id);
                        window.location.reload();
                    }
                }
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
        
        const dataToSave = {
            tableHtml: tableBody.innerHTML,
            totalHtml: previewTotal.innerHTML,
            dpHtml: previewDP.innerHTML,
            sisaHtml: previewSisa.innerHTML
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
        const invoice = document.getElementById("invoiceArea");
        html2pdf().set({
            margin: 0.4,
            filename:
                "Invoice-" +
                document.getElementById("previewInvoiceNo").innerText +
                ".pdf",
            image: {
                type: "jpeg",
                quality: 1
            },
            html2canvas: {
                scale: 2
            },
            jsPDF: {
                unit: "in",
                format: "a4",
                orientation: "portrait"
            }
        }).from(invoice).save();
    },
    generateWatermark() {
        const img = new Image();
        img.src = "./assets/img/logo.png";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Ukuran per-tile watermark (lebar x tinggi)
            // Tinggi 120px memberikan jarak atas-bawah yang longgar
            const tileWidth = 180;
            const tileHeight = 120;

            canvas.width = tileWidth;
            canvas.height = tileHeight;

            // Pertahankan rasio aspek logo
            const imgRatio = img.width / img.height;
            const logoWidth = 95; // Ukuran small
            const logoHeight = logoWidth / imgRatio;

            // Posisikan di tengah tile (memberikan ruang kosong di sekelilingnya)
            const x = (tileWidth - logoWidth) / 2;
            const y = (tileHeight - logoHeight) / 2;

            ctx.drawImage(img, x, y, logoWidth, logoHeight);

            const dataUrl = canvas.toDataURL();
            const style = document.createElement("style");
            style.innerHTML = `
                #invoiceArea::before {
                    background-image: url("${dataUrl}") !important;
                }
            `;
            document.head.appendChild(style);
        };
    }
};
document.addEventListener("DOMContentLoaded", () => {
    Invoice.init();
});

