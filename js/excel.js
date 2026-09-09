function openExportModal() {

    document
        .getElementById("exportModal")
        .classList.remove("hidden");

    document
        .getElementById("exportModal")
        .classList.add("flex");

}

function closeExportModal() {

    document
        .getElementById("exportModal")
        .classList.add("hidden");

    document
        .getElementById("exportModal")
        .classList.remove("flex");

}

async function exportExcel() {
    const btn = document.querySelector('#exportModal button.bg-green-600') || document.querySelector('#exportModal button:last-child');
    if (btn && btn.disabled) return;

    const origText = btn ? btn.innerHTML : 'Export';
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Mengekspor...';
    }

    try {
        let data = await API.getProyek();

        const periode = document.querySelector(
            'input[name="periode"]:checked'
        ).value;

        const bulan = parseInt(
            document.getElementById("bulan").value
        );

        const tahun = parseInt(
            document.getElementById("tahun").value
        );

    if (periode === "month") {

        data = data.filter(item => {

            const t = new Date(item.tanggal);

            return (
                t.getMonth() + 1 === bulan &&
                t.getFullYear() === tahun
            );

        });

    }

    if (periode === "year") {

        data = data.filter(item => {

            const t = new Date(item.tanggal);

            return t.getFullYear() === tahun;

        });

    }

    const rows = data.map(item => ({

        ID: item.iDProyek,

        UserID: item.userId || "USR-001",

        Tanggal: item.tanggal,

        Pelanggan: item.namaPelanggan,

        Proyek: item.namaProyek,

        Produk: item.produk,

        Jumlah: item.jumlah,

        Satuan: item.satuan,

        Harga: item.hargaSatuan,

        Nominal: item.nominalProyek,

        DP: item.dP,

        Pelunasan: item.pelunasan || 0,

        Sisa: item.sisaPembayaran,

        Deadline: item.deadline,

        Status: item.status,

        Sumber: item.sumber || "WhatsApp",

        Catatan: item.catatan

    }));

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        "Data Proyek"
    );

    let namaFile = "Data-Proyek.xlsx";

    if (periode === "month")
        namaFile = `Data-Proyek-${bulan}-${tahun}.xlsx`;

    if (periode === "year")
        namaFile = `Data-Proyek-${tahun}.xlsx`;

    XLSX.writeFile(
        wb,
        namaFile
    );

    closeExportModal();

    if (typeof Toast !== 'undefined') {
        Toast.success('Export Berhasil', `File ${namaFile} berhasil diunduh.`);
    }

    } catch (err) {
        console.error('Export Excel error:', err);
        if (typeof Toast !== 'undefined') {
            Toast.error('Gagal Ekspor', 'Terjadi kesalahan saat memproses ekspor Excel.');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
            btn.innerHTML = origText;
        }
    }
}

