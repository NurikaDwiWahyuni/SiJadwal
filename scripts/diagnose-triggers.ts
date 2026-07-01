import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== TRIGGERS di database (semua tabel) ===");
  const triggers: any[] = await prisma.$queryRawUnsafe(`
    SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, ACTION_STATEMENT
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = DATABASE();
  `);
  console.table(triggers.map((t) => ({
    name: t.TRIGGER_NAME,
    event: t.EVENT_MANIPULATION,
    table: t.EVENT_OBJECT_TABLE,
    timing: t.ACTION_TIMING,
  })));
  if (triggers.length > 0) {
    console.log(JSON.stringify(triggers, null, 2));
  }

  console.log("\n=== SEMUA kolom bernama guruId di seluruh database (bukan cuma yg ada FK resmi) ===");
  const cols: any[] = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'guruId';
  `);
  console.table(cols);

  console.log("\n=== SEMUA tabel di database (cek ada tabel siluman/tidak dikenal Prisma) ===");
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();
  `);
  console.table(tables);

  // Coba langsung cek baris yg masih reference guru SY pakai raw query ke SETIAP tabel yg punya kolom guruId
  console.log("\n=== Cek baris guruId = target di SETIAP tabel yang punya kolom guruId ===");
  const targetId = "cmquilgiw000jicqks20hy9tb";
  for (const c of cols) {
    const tbl = c.TABLE_NAME;
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM \`${tbl}\` WHERE guruId = ?`,
        targetId
      );
      console.log(`${tbl}: ${rows[0].cnt}`);
    } catch (e: any) {
      console.log(`${tbl}: ERROR ${e.message}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Script error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
