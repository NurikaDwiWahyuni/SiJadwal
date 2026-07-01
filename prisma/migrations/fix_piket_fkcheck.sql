-- Drop FK pakai nama yang Prisma generate secara otomatis
-- Format Prisma: piket_guru_<kolom>_fkey

SET FOREIGN_KEY_CHECKS = 0;

-- Drop index lama
ALTER TABLE `piket_guru` DROP INDEX `piket_guru_guruId_periodeAkademikId_key`;

-- Tambah index baru
ALTER TABLE `piket_guru`
  ADD UNIQUE KEY `piket_guru_guruId_periodeAkademikId_jenisPiket_key`
  (`guruId`, `periodeAkademikId`, `jenisPiket`);

SET FOREIGN_KEY_CHECKS = 1;
