# 📁 Panduan Manajemen & Struktur Folder (FPManager)

Dokumen ini menjelaskan arsitektur hierarki berkas, standar penempatan file, serta konvensi penamaan dalam repository **FPManager**. 

---

## 🏛️ Filosofi Arsitektur Folder

Aplikasi FPManager adalah **Serverless Progressive Web App (PWA)** dengan frontend statis yang terhubung ke Google Apps Script API.

```
FPManager/
├── 📄 *.html             # Halaman utama aplikasi (Wajib di Root)
├── 📄 sw.js              # Service Worker PWA (Wajib di Root)
├── 📄 manifest.json      # Konfigurasi PWA Web App Manifest
├── 📄 kode.gs            # Backend Google Apps Script (Endpoint API)
├── 📂 assets/            # Aset statis grafis, video, & media
│   ├── 📂 img/           # Logo, ikon PWA, tanda tangan, QRIS
│   ├── 📂 watermark/     # Aset watermark cetak & PDF
│   └── 📂 maintenance-assets/ # Video animasi mode maintenance
├── 📂 css/               # Berkas lembar gaya (Tailwind, Style kustom, Tema Gelap)
├── 📂 js/                # Berkas logika kontroler JavaScript vanilla modular
├── 📂 docs/              # Dokumentasi arsitektur, panduan desain, & sistem
└── 📂 notes/             # Catatan pengembang, roadmap, & aturan prompt
```

---

## 📌 Alasan Halaman HTML & Service Worker Wajib Berada di Root

1. **Service Worker Root Scope (`/`)**:
   - `sw.js` diletakkan di root agar memiliki *scope* kontrol penuh atas seluruh URL halaman aplikasi (`/index.html`, `/proyek.html`, dll.). Jika dipindahkan ke dalam subfolder, Service Worker secara default tidak dapat mencegat (*intercept*) cache halaman di atas foldernya.
2. **Keamanan Routing & URL Permanen**:
   - Menjaga URL tetap bersih dan konsisten tanpa perlu konfigurasi web server rewrite yang kompleks (`window.location.href = 'proyek.html'`).
3. **Penyimpanan Cache & PWA Offline**:
   - Path relatif `./` pada Service Worker dan Manifest PWA bekerja secara konsisten di localhost maupun hosting statis (GitHub Pages, Vercel, Netlify, Apache).

---

## 🗂️ Rincian Direktori & Tugas Berkas

### 1. Halaman Antarmuka Root (`*.html`)
Setiap file HTML mewakili satu modul operasional dengan kontroler JS pasangannya:

| Berkas HTML | Kontroler JS | Fungsi & Modul Utama |
|---|---|---|
| `index.html` | `js/dashboard.js` | Ringkasan eksekutif, metrik performa, dan grafik analitik |
| `proyek.html` | `js/proyek.js` | Tabel data master projek, filter status, pencarian, & DataTables |
| `tambah-proyek.html` | `js/tambah.js` | Formulir entri projek baru dan edit projek |
| `keuangan.html` | `js/keuangan.js` | Buku kas pemasukan/pengeluaran & mutasi saldo |
| `laporan.html` | `js/laporan.js` | Analitik komprehensif, filter periode, & laporan tahunan |
| `history-invoice.html` | `js/history-invoice.js` | Arsip pencatatan invoice & status pembayaran klien |
| `invoice.html` | `js/invoice.js` | Generator nota / invoice dan cetak PDF profesional |
| `admin-tasks.html` | `js/admin-tasks.js` | Checklist harian staf, delegasi tugas, & reset berkala |
| `tools.html` | `js/tools.js` | Utilitas generator prompt, AI assistant Gemini, & pintasan |
| `user-management.html` | `js/user-management.js` | Pengelolaan hak akses 3-Role (Super Admin Only) |
| `pengaturan.html` | `js/pengaturan.js` | Manajemen database lokal, API Sheets, & backup |
| `profil.html` | `js/profil.js` | Edit profil pengguna, ganti password, & avatar |
| `login.html` | `js/auth.js` | Autentikasi sesi login (Sesi aman 3 hari) |
| `maintenance.html` | - | Halaman pemeliharaan sistem saat server offline |

---

### 2. Direktori `js/` (Logika & Modul JavaScript)
Dikelompokkan menjadi 3 kategori fungsi:

- **Modul Fondasi & Utilitas Global**:
  - `config.js`: Variabel konfigurasi terpusat, endpoint Google Apps Script, & helper modal.
  - `api.js`: Lapisan komunikasi jaringan fetch API, antrean sinkronisasi offline.
  - `auth.js`: Manajemen sesi autentikasi, enkripsi token, kontrol hak akses 3-Role.
  - `theme.js`: Switcher tema terang / gelap (Light / Dark Mode).
  - `toast.js`: Notifikasi pesan mengambang (*toast*) dengan timer progress bar.
  - `pwa.js`: Penanganan instalasi PWA dan deteksi liveness service worker.
  - `i18n.js`: Lokalisasi bahasa (Indonesia & English).

- **Modul Kontroler Halaman**:
  - `dashboard.js`, `proyek.js`, `tambah.js`, `keuangan.js`, `laporan.js`, `history-invoice.js`, `invoice.js`, `admin-tasks.js`, `tools.js`, `user-management.js`, `pengaturan.js`, `profil.js`.

- **Modul Ekspor & Integrasi Pihak Ketiga**:
  - `excel.js`: Generator dan parser berkas Excel (.xlsx).
  - `calendar.js`: Generator jadwal Google Calendar & berkas iCal (.ics).

---

### 3. Direktori `css/` (Lembar Gaya)
- `style.css`: Lembar gaya kustom aplikasi, animasi transisi, kustom scrollbar, standarisasi padding/margin tabel, dan tipografi Plus Jakarta Sans.
- `tailwind.min.css`: Framework utilitas CSS terkompilasi offline (~44KB teroptimasi).
- `darkmode.css`: Definisi variabel tema gelap berbasis HSL.

---

### 4. Direktori `assets/` (Media & Grafis)
- `assets/img/`:
  - `logo.webp`: Logo resmi aplikasi.
  - `favicon.png`, `icon-192.png`, `icon-512.png`: Ikon aplikasi PWA.
  - `qris.jpg`: Gambar barcode pembayaran QRIS.
  - `ttd.png`: Tanda tangan digital untuk invoice/nota.
- `assets/watermark/`:
  - `wm_black.png`, `wm_warna.png`, `wm_white.png`: Watermark dokumen.
- `assets/maintenance-assets/`:
  - Video loop animasi untuk halaman maintenance.

---

### 5. Direktori `docs/` (Dokumentasi Resmi)
- `docs/FOLDER_STRUCTURE.md`: Panduan tata kelola dan peta arsitektur folder ini.
- `docs/DESIGN_SYSTEM.md`: Standar desain antarmuka, warna, aturan popup modal, dan UX.
- `docs/README.md`: Indeks navigasi seluruh dokumen proyek.

---

### 6. Direktori `notes/` (Catatan Internal Pengembang)
- `notes/aturan_prompt.txt`: Standar kepatuhan prompt (font Jakarta, ikon bersih, konsistensi warna, proteksi fungsi).
- `notes/next_fitur.txt`: Backlog dan perencanaan fitur pengembangan mendatang.

---

## ⚡ Standar Penambahan Berkas Baru

1. **Jika Menambah Halaman Baru**:
   - Buat `nama-halaman.html` di root.
   - Buat `js/nama-halaman.js` di folder `js/`.
   - Daftarkan URL di array `urlsToCache` dalam `sw.js` dan naikkan versi `CACHE_NAME`.
   - Gunakan tipografi baku: Judul menggunakan font *Plus Jakarta Sans* dan isi menggunakan *Inter*.
   - Gunakan font icon Font Awesome, jangan menyertakan emotikon mentah OS.
2. **Jika Menambah Media/Gambar**:
   - Tempatkan di `assets/img/` dengan format optimal (`.webp` untuk foto/ilustrasi, `.png` untuk transparansi, `.svg` untuk vektor).
