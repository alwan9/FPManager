/**
 * FPManager - Fitur Import & Export Data Projek & Keuangan
 * Sesuai Struktur Database & Model Sistem (Proyek & Keuangan)
 */

// ==========================================
// 1. KONSTANTA PILIHAN VALID SISTEM
// ==========================================
const VALID_PROJECT_STATUSES = [
  "Menunggu",
  "Sedang Dikerjakan",
  "Revisi",
  "Selesai",
  "Belum Pembayaran",
  "Dibatalkan"
];

const VALID_PAYMENT_METHODS = [
  "QRIS",
  "Shopee",
  "BSI",
  "Transfer Bank",
  "ShopeePay",
  "Saldo Shopee",
  "Fiverr",
  "PayPal",
  "Payoneer",
  "Cash",
  "Tunai"
];

const VALID_SOURCES = [
  "WhatsApp",
  "Shopee",
  "Fiverr",
  "Website",
  "Instagram",
  "Lainnya"
];

const VALID_KEUANGAN_TYPES = [
  "Pemasukan",
  "Pengeluaran",
  "Mutasi"
];

// Global state untuk import preview Proyek
let importState = {
  file: null,
  fileName: "",
  parsedData: [],
  validRows: [],
  invalidRows: [],
  duplicateRows: [],
  isImporting: false,
  activeFilter: 'all' // 'all', 'valid', 'invalid', 'duplicate'
};

// Global state untuk import preview Keuangan
let importKeuanganState = {
  file: null,
  fileName: "",
  parsedData: [],
  validRows: [],
  invalidRows: [],
  duplicateRows: [],
  isImporting: false,
  activeFilter: 'all'
};

// ==========================================
// 2. MODAL EXPORT & LOGIC EXPORT EXCEL PROYEK
// ==========================================
function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function exportExcel() {
  const btn = document.querySelector('#exportModal button.bg-emerald-600') ||
              document.querySelector('#exportModal button.bg-green-600') ||
              document.querySelector('#exportModal button:last-child');
  if (btn && btn.disabled) return;

  const origText = btn ? btn.innerHTML : 'Export';
  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Mengekspor...';
  }

  try {
    let data = [];
    
    // 1. Ambil data dari tabel / cache / API
    if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
      data = await API.getProyek();
    } else if (Array.isArray(window.allProyekList)) {
      data = window.allProyekList;
    }

    if (!Array.isArray(data)) data = [];

    // 2. Cek filter rentang data
    const periodeInput = document.querySelector('input[name="periode"]:checked');
    const periode = periodeInput ? periodeInput.value : 'all';

    const bulanEl = document.getElementById("bulan");
    const bulan = bulanEl ? parseInt(bulanEl.value) : (new Date().getMonth() + 1);

    const tahunEl = document.getElementById("tahun");
    const tahun = tahunEl ? parseInt(tahunEl.value) : new Date().getFullYear();

    if (periode === "current") {
      if (typeof table !== 'undefined' && table && typeof table.rows === 'function') {
        const tableData = table.rows({ filter: 'applied' }).data().toArray();
        if (Array.isArray(tableData) && tableData.length > 0) {
          data = tableData;
        }
      }
    } else if (periode === "month") {
      data = data.filter(item => {
        const rawDate = item.tanggal || item.createdAt || item.deadline;
        if (!rawDate) return false;
        const t = new Date(rawDate);
        return !isNaN(t) && (t.getMonth() + 1 === bulan) && (t.getFullYear() === tahun);
      });
    } else if (periode === "year") {
      data = data.filter(item => {
        const rawDate = item.tanggal || item.createdAt || item.deadline;
        if (!rawDate) return false;
        const t = new Date(rawDate);
        return !isNaN(t) && (t.getFullYear() === tahun);
      });
    }

    if (data.length === 0) {
      if (typeof Toast !== 'undefined') {
        Toast.warning('Data Kosong', 'Tidak ada data projek pada filter / periode yang dipilih.');
      } else {
        alert('Tidak ada data projek pada filter / periode yang dipilih.');
      }
      return;
    }

    // 3. Mapping data ke kolom resmi sesuai format database (tanpa Created_at & Update_at jika diinginkan / atau sertakan saat export)
    const rows = data.map(item => {
      const nom = Number(item.nominalProyek !== undefined ? item.nominalProyek : (item.nominal || item.totalPembayaran || 0));
      const dp = Number(item.dP !== undefined ? item.dP : (item.dp || item.totalDp || 0));
      const pel = Number(item.pelunasan !== undefined ? item.pelunasan : (item.totalPelunasan || 0));
      const sisa = (item.sisaPembayaran !== undefined && item.sisaPembayaran !== null)
        ? Number(item.sisaPembayaran)
        : Math.max(0, nom - dp - pel);

      return {
        "Id_projek": item.iDProyek || item.idProjek || "",
        "Id_user": item.userId || "USR-001",
        "Id_transaksi": item.idTransaksi || "",
        "Nama_projek": item.namaProyek || "",
        "No_wa": item.nomorWA || item.noWa || item.wa || "",
        "Deatline": item.deadline || "",
        "Status": item.status || "Menunggu",
        "Link_Drive": item.gdriveLink || "",
        "Pelanggan": item.namaPelanggan || item.pelanggan || "",
        "Produk": item.produk || "",
        "Jumlah": item.jumlah !== undefined ? Number(item.jumlah) : 1,
        "Satuan": item.satuan || "pcs",
        "Harga_satuan": item.hargaSatuan !== undefined ? Number(item.hargaSatuan) : (nom / (Number(item.jumlah) || 1)),
        "Total_pembayaran": nom,
        "Sisa_pembayaran": sisa,
        "Sumber": item.sumber || "WhatsApp",
        "Catatan": item.catatan || "",
        "Id_designer": item.designerId || item.assignDesigner || ""
      };
    });

    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 18 }, // Id_projek
      { wch: 12 }, // Id_user
      { wch: 14 }, // Id_transaksi
      { wch: 30 }, // Nama_projek
      { wch: 16 }, // No_wa
      { wch: 14 }, // Deatline
      { wch: 18 }, // Status
      { wch: 36 }, // Link_Drive
      { wch: 22 }, // Pelanggan
      { wch: 20 }, // Produk
      { wch: 8 },  // Jumlah
      { wch: 10 }, // Satuan
      { wch: 14 }, // Harga_satuan
      { wch: 16 }, // Total_pembayaran
      { wch: 16 }, // Sisa_pembayaran
      { wch: 14 }, // Sumber
      { wch: 30 }, // Catatan
      { wch: 14 }  // Id_designer
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Proyek");

    let namaFile = `Data-Projek-${new Date().toISOString().split('T')[0]}.xlsx`;
    if (periode === "month") {
      namaFile = `Data-Projek-${bulan}-${tahun}.xlsx`;
    } else if (periode === "year") {
      namaFile = `Data-Projek-${tahun}.xlsx`;
    } else if (periode === "current") {
      namaFile = `Data-Projek-Filter-${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    XLSX.writeFile(wb, namaFile);
    closeExportModal();

    if (typeof Toast !== 'undefined') {
      Toast.success('Export Berhasil', `File ${namaFile} berhasil diunduh (${rows.length} data).`);
    }
  } catch (err) {
    console.error('Export Excel error:', err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Ekspor', 'Terjadi kesalahan saat mengekspor data: ' + (err.message || err));
    } else {
      alert('Gagal mengekspor data: ' + err.message);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-60', 'cursor-not-allowed', 'pointer-events-none');
      btn.innerHTML = origText;
    }
  }
}

// ==========================================
// 3. FITUR DOWNLOAD TEMPLATE EXCEL RESMI (PROYEK)
// Catatan: Created_at & Update_at dibuat otomatis oleh sistem (tidak masuk template)
// ==========================================
function downloadProjectTemplateExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();

    // 1. Data Sheet Template Proyek (Tanpa Created_at dan Update_at)
    const templateRows = [
      {
        "Nama_projek": "Website Company Profile PT Maju",
        "Pelanggan": "PT Maju Bersama",
        "No_wa": "6281234567890",
        "Deatline": "2026-10-25",
        "Status": "Sedang Dikerjakan",
        "Link_Drive": "https://drive.google.com/drive/folders/contoh-folder-1",
        "Produk": "Web Development",
        "Jumlah": 1,
        "Satuan": "paket",
        "Harga_satuan": 2500000,
        "Total_pembayaran": 2500000,
        "Sisa_pembayaran": 2000000,
        "Sumber": "WhatsApp",
        "Catatan": "DP 500rb via QRIS",
        "Id_designer": "USR-001"
      },
      {
        "Nama_projek": "Desain Logo & Branding",
        "Pelanggan": "CV Berkah",
        "No_wa": "6285678901234",
        "Deatline": "2026-10-15",
        "Status": "Selesai",
        "Link_Drive": "https://drive.google.com/drive/folders/contoh-folder-2",
        "Produk": "Desain Logo",
        "Jumlah": 1,
        "Satuan": "pcs",
        "Harga_satuan": 45000,
        "Total_pembayaran": 45000,
        "Sisa_pembayaran": 0,
        "Sumber": "Shopee",
        "Catatan": "Pembayaran lunas via Shopee",
        "Id_designer": "USR-001"
      },
      {
        "Nama_projek": "Box Martabak",
        "Pelanggan": "Martabak Enak",
        "No_wa": "6282190816661",
        "Deatline": "2026-10-20",
        "Status": "Sedang Dikerjakan",
        "Link_Drive": "https://drive.google.com/drive/folders/contoh-folder-3",
        "Produk": "Desain Box",
        "Jumlah": 1,
        "Satuan": "pcs",
        "Harga_satuan": 69000,
        "Total_pembayaran": 69000,
        "Sisa_pembayaran": 30000,
        "Sumber": "Shopee",
        "Catatan": "DP 39rb via Shopee, pelunasan 30rb via QRIS",
        "Id_designer": "USR-001"
      }
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);

    wsTemplate['!cols'] = [
      { wch: 32 }, // Nama_projek
      { wch: 22 }, // Pelanggan
      { wch: 18 }, // No_wa
      { wch: 14 }, // Deatline
      { wch: 18 }, // Status
      { wch: 36 }, // Link_Drive
      { wch: 22 }, // Produk
      { wch: 8 },  // Jumlah
      { wch: 10 }, // Satuan
      { wch: 16 }, // Harga_satuan
      { wch: 18 }, // Total_pembayaran
      { wch: 18 }, // Sisa_pembayaran
      { wch: 14 }, // Sumber
      { wch: 36 }, // Catatan
      { wch: 14 }  // Id_designer
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Proyek");

    // 2. Sheet Petunjuk
    const guideRows = [
      { "PANDUAN IMPORT PROJEK FPManager": "Silakan ikuti petunjuk pengisian file Excel ini:" },
      { "PANDUAN IMPORT PROJEK FPManager": "" },
      { "PANDUAN IMPORT PROJEK FPManager": "1. Kolom Wajib Diisi: Nama_projek, Pelanggan, Total_pembayaran." },
      { "PANDUAN IMPORT PROJEK FPManager": "2. Id_projek & Id_transaksi: Otomatis digenerate sistem jika dikosongkan." },
      { "PANDUAN IMPORT PROJEK FPManager": "3. Created_at & Update_at: Otomatis diisi waktu sekarang saat proses import (tidak perlu diisi di Excel)." },
      { "PANDUAN IMPORT PROJEK FPManager": "4. Deatline: Format YYYY-MM-DD (contoh: 2026-10-25)." },
      { "PANDUAN IMPORT PROJEK FPManager": "5. Status: Menunggu, Sedang Dikerjakan, Revisi, Selesai, Belum Pembayaran, Dibatalkan." },
      { "PANDUAN IMPORT PROJEK FPManager": "6. Sumber: WhatsApp, Shopee, Fiverr, Website, Instagram, Lainnya." },
      { "PANDUAN IMPORT PROJEK FPManager": "7. Sisa_pembayaran: Jika kosong, otomatis dihitung: Total_pembayaran - DP." }
    ];

    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

    XLSX.writeFile(wb, "Template-Import-Proyek-FPManager.xlsx");

    if (typeof Toast !== 'undefined') {
      Toast.success('Template Diunduh', 'Template Excel Proyek resmi berhasil diunduh.');
    }
  } catch (err) {
    console.error('Download template proyek error:', err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Download Template', 'Terjadi kesalahan saat membuat template: ' + (err.message || err));
    }
  }
}

// ==========================================
// 4. FITUR DOWNLOAD TEMPLATE EXCEL RESMI (KEUANGAN)
// Catatan: Created_at & Update_at dibuat otomatis oleh sistem (tidak masuk template)
// ==========================================
function downloadKeuanganTemplateExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();

    // 1. Data Sheet Template Keuangan (Tanpa Created_at dan Update_at)
    const templateRows = [
      {
        "Id_projek": "PRJ-002-editvideofutiya",
        "Jenis": "Pemasukan",
        "Keterangan": "Pembayaran DP - Futiya (PRJ-002-editvideofutiya)",
        "Metode_bayar_dp": "QRIS",
        "Metode_bayar_pelunasan": "QRIS",
        "Total_dp": 10000,
        "Total_pelunasan": 15000,
        "Total_pembayaran": 25000
      },
      {
        "Id_projek": "PRJ-004-desainboxmartabak",
        "Jenis": "Pemasukan",
        "Keterangan": "Pembayaran DP - Martabak (PRJ-004-desainboxmartabak)",
        "Metode_bayar_dp": "Shopee",
        "Metode_bayar_pelunasan": "QRIS",
        "Total_dp": 39000,
        "Total_pelunasan": 30000,
        "Total_pembayaran": 69000
      },
      {
        "Id_projek": "",
        "Jenis": "Pengeluaran",
        "Keterangan": "Beli langganan tools desain",
        "Metode_bayar_dp": "QRIS",
        "Metode_bayar_pelunasan": "QRIS",
        "Total_dp": 50000,
        "Total_pelunasan": 0,
        "Total_pembayaran": 50000
      },
      {
        "Id_projek": "",
        "Jenis": "Mutasi",
        "Keterangan": "Mutasi Pengeluaran QRIS ke BSI",
        "Metode_bayar_dp": "QRIS",
        "Metode_bayar_pelunasan": "BSI",
        "Total_dp": 0,
        "Total_pelunasan": 0,
        "Total_pembayaran": 450000
      }
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);

    wsTemplate['!cols'] = [
      { wch: 26 }, // Id_projek
      { wch: 16 }, // Jenis
      { wch: 45 }, // Keterangan
      { wch: 18 }, // Metode_bayar_dp
      { wch: 22 }, // Metode_bayar_pelunasan
      { wch: 16 }, // Total_dp
      { wch: 18 }, // Total_pelunasan
      { wch: 18 }  // Total_pembayaran
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Keuangan");

    // 2. Sheet Petunjuk
    const guideRows = [
      { "PANDUAN IMPORT KEUANGAN FPManager": "Silakan ikuti petunjuk pengisian file Excel Keuangan ini:" },
      { "PANDUAN IMPORT KEUANGAN FPManager": "" },
      { "PANDUAN IMPORT KEUANGAN FPManager": "1. Kolom Wajib Diisi: Jenis (Pemasukan / Pengeluaran / Mutasi), Keterangan, Total_pembayaran." },
      { "PANDUAN IMPORT KEUANGAN FPManager": "2. Id_transaksi: Otomatis digenerate sistem jika dikosongkan (contoh: TRX-031)." },
      { "PANDUAN IMPORT KEUANGAN FPManager": "3. Id_projek: Opsional. Jika diisi dengan ID Projek yang valid, transaksi akan otomatis terhubung ke projek tersebut." },
      { "PANDUAN IMPORT KEUANGAN FPManager": "4. Created_at & Update_at: Otomatis diisi waktu sekarang oleh sistem (tidak perlu diisi di Excel)." },
      { "PANDUAN IMPORT KEUANGAN FPManager": "5. Metode Pembayaran: QRIS, Shopee, BSI, Transfer Bank, ShopeePay, Saldo Shopee, Fiverr, PayPal, Payoneer, Cash/Tunai." },
      { "PANDUAN IMPORT KEUANGAN FPManager": "6. Untuk Mutasi Saldo: Metode_bayar_dp = Rekening Asal, Metode_bayar_pelunasan = Rekening Tujuan." }
    ];

    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

    XLSX.writeFile(wb, "Template-Import-Keuangan-FPManager.xlsx");

    if (typeof Toast !== 'undefined') {
      Toast.success('Template Diunduh', 'Template Excel Keuangan resmi berhasil diunduh.');
    }
  } catch (err) {
    console.error('Download template keuangan error:', err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Download Template', 'Terjadi kesalahan saat membuat template Keuangan: ' + (err.message || err));
    }
  }
}

// ==========================================
// 5. EXPORT KEUANGAN KE EXCEL
// ==========================================
async function exportKeuanganToExcel(periode = "all", bulan, tahun) {
  try {
    let data = [];
    if (typeof API !== 'undefined' && typeof API.getKeuangan === 'function') {
      data = await API.getKeuangan();
    }

    if (!Array.isArray(data) || data.length === 0) {
      if (typeof Toast !== 'undefined') {
        Toast.warning('Data Kosong', 'Tidak ada data keuangan yang dapat diekspor.');
      } else {
        alert('Tidak ada data keuangan yang dapat diekspor.');
      }
      return;
    }

    const rows = data.map(k => {
      const dp = Number(k.dp !== undefined ? k.dp : (k.totalDp || 0));
      const pel = Number(k.pelunasan !== undefined ? k.pelunasan : (k.totalPelunasan || 0));
      const tot = Number(k.nominal !== undefined ? k.nominal : (k.totalPembayaran || (dp + pel)));

      return {
        "Id_transaksi": k.idTransaksi || k.id || "",
        "Id_user": k.userId || "USR-001",
        "Id_projek": k.idProjek || k.idProyek || "",
        "Jenis": k.jenis || "Pemasukan",
        "Keterangan": k.keterangan || "",
        "Metode_bayar_dp": k.metodeBayarDp || k.metodePembayaran || "QRIS",
        "Metode_bayar_pelunasan": k.metodeBayarPelunasan || k.metodeBayarDp || "QRIS",
        "Total_dp": dp,
        "Total_pelunasan": pel,
        "Total_pembayaran": tot
      };
    });

    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 16 }, // Id_transaksi
      { wch: 12 }, // Id_user
      { wch: 26 }, // Id_projek
      { wch: 16 }, // Jenis
      { wch: 45 }, // Keterangan
      { wch: 18 }, // Metode_bayar_dp
      { wch: 22 }, // Metode_bayar_pelunasan
      { wch: 16 }, // Total_dp
      { wch: 18 }, // Total_pelunasan
      { wch: 18 }  // Total_pembayaran
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");

    const namaFile = `Data-Keuangan-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, namaFile);

    if (typeof Toast !== 'undefined') {
      Toast.success('Export Berhasil', `File ${namaFile} berhasil diunduh (${rows.length} transaksi).`);
    }
  } catch (err) {
    console.error('Export Keuangan error:', err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Ekspor', 'Terjadi kesalahan saat mengekspor data: ' + (err.message || err));
    }
  }
}

// ==========================================
// 6. MODAL IMPORT EXCEL & STATE MANAGEMENT (PROYEK)
// ==========================================
function openImportModal() {
  resetImportState();
  const modal = document.getElementById("importExcelModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  showImportStep(1);
}

function closeImportModal() {
  if (importState.isImporting) {
    if (!confirm("Proses import sedang berlangsung. Yakin ingin menutup?")) {
      return;
    }
  }
  const modal = document.getElementById("importExcelModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  resetImportState();
}

function resetImportState() {
  importState = {
    file: null,
    fileName: "",
    parsedData: [],
    validRows: [],
    invalidRows: [],
    duplicateRows: [],
    isImporting: false,
    activeFilter: 'all'
  };

  const fileInput = document.getElementById("excelFileInput");
  if (fileInput) fileInput.value = "";

  const fileInfo = document.getElementById("importFileInfo");
  if (fileInfo) fileInfo.classList.add("hidden");

  const dropzone = document.getElementById("importDropzone");
  if (dropzone) dropzone.classList.remove("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20");

  const btnProcess = document.getElementById("btnExecuteImport");
  if (btnProcess) {
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2"></i> Import Data Valid';
  }

  const btnFinish = document.getElementById("btnFinishImport");
  if (btnFinish) btnFinish.classList.add("hidden");
}

function showImportStep(step) {
  const step1 = document.getElementById("importStep1");
  const step2 = document.getElementById("importStep2");
  const step3 = document.getElementById("importStep3");

  if (step1) step1.classList.toggle("hidden", step !== 1);
  if (step2) step2.classList.toggle("hidden", step !== 2);
  if (step3) step3.classList.toggle("hidden", step !== 3);
}

// ==========================================
// 7. PARSING & VALIDASI FILE EXCEL PROYEK
// ==========================================

function parseCleanNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/Rp/gi, '').replace(/\s+/g, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function parseExcelDate(rawDate) {
  if (!rawDate) return "";
  if (rawDate instanceof Date && !isNaN(rawDate)) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof rawDate === "number") {
    const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    if (!isNaN(jsDate)) {
      const y = jsDate.getFullYear();
      const m = String(jsDate.getMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed) && parsed.getFullYear() > 2000) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

function normalizeHeaderKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Match Kolom Excel ke Kolom Sistem Proyek
function mapRowFields(rawRow) {
  const mapped = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const norm = normalizeHeaderKey(k);
    if (norm === "idprojek" || norm === "idproyek" || norm === "id") {
      mapped.idProyek = v;
    } else if (norm === "iduser" || norm === "userid") {
      mapped.userId = v;
    } else if (norm === "idtransaksi" || norm === "idkas") {
      mapped.idTransaksi = v;
    } else if (norm.includes("namaproyek") || norm === "proyek" || norm === "nama" || norm === "project" || norm === "namaprojek") {
      mapped.namaProyek = v;
    } else if (norm.includes("pelanggan") || norm.includes("client") || norm.includes("klien") || norm === "customer") {
      mapped.pelanggan = v;
    } else if (norm.includes("whatsapp") || norm.includes("nomorwa") || norm === "wa" || norm === "kontak" || norm === "telepon" || norm === "hp" || norm === "nowa") {
      mapped.wa = v;
    } else if (norm.includes("produk") || norm.includes("layanan") || norm === "service") {
      mapped.produk = v;
    } else if (norm === "jumlah" || norm === "qty" || norm === "quantity") {
      mapped.jumlah = v;
    } else if (norm === "satuan" || norm === "unit") {
      mapped.satuan = v;
    } else if (norm.includes("hargasatuan") || norm === "harga" || norm === "price") {
      mapped.hargaSatuan = v;
    } else if (norm.includes("totalpembayaran") || norm.includes("totalproyek") || norm.includes("nominal") || norm === "total" || norm === "biaya") {
      mapped.nominal = v;
    } else if (norm.includes("sisapembayaran") || norm === "sisa" || norm.includes("sisatagihan")) {
      mapped.sisa = v;
    } else if (norm === "dp" || norm.includes("uangmuka") || norm.includes("downpayment") || norm === "totaldp") {
      mapped.dp = v;
    } else if (norm.includes("metodedp") || norm.includes("metodebayardp") || norm.includes("metodepembayaran") || norm === "metode") {
      mapped.metodePembayaran = v;
    } else if (norm === "pelunasan" || norm.includes("pelunasanrp") || norm === "totalpelunasan") {
      mapped.pelunasan = v;
    } else if (norm.includes("metodepelunasan") || norm.includes("metodebayarpelunasan")) {
      mapped.metodeBayarPelunasan = v;
    } else if (norm.includes("deadline") || norm.includes("tenggat") || norm === "duedate" || norm.includes("deatline")) {
      mapped.deadline = v;
    } else if (norm === "status" || norm.includes("statusproyek") || norm.includes("statusprojek")) {
      mapped.status = v;
    } else if (norm === "sumber" || norm === "source" || norm.includes("channel")) {
      mapped.sumber = v;
    } else if (norm.includes("drive") || norm.includes("gdrive") || norm.includes("link") || norm.includes("linkdrive")) {
      mapped.gdriveLink = v;
    } else if (norm.includes("designer") || norm.includes("desainer") || norm === "assign") {
      mapped.designerId = v;
    } else if (norm === "catatan" || norm === "keterangan" || norm === "notes" || norm === "note") {
      mapped.catatan = v;
    }
  }
  return mapped;
}

// Validasi Baris Data Projek
function validateProjectRow(rawItem, rowIndex, existingProjects = [], inMemoryMap = new Map()) {
  const row = mapRowFields(rawItem);
  const errors = [];
  const warnings = [];
  let isDuplicate = false;

  const namaProyek = String(row.namaProyek || "").trim();
  if (!namaProyek) {
    errors.push("Nama Proyek* wajib diisi.");
  }

  const pelanggan = String(row.pelanggan || "").trim();
  if (!pelanggan) {
    errors.push("Client / Pelanggan* wajib diisi.");
  }

  const qty = row.jumlah !== undefined && row.jumlah !== null && String(row.jumlah).trim() !== "" ? parseCleanNumber(row.jumlah) : 1;
  const hargaSatuan = parseCleanNumber(row.hargaSatuan);
  let rawNominal = row.nominal;
  let nominal = parseCleanNumber(rawNominal);

  if (nominal <= 0 && qty > 0 && hargaSatuan > 0) {
    nominal = Math.round(qty * hargaSatuan);
  }

  if (nominal <= 0) {
    errors.push("Total Pembayaran / Nominal Proyek harus berupa angka lebih besar dari 0.");
  }

  const rawDp = row.dp;
  const dp = parseCleanNumber(rawDp);
  if (dp < 0) {
    errors.push("DP tidak boleh bernilai negatif.");
  }
  if (dp > nominal && nominal > 0) {
    errors.push(`Nominal DP (Rp ${dp.toLocaleString('id-ID')}) melebihi Total Pembayaran (Rp ${nominal.toLocaleString('id-ID')}).`);
  }

  let metodeDP = String(row.metodePembayaran || "").trim();
  if (dp > 0) {
    if (!metodeDP) {
      metodeDP = "QRIS";
    } else {
      const matchedMethod = VALID_PAYMENT_METHODS.find(m => m.toLowerCase() === metodeDP.toLowerCase());
      if (matchedMethod) {
        metodeDP = matchedMethod;
      }
    }
  } else if (!metodeDP) {
    metodeDP = "QRIS";
  }

  const pelunasan = parseCleanNumber(row.pelunasan);
  let metodePelunasan = String(row.metodeBayarPelunasan || "").trim();
  if (pelunasan > 0) {
    if (!metodePelunasan) {
      metodePelunasan = metodeDP || "QRIS";
    }
  }

  let sisa = (row.sisa !== undefined && row.sisa !== null && String(row.sisa).trim() !== "")
    ? parseCleanNumber(row.sisa)
    : Math.max(0, nominal - dp - pelunasan);

  let deadline = parseExcelDate(row.deadline);
  let status = String(row.status || "").trim();
  if (!status) {
    status = "Menunggu";
  } else {
    const matchedStatus = VALID_PROJECT_STATUSES.find(s => s.toLowerCase() === status.toLowerCase());
    if (matchedStatus) {
      status = matchedStatus;
    }
  }

  let sumber = String(row.sumber || "").trim();
  if (!sumber) {
    sumber = "WhatsApp";
  } else {
    const matchedSource = VALID_SOURCES.find(s => s.toLowerCase() === sumber.toLowerCase());
    if (matchedSource) {
      sumber = matchedSource;
    }
  }

  let cleanWA = String(row.wa || "").trim();
  if (cleanWA) {
    const digitsOnly = cleanWA.replace(/\D/g, "");
    if (digitsOnly.length > 0) {
      if (digitsOnly.startsWith("0")) {
        cleanWA = "62" + digitsOnly.slice(1);
      } else if (!digitsOnly.startsWith("62")) {
        cleanWA = "62" + digitsOnly;
      } else {
        cleanWA = digitsOnly;
      }
    }
  }

  // Cek duplikasi
  const duplicateKey = `${namaProyek.toLowerCase()}_${pelanggan.toLowerCase()}`;
  if (inMemoryMap.has(duplicateKey)) {
    isDuplicate = true;
    warnings.push(`Duplikat di dalam file Excel (sama dengan baris ke-${inMemoryMap.get(duplicateKey)}).`);
  } else {
    inMemoryMap.set(duplicateKey, rowIndex);
  }

  if (Array.isArray(existingProjects) && existingProjects.length > 0) {
    const existsInDb = existingProjects.some(p => {
      const pName = String(p.namaProyek || "").toLowerCase().trim();
      const pClient = String(p.namaPelanggan || p.pelanggan || "").toLowerCase().trim();
      return pName === namaProyek.toLowerCase() && pClient === pelanggan.toLowerCase();
    });
    if (existsInDb) {
      isDuplicate = true;
      warnings.push("Data dengan Nama Projek & Pelanggan ini sudah ada di database.");
    }
  }

  const payload = {
    idProyek: String(row.idProyek || "").trim(),
    userId: String(row.userId || "USR-001").trim(),
    idTransaksi: String(row.idTransaksi || "").trim(),
    namaProyek,
    pelanggan,
    wa: cleanWA,
    produk: String(row.produk || "").trim(),
    jumlah: qty,
    satuan: String(row.satuan || "pcs").trim(),
    hargaSatuan: hargaSatuan > 0 ? hargaSatuan : (nominal / qty),
    nominal,
    totalPembayaran: nominal,
    dp,
    metodePembayaran: metodeDP,
    metodeBayarDp: metodeDP,
    pelunasan,
    metodeBayarPelunasan: metodePelunasan,
    sisa,
    sisaPembayaran: sisa,
    deadline,
    status,
    sumber,
    gdriveLink: String(row.gdriveLink || "").trim(),
    catatan: String(row.catatan || "").trim(),
    designerId: String(row.designerId || "").trim()
  };

  const isValid = errors.length === 0;

  return {
    rowIndex,
    original: rawItem,
    payload,
    isValid,
    isDuplicate,
    errors,
    warnings
  };
}

// Handler saat file Excel Proyek dipilih
async function handleProjectExcelFile(file) {
  if (!file) return;

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExts.includes(ext)) {
    if (typeof Toast !== 'undefined') {
      Toast.error('Format Tidak Didukung', 'Harap upload file berformat Excel (.xlsx, .xls) atau .csv');
    } else {
      alert('Format file tidak didukung. Gunakan .xlsx atau .xls');
    }
    return;
  }

  importState.file = file;
  importState.fileName = file.name;

  const fileInfo = document.getElementById("importFileInfo");
  const fileNameEl = document.getElementById("importFileName");
  const fileSizeEl = document.getElementById("importFileSize");
  if (fileInfo && fileNameEl && fileSizeEl) {
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = (file.size / 1024).toFixed(1) + " KB";
    fileInfo.classList.remove("hidden");
  }

  let existingProjects = [];
  try {
    if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
      existingProjects = await API.getProyek();
    } else if (Array.isArray(window.allProyekList)) {
      existingProjects = window.allProyekList;
    }
  } catch (e) {
    console.warn("Peringatan membaca existing project:", e);
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      if (typeof XLSX === 'undefined') {
        throw new Error("Pustaka SheetJS (XLSX) tidak tersedia.");
      }

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        if (typeof Toast !== 'undefined') {
          Toast.warning('File Kosong', 'Tidak ada baris data yang ditemukan pada file Excel.');
        } else {
          alert('File Excel kosong atau tidak memiliki baris data.');
        }
        return;
      }

      const filteredRows = rawRows.filter(r => {
        return Object.values(r).some(val => String(val).trim() !== "");
      });

      if (filteredRows.length === 0) {
        if (typeof Toast !== 'undefined') {
          Toast.warning('File Kosong', 'Semua baris data pada file Excel kosong.');
        } else {
          alert('Semua baris data pada file Excel kosong.');
        }
        return;
      }

      const validatedList = [];
      const validRows = [];
      const invalidRows = [];
      const duplicateRows = [];
      const inMemoryMap = new Map();

      filteredRows.forEach((r, idx) => {
        const excelRowNumber = idx + 2;
        const res = validateProjectRow(r, excelRowNumber, existingProjects, inMemoryMap);
        validatedList.push(res);

        if (res.isValid) {
          validRows.push(res);
        } else {
          invalidRows.push(res);
        }

        if (res.isDuplicate) {
          duplicateRows.push(res);
        }
      });

      importState.parsedData = validatedList;
      importState.validRows = validRows;
      importState.invalidRows = invalidRows;
      importState.duplicateRows = duplicateRows;

      renderImportPreview();
      showImportStep(2);

      if (typeof Toast !== 'undefined') {
        Toast.info('Validasi Selesai', `Total ${validatedList.length} baris: ${validRows.length} siap diimport, ${invalidRows.length} error, ${duplicateRows.length} potensi duplikat.`);
      }
    } catch (err) {
      console.error('Gagal membaca file Excel:', err);
      if (typeof Toast !== 'undefined') {
        Toast.error('Gagal Membaca File', 'File Excel rusak atau struktur data tidak dapat dibaca: ' + (err.message || err));
      } else {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    }
  };

  reader.readAsArrayBuffer(file);
}

function filterImportPreview(filterType) {
  importState.activeFilter = filterType;

  const tabAll = document.getElementById("tabPreviewAll");
  const tabValid = document.getElementById("tabPreviewValid");
  const tabInvalid = document.getElementById("tabPreviewInvalid");
  const tabDuplicate = document.getElementById("tabPreviewDuplicate");

  [tabAll, tabValid, tabInvalid, tabDuplicate].forEach(tab => {
    if (tab) {
      tab.classList.remove("border-indigo-600", "text-indigo-600", "dark:text-indigo-400", "font-bold");
      tab.classList.add("border-transparent", "text-zinc-500", "font-medium");
    }
  });

  if (filterType === 'all' && tabAll) {
    tabAll.classList.add("border-indigo-600", "text-indigo-600", "dark:text-indigo-400", "font-bold");
    tabAll.classList.remove("border-transparent", "text-zinc-500");
  } else if (filterType === 'valid' && tabValid) {
    tabValid.classList.add("border-indigo-600", "text-indigo-600", "dark:text-indigo-400", "font-bold");
    tabValid.classList.remove("border-transparent", "text-zinc-500");
  } else if (filterType === 'invalid' && tabInvalid) {
    tabInvalid.classList.add("border-indigo-600", "text-indigo-600", "dark:text-indigo-400", "font-bold");
    tabInvalid.classList.remove("border-transparent", "text-zinc-500");
  } else if (filterType === 'duplicate' && tabDuplicate) {
    tabDuplicate.classList.add("border-indigo-600", "text-indigo-600", "dark:text-indigo-400", "font-bold");
    tabDuplicate.classList.remove("border-transparent", "text-zinc-500");
  }

  renderImportTable();
}

function renderImportPreview() {
  const totalCount = importState.parsedData.length;
  const validCount = importState.validRows.length;
  const invalidCount = importState.invalidRows.length;
  const duplicateCount = importState.duplicateRows.length;

  const countTotalEl = document.getElementById("importCountTotal");
  const countValidEl = document.getElementById("importCountValid");
  const countInvalidEl = document.getElementById("importCountInvalid");
  const countDuplicateEl = document.getElementById("importCountDuplicate");
  const badgeValidTab = document.getElementById("badgeTabValid");
  const badgeInvalidTab = document.getElementById("badgeTabInvalid");
  const badgeDuplicateTab = document.getElementById("badgeTabDuplicate");

  if (countTotalEl) countTotalEl.textContent = totalCount;
  if (countValidEl) countValidEl.textContent = validCount;
  if (countInvalidEl) countInvalidEl.textContent = invalidCount;
  if (countDuplicateEl) countDuplicateEl.textContent = duplicateCount;
  if (badgeValidTab) badgeValidTab.textContent = validCount;
  if (badgeInvalidTab) badgeInvalidTab.textContent = invalidCount;
  if (badgeDuplicateTab) badgeDuplicateTab.textContent = duplicateCount;

  const warningBanner = document.getElementById("importWarningBanner");
  const warningText = document.getElementById("importWarningText");
  if (warningBanner && warningText) {
    if (invalidCount > 0) {
      warningBanner.classList.remove("hidden");
      warningText.innerHTML = `<strong>Terdapat ${invalidCount} baris bermasalah.</strong> Baris dengan error tidak akan dimasukkan. Anda dapat memperbaiki file Excel lalu upload kembali, atau melanjutkan import hanya untuk <strong>${validCount} data yang valid</strong>.`;
    } else if (duplicateCount > 0) {
      warningBanner.classList.remove("hidden");
      warningText.innerHTML = `<strong>Perhatian:</strong> Ditemukan <strong>${duplicateCount} baris dengan potensi duplikat</strong>. Data tetap dapat diimport bila semua field wajib valid.`;
    } else {
      warningBanner.classList.add("hidden");
    }
  }

  const btnExecute = document.getElementById("btnExecuteImport");
  if (btnExecute) {
    if (validCount > 0) {
      btnExecute.disabled = false;
      btnExecute.classList.remove("opacity-50", "cursor-not-allowed");
      btnExecute.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-2"></i> Import ${validCount} Projek Valid`;
    } else {
      btnExecute.disabled = true;
      btnExecute.classList.add("opacity-50", "cursor-not-allowed");
      btnExecute.innerHTML = `<i class="fa-solid fa-circle-xmark mr-2"></i> Tidak Ada Data Valid`;
    }
  }

  filterImportPreview('all');
}

function renderImportTable() {
  const tableBody = document.getElementById("importPreviewTableBody");
  if (!tableBody) return;

  let itemsToRender = importState.parsedData;
  if (importState.activeFilter === 'valid') {
    itemsToRender = importState.validRows;
  } else if (importState.activeFilter === 'invalid') {
    itemsToRender = importState.invalidRows;
  } else if (importState.activeFilter === 'duplicate') {
    itemsToRender = importState.duplicateRows;
  }

  if (itemsToRender.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
          Tidak ada data pada tab filter ini.
        </td>
      </tr>
    `;
    return;
  }

  const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);

  let html = '';
  itemsToRender.forEach(item => {
    const p = item.payload;
    let statusBadge = '';

    if (!item.isValid) {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Error</span>`;
    } else if (item.isDuplicate) {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><i class="fa-solid fa-copy mr-1"></i> Duplikat</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><i class="fa-solid fa-check mr-1"></i> Siap Import</span>`;
    }

    let notesOrError = '';
    if (item.errors.length > 0) {
      notesOrError = `<ul class="list-disc list-inside text-rose-600 dark:text-rose-400 text-[11px] space-y-0.5 font-medium">
        ${item.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
      </ul>`;
    } else if (item.warnings.length > 0) {
      notesOrError = `<ul class="list-disc list-inside text-amber-600 dark:text-amber-400 text-[11px] space-y-0.5">
        ${item.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
      </ul>`;
    } else {
      notesOrError = `<span class="text-zinc-500 dark:text-zinc-400 text-[11px]">${escapeHtml(p.catatan || '-')}</span>`;
    }

    const rowBg = !item.isValid
      ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30'
      : (item.isDuplicate
        ? 'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/50 dark:hover:bg-amber-950/25'
        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50');

    html += `
      <tr class="border-b border-zinc-100 dark:border-zinc-800 transition-colors ${rowBg}">
        <td class="px-3 py-2.5 font-mono text-zinc-500 text-center text-xs">
          ${item.rowIndex}
        </td>
        <td class="px-3 py-2.5 text-center whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 text-xs max-w-[180px] truncate" title="${escapeHtml(p.namaProyek)}">
          ${escapeHtml(p.namaProyek || '-')}
          <div class="text-[10px] text-zinc-400 font-normal">${escapeHtml(p.produk || 'Umum')}</div>
        </td>
        <td class="px-3 py-2.5 text-zinc-700 dark:text-zinc-300 text-xs max-w-[140px] truncate" title="${escapeHtml(p.pelanggan)}">
          ${escapeHtml(p.pelanggan || '-')}
          ${p.wa ? `<div class="text-[10px] text-zinc-400">${escapeHtml(p.wa)}</div>` : ''}
        </td>
        <td class="px-3 py-2.5 text-right font-semibold text-zinc-800 dark:text-zinc-200 text-xs whitespace-nowrap">
          Rp ${(p.nominal || 0).toLocaleString('id-ID')}
          ${p.dp > 0 ? `<div class="text-[10px] text-emerald-600 font-normal">DP: Rp ${p.dp.toLocaleString('id-ID')} (${escapeHtml(p.metodePembayaran)})</div>` : ''}
        </td>
        <td class="px-3 py-2.5 text-center text-xs whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
            ${escapeHtml(p.status)}
          </span>
        </td>
        <td class="px-3 py-2.5 text-xs max-w-[220px]">
          ${notesOrError}
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Eksekusi Batch Import Proyek
async function executeBatchImport() {
  if (importState.isImporting) return;
  const validItems = importState.validRows;
  if (!validItems || validItems.length === 0) {
    if (typeof Toast !== 'undefined') {
      Toast.warning('Tidak Ada Data', 'Tidak ada data valid yang dapat diimport.');
    }
    return;
  }

  importState.isImporting = true;
  showImportStep(3);

  const progressBar = document.getElementById("importProgressBar");
  const progressText = document.getElementById("importProgressText");
  const progressDetail = document.getElementById("importProgressDetail");

  let successCount = 0;
  let failedCount = 0;
  const total = validItems.length;

  for (let i = 0; i < total; i++) {
    const item = validItems[i];
    const p = item.payload;

    const percent = Math.round(((i + 1) / total) * 100);
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.textContent = `${percent}% (${i + 1} / ${total})`;
    if (progressDetail) progressDetail.textContent = `Menyimpan: ${p.namaProyek} (${p.pelanggan})...`;

    try {
      if (typeof API !== 'undefined' && typeof API.addProyek === 'function') {
        const res = await API.addProyek(p);
        if (res && res.success !== false) {
          successCount++;
        } else {
          failedCount++;
          console.warn(`Gagal import baris ${item.rowIndex}:`, res);
        }
      } else {
        successCount++;
      }
    } catch (err) {
      failedCount++;
      console.error(`Error import baris ${item.rowIndex}:`, err);
    }
  }

  importState.isImporting = false;

  if (progressBar) progressBar.style.width = "100%";
  if (progressText) progressText.textContent = `100% Selesai`;
  if (progressDetail) {
    progressDetail.innerHTML = `
      <span class="text-emerald-600 dark:text-emerald-400 font-bold">
        ✅ Selesai: ${successCount} projek berhasil ditambahkan!
      </span>
      ${failedCount > 0 ? `<span class="text-rose-500 ml-2 font-medium">(${failedCount} gagal tersimpan)</span>` : ''}
    `;
  }

  if (typeof loadProyekData === 'function') {
    loadProyekData();
  }

  if (typeof Toast !== 'undefined') {
    if (failedCount === 0) {
      Toast.success('Import Berhasil', `Berhasil menambahkan ${successCount} projek baru ke database.`);
    } else {
      Toast.warning('Import Selesai dengan Catatan', `${successCount} projek berhasil ditambahkan, ${failedCount} gagal.`);
    }
  }

  const btnFinish = document.getElementById("btnFinishImport");
  if (btnFinish) btnFinish.classList.remove("hidden");
}

// ==========================================
// 8. PARSING & VALIDASI FILE EXCEL KEUANGAN
// ==========================================

function mapKeuanganRowFields(rawRow) {
  const mapped = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const norm = normalizeHeaderKey(k);
    if (norm === "idtransaksi" || norm === "idkas" || norm === "id") {
      mapped.idTransaksi = v;
    } else if (norm === "iduser" || norm === "userid") {
      mapped.userId = v;
    } else if (norm === "idprojek" || norm === "idproyek") {
      mapped.idProyek = v;
    } else if (norm === "jenis" || norm === "tipe") {
      mapped.jenis = v;
    } else if (norm.includes("keterangan") || norm.includes("deskripsi") || norm === "catatan") {
      mapped.keterangan = v;
    } else if (norm.includes("metodebayardp") || norm.includes("metodedp") || norm.includes("metodeasal")) {
      mapped.metodeBayarDp = v;
    } else if (norm.includes("metodebayarpelunasan") || norm.includes("metodepelunasan") || norm.includes("metodetujuan")) {
      mapped.metodeBayarPelunasan = v;
    } else if (norm.includes("metodepembayaran") || norm.includes("metodebayar") || norm === "metode") {
      mapped.metodePembayaran = v;
    } else if (norm === "totaldp" || norm === "dp" || norm.includes("uangmuka")) {
      mapped.dp = v;
    } else if (norm === "totalpelunasan" || norm === "pelunasan") {
      mapped.pelunasan = v;
    } else if (norm.includes("totalpembayaran") || norm.includes("nominal") || norm === "total") {
      mapped.nominal = v;
    }
  }
  return mapped;
}

function validateKeuanganRow(rawItem, rowIndex) {
  const row = mapKeuanganRowFields(rawItem);
  const errors = [];
  const warnings = [];

  let jenis = String(row.jenis || "Pemasukan").trim();
  const matchedJenis = VALID_KEUANGAN_TYPES.find(j => j.toLowerCase() === jenis.toLowerCase());
  if (matchedJenis) {
    jenis = matchedJenis;
  } else {
    jenis = "Pemasukan";
  }

  const keterangan = String(row.keterangan || "").trim();
  if (!keterangan) {
    errors.push("Keterangan transaksi wajib diisi.");
  }

  const dp = parseCleanNumber(row.dp);
  const pelunasan = parseCleanNumber(row.pelunasan);
  let nominal = parseCleanNumber(row.nominal);

  if (nominal <= 0 && (dp + pelunasan) > 0) {
    nominal = dp + pelunasan;
  }

  if (nominal <= 0) {
    errors.push("Total Pembayaran / Nominal transaksi harus lebih besar dari 0.");
  }

  let metodeDp = String(row.metodeBayarDp || row.metodePembayaran || "QRIS").trim();
  let metodePel = String(row.metodeBayarPelunasan || row.metodeBayarDp || "QRIS").trim();

  const payload = {
    idTransaksi: String(row.idTransaksi || "").trim(),
    userId: String(row.userId || "USR-001").trim(),
    idProyek: String(row.idProyek || "").trim(),
    jenis,
    keterangan,
    metodeBayarDp: metodeDp,
    metodeBayarPelunasan: metodePel,
    metodePembayaran: metodeDp,
    dp,
    pelunasan,
    nominal,
    totalPembayaran: nominal
  };

  const isValid = errors.length === 0;

  return {
    rowIndex,
    original: rawItem,
    payload,
    isValid,
    isDuplicate: false,
    errors,
    warnings
  };
}

// Handler saat file Excel Keuangan dipilih
async function handleKeuanganExcelFile(file) {
  if (!file) return;

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExts.includes(ext)) {
    if (typeof Toast !== 'undefined') {
      Toast.error('Format Tidak Didukung', 'Harap upload file berformat Excel (.xlsx, .xls) atau .csv');
    } else {
      alert('Format file tidak didukung. Gunakan .xlsx atau .xls');
    }
    return;
  }

  importKeuanganState.file = file;
  importKeuanganState.fileName = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      if (typeof XLSX === 'undefined') {
        throw new Error("Pustaka SheetJS (XLSX) tidak tersedia.");
      }

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        if (typeof Toast !== 'undefined') {
          Toast.warning('File Kosong', 'Tidak ada baris data pada file Excel.');
        }
        return;
      }

      const filteredRows = rawRows.filter(r => {
        return Object.values(r).some(val => String(val).trim() !== "");
      });

      const validatedList = [];
      const validRows = [];
      const invalidRows = [];

      filteredRows.forEach((r, idx) => {
        const excelRowNumber = idx + 2;
        const res = validateKeuanganRow(r, excelRowNumber);
        validatedList.push(res);
        if (res.isValid) {
          validRows.push(res);
        } else {
          invalidRows.push(res);
        }
      });

      importKeuanganState.parsedData = validatedList;
      importKeuanganState.validRows = validRows;
      importKeuanganState.invalidRows = invalidRows;

      if (validRows.length > 0) {
        if (confirm(`Ditemukan ${validRows.length} transaksi valid dari ${validatedList.length} baris. Lanjutkan import sekarang?`)) {
          executeBatchImportKeuangan();
        }
      } else {
        if (typeof Toast !== 'undefined') {
          Toast.error('Data Tidak Valid', 'Tidak ada baris data keuangan yang valid untuk diimport.');
        }
      }
    } catch (err) {
      console.error('Gagal membaca file Excel Keuangan:', err);
      if (typeof Toast !== 'undefined') {
        Toast.error('Gagal Membaca File', 'File Excel rusak atau tidak sesuai format: ' + (err.message || err));
      }
    }
  };

  reader.readAsArrayBuffer(file);
}

// Eksekusi Batch Import Keuangan
async function executeBatchImportKeuangan() {
  if (importKeuanganState.isImporting) return;
  const validItems = importKeuanganState.validRows;
  if (!validItems || validItems.length === 0) return;

  importKeuanganState.isImporting = true;
  let successCount = 0;
  let failedCount = 0;

  if (typeof Toast !== 'undefined') {
    Toast.info('Mengimpor Transaksi...', `Sedang memproses ${validItems.length} data transaksi ke database...`);
  }

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const k = item.payload;

    try {
      if (typeof API !== 'undefined' && typeof API.addKeuangan === 'function') {
        const res = await API.addKeuangan(k);
        if (res && res.success !== false) {
          successCount++;
        } else {
          failedCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      failedCount++;
      console.error(`Error import keuangan baris ${item.rowIndex}:`, err);
    }
  }

  importKeuanganState.isImporting = false;

  if (typeof loadKeuanganData === 'function') {
    loadKeuanganData();
  }

  if (typeof Toast !== 'undefined') {
    if (failedCount === 0) {
      Toast.success('Import Berhasil', `Berhasil menambahkan ${successCount} data transaksi ke Keuangan.`);
    } else {
      Toast.warning('Import Selesai', `${successCount} transaksi berhasil ditambahkan, ${failedCount} gagal.`);
    }
  }
}

// ==========================================
// 9. EVENT LISTENERS & DROPDOWN CONTROLS
// ==========================================
function toggleExcelDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("excelDropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

function closeExcelDropdown() {
  const menu = document.getElementById("excelDropdownMenu");
  if (menu) menu.classList.add("hidden");
}

function toggleKeuanganExcelDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("keuanganExcelDropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

function closeKeuanganExcelDropdown() {
  const menu = document.getElementById("keuanganExcelDropdownMenu");
  if (menu) menu.classList.add("hidden");
}

function triggerKeuanganImport() {
  const fileInput = document.getElementById("keuanganExcelFileInput");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Global click outside to close dropdowns
  document.addEventListener("click", (e) => {
    const pBtn = document.getElementById("excelDropdownBtn") || document.getElementById("btnExcelDropdown");
    const pMenu = document.getElementById("excelDropdownMenu");
    if (pMenu && pBtn && !pBtn.contains(e.target) && !pMenu.contains(e.target)) {
      pMenu.classList.add("hidden");
    }

    const kBtn = document.getElementById("keuanganExcelDropdownBtn");
    const kMenu = document.getElementById("keuanganExcelDropdownMenu");
    if (kMenu && kBtn && !kBtn.contains(e.target) && !kMenu.contains(e.target)) {
      kMenu.classList.add("hidden");
    }
  });

  // Drag & Drop Area Setup (Proyek)
  const dropzone = document.getElementById("importDropzone");
  const fileInput = document.getElementById("excelFileInput");

  if (dropzone && fileInput) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20");
    });

    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleProjectExcelFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleProjectExcelFile(e.target.files[0]);
      }
    });
  }

  // File Input Setup (Keuangan)
  const kFileInput = document.getElementById("keuanganExcelFileInput");
  if (kFileInput) {
    kFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleKeuanganExcelFile(e.target.files[0]);
      }
    });
  }
});
