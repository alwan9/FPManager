const Invoice = {
    proyek: [],
    async init() {
        try {
            this.proyek = await API.getProyek();
            console.log("DATA PROYEK =", this.proyek);
            const id = new URLSearchParams(window.location.search).get("id");
            console.log("ID URL =", id);
            if (!id) {

                Toast.warning(
                    "Invoice Tidak Ditemukan",
                    "ID proyek tidak ditemukan."
                );

                return;

            }
            this.loadInvoice(id);
            document
                .getElementById("btnPDF")
                .addEventListener("click", () => {
                    this.exportPDF();
                });
        } catch (err) {

            console.error(err);

            Toast.error(
                "Gagal Memuat Invoice",
                err.message || "Terjadi kesalahan saat mengambil data invoice."
            );

        }
    },
    loadInvoice(id) {
        console.log("Mencari ID :", id);
        const data = this.proyek.find(
            p => String(p.iDProyek).trim() === String(id).trim()
        );
        console.log("HASIL FIND =", data);
        if (!data) {

            Toast.warning(
                "Data Tidak Ditemukan",
                "Proyek yang dipilih tidak tersedia atau sudah dihapus."
            );

            return;

        }

        // HEADER
        // ==========================
        document.getElementById("previewInvoiceNo").innerText =
            data.iDProyek;
        document.getElementById("previewTanggal").innerText =
            new Date().toLocaleDateString("id-ID");
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
        const status = document.getElementById("previewStatus");
        status.innerText = data.status;
        status.className =
            "px-4 py-1 rounded-full text-white";
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
            case "Sudah Diambil":
                status.classList.add("bg-purple-600");
                break;
            default:
                status.classList.add("bg-gray-500");
        }
        // ==========================
        // DEADLINE
        // ==========================
        document.getElementById("previewDeadline").innerText =
            data.deadline || "-";
        // ==========================
        // CATATAN
        // ==========================
        document.getElementById("previewCatatan").innerText =
            data.catatan || "-";
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
    }
};
document.addEventListener("DOMContentLoaded", () => {
    Invoice.init();
});