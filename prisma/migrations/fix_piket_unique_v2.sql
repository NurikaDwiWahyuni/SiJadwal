-- Fix piket_guru unique constraint
-- Harus drop FK dulu sebelum bisa drop index

-- Step 1: Cek nama FK yang ada (jalankan ini dulu untuk tahu nama FK-nya)
-- SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
-- WHERE TABLE_NAME = 'piket_guru' AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Step 2: Drop FK yang pakai index itu
-- (nama FK biasanya: piket_guru_guruId_fkey atau piket_guru_periodeAkademikId_fkey)
ALTER TABLE `piket_guru` DROP FOREIGN KEY `piket_guru_guruId_fkey`;
ALTER TABLE `piket_guru` DROP FOREIGN KEY `piket_guru_periodeAkademikId_fkey`;

-- Step 3: Drop index lama
ALTER TABLE `piket_guru` DROP INDEX `piket_guru_guruId_periodeAkademikId_key`;

-- Step 4: Tambah index baru (guruId + periodeId + jenisPiket)
ALTER TABLE `piket_guru`
  ADD UNIQUE KEY `piket_guru_guruId_periodeAkademikId_jenisPiket_key`
  (`guruId`, `periodeAkademikId`, `jenisPiket`);

-- Step 5: Restore FK
ALTER TABLE `piket_guru`
  ADD CONSTRAINT `piket_guru_guruId_fkey`
  FOREIGN KEY (`guruId`) REFERENCES `guru`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `piket_guru`
  ADD CONSTRAINT `piket_guru_periodeAkademikId_fkey`
  FOREIGN KEY (`periodeAkademikId`) REFERENCES `periode_akademik`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
