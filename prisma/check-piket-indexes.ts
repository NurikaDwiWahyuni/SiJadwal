import { prisma } from "../lib/prisma";

async function main() {
  const idx: any = await prisma.$queryRawUnsafe(`SHOW INDEX FROM piket_guru`);
  console.log("Indexes on piket_guru:");
  console.table(idx.map((r: any) => ({ Key_name: r.Key_name, Column_name: r.Column_name, Non_unique: r.Non_unique, Seq: r.Seq_in_index })));

  const createTbl: any = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE piket_guru`);
  console.log("\nCREATE TABLE piket_guru:\n", createTbl[0]["Create Table"]);
}

main().catch(console.error).finally(() => process.exit(0));
