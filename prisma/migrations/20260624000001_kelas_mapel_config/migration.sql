-- Migration: KelasMapelConfig + Mapel.aktif
-- Tujuan: memungkinkan konfigurasi mapel per kelas (ALL / CUSTOM / EXCLUDE)
--         tanpa harus input relasi satu per satu.

-- 1. Tambah kolom aktif pada tabel mapel (default TRUE agar data lama tetap aktif)
ALTER TABLE `mapel` ADD COLUMN `aktif` BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Buat tabel kelas_mapel_config
--    - mode ALL   : kelas memiliki semua mapel aktif (default, tidak butuh row)
--    - mode CUSTOM: hanya mapelIds yang tercantum di kolom mapelIds
--    - mode EXCLUDE: semua mapel aktif dikurangi yang ada di mapelIds
CREATE TABLE `kelas_mapel_config` (
  `id`        VARCHAR(191) NOT NULL,
  `kelasId`   VARCHAR(191) NOT NULL,
  `mode`      ENUM('ALL', 'CUSTOM', 'EXCLUDE') NOT NULL DEFAULT 'ALL',
  `mapelIds`  JSON NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `kelas_mapel_config_kelasId_key` (`kelasId`),
  CONSTRAINT `kelas_mapel_config_kelasId_fkey`
    FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CATATAN MIGRASI DATA:
-- Kelas lama yang tidak memiliki row di kelas_mapel_config
-- secara otomatis dianggap mode ALL (semua mapel aktif).
-- Tidak perlu backfill — logika ini ditangani di aplikasi.
