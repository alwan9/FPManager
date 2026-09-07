# Panduan Desain & Standar Pembuatan Popup Modal (FPManager)

Dokumen ini adalah pedoman teknis dan panduan desain resmi untuk antarmuka pengguna (UI/UX), standarisasi pembuatan popup/modal, dialog konfirmasi, dan sistem notifikasi di dalam aplikasi **FPManager**.

---

## 1. Filosofi & Desain Sistem Utama

Aplikasi FPManager menggunakan kombinasi estetika **Modern Glassmorphism**, palet warna **Zinc & Indigo**, serta dukungan penuh untuk **Light Mode** dan **Dark Mode**.

### Palet Warna Utama:
- **Background Utama (Light)**: `bg-zinc-50` / `#fafafa`
- **Background Utama (Dark)**: `bg-zinc-950` / `#09090b`
- **Card / Surface (Light)**: `bg-white` / `#ffffff` dengan border `border-zinc-200`
- **Card / Surface (Dark)**: `bg-zinc-900` / `#18181b` dengan border `border-zinc-800`
- **Aksen Primer**: Indigo (`#4f46e5` / `bg-indigo-600`, `hover:bg-indigo-700`)
- **Aksen Sukses**: Emerald (`#16a34a` / `bg-emerald-600`)
- **Aksen Peringatan**: Amber (`#d97706` / `bg-amber-600`)
- **Aksen Bahaya / Destruktif**: Rose (`#e11d48` / `bg-rose-600`)

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

### C. Struktur DOM Baku Pembuatan Modal

Gunakan template HTML berikut saat membuat modal baru:

```html
<!-- Container Modal Backdrop (Overlay Hitam 60%) -->
<div id="contohModal"
     onclick="if(event.target === this && !isModalInputFilled(this)) closeContohModal()"
     class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
  
  <!-- Dialog Box Card -->
  <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden transform transition-all">
    
    <!-- Modal Header -->
    <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
      <h3 class="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
        <i class="fa-solid fa-layer-group text-indigo-600 dark:text-indigo-400"></i>
        <span>Judul Modal</span>
      </h3>
      <button type="button" onclick="closeContohModal()" class="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>
    </div>

    <!-- Modal Body (Scrollable jika panjang) -->
    <div class="p-6 space-y-4 overflow-y-auto flex-1">
      <form id="contohForm">
        <div>
          <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">Nama Input</label>
          <input type="text" id="inputNama" class="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition">
        </div>
      </form>
    </div>

    <!-- Modal Footer -->
    <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end items-center gap-3 shrink-0">
      <button type="button" onclick="closeContohModal()" class="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition">
        Batal
      </button>
      <button type="submit" form="contohForm" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5">
        <i class="fa-solid fa-floppy-disk"></i>
        <span>Simpan</span>
      </button>
    </div>

  </div>
</div>
```

---

## 3. Standar Modal Konfirmasi Kustom (`showConfirmModal`)

Aplikasi FPManager telah menonaktifkan `confirm()` bawaan browser dan menggantinya dengan sistem dialog konfirmasi UI kustom berbasis `Promise<boolean>`.

### Keunggulan:
- Desain konsisten dengan Dark Mode dan Glassmorphism.
- Berbasis `async / await` yang sangat bersih dan mudah dibaca.
- Mendukung shortcut keyboard: `Enter` untuk konfirmasi, `Escape` untuk membatalkan.
- Mendukung penutupan via klik backdrop luar (mengembalikan `false`).

### API Signature:
```javascript
const isConfirmed = await showConfirmModal({
  title: 'Judul Konfirmasi',
  message: 'Penjelasan rinci mengenai konsekuensi tindakan...',
  type: 'danger' | 'warning' | 'info' | 'success', // default: 'danger'
  confirmText: 'Teks Tombol Ya', // default disesuaikan tipe
  cancelText: 'Batal'            // default: 'Batal'
});

if (isConfirmed) {
  // Jalankan aksi penghapusan atau pembaruan data
}
```

### Varian Tipe Konfirmasi:

| Tipe | Warna & Icon | Kegunaan Utama |
| :--- | :--- | :--- |
| `danger` | **Rose / Merah** (`fa-trash-can`) | Penghapusan data permanen (projek, user, transaksi, tugas, prompt). |
| `warning` | **Amber / Kuning** (`fa-triangle-exclamation`) | Reset pengaturan, pembersihan cache, perubahan status massal. |
| `info` | **Indigo / Biru** (`fa-circle-question`) | Konfirmasi pelunasan, pengalihan status, tindakan umum. |
| `success` | **Emerald / Hijau** (`fa-circle-check`) | Persetujuan validasi, publikasi, finalisasi. |

---

## 4. Standar Notifikasi Toast (`Toast`)

Seluruh pesan notifikasi dan validasi form **TIDAK BOLEH** menggunakan `alert()` bawaan browser. Gunakan sistem **Toast** terintegrasi:

```javascript
// 1. Notifikasi Sukses
Toast.success('Berhasil', 'Data transaksi berhasil disimpan.');

// 2. Notifikasi Error / Gagal
Toast.error('Gagal', 'Terjadi kesalahan saat memproses data.');

// 3. Notifikasi Peringatan / Validasi Form
Toast.warning('Peringatan', 'Tanggal deadline tidak boleh di masa lampau.');

// 4. Notifikasi Informasi
Toast.info('Info', 'Form tambah data dibuka.');
```

---

## 5. Ringkasan Aturan yang Dilarang (Deprecated Patterns)

- ❌ **DILARANG** memanggil `alert(...)` bawaan browser.
- ❌ **DILARANG** memanggil `confirm(...)` bawaan browser.
- ❌ **DILARANG** menggunakan warna backdrop modal selain transparansi hitam 60% (`rgba(0, 0, 0, 0.6)`).
- ❌ **DILARANG** membuat popup yang langsung tertutup saat klik backdrop jika pengguna sedang mengisi form data penting tanpa proteksi `isModalInputFilled`.
