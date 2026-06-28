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

Berikut adalah langkah-langkah untuk melakukan setup dan mengaktifkan **Live Mode**:

### Langkah 1: Siapkan Google Spreadsheet
1. Buka Google Drive Anda, lalu buat sebuah **Google Spreadsheet** baru.
2. Beri nama spreadsheet bebas (misalnya: *Database ProjekBareng*).
3. Anda **tidak perlu membuat kolom tabel secara manual**. Apps Script akan otomatis mendeteksi dan membuat sheet `Proyek` dan `Keuangan` beserta header kolomnya saat pertama kali dijalankan.
4. Salin **ID Spreadsheet** Anda dari URL browser.
   * *Contoh URL*: `https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit#gid=0`
   * *ID Spreadsheet*: `1A2B3C4D5E6F7G8H9I0J`

### Langkah 2: Deploy Google Apps Script sebagai API
1. Di dalam spreadsheet tersebut, klik menu **Ekstensi** > **Apps Script**.
2. Hapus semua kode default di dalam editor script, lalu salin seluruh isi kode dari file [Code.js](file:///c:/Users/user/Desktop/ProjekBareng/apps-script/Code.js) proyek ini dan tempelkan ke dalam editor Apps Script.
3. Klik tombol **Simpan** (ikon disket).
4. Klik tombol **Deploy** di bagian kanan atas > pilih **Deploy baru**.
5. Klik ikon gerigi (Pilih jenis) > pilih **Aplikasi web**.
6. Atur konfigurasi berikut:
   * **Deskripsi**: `API Kelola ProjekBareng`
   * **Jalankan sebagai**: `Saya (emailanda@gmail.com)`
   * **Siapa yang memiliki akses**: `Siapa saja` (*Penting: ini agar frontend HTML bisa mengirim data tanpa memicu blokir login Google*).
7. Klik **Deploy**.
8. Sistem akan meminta otorisasi akun Google Anda. Klik **Berikan Akses** > pilih akun email Anda > klik **Advanced** > klik **Go to Database ProjekBareng (unsafe)** > klik **Allow**.
9. Setelah deploy berhasil, salin **URL Aplikasi Web** yang diberikan.
   * *Bentuk URL*: `https://script.google.com/macros/s/AKfycbz...YOUR_SCRIPT_ID.../exec`

### Langkah 3: Sambungkan Frontend dengan API
1. Buka file [js/config.js](file:///c:/Users/user/Desktop/ProjekBareng/js/config.js) di dalam folder proyek Anda.
2. Ubah konfigurasi menjadi seperti berikut:
   ```javascript
   const CONFIG = {
     MOCK_MODE: false, // Ubah dari true ke false
     API_URL: 'URL_APLIKASI_WEB_APPS_SCRIPT_ANDA', // Tempel URL Apps Script Anda di sini
     WA_TEMPLATE: 'gimana kak? apakah sudah sesuai? atau bagai mana ya kak?',
     ADMIN_PASS: 'admin123' // Anda dapat mengganti password login admin di sini
   };
   ```
3. Simpan perubahan file `config.js`.

Sekarang, setiap kali aplikasi Anda dibuka, data proyek dan transaksi keuangan akan langsung dibaca dan disimpan secara real-time ke Google Spreadsheet Anda!

---

## 🌐 Publikasi ke GitHub Pages
Agar aplikasi ini bisa diakses online oleh Anda atau admin lain di manapun:
1. Buat sebuah repositori baru di GitHub dengan nama `kelola-projekbareng`.
2. Push seluruh file folder proyek Anda ke repositori tersebut menggunakan Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Kelola ProjekBareng"
   git branch -M main
   git remote add origin https://github.com/username-anda/kelola-projekbareng.git
   git push -u origin main
   ```
3. Di halaman repositori GitHub Anda, buka menu **Settings** > **Pages**.
4. Pada bagian **Build and deployment** > **Source**, pilih **Deploy from a branch**.
5. Pada bagian **Branch**, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
6. Tunggu beberapa menit, situs web Anda akan aktif di URL: `https://username-anda.github.io/kelola-projekbareng/`.
7. (*Opsional*) Anda dapat menghubungkan domain kustom pada kolom **Custom domain** di menu Pages tersebut.

---

## 🔒 Catatan Keamanan
Karena backend Google Apps Script ini berjalan secara publik (`Siapa saja` memiliki akses), pastikan untuk:
1. Tidak mempublikasikan URL Google Sheets database Anda ke publik.
2. Mengubah nilai `ADMIN_PASS` di file `js/config.js` dengan sandi yang lebih aman sebelum mempublikasikannya ke GitHub.
3. Aplikasi ini menggunakan enkripsi/pengecekan password sisi client. Untuk tingkat keamanan tingkat perusahaan (enterprise), disarankan menggunakan backend hosting berbayar dengan OAuth/JWT. Namun untuk mini-company, arsitektur serverless ini sangat memadai dan ekonomis.
