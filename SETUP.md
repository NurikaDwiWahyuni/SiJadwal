# Setup Project — Sistem Penjadwalan Sekolah

Project ini sudah disiapkan (Prisma schema, koneksi DB, layout admin, dan modul
**Master Data > Guru** sebagai modul referensi/contoh pola). Jalankan langkah berikut
di terminal, dari folder `D:\app\roster`:

## 1. Install dependency baru
Beberapa package ditambahkan ke `package.json` (Prisma, zod, bcryptjs, exceljs,
@react-pdf/renderer). Install dulu:

```bash
npm install
```

## 2. Siapkan database MySQL
- Buat database kosong di MySQL, misalnya bernama `roster_db`.
- Salin `.env.example` menjadi `.env`:

```bash
copy .env.example .env
```

- Edit isi `.env`, sesuaikan `DATABASE_URL` dengan koneksi MySQL Anda:

```
DATABASE_URL="mysql://root:password@localhost:3306/roster_db"
```

## 3. Jalankan migrasi Prisma
Ini akan membuat seluruh tabel di database sesuai `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name init
```

## 4. (Opsional) Isi data contoh
Sudah disiapkan seed data contoh (guru AAS, 9 kelas, 7 mapel, slot waktu
Senin–Jumat, 1 periode akademik aktif, 1 beban mengajar contoh):

```bash
npm run db:seed
```

## 5. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan otomatis diarahkan ke
`/admin/dashboard`. Coba juga buka **Master Data > Guru** untuk melihat modul
CRUD yang sudah jadi (tambah, edit, hapus guru).

---

## Status Pengerjaan

✅ Selesai (Tahap 1):
- Prisma schema lengkap (seluruh tabel sesuai requirement, termasuk semua hasil revisi)
- Koneksi database (`lib/prisma.ts`)
- Layout admin + sidebar navigasi (semua menu sesuai struktur modul)
- Dashboard (ringkasan total guru/kelas/mapel/JP + status jadwal)
- Modul **Master Data > Guru** (CRUD penuh) — jadi pola referensi untuk modul lain
- Seed data contoh

⏳ Belum dikerjakan (menyusul di tahap berikutnya):
- Master Data: Kelas, Mapel, Ekstrakurikuler, Slot Waktu, Periode Akademik,
  Identitas Sekolah, Pengaturan TTD
- Beban Mengajar (CRUD)
- Penjadwalan: Slot Terkunci, Generate Jadwal (algoritma), Jadwal Kelas/Guru/Ekstrakurikuler
- Piket Guru (checklist)
- Laporan: Export Excel & PDF
- Halaman Guru (publik, cari berdasarkan kode guru)
- Login Admin/Operator (tabel `users` sudah ada di schema, halaman login belum dibuat)

Beri tahu saya kalau langkah 1–5 di atas sudah berhasil jalan, supaya saya lanjutkan
ke modul-modul berikutnya.
