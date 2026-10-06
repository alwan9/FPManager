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

// Global state untuk import preview
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

// ==========================================
// 2. MODAL EXPORT & LOGIC EXPORT EXCEL
// ==========================================
function openExportModal() {
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:export') && !Auth.hasPermission('keuangan:export')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki hak akses (proyek:export) untuk mengekspor data.');
    return;
  }
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
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:export') && !Auth.hasPermission('keuangan:export')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin ekspor.');
    return;
  }
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
      // Ambil data yang sedang terfilter di DataTables jika tersedia
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

    // 3. Mapping data ke kolom resmi sesuai database (20 kolom terstruktur)
    const rows = data.map(item => {
      const nom = Number(item.nominalProyek !== undefined ? item.nominalProyek : (item.nominal || item.totalPembayaran || 0));
      const dp = Number(item.dP !== undefined ? item.dP : (item.dp || item.totalDp || 0));
      const pel = Number(item.pelunasan !== undefined ? item.pelunasan : (item.totalPelunasan || 0));
      const sisa = (item.sisaPembayaran !== undefined && item.sisaPembayaran !== null)
        ? Number(item.sisaPembayaran)
        : Math.max(0, nom - dp - pel);

      return {
        "ID Proyek": item.iDProyek || item.idProjek || "",
        "Tanggal": item.tanggal || (item.createdAt ? String(item.createdAt).split('T')[0] : ""),
        "Nama Proyek*": item.namaProyek || "",
        "Client / Pelanggan*": item.namaPelanggan || item.pelanggan || "",
        "Nomor WhatsApp": item.nomorWA || item.noWa || item.wa || "",
        "Produk / Layanan": item.produk || "",
        "Jumlah": item.jumlah !== undefined ? Number(item.jumlah) : 1,
        "Satuan": item.satuan || "pcs",
        "Harga Satuan": item.hargaSatuan !== undefined ? Number(item.hargaSatuan) : (nom / (Number(item.jumlah) || 1)),
        "Total Proyek / Nominal*": nom,
        "DP": dp,
        "Metode DP": item.metodePembayaran || item.metodeBayarDp || (dp > 0 ? "QRIS" : ""),
        "Pelunasan": pel,
        "Metode Pelunasan": item.metodeBayarPelunasan || "",
        "Sisa Tagihan": sisa,
        "Deadline": item.deadline || "",
        "Status": item.status || "Menunggu",
        "Sumber": item.sumber || "WhatsApp",
        "Link Google Drive": item.gdriveLink || "",
        "Catatan": item.catatan || ""
      };
    });

    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Styling lebar kolom
    ws['!cols'] = [
      { wch: 16 }, // ID Proyek
      { wch: 14 }, // Tanggal
      { wch: 30 }, // Nama Proyek*
      { wch: 24 }, // Client / Pelanggan*
      { wch: 18 }, // Nomor WhatsApp
      { wch: 22 }, // Produk / Layanan
      { wch: 8 },  // Jumlah
      { wch: 10 }, // Satuan
      { wch: 16 }, // Harga Satuan
      { wch: 24 }, // Total Proyek / Nominal*
      { wch: 16 }, // DP
      { wch: 16 }, // Metode DP
      { wch: 16 }, // Pelunasan
      { wch: 18 }, // Metode Pelunasan
      { wch: 16 }, // Sisa Tagihan
      { wch: 14 }, // Deadline
      { wch: 20 }, // Status
      { wch: 14 }, // Sumber
      { wch: 36 }, // Link Google Drive
      { wch: 36 }  // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Data Projek");

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
// 3. FITUR DOWNLOAD TEMPLATE EXCEL RESMI
// ==========================================
function downloadProjectTemplateExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      throw new Error("Pustaka SheetJS (XLSX) belum dimuat.");
    }

    const wb = XLSX.utils.book_new();

    // 1. Data Sheet Template + Contoh Pengisian Realistis
    const templateRows = [
      {
        "Nama Proyek*": "Website Company Profile PT Maju Bersama",
        "Client / Pelanggan*": "PT Maju Bersama",
        "Nomor WhatsApp": "081234567890",
        "Produk / Layanan": "Web Development",
        "Jumlah": 1,
        "Satuan": "paket",
        "Harga Satuan": 2500000,
        "Total Proyek / Nominal*": 2500000,
        "DP": 500000,
        "Metode DP": "QRIS",
        "Pelunasan": 0,
        "Metode Pelunasan": "",
        "Deadline": "2026-10-25",
        "Status": "Sedang Dikerjakan",
        "Sumber": "WhatsApp",
        "Link Google Drive": "https://drive.google.com/drive/folders/contoh-folder-1",
        "Catatan": "DP 500rb masuk via QRIS, sisa dibayar setelah preview website disetujui"
      },
      {
        "Nama Proyek*": "Desain Logo & Brand Guidelines",
        "Client / Pelanggan*": "CV Berkah Mandiri",
        "Nomor WhatsApp": "085678901234",
        "Produk / Layanan": "Graphic Design",
        "Jumlah": 1,
        "Satuan": "paket",
        "Harga Satuan": 1200000,
        "Total Proyek / Nominal*": 1200000,
        "DP": 600000,
        "Metode DP": "BSI",
        "Pelunasan": 600000,
        "Metode Pelunasan": "BSI",
        "Deadline": "2026-10-15",
        "Status": "Selesai",
        "Sumber": "WhatsApp",
        "Link Google Drive": "https://drive.google.com/drive/folders/contoh-folder-2",
        "Catatan": "Sudah lunas penuh melalui transfer BSI"
      },
      {
        "Nama Proyek*": "10 Konten Feed Instagram",
        "Client / Pelanggan*": "Studio Cantik",
        "Nomor WhatsApp": "087811223344",
        "Produk / Layanan": "Social Media Design",
        "Jumlah": 10,
        "Satuan": "post",
        "Harga Satuan": 100000,
        "Total Proyek / Nominal*": 1000000,
        "DP": 0,
        "Metode DP": "",
        "Pelunasan": 0,
        "Metode Pelunasan": "",
        "Deadline": "2026-10-30",
        "Status": "Menunggu",
        "Sumber": "WhatsApp",
        "Link Google Drive": "",
        "Catatan": "Projek baru konfirmasi, menunggu materi dari klien"
      },
      {
        "Nama Proyek*": "Order Banner Promo Shopee",
        "Client / Pelanggan*": "Toko Fashion Trendy",
        "Nomor WhatsApp": "089912345678",
        "Produk / Layanan": "Banner Design",
        "Jumlah": 1,
        "Satuan": "pcs",
        "Harga Satuan": 350000,
        "Total Proyek / Nominal*": 350000,
        "DP": 350000,
        "Metode DP": "Shopee",
        "Pelunasan": 0,
        "Metode Pelunasan": "",
        "Deadline": "2026-10-20",
        "Status": "Sedang Dikerjakan",
        "Sumber": "Shopee",
        "Link Google Drive": "",
        "Catatan": "Pembayaran penuh langsung dari marketplace Shopee"
      }
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);

    // Set kolom lebar agar mudah dibaca pengguna
    wsTemplate['!cols'] = [
      { wch: 36 }, // Nama Proyek*
      { wch: 26 }, // Client / Pelanggan*
      { wch: 18 }, // Nomor WhatsApp
      { wch: 24 }, // Produk / Layanan
      { wch: 8 },  // Jumlah
      { wch: 10 }, // Satuan
      { wch: 16 }, // Harga Satuan
      { wch: 26 }, // Total Proyek / Nominal*
      { wch: 16 }, // DP
      { wch: 16 }, // Metode DP
      { wch: 16 }, // Pelunasan
      { wch: 18 }, // Metode Pelunasan
      { wch: 14 }, // Deadline
      { wch: 20 }, // Status
      { wch: 14 }, // Sumber
      { wch: 38 }, // Link Google Drive
      { wch: 42 }  // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Import Projek");

    // 2. Sheet Petunjuk & Pilihan Valid
    const guideRows = [
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "Silakan ikuti instruksi berikut agar data projek berhasil diimport ke sistem." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "1. KOLOM WAJIB & ATURAN PENGISIAN:" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Nama Proyek* : Wajib diisi (Teks nama atau judul projek)." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Client / Pelanggan* : Wajib diisi (Nama klien/perusahaan)." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Total Proyek / Nominal* : Wajib diisi (Angka murni tanpa Rp atau pemisah ribuan, contoh: 1500000)." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - DP : Opsional (Angka murni, contoh: 500000). Jika diisi > 0, WAJIB memilih Metode DP yang valid." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Metode DP : Wajib jika DP > 0. Dana DP akan otomatis dicatat ke sistem Keuangan pada metode ini." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Pelunasan : Opsional (Angka murni). Jika diisi, nominal pelunasan tetap tercatat sebagai pelunasan." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Deadline : Format tanggal YYYY-MM-DD (contoh: 2026-10-25)." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Catatan : Opsional (Keterangan tambahan untuk projek)." },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "2. PILIHAN STATUS YANG TERSEDIA DI SISTEM:" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Menunggu (Default jika dikosongkan)" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Sedang Dikerjakan" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Revisi" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Selesai" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Belum Pembayaran" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Dibatalkan" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "3. PILIHAN METODE PEMBAYARAN YANG TERSEDIA DI SISTEM:" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - QRIS" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Shopee" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - BSI" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Transfer Bank" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - ShopeePay" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Saldo Shopee" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Fiverr" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - PayPal" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Payoneer" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Cash / Tunai" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "4. PILIHAN SUMBER PROJEK YANG TERSEDIA:" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - WhatsApp (Default)" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Shopee" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Fiverr" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Website" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Instagram" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Lainnya" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "5. INTEGRASI KEUANGAN OTOMATIS:" },
      { "PANDUAN & PETUNJUK IMPORT EXCEL FPManager": "   - Setiap projek dengan DP dan Metode Pembayaran akan otomatis tercatat ke transaksi Keuangan tanpa perlu input ulang manual." }
    ];

    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 100 }];

    XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

    XLSX.writeFile(wb, "Template-Import-Projek-FPManager.xlsx");

    if (typeof Toast !== 'undefined') {
      Toast.success('Template Diunduh', 'Template Excel resmi berhasil diunduh. Silakan isi dan upload kembali.');
    }
  } catch (err) {
    console.error('Download template error:', err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Download Template', 'Terjadi kesalahan saat membuat template Excel: ' + (err.message || err));
    }
  }
}

// ==========================================
// 4. MODAL IMPORT EXCEL & STATE MANAGEMENT
// ==========================================
function openImportModal() {
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:import')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki hak akses (proyek:import) untuk import data projek.');
    return;
  }
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
// 5. PARSING & VALIDASI FILE EXCEL
// ==========================================

// Helper: Parsing angka fleksibel
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

// Helper: Parsing Tanggal dari Excel (Serial / String)
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

  // DD/MM/YYYY or DD-MM-YYYY
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

// Normalisasi Nama Header Kolom
function normalizeHeaderKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Match Kolom Excel ke Kolom Sistem
function mapRowFields(rawRow) {
  const mapped = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const norm = normalizeHeaderKey(k);
    if (norm.includes("namaproyek") || norm === "proyek" || norm === "nama" || norm === "project" || norm === "namaprojek") {
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
    } else if (norm.includes("totalproyek") || norm.includes("nominal") || norm === "total" || norm === "biaya" || norm.includes("totalpembayaran")) {
      mapped.nominal = v;
    } else if (norm === "dp" || norm.includes("uangmuka") || norm.includes("downpayment") || norm === "totaldp") {
      mapped.dp = v;
    } else if (norm.includes("metodedp") || norm.includes("metodebayardp") || norm.includes("metodepembayaran") || norm === "metode") {
      mapped.metodePembayaran = v;
    } else if (norm === "pelunasan" || norm.includes("pelunasanrp") || norm === "totalpelunasan") {
      mapped.pelunasan = v;
    } else if (norm.includes("metodepelunasan") || norm.includes("metodebayarpelunasan")) {
      mapped.metodeBayarPelunasan = v;
    } else if (norm.includes("deadline") || norm.includes("tenggat") || norm === "duedate" || norm === "deatline") {
      mapped.deadline = v;
    } else if (norm === "status" || norm.includes("statusproyek") || norm.includes("statusprojek")) {
      mapped.status = v;
    } else if (norm === "sumber" || norm === "source" || norm.includes("channel")) {
      mapped.sumber = v;
    } else if (norm.includes("drive") || norm.includes("gdrive") || norm.includes("link") || norm.includes("linkdrive")) {
      mapped.gdriveLink = v;
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

  // 1. Validasi Nama Proyek (Wajib)
  const namaProyek = String(row.namaProyek || "").trim();
  if (!namaProyek) {
    errors.push("Nama Proyek* wajib diisi.");
  }

  // 2. Validasi Client / Pelanggan (Wajib)
  const pelanggan = String(row.pelanggan || "").trim();
  if (!pelanggan) {
    errors.push("Client / Pelanggan* wajib diisi.");
  }

  // 3. Validasi Nominal / Total Proyek (Wajib)
  const rawNominal = row.nominal;
  const nominal = parseCleanNumber(rawNominal);
  if (rawNominal === undefined || rawNominal === null || String(rawNominal).trim() === "") {
    errors.push("Total Proyek / Nominal* wajib diisi.");
  } else if (nominal <= 0) {
    errors.push("Nominal Proyek harus berupa angka lebih besar dari 0.");
  }

  // 4. Validasi DP & Metode DP
  const rawDp = row.dp;
  const dp = parseCleanNumber(rawDp);
  if (dp < 0) {
    errors.push("DP tidak boleh bernilai negatif.");
  }
  if (dp > nominal && nominal > 0) {
    errors.push(`Nominal DP (Rp ${dp.toLocaleString('id-ID')}) melebihi Total Proyek (Rp ${nominal.toLocaleString('id-ID')}).`);
  }

  let metodeDP = String(row.metodePembayaran || "").trim();
  if (dp > 0) {
    if (!metodeDP) {
      errors.push("Metode DP wajib dipilih jika terdapat nominal DP.");
    } else {
      const matchedMethod = VALID_PAYMENT_METHODS.find(m => m.toLowerCase() === metodeDP.toLowerCase());
      if (matchedMethod) {
        metodeDP = matchedMethod;
      } else {
        errors.push(`Metode DP "${metodeDP}" tidak tersedia di sistem. Pilihan: ${VALID_PAYMENT_METHODS.slice(0, 5).join(', ')}, dll.`);
      }
    }
  } else if (!metodeDP) {
    metodeDP = "QRIS";
  }

  // 5. Validasi Pelunasan
  const rawPelunasan = row.pelunasan;
  const pelunasan = parseCleanNumber(rawPelunasan);
  if (pelunasan < 0) {
    errors.push("Pelunasan tidak boleh bernilai negatif.");
  }
  if (dp + pelunasan > nominal && nominal > 0) {
    warnings.push(`Jumlah DP + Pelunasan (Rp ${(dp + pelunasan).toLocaleString('id-ID')}) melebihi total nominal.`);
  }

  let metodePelunasan = String(row.metodeBayarPelunasan || "").trim();
  if (pelunasan > 0 && metodePelunasan) {
    const matchedPel = VALID_PAYMENT_METHODS.find(m => m.toLowerCase() === metodePelunasan.toLowerCase());
    if (matchedPel) {
      metodePelunasan = matchedPel;
    }
  }

  // 6. Validasi Status
  let status = String(row.status || "").trim();
  if (!status) {
    status = "Menunggu";
  } else {
    const matchedStatus = VALID_PROJECT_STATUSES.find(s => s.toLowerCase() === status.toLowerCase());
    if (matchedStatus) {
      status = matchedStatus;
    } else {
      errors.push(`Status "${status}" tidak valid. Pilihan: ${VALID_PROJECT_STATUSES.join(', ')}.`);
    }
  }

  // 7. Validasi Sumber
  let sumber = String(row.sumber || "").trim();
  if (!sumber) {
    sumber = "WhatsApp";
  } else {
    const matchedSumber = VALID_SOURCES.find(s => s.toLowerCase() === sumber.toLowerCase());
    if (matchedSumber) {
      sumber = matchedSumber;
    }
  }

  // 8. Validasi Deadline
  let deadline = parseExcelDate(row.deadline);
  if (row.deadline && !deadline) {
    warnings.push("Format deadline tidak standar, pastikan format YYYY-MM-DD.");
  }

  // Format nomor WA jika ada
  let wa = String(row.wa || "").trim().replace(/\D/g, '');
  if (wa.startsWith('0')) {
    wa = '62' + wa.substring(1);
  }

  // Hitung Sisa Tagihan
  const sisa = Math.max(0, nominal - dp - pelunasan);

  // 9. Cek Duplikasi (Di Dalam File & Terhadap Database Existing)
  if (namaProyek && pelanggan) {
    const dupKey = (namaProyek + "___" + pelanggan).toLowerCase();

    // Cek duplikasi di dalam file yang sedang diupload
    if (inMemoryMap.has(dupKey)) {
      const prevRow = inMemoryMap.get(dupKey);
      warnings.push(`[Duplikat di File] Data serupa dengan baris ${prevRow} (Nama: "${namaProyek}", Klien: "${pelanggan}").`);
      isDuplicate = true;
    } else {
      inMemoryMap.set(dupKey, rowIndex);
    }

    // Cek duplikasi dengan data yang sudah ada di database
    if (Array.isArray(existingProjects) && existingProjects.length > 0) {
      const existingMatch = existingProjects.find(p => {
        if (!p) return false;
        const pNama = String(p.namaProyek || "").toLowerCase().trim();
        const pClient = String(p.namaPelanggan || p.pelanggan || "").toLowerCase().trim();
        return pNama === namaProyek.toLowerCase() && pClient === pelanggan.toLowerCase();
      });

      if (existingMatch) {
        warnings.push(`[Sudah Ada di Database] Projek serupa ditemukan (${existingMatch.iDProyek || existingMatch.idProjek || 'DB'}).`);
        isDuplicate = true;
      }
    }
  }

  const payload = {
    namaProyek,
    pelanggan,
    wa,
    produk: String(row.produk || "").trim(),
    jumlah: parseCleanNumber(row.jumlah) || 1,
    satuan: String(row.satuan || "pcs").trim() || "pcs",
    hargaSatuan: parseCleanNumber(row.hargaSatuan) || (nominal / (parseCleanNumber(row.jumlah) || 1)),
    nominal,
    dp,
    metodePembayaran: metodeDP,
    pelunasan,
    metodeBayarPelunasan: metodePelunasan,
    sisa,
    deadline,
    status,
    sumber,
    gdriveLink: String(row.gdriveLink || "").trim(),
    catatan: String(row.catatan || "").trim()
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

// Handler saat file dipilih/di-drop
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

  // Update UI File Info
  const fileInfo = document.getElementById("importFileInfo");
  const fileNameEl = document.getElementById("importFileName");
  const fileSizeEl = document.getElementById("importFileSize");
  if (fileInfo && fileNameEl && fileSizeEl) {
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = (file.size / 1024).toFixed(1) + " KB";
    fileInfo.classList.remove("hidden");
  }

  // Ambil data projek existing untuk pengecekan duplikat
  let existingProjects = [];
  try {
    if (typeof API !== 'undefined' && typeof API.getProyek === 'function') {
      existingProjects = await API.getProyek();
    } else if (Array.isArray(window.allProyekList)) {
      existingProjects = window.allProyekList;
    }
  } catch (e) {
    console.warn("Peringatan membaca existing project untuk validasi duplikat:", e);
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

      // Filter baris kosong sepenuhnya
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

      // Validasi baris per baris
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

      // Render Preview Step 2
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

  reader.onerror = function () {
    if (typeof Toast !== 'undefined') {
      Toast.error('Gagal Membaca File', 'Terjadi kesalahan saat membaca file.');
    }
  };

  reader.readAsArrayBuffer(file);
}

// ==========================================
// 6. RENDER PREVIEW & STATS IMPORT
// ==========================================
function filterImportPreview(filterType) {
  importState.activeFilter = filterType;

  // Update tabs active styling
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

  // Update Summary Badges
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

  // Warning Banner jika ada error
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

  // Tombol Import Execution
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

// ==========================================
// 7. EKSEKUSI BATCH IMPORT PROJEK
// ==========================================
async function executeBatchImport() {
  if (typeof Auth !== 'undefined' && !Auth.hasPermission('proyek:import')) {
    if (typeof Toast !== 'undefined') Toast.error('Akses Ditolak', 'Anda tidak memiliki izin (proyek:import) untuk import projek.');
    return;
  }
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
        // Fallback simulate save
        successCount++;
      }
    } catch (err) {
      failedCount++;
      console.error(`Error import baris ${item.rowIndex}:`, err);
    }
  }

  importState.isImporting = false;

  // Selesai import
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

  // Refresh Table Data Proyek di halaman
  if (typeof loadProyekData === 'function') {
    loadProyekData();
  }

  // Tampilkan Notifikasi Hasil
  if (typeof Toast !== 'undefined') {
    if (failedCount === 0) {
      Toast.success('Import Berhasil', `Berhasil menambahkan ${successCount} projek baru ke database.`);
    } else {
      Toast.warning('Import Selesai dengan Catatan', `${successCount} projek berhasil ditambahkan, ${failedCount} gagal.`);
    }
  }

  // Tampilkan tombol selesai
  const btnFinish = document.getElementById("btnFinishImport");
  if (btnFinish) btnFinish.classList.remove("hidden");
}
