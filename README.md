# Kelola ProjekBareng 📂📈

Kelola ProjekBareng adalah aplikasi mini-ERP berbasis web yang didesain khusus untuk mengelola operasional usaha kecil atau jasa percetakan secara mandiri tanpa memerlukan server berbayar. Aplikasi ini menggunakan **HTML5/Tailwind CSS/JavaScript Vanilla** di sisi frontend dan **Google Spreadsheet** sebagai basis data melalui perantara **Google Apps Script API**.

---

## 🌟 Fitur Utama
1. **Dashboard Usaha**: Menampilkan statistik ringkasan proyek (Aktif/Selesai), omzet, pengeluaran, keuntungan bersih, grafik bulanan, serta pengingat deadline mendesak (&le; 3 hari).
2. **Formulir Proyek Baru**: Mempermudah pendaftaran proyek dengan sistem kalkulasi otomatis nominal proyek dan sisa piutang, serta validasi kedekatan deadline.
3. **Data Proyek**: Menyajikan data tabel lengkap dengan integrasi DataTables (Search, Sort, Pagination, Filter Status), tombol hubungi klien langsung via WhatsApp, dan edit/hapus proyek.
4. **Buku Kas Keuangan**: Mempermudah pencatatan kas masuk dan kas keluar operasional. Pencatatan DP proyek baru otomatis terintegrasi ke kas masuk.
5. **Laporan & Ekspor**: Menyajikan grafik keuangan Chart.js, ringkasan piutang, cetak laporan ramah PDF (Print mode), dan ekspor data proyek & keuangan ke berkas Excel (*Multi-sheet*).
6. **Autentikasi Admin**: Akses dashboard diamankan menggunakan simulasi login admin sederhana.

---

## 🚀 Panduan Setup Aplikasi

Aplikasi ini mendukung **Dual-Mode API**:
*   **Mock Mode (Offline)**: Berjalan secara lokal menggunakan memori browser (`localStorage`). Seluruh fitur CRUD, grafik, dan laporan keuangan langsung aktif 100% saat dibuka tanpa konfigurasi backend.
*   **Live Mode (Online)**: Terhubung ke Google Spreadsheet milik akun Google Anda untuk menyimpan data secara permanen dan real-time.
