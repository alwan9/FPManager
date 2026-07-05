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

        Tanggal: item.tanggal,

        Pelanggan: item.namaPelanggan,

        Proyek: item.namaProyek,

        Produk: item.produk,

        Jumlah: item.jumlah,

        Satuan: item.satuan,

        Harga: item.hargaSatuan,

        Nominal: item.nominalProyek,

        DP: item.dP,

        Sisa: item.sisaPembayaran,

        Deadline: item.deadline,

        Status: item.status,

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

}

