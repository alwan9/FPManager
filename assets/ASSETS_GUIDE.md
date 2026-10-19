# 🖼️ Direktori Aset Media (FPManager)

Direktori ini menyimpan seluruh aset statis berupa gambar, ikon PWA, tanda tangan digital, QRIS, watermark, dan video pendukung antarmuka pengguna.

---

## 📂 Struktur Subdirektori

```
assets/
├── img/                  # Aset gambar & identitas visual aplikasi
│   ├── logo.webp         # Logo utama FPManager
│   ├── favicon.png       # Favicon tab browser (32x32)
│   ├── icon-192.png      # Ikon PWA standar mobile (192x192)
│   ├── icon-512.png      # Ikon PWA splash screen desktop/tablet (512x512)
│   ├── qris.jpg          # Foto QRIS untuk popup pembayaran keuangan
│   └── ttd.png           # Tanda tangan digital stempel invoice/nota
├── watermark/            # Watermark berkas dokumen
│   ├── wm_black.png      # Watermark hitam transparan
│   ├── wm_warna.png      # Watermark berwarna
│   └── wm_white.png      # Watermark putih (dark mode / background gelap)
└── maintenance-assets/   # Aset video/animasi mode pemeliharaan
    ├── 0_Website_Maintenance_1280x720.mp4
    └── 0_Website_Maintenance_1280x720_2.mp4
```

---

## 📐 Standar Kualitas & Format Berkas
1. **Foto & Grafis Kompleks**: Gunakan format modern `.webp` untuk kompresi file terbaik dan loading instan.
2. **Ikon Transparan & Tanda Tangan**: Gunakan format `.png` dengan alpha transparency murni.
3. **PWA Icons**: Wajib mempertahankan aspek rasio 1:1 tanpa distorsi.
