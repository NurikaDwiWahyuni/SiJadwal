-- Fix unique constraint untuk piket_guru
-- Hapus constraint lama (guruId + periodeId saja)
-- Tambah constraint baru (guruId + periodeId + jenisPiket)
-- Sehingga 1 guru bisa punya 2 baris: HARIAN + KARAKTER

-- Langkah 1: hapus index lama (nama bisa beda tergantung Prisma versi, coba keduanya)
ALTER TABLE `piket_guru` DROP INDEX IF EXISTS `piket_guru_guruId_periodeAkademikId_key`;
ALTER TABLE `piket_guru` DROP INDEX IF EXISTS `piket_guru_guruId_periodeAkademikId_jenisPiket_key`;

-- Langkah 2: tambah index baru yang benar
ALTER TABLE `piket_guru`
  ADD UNIQUE KEY `piket_guru_guruId_periodeAkademikId_jenisPiket_key`
  (`guruId`, `periodeAkademikId`, `jenisPiket`);
