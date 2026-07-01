-- Tambah kolom semester ke identitas_sekolah
ALTER TABLE `identitas_sekolah`
  ADD COLUMN `semester` ENUM('GANJIL', 'GENAP') NOT NULL DEFAULT 'GANJIL';
