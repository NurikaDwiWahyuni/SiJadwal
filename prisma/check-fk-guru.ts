import { prisma } from "../lib/prisma";

async function main() {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME, CHARACTER_SET_NAME, COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (
        (TABLE_NAME = 'guru' AND COLUMN_NAME = 'id') OR
        (TABLE_NAME = 'beban_mengajar' AND COLUMN_NAME = 'guruId') OR
        (TABLE_NAME = 'jadwal' AND COLUMN_NAME = 'guruId') OR
        (TABLE_NAME = 'piket_guru' AND COLUMN_NAME = 'guruId') OR
        (TABLE_NAME = 'kelas' AND COLUMN_NAME = 'waliKelasId') OR
        (TABLE_NAME = 'ekstrakurikuler' AND COLUMN_NAME = 'pembinaId')
      );
  `);
  console.table(rows);

  // Also: directly check raw rows in piket_guru/jadwal/beban_mengajar for this guru id,
  // bypassing Prisma's normal query builder, using binary comparison
  const id = process.argv[2];
  if (id) {
    const piket = await prisma.$queryRawUnsafe(`SELECT * FROM piket_guru WHERE guruId = ?`, id);
    const jadwal = await prisma.$queryRawUnsafe(`SELECT id, guruId, bebanMengajarId FROM jadwal WHERE guruId = ?`, id);
    const beban = await prisma.$queryRawUnsafe(`SELECT id, guruId FROM beban_mengajar WHERE guruId = ?`, id);
    console.log("piket_guru rows:", piket);
    console.log("jadwal rows:", jadwal);
    console.log("beban_mengajar rows:", beban);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
