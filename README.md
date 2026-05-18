# 🖨️ PrintDrop

PrintDrop adalah aplikasi manajemen antrean cetak dokumen berbasis cloud. Aplikasi ini memungkinkan pengguna (pelanggan) untuk mengirim file yang ingin dicetak melalui tautan publik (*Public Link*) atau pemindaian QR Code, sedangkan operator (pemilik printer) dapat menerima, mengelola, dan memproses antrean secara *real-time* melalui Dashboard.

---

## ✨ Fitur Utama

### 🧑‍💻 Untuk Pelanggan (Halaman Kirim File)
- **Upload Mudah:** Antarmuka *drag-and-drop* modern untuk mengirim file dokumen (PDF, Image, Word, dll).
- **Pengaturan Cetak:** Mendukung kustomisasi jumlah *copy*, ukuran kertas (A4, F4, Letter), dan mode warna (Hitam Putih / Berwarna).
- **Keamanan PIN:** Dukungan untuk meminta PIN sebelum pelanggan dapat mengirim file ke printer tertentu (dikonfigurasi oleh operator).
- **Catatan Tambahan:** Pengguna dapat meninggalkan pesan khusus untuk operator (misal: "Tolong jilid spiral").

### 👨‍💼 Untuk Operator (Dashboard Admin)
- **Realtime Dashboard:** Antrean baru akan muncul secara instan tanpa perlu memuat ulang (*refresh*) halaman berkat sinkronisasi langsung dengan Supabase.
- **Manajemen Status:** Ubah status file menjadi Selesai (*Done*) atau Gagal (*Failed*), dan hapus file permanen dari Storage.
- **Kontrol Akses Printer:** Operator dapat menyalakan atau mematikan penerimaan file hanya dengan sekali klik (Toggle Status).
- **QR Code Terintegrasi:** Terdapat QR Code yang ter-generate otomatis untuk dipajang di area fisik *printing/fotocopy*.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan *stack* modern untuk menjamin performa dan kualitas UI/UX:

- **Frontend Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + Framer Motion (untuk animasi transisi)
- **Ikonografi:** Lucide React
- **Notifikasi (Toast):** Sonner
- **Backend / Database:** Supabase (Database PostgreSQL, Auth, Storage, dan Realtime)

---

## 🚀 Cara Menjalankan Secara Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/hadid-zarid/printdrop.git
cd printdrop
```

### 2. Instalasi Dependensi
Pastikan Anda sudah menginstal Node.js di komputer Anda.
```bash
npm install
```

### 3. Konfigurasi Environment (Supabase)
Buat file bernama `.env` di folder utama (sejajar dengan `package.json`) dan isi dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://<PROJECT-ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON-KEY-ANDA>
```

### 4. Menjalankan Development Server
```bash
npm run dev
```
Buka browser Anda dan akses `http://localhost:5173`.

---

## 🗄️ Konfigurasi Database (Supabase)

Agar aplikasi dapat berjalan dengan lancar, Anda membutuhkan tabel berikut di database Supabase Anda:

1. **`devices`**: Untuk menyimpan data printer, public key, status *is_accepting_jobs*, lokasi, dsb.
2. **`print_jobs`**: Untuk menyimpan riwayat unggahan antrean cetak beserta tautan referensi file (*file_path*) yang ada di Storage bucket.

*Bucket Storage*: Aplikasi ini menggunakan Supabase Storage dengan nama bucket `print-files` untuk menampung dokumen yang diunggah oleh pelanggan.

---

> Dibuat dengan antarmuka premium (Glassmorphism & Micro-animations) untuk memberikan pengalaman terbaik kepada pelanggan Anda.
