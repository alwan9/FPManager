# 📁 Panduan Manajemen & Struktur Folder (FPManager)

Dokumen ini menjelaskan arsitektur hierarki berkas, standar penempatan file, serta konvensi penamaan dalam repository **FPManager**. 

---

## 🏛️ Filosofi Arsitektur Folder

Aplikasi FPManager adalah **Serverless Progressive Web App (PWA)** dengan frontend statis yang terhubung ke Google Apps Script API.

```
FPManager/
├── 📄 index.html             # Dashboard utama (Entry point aplikasi di Root)
├── 📄 login.html             # Halaman autentikasi login (Root)
├── 📄 sw.js                  # Service Worker PWA (Root scope '/')
├── 📄 manifest.json          # Konfigurasi PWA Web App Manifest
├── 📄 kode.gs                # Backend Google Apps Script (Endpoint API)
├── 📂 pages/                 # Seluruh modul halaman aplikasi
│   ├── 📄 proyek.html        # Manajemen data projek
│   ├── 📄 tambah-proyek.html # Form input / edit projek
│   ├── 📄 keuangan.html      # Buku kas & mutasi keuangan
│   ├── 📄 laporan.html       # Laporan & analitik keuangan
│   ├── 📄 history-invoice.html # Riwayat invoice & nota
│   ├── 📄 invoice.html       # Generator nota & invoice PDF
│   ├── 📄 admin-tasks.html   # Checklist aktivitas admin
│   ├── 📄 tools.html         # Tools & AI Generator
│   ├── 📄 user-management.html # Manajemen pengguna & role
│   ├── 📄 pengaturan.html    # Pengaturan sistem & database
│   ├── 📄 profil.html        # Profil pengguna
│   └── 📄 maintenance.html   # Halaman pemeliharaan
├── 📂 js/                    # Logika JavaScript Modular
│   ├── 📂 core/              # Modul inti (config, api, auth, pwa, theme, toast, i18n)
│   ├── 📂 modules/           # Kontroler per halaman modul
│   └── 📂 utils/             # Utilitas integrasi (excel, calendar)
├── 📂 css/                   # Lembar gaya (style.css, darkmode.css, tailwind.min.css)
├── 📂 assets/                # Aset statis grafis, video, & media
├── 📂 docs/                  # Dokumentasi arsitektur & panduan sistem
└── 📂 notes/                 # Catatan pengembang, roadmap, & aturan prompt
```

---

## 📌 Alasan Arsitektur Root + Subfolder `pages/`

1. **Service Worker Root Scope (`/`)**:
   - `sw.js` tetap diletakkan di root agar memiliki *scope* kontrol penuh atas seluruh URL halaman aplikasi (`/index.html`, `/pages/proyek.html`, dll.).
2. **Kerapian & Kemudahan Pemeliharaan**:
   - Direktori root kini sangat bersih, bebas dari tumpukan belasan file HTML. Seluruh halaman modul operasional tertata rapi di folder `pages/`.
3. **Penyimpanan Cache & PWA Offline**:
   - Seluruh modul halaman di `pages/` dan script di `js/core/`, `js/modules/`, serta `js/utils/` terdaftar di cache Service Worker (`urlsToCache`), menjaga kemampuan offline 100%.

---

## 🗂️ Rincian Direktori & Tugas Berkas

### 1. Halaman Antarmuka (`index.html`, `login.html`, & `pages/*.html`)
Setiap file HTML mewakili satu modul operasional dengan kontroler JS pasangannya:

| Berkas HTML | Kontroler JS | Fungsi & Modul Utama |
|---|---|---|
| `index.html` (Root) | `js/modules/dashboard.js` | Ringkasan eksekutif, metrik performa, dan grafik analitik |
| `login.html` (Root) | `js/core/auth.js` | Autentikasi sesi login (Sesi aman 3 hari) |
| `pages/proyek.html` | `js/modules/proyek.js` | Tabel data master projek, filter status, pencarian, & DataTables |
| `pages/tambah-proyek.html` | `js/modules/tambah.js` | Formulir entri projek baru dan edit projek |
| `pages/keuangan.html` | `js/modules/keuangan.js` | Buku kas pemasukan/pengeluaran & mutasi saldo |
| `pages/laporan.html` | `js/modules/laporan.js` | Analitik komprehensif, filter periode, & laporan tahunan |
| `pages/history-invoice.html` | `js/modules/history-invoice.js` | Arsip pencatatan invoice & status pembayaran klien |
| `pages/invoice.html` | `js/modules/invoice.js` | Generator nota / invoice dan cetak PDF profesional |
| `pages/admin-tasks.html` | `js/modules/admin-tasks.js` | Checklist harian staf, delegasi tugas, & reset berkala |
| `pages/tools.html` | `js/modules/tools.js` | Utilitas generator prompt, AI assistant Gemini, & pintasan |
| `pages/user-management.html` | `js/modules/user-management.js` | Pengelolaan hak akses 3-Role (Super Admin Only) |
| `pages/pengaturan.html` | `js/modules/pengaturan.js` | Manajemen database lokal, API Sheets, & backup |
| `pages/profil.html` | `js/modules/profil.js` | Edit profil pengguna, ganti password, & avatar |
| `pages/maintenance.html` | - | Halaman pemeliharaan sistem saat server offline |

---

### 2. Direktori `js/` (Logika & Modul JavaScript)
Dikelompokkan menjadi 3 kategori fungsi:

- **`js/core/` (Modul Fondasi & Utilitas Global)**:
  - `config.js`: Variabel konfigurasi terpusat, endpoint Google Apps Script, & helper modal.
  - `api.js`: Lapisan komunikasi jaringan fetch API, antrean sinkronisasi offline.
  - `auth.js`: Manajemen sesi autentikasi, enkripsi token, kontrol hak akses 3-Role, bottom navigation.
  - `theme.js`: Switcher tema terang / gelap (Light / Dark Mode).
  - `toast.js`: Notifikasi pesan mengambang (*toast*) dengan timer progress bar.
  - `pwa.js`: Penanganan instalasi PWA dan deteksi liveness service worker.
  - `i18n.js`: Lokalisasi bahasa (Indonesia & English).

- **`js/modules/` (Modul Kontroler Halaman)**:
  - `dashboard.js`, `proyek.js`, `tambah.js`, `keuangan.js`, `laporan.js`, `history-invoice.js`, `invoice.js`, `admin-tasks.js`, `tools.js`, `user-management.js`, `pengaturan.js`, `profil.js`.

- **`js/utils/` (Modul Ekspor & Integrasi Pihak Ketiga)**:
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
