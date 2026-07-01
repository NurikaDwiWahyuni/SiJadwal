-- Migration: tambah jenisPiket ke piket_guru
-- Jalankan: npx prisma db execute --file prisma/migrations/add_jenis_piket.sql

ALTER TABLE `piket_guru`
  ADD COLUMN `jenisPiket` ENUM('HARIAN','KARAKTER') NOT NULL DEFAULT 'HARIAN'
  AFTER `hari`;

-- Update unique constraint lama → baru (boleh 2 baris per guru: HARIAN + KARAKTER)
ALTER TABLE `piket_guru`
  DROP INDEX `piket_guru_guruId_periodeAkademikId_key`;

ALTER TABLE `piket_guru`
  ADD UNIQUE KEY `piket_guru_guruId_periodeId_jenis` (`guruId`, `periodeAkademikId`, `jenisPiket`);
