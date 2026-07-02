-- CreateEnum
CREATE TYPE "StatusGuru" AS ENUM ('PNS', 'HONOR');

-- CreateEnum
CREATE TYPE "Hari" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('GANJIL', 'GENAP');

-- CreateEnum
CREATE TYPE "JenisSlot" AS ENUM ('PELAJARAN', 'NON_PELAJARAN');

-- CreateEnum
CREATE TYPE "JenisPiket" AS ENUM ('HARIAN', 'KARAKTER');

-- CreateEnum
CREATE TYPE "KelasMapelMode" AS ENUM ('ALL', 'CUSTOM', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guru" (
    "id" TEXT NOT NULL,
    "kodeGuru" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "StatusGuru" NOT NULL,
    "hariTidakTersedia" JSONB,
    "maksJp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelas" (
    "id" TEXT NOT NULL,
    "namaKelas" TEXT NOT NULL,
    "waliKelasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapel" (
    "id" TEXT NOT NULL,
    "namaMapel" TEXT NOT NULL,
    "kodeMapel" TEXT NOT NULL,
    "jpMaksBerurutan" INTEGER NOT NULL DEFAULT 2,
    "jumlahPertemuanMaks" INTEGER NOT NULL DEFAULT 3,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ekstrakurikuler" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "pembinaId" TEXT,
    "hari" "Hari" NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "lokasi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ekstrakurikuler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_waktu" (
    "id" TEXT NOT NULL,
    "hari" "Hari" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "namaSlot" TEXT NOT NULL,
    "jenisSlot" "JenisSlot" NOT NULL,
    "jamMulai" TEXT,
    "jamSelesai" TEXT,

    CONSTRAINT "slot_waktu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periode_akademik" (
    "id" TEXT NOT NULL,
    "tahun" TEXT NOT NULL,
    "semester" "Semester" NOT NULL,
    "statusAktif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periode_akademik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identitas_sekolah" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "namaSekolah" TEXT NOT NULL,
    "npsn" TEXT,
    "nss" TEXT,
    "alamat" TEXT,
    "email" TEXT,
    "namaPemerintah" TEXT,
    "namaDinas" TEXT,
    "kecamatan" TEXT,
    "tahunPelajaran" TEXT,
    "semester" "Semester" NOT NULL DEFAULT 'GANJIL',
    "kurikulum" TEXT,
    "logoKiri" TEXT,
    "logoKanan" TEXT,

    CONSTRAINT "identitas_sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_ttd" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "namaKepsek" TEXT NOT NULL,
    "nipKepsek" TEXT,
    "namaWaka" TEXT NOT NULL,
    "nipWaka" TEXT,

    CONSTRAINT "pengaturan_ttd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelas_mapel_config" (
    "id" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mode" "KelasMapelMode" NOT NULL DEFAULT 'ALL',
    "mapelIds" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelas_mapel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beban_mengajar" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "mapelId" TEXT NOT NULL,
    "jp" INTEGER NOT NULL,
    "periodeAkademikId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beban_mengajar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_terkunci" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "mapelId" TEXT,
    "ekstrakurikulerId" TEXT,
    "kelasId" TEXT,
    "hari" "Hari" NOT NULL,
    "slotWaktuMulaiId" TEXT NOT NULL,
    "durasiSlot" INTEGER NOT NULL DEFAULT 1,
    "periodeAkademikId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_terkunci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal" (
    "id" TEXT NOT NULL,
    "periodeAkademikId" TEXT NOT NULL,
    "bebanMengajarId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "hari" "Hari" NOT NULL,
    "slotWaktuId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPecah11" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piket_guru" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "hari" "Hari" NOT NULL,
    "jenisPiket" "JenisPiket" NOT NULL DEFAULT 'HARIAN',
    "periodeAkademikId" TEXT NOT NULL,

    CONSTRAINT "piket_guru_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "guru_kodeGuru_key" ON "guru"("kodeGuru");

-- CreateIndex
CREATE UNIQUE INDEX "kelas_namaKelas_key" ON "kelas"("namaKelas");

-- CreateIndex
CREATE UNIQUE INDEX "mapel_kodeMapel_key" ON "mapel"("kodeMapel");

-- CreateIndex
CREATE UNIQUE INDEX "slot_waktu_hari_urutan_key" ON "slot_waktu"("hari", "urutan");

-- CreateIndex
CREATE UNIQUE INDEX "periode_akademik_tahun_semester_key" ON "periode_akademik"("tahun", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "kelas_mapel_config_kelasId_key" ON "kelas_mapel_config"("kelasId");

-- CreateIndex
CREATE UNIQUE INDEX "beban_mengajar_guruId_kelasId_mapelId_periodeAkademikId_key" ON "beban_mengajar"("guruId", "kelasId", "mapelId", "periodeAkademikId");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_periodeAkademikId_kelasId_hari_slotWaktuId_key" ON "jadwal"("periodeAkademikId", "kelasId", "hari", "slotWaktuId");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_periodeAkademikId_guruId_hari_slotWaktuId_key" ON "jadwal"("periodeAkademikId", "guruId", "hari", "slotWaktuId");

-- CreateIndex
CREATE UNIQUE INDEX "piket_guru_guruId_periodeAkademikId_jenisPiket_key" ON "piket_guru"("guruId", "periodeAkademikId", "jenisPiket");

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_waliKelasId_fkey" FOREIGN KEY ("waliKelasId") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ekstrakurikuler" ADD CONSTRAINT "ekstrakurikuler_pembinaId_fkey" FOREIGN KEY ("pembinaId") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelas_mapel_config" ADD CONSTRAINT "kelas_mapel_config_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beban_mengajar" ADD CONSTRAINT "beban_mengajar_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beban_mengajar" ADD CONSTRAINT "beban_mengajar_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beban_mengajar" ADD CONSTRAINT "beban_mengajar_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beban_mengajar" ADD CONSTRAINT "beban_mengajar_periodeAkademikId_fkey" FOREIGN KEY ("periodeAkademikId") REFERENCES "periode_akademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_terkunci" ADD CONSTRAINT "slot_terkunci_mapelId_fkey" FOREIGN KEY ("mapelId") REFERENCES "mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_terkunci" ADD CONSTRAINT "slot_terkunci_ekstrakurikulerId_fkey" FOREIGN KEY ("ekstrakurikulerId") REFERENCES "ekstrakurikuler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_terkunci" ADD CONSTRAINT "slot_terkunci_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_terkunci" ADD CONSTRAINT "slot_terkunci_slotWaktuMulaiId_fkey" FOREIGN KEY ("slotWaktuMulaiId") REFERENCES "slot_waktu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_terkunci" ADD CONSTRAINT "slot_terkunci_periodeAkademikId_fkey" FOREIGN KEY ("periodeAkademikId") REFERENCES "periode_akademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_periodeAkademikId_fkey" FOREIGN KEY ("periodeAkademikId") REFERENCES "periode_akademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_bebanMengajarId_fkey" FOREIGN KEY ("bebanMengajarId") REFERENCES "beban_mengajar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_slotWaktuId_fkey" FOREIGN KEY ("slotWaktuId") REFERENCES "slot_waktu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piket_guru" ADD CONSTRAINT "piket_guru_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piket_guru" ADD CONSTRAINT "piket_guru_periodeAkademikId_fkey" FOREIGN KEY ("periodeAkademikId") REFERENCES "periode_akademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
