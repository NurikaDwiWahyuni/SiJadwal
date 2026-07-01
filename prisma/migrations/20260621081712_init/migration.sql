-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guru` (
    `id` VARCHAR(191) NOT NULL,
    `kodeGuru` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `status` ENUM('PNS', 'HONOR') NOT NULL,
    `hariTidakTersedia` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `guru_kodeGuru_key`(`kodeGuru`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id` VARCHAR(191) NOT NULL,
    `namaKelas` VARCHAR(191) NOT NULL,
    `waliKelasId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kelas_namaKelas_key`(`namaKelas`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mapel` (
    `id` VARCHAR(191) NOT NULL,
    `namaMapel` VARCHAR(191) NOT NULL,
    `kodeMapel` VARCHAR(191) NOT NULL,
    `jpMaksBerurutan` INTEGER NOT NULL DEFAULT 2,
    `jumlahPertemuanMaks` INTEGER NOT NULL DEFAULT 3,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mapel_kodeMapel_key`(`kodeMapel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ekstrakurikuler` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `pembinaId` VARCHAR(191) NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `jamMulai` VARCHAR(191) NOT NULL,
    `jamSelesai` VARCHAR(191) NOT NULL,
    `lokasi` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_waktu` (
    `id` VARCHAR(191) NOT NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `urutan` INTEGER NOT NULL,
    `namaSlot` VARCHAR(191) NOT NULL,
    `jenisSlot` ENUM('PELAJARAN', 'NON_PELAJARAN') NOT NULL,
    `jamMulai` VARCHAR(191) NULL,
    `jamSelesai` VARCHAR(191) NULL,

    UNIQUE INDEX `slot_waktu_hari_urutan_key`(`hari`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periode_akademik` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` VARCHAR(191) NOT NULL,
    `semester` ENUM('GANJIL', 'GENAP') NOT NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `periode_akademik_tahun_semester_key`(`tahun`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `identitas_sekolah` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `namaSekolah` VARCHAR(191) NOT NULL,
    `npsn` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengaturan_ttd` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `namaKepsek` VARCHAR(191) NOT NULL,
    `nipKepsek` VARCHAR(191) NULL,
    `namaWaka` VARCHAR(191) NOT NULL,
    `nipWaka` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beban_mengajar` (
    `id` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `mapelId` VARCHAR(191) NOT NULL,
    `jp` INTEGER NOT NULL,
    `periodeAkademikId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `beban_mengajar_guruId_kelasId_mapelId_periodeAkademikId_key`(`guruId`, `kelasId`, `mapelId`, `periodeAkademikId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_terkunci` (
    `id` VARCHAR(191) NOT NULL,
    `mapelId` VARCHAR(191) NULL,
    `ekstrakurikulerId` VARCHAR(191) NULL,
    `kelasId` VARCHAR(191) NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `slotWaktuMulaiId` VARCHAR(191) NOT NULL,
    `durasiSlot` INTEGER NOT NULL DEFAULT 1,
    `periodeAkademikId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal` (
    `id` VARCHAR(191) NOT NULL,
    `periodeAkademikId` VARCHAR(191) NOT NULL,
    `bebanMengajarId` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `slotWaktuId` VARCHAR(191) NOT NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `jadwal_periodeAkademikId_kelasId_hari_slotWaktuId_key`(`periodeAkademikId`, `kelasId`, `hari`, `slotWaktuId`),
    UNIQUE INDEX `jadwal_periodeAkademikId_guruId_hari_slotWaktuId_key`(`periodeAkademikId`, `guruId`, `hari`, `slotWaktuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `piket_guru` (
    `id` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `periodeAkademikId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `piket_guru_guruId_periodeAkademikId_key`(`guruId`, `periodeAkademikId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_waliKelasId_fkey` FOREIGN KEY (`waliKelasId`) REFERENCES `guru`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ekstrakurikuler` ADD CONSTRAINT `ekstrakurikuler_pembinaId_fkey` FOREIGN KEY (`pembinaId`) REFERENCES `guru`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beban_mengajar` ADD CONSTRAINT `beban_mengajar_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beban_mengajar` ADD CONSTRAINT `beban_mengajar_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beban_mengajar` ADD CONSTRAINT `beban_mengajar_mapelId_fkey` FOREIGN KEY (`mapelId`) REFERENCES `mapel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beban_mengajar` ADD CONSTRAINT `beban_mengajar_periodeAkademikId_fkey` FOREIGN KEY (`periodeAkademikId`) REFERENCES `periode_akademik`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_terkunci` ADD CONSTRAINT `slot_terkunci_mapelId_fkey` FOREIGN KEY (`mapelId`) REFERENCES `mapel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_terkunci` ADD CONSTRAINT `slot_terkunci_ekstrakurikulerId_fkey` FOREIGN KEY (`ekstrakurikulerId`) REFERENCES `ekstrakurikuler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_terkunci` ADD CONSTRAINT `slot_terkunci_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_terkunci` ADD CONSTRAINT `slot_terkunci_slotWaktuMulaiId_fkey` FOREIGN KEY (`slotWaktuMulaiId`) REFERENCES `slot_waktu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_terkunci` ADD CONSTRAINT `slot_terkunci_periodeAkademikId_fkey` FOREIGN KEY (`periodeAkademikId`) REFERENCES `periode_akademik`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal` ADD CONSTRAINT `jadwal_periodeAkademikId_fkey` FOREIGN KEY (`periodeAkademikId`) REFERENCES `periode_akademik`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal` ADD CONSTRAINT `jadwal_bebanMengajarId_fkey` FOREIGN KEY (`bebanMengajarId`) REFERENCES `beban_mengajar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal` ADD CONSTRAINT `jadwal_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal` ADD CONSTRAINT `jadwal_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal` ADD CONSTRAINT `jadwal_slotWaktuId_fkey` FOREIGN KEY (`slotWaktuId`) REFERENCES `slot_waktu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `piket_guru` ADD CONSTRAINT `piket_guru_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `piket_guru` ADD CONSTRAINT `piket_guru_periodeAkademikId_fkey` FOREIGN KEY (`periodeAkademikId`) REFERENCES `periode_akademik`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
