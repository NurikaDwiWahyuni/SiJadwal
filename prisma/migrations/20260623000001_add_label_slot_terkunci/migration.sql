-- Migration: Tambah kolom `label` ke tabel `slot_terkunci`
-- Tujuan: Menyimpan nama acara untuk slot yang diblokir (tipe "blocked")
--         Contoh: "Upacara", "Sholat Jumat", "Rapat Guru"
--         Kolom ini NULL untuk tipe mapel/ekskul (sudah punya nama dari relasinya)

ALTER TABLE `slot_terkunci`
  ADD COLUMN `label` VARCHAR(60) NULL AFTER `id`;
