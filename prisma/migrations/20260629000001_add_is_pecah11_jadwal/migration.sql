-- Migration: Tambah kolom isPecah11 ke tabel jadwal
-- Tujuan: Menandai slot hasil pecah 2JP → 1+1 di hari berbeda (Fase 3 generate)
-- Default false → semua baris lama otomatis tidak terpengaruh

ALTER TABLE `jadwal`
  ADD COLUMN `isPecah11` BOOLEAN NOT NULL DEFAULT false;
