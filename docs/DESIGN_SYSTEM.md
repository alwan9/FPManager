# 🎨 Panduan Desain & Standar UI/UX (FPManager)

Dokumen ini adalah pedoman teknis dan panduan desain resmi untuk antarmuka pengguna (UI/UX), standarisasi pembuatan popup/modal, dialog konfirmasi, dan sistem notifikasi di dalam aplikasi **FPManager**.

---

## 1. Filosofi & Desain Sistem Utama

Aplikasi FPManager menggunakan kombinasi estetika **Modern Glassmorphism**, palet warna **Zinc & Indigo**, serta dukungan penuh untuk **Light Mode** dan **Dark Mode**.

### A. Tipografi Baku
- **Judul & Heading (`h1` - `h6`, `.font-heading`)**: `Plus Jakarta Sans`, system-ui, sans-serif
- **Body & Isi Teks**: `Inter`, sans-serif

### B. Palet Warna Utama
- **Background Utama (Light)**: `bg-zinc-50` / `#fafafa`
- **Background Utama (Dark)**: `bg-zinc-950` / `#09090b`
- **Card / Surface (Light)**: `bg-white` / `#ffffff` dengan border `border-zinc-200`
- **Card / Surface (Dark)**: `bg-zinc-900` / `#18181b` dengan border `border-zinc-800`
- **Aksen Primer**: Indigo (`#4f46e5` / `bg-indigo-600`, `hover:bg-indigo-700`)
- **Aksen Sukses / Pendapatan**: Emerald (`#16a34a` / `bg-emerald-600`, `bg-emerald-50`)
- **Aksen Peringatan / Progress**: Amber (`#d97706` / `bg-amber-600`, `bg-amber-50`)
- **Aksen Bahaya / Pengeluaran**: Rose (`#e11d48` / `bg-rose-600`, `bg-rose-50`)
- **Aksen Mutasi Saldo**: Purple (`#9333ea` / `bg-purple-600`, `bg-purple-50`)

---

## 2. Ketentuan & Standar Pembuatan Popup / Modal

Setiap popup atau modal di aplikasi FPManager **WAJIB** mengikuti ketentuan baku di bawah ini:

### A. Backdrop Overlay (Latar Hitam Transparan)
1. **Transparansi Wajib 60% Hitam**:
   - CSS: `background-color: rgba(0, 0, 0, 0.6) !important;`
   - Tailwind Class: `bg-black/60` atau `bg-black bg-opacity-60`
2. **Backdrop Blur**:
   - Tambahkan `backdrop-blur-sm` atau `backdrop-blur-md` untuk memberikan efek kedalaman (*depth*) modern pada area di belakang popup.
3. **Z-Index Layering**:
   - Modal halaman standar: `z-50` atau `z-[100]`
   - Modal konfirmasi / alert global: `z-[9999]` atau `z-[999999]`

---

### B. Ketentuan Auto-Close & Proteksi Form Terisi (*Dirty Input Protection*)

> [!IMPORTANT]
> **Aturan Interaksi Klik Luar (Backdrop Click):**
> 1. **Jika Input Kosong atau Modal Info/Detail**: Ketika pengguna mengklik area hitam transparan di luar kotak modal, modal **otomatis tertutup** (*auto-close*).
> 2. **Jika Input Sudah Terisi Data**: Modal **TIDAK BOLEH** tertutup saat area hitam diklik, demi melindungi ketikan/data pengguna agar tidak hilang akibat ketidaksengajaan klik.
> 3. **Penutupan Khusus**: Modal yang sudah terisi hanya boleh ditutup melalui klik langsung pada tombol **"X"** (*close*) atau tombol **"Batal"**.

#### Fungsi Pendeteksi Input Terisi (`isModalInputFilled`):
Fungsi global tersedia di `js/config.js` untuk memeriksa apakah form dalam modal sedang berisi data:
```javascript
// Memeriksa apakah modal memiliki input teks/angka/file yang terisi
if (!isModalInputFilled(modalElement)) {
  closeModal();
}
```

---

## 3. Ikonografi & Emotikon
- **Wajib Ikon Vektor Bersih**: Gunakan pustaka Font Awesome (`<i class="fa-solid fa-..."></i>`).
- **Dilarang Emotikon OS**: Jangan menggunakan emotikon mentah Windows/Apple karena render visual tidak konsisten antar platform dan dapat merusak tata letak tabel atau tombol.
