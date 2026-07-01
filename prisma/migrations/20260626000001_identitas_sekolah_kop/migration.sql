-- Tambah kolom-kolom KOP sekolah yang dibutuhkan untuk laporan PDF/Excel
-- Field yang sudah ada: id, namaSekolah, npsn, alamat
-- Field baru:

ALTER TABLE `identitas_sekolah`
  ADD COLUMN `nss`            VARCHAR(191) NULL,
  ADD COLUMN `email`          VARCHAR(191) NULL,
  ADD COLUMN `kecamatan`      VARCHAR(191) NULL,
  ADD COLUMN `namaPemerintah` VARCHAR(191) NULL,
  ADD COLUMN `namaDinas`      VARCHAR(191) NULL,
  ADD COLUMN `kurikulum`      VARCHAR(191) NULL,
  ADD COLUMN `tahunPelajaran` VARCHAR(191) NULL,
  ADD COLUMN `logoKiri`       LONGTEXT     NULL,
  ADD COLUMN `logoKanan`      LONGTEXT     NULL;
