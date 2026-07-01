import { prisma } from "../lib/prisma";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npx tsx prisma/diagnose-delete.ts <guruId>");
    process.exit(1);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const bebanMilikGuru = await tx.bebanMengajar.findMany({
        where: { guruId: id },
        select: { id: true },
      });
      const bebanIds = bebanMilikGuru.map((b) => b.id);

      await tx.jadwal.deleteMany({
        where: {
          OR: [
            { guruId: id },
            ...(bebanIds.length > 0 ? [{ bebanMengajarId: { in: bebanIds } }] : []),
          ],
        },
      });
      await tx.bebanMengajar.deleteMany({ where: { guruId: id } });
      await tx.piketGuru.deleteMany({ where: { guruId: id } });
      await tx.kelas.updateMany({ where: { waliKelasId: id }, data: { waliKelasId: null } });
      await tx.ekstrakurikuler.updateMany({ where: { pembinaId: id }, data: { pembinaId: null } });

      await tx.guru.delete({ where: { id } });
    });
    console.log("Berhasil dihapus tanpa error.");
  } catch (err) {
    console.error("Gagal hapus, ambil detail InnoDB...");
    const status: any = await prisma.$queryRawUnsafe(`SHOW ENGINE INNODB STATUS`);
    const text = status[0]?.Status ?? JSON.stringify(status);
    const idx = text.indexOf("LATEST FOREIGN KEY ERROR");
    if (idx >= 0) {
      console.log(text.substring(idx, idx + 2000));
    } else {
      console.log("Tidak ada section LATEST FOREIGN KEY ERROR. Full status di bawah:");
      console.log(text);
    }
  } finally {
    process.exit(0);
  }
}

main();
