import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { HariType } from "@/lib/constants";
import { getSession } from "@/lib/auth";

// ─── Palet warna (argb) ──────────────────────────────────────────────────────
const C = {
  HDR:       "FFFFC000", // amber/oranye — judul header
  HDR_TEXT:  "FF000000",
  // Per tingkat kelas
  KELAS: [
    { hdr: "FF1E40AF", hdrFg: "FFFFFFFF", row: "FFdbeafe", rowFg: "FF1e3a8a" }, // VII  biru
    { hdr: "FF065F46", hdrFg: "FFFFFFFF", row: "FFccfbf1", rowFg: "FF134e4a" }, // VIII hijau
    { hdr: "FF7C2D12", hdrFg: "FFFFFFFF", row: "FFfed7aa", rowFg: "FF7c2d12" }, // IX   oranye
  ],
  HARI_BG:   "FFEEEEEE",
  ISTIRAHAT: "FFF5F5F5",
  ACARA:     "FFFFFF99",
  KOSONG:    "FFFFF5F5",
  WHITE:     "FFFFFFFF",
  SECTION:   "FFDDE8F0", // biru muda — header bagian bawah (wali kelas, piket, ekskul)
  PIKET_H:   "FFFEF3C7", // amber muda — harian
  PIKET_K:   "FFede9fe", // ungu muda  — karakter
  EKSKUL_H:  "FFf0fdf4", // hijau muda — ekskul header
};

const thin: ExcelJS.BorderStyle = "thin";
const bAll: Partial<ExcelJS.Borders> = {
  top: { style: thin }, bottom: { style: thin },
  left: { style: thin }, right: { style: thin },
};
const mid: Partial<ExcelJS.Alignment>  = { horizontal: "center", vertical: "middle" };
const left: Partial<ExcelJS.Alignment> = { horizontal: "left",   vertical: "middle" };

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function tingkatIdx(namaKelas: string): number {
  if (namaKelas.startsWith("IX"))   return 2;
  if (namaKelas.startsWith("VIII")) return 1;
  return 0;
}

function cell(
  row: ExcelJS.Row, col: number, val: ExcelJS.CellValue,
  o: { b?: boolean; sz?: number; it?: boolean; argbFill?: string; argbFg?: string;
       al?: Partial<ExcelJS.Alignment>; border?: boolean; wrap?: boolean } = {}
): ExcelJS.Cell {
  const c = row.getCell(col);
  c.value = val;
  c.font  = { name: "Arial", size: o.sz ?? 8, bold: o.b, italic: o.it,
               color: o.argbFg ? { argb: o.argbFg } : undefined };
  c.alignment = { ...mid, ...o.al, wrapText: o.wrap ?? false };
  if (o.argbFill) c.fill = fill(o.argbFill);
  if (o.border !== false) c.border = bAll;
  return c;
}

const bulanId = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) return NextResponse.json({ error: "Belum ada periode aktif" }, { status: 400 });

  const [identitas, ttd, kelasList, slotAll, jadwalAll, guruAll, piketAll, ekskulAll] =
    await Promise.all([
      prisma.identitasSekolah.findFirst(),
      prisma.pengaturanTtd.findFirst(),
      prisma.kelas.findMany({
        orderBy: { namaKelas: "asc" },
        include: { waliKelas: { select: { kodeGuru: true } } },
      }),
      prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] }),
      prisma.jadwal.findMany({
        where: { periodeAkademikId: periode.id },
        include: {
          slotWaktu: true,
          guru: { select: { kodeGuru: true } },
          kelas: { select: { id: true } },
          bebanMengajar: { include: { mapel: { select: { kodeMapel: true, namaMapel: true } } } },
        },
      }),
      prisma.guru.findMany({
        orderBy: { kodeGuru: "asc" },
        include: {
          bebanMengajar: { where: { periodeAkademikId: periode.id }, select: { jp: true } },
        },
      }),
      prisma.piketGuru.findMany({
        where: { periodeAkademikId: periode.id },
        include: { guru: { select: { kodeGuru: true, nama: true } } },
      }),
      prisma.ekstrakurikuler.findMany({
        orderBy: { nama: "asc" },
        include: { pembina: { select: { kodeGuru: true, nama: true } } },
      }),
    ]);

  // ── Lookup jadwal ─────────────────────────────────────────────────────────
  type JInfo = { mapel: string; kodeGuru: string };
  const lookup = new Map<string, JInfo>();
  for (const j of jadwalAll) {
    lookup.set(`${j.hari}__${j.slotWaktuId}__${j.kelasId}`, {
      mapel: j.bebanMengajar.mapel.kodeMapel || j.bebanMengajar.mapel.namaMapel,
      kodeGuru: j.guru.kodeGuru,
    });
  }

  // ── Piket per hari ─────────────────────────────────────────────────────────
  // hariPiket[hari] = { HARIAN: [{kode, nama}], KARAKTER: [{kode, nama}] }
  const hariPiket = new Map<string, { HARIAN: string[]; KARAKTER: string[] }>();
  for (const p of piketAll) {
    const h = p.hari as string;
    if (!hariPiket.has(h)) hariPiket.set(h, { HARIAN: [], KARAKTER: [] });
    const entry = hariPiket.get(h)!;
    const label = `${p.guru.nama} (${p.guru.kodeGuru})`;
    if (p.jenisPiket === "HARIAN")   entry.HARIAN.push(label);
    else                              entry.KARAKTER.push(label);
  }

  // ── Dimensi kolom ─────────────────────────────────────────────────────────
  const nKelas  = kelasList.length;
  const colMapel = (i: number) => 4 + i * 2; // 1-based
  const colGmp   = (i: number) => 5 + i * 2;
  const lastCol  = 3 + nKelas * 2;

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Roster App";
  const ws = wb.addWorksheet("Jadwal Pelajaran", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 5,           // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    properties: { defaultRowHeight: 15 },
  });

  // Lebar kolom
  ws.getColumn(1).width = 6.5;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 4.5;
  for (let i = 0; i < nKelas; i++) {
    ws.getColumn(colMapel(i)).width = 11;
    ws.getColumn(colGmp(i)).width   = 3.5;
  }

  let r = 1; // baris aktif

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. KOP SEKOLAH — mengikuti format Excel asli
  // ═══════════════════════════════════════════════════════════════════════════

  // Offset: kop mulai dari kolom 4 (col D) seperti di Excel asli
  // kolom 1–3 biasanya kosong di kop sekolah asli (logo ditempatkan di luar tabel)
  const kopStart = 4; // kolom mulai teks kop

  if (identitas?.namaPemerintah) {
    ws.mergeCells(r, kopStart, r, lastCol);
    const rw = ws.getRow(r); rw.height = 13;
    const ce = rw.getCell(kopStart);
    ce.value = identitas.namaPemerintah;
    ce.font  = { name: "Arial", size: 9 };
    ce.alignment = mid;
    r++;
  }
  if (identitas?.namaDinas) {
    ws.mergeCells(r, kopStart, r, lastCol);
    const rw = ws.getRow(r); rw.height = 13;
    const ce = rw.getCell(kopStart);
    ce.value = identitas.namaDinas;
    ce.font  = { name: "Arial", size: 9 };
    ce.alignment = mid;
    r++;
  }
  // Nama Sekolah — bold besar
  ws.mergeCells(r, kopStart, r, lastCol);
  { const rw = ws.getRow(r); rw.height = 22;
    const ce = rw.getCell(kopStart);
    ce.value = identitas?.namaSekolah ?? "SMP";
    ce.font  = { name: "Arial", size: 16, bold: true };
    ce.alignment = mid; r++; }

  // Kecamatan
  if (identitas?.kecamatan) {
    ws.mergeCells(r, 1, r, lastCol);
    const rw = ws.getRow(r); rw.height = 12;
    const ce = rw.getCell(1);
    ce.value = `KEC. ${identitas.kecamatan.toUpperCase()}`;
    ce.font  = { name: "Arial", size: 9 };
    ce.alignment = mid; r++;
  }
  // NPSN / NSS
  const npsn = [
    identitas?.npsn ? `NPSN : ${identitas.npsn}` : "",
    identitas?.nss  ? `NSS : ${identitas.nss}`   : "",
  ].filter(Boolean).join("   ");
  if (npsn) {
    ws.mergeCells(r, 1, r, lastCol);
    const rw = ws.getRow(r); rw.height = 12;
    const ce = rw.getCell(1);
    ce.value = npsn;
    ce.font  = { name: "Arial", size: 8, bold: true };
    ce.alignment = mid; r++;
  }
  // Alamat & email
  if (identitas?.alamat) {
    ws.mergeCells(r, 1, r, lastCol);
    const rw = ws.getRow(r); rw.height = 12;
    const ce = rw.getCell(1);
    ce.value = `Alamat : ${identitas.alamat}${identitas.email ? `   Email : ${identitas.email}` : ""}`;
    ce.font  = { name: "Arial", size: 8 };
    ce.alignment = mid; r++;
  }

  // Garis bawah kop (medium)
  ws.mergeCells(r, 1, r, lastCol);
  const garisRow = ws.getRow(r); garisRow.height = 3;
  garisRow.getCell(1).border = { bottom: { style: "medium", color: { argb: "FF000000" } } };
  r++;

  // Judul jadwal
  ws.mergeCells(r, 1, r, lastCol);
  { const rw = ws.getRow(r); rw.height = 16;
    const ce = rw.getCell(1);
    ce.value = `JADWAL PELAJARAN/ DISTRIBUSI WAKTU TAHUN PELAJARAN ${identitas?.tahunPelajaran ?? periode.tahun}`;
    ce.font  = { name: "Arial", size: 11, bold: true };
    ce.alignment = mid; r++; }

  // Kurikulum (opsional)
  if (identitas?.kurikulum) {
    ws.mergeCells(r, 1, r, lastCol);
    const rw = ws.getRow(r); rw.height = 13;
    const ce = rw.getCell(1);
    ce.value = identitas.kurikulum;
    ce.font  = { name: "Arial", size: 10, bold: true };
    ce.alignment = mid; r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HEADER TABEL — HARI | WAKTU | JAM KE | K E L A S  (2 baris)
  // ═══════════════════════════════════════════════════════════════════════════

  const hdrR1 = r;
  ws.getRow(r).height = 20;
  cell(ws.getRow(r), 1, "HARI",    { b: true, sz: 9, argbFill: C.HDR });
  cell(ws.getRow(r), 2, "WAKTU",   { b: true, sz: 9, argbFill: C.HDR });
  cell(ws.getRow(r), 3, "JAM\nKE", { b: true, sz: 8, argbFill: C.HDR, wrap: true });
  cell(ws.getRow(r), 4, "K  U  R  I  K  U  L  U  M    M E R D E K A", { b: true, sz: 10, argbFill: C.HDR });
  ws.mergeCells(r, 4, r, lastCol);
  ws.mergeCells(r, 1, r + 1, 1);
  ws.mergeCells(r, 2, r + 1, 2);
  ws.mergeCells(r, 3, r + 1, 3);
  r++;

  // Baris H2: "K E L A S" + nama kelas
  ws.getRow(r).height = 18;
  cell(ws.getRow(r), 4, "K  E  L  A  S", { b: true, sz: 9, argbFill: C.HDR });
  ws.mergeCells(r, 4, r, lastCol); // akan di-override per kelas di bawah (ExcelJS last-write wins)
  // Perlu unmerge dulu kolom 4..lastCol supaya bisa isi per kelas
  // ExcelJS: cukup tulis per cell saja — merge H2 col4..lastCol hanya untuk teks "K E L A S"
  // Ini sudah di-merge pada baris sebelumnya secara benar
  // Pada baris ini, kita merge "K E L A S" span dan tulis nama kelas di baris H2
  // Approach: baris H2 langsung isi nama kelas saja (tanpa merge K E L A S lagi)
  // Karena merge H2 col4..lastCol overwrite, kita skip merge disini dan tulis nama kelas
  try { ws.unMergeCells(r, 4, r, lastCol); } catch { /* skip */ }
  for (let i = 0; i < nKelas; i++) {
    const ci = tingkatIdx(kelasList[i].namaKelas);
    const cl = C.KELAS[ci];
    cell(ws.getRow(r), colMapel(i), kelasList[i].namaKelas,
      { b: true, sz: 8, argbFill: cl.hdr, argbFg: cl.hdrFg });
    cell(ws.getRow(r), colGmp(i), "GMP",
      { sz: 7, argbFill: cl.hdr, argbFg: cl.hdrFg });
  }
  r++;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BODY JADWAL
  // ═══════════════════════════════════════════════════════════════════════════
  for (const hari of HARI_LIST) {
    const slots = slotAll.filter((s) => s.hari === hari);
    if (!slots.length) continue;
    const hariRowStart = r;

    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const rw   = ws.getRow(r);
      rw.height  = 16;

      // Kolom HARI — hanya tulis pada baris pertama, merge nanti
      if (si === 0) {
        cell(rw, 1, HARI_LABEL[hari as HariType], {
          b: true, sz: 9, argbFill: C.HARI_BG,
          al: { ...mid, textRotation: 90 },
        });
      } else {
        rw.getCell(1).fill   = fill(C.HARI_BG);
        rw.getCell(1).border = bAll;
      }

      // WAKTU
      const waktu = slot.jamMulai && slot.jamSelesai
        ? `${slot.jamMulai} - ${slot.jamSelesai}` : slot.namaSlot;
      cell(rw, 2, waktu, { sz: 8 });

      // JAM KE
      if (slot.jenisSlot === "NON_PELAJARAN") {
        cell(rw, 3, "-", { sz: 8, it: true, argbFg: "FF999999" });
        cell(rw, 4, slot.namaSlot.toUpperCase(),
          { sz: 8, it: true, argbFg: "FF888888", argbFill: C.ISTIRAHAT });
        ws.mergeCells(r, 4, r, lastCol);
      } else {
        cell(rw, 3, slot.urutan, { b: true, sz: 8 });

        const infos = kelasList.map((k) => lookup.get(`${hari}__${slot.id}__${k.id}`));
        const allSame = infos.every(Boolean) && infos.every((x) => x?.mapel === infos[0]?.mapel);

        if (allSame && infos[0]) {
          // Acara serentak (upacara, GLS, yasinan, dll)
          cell(rw, 4, infos[0].mapel.toUpperCase(),
            { b: true, sz: 9, argbFill: C.ACARA, al: { ...mid, textRotation: 0 },
              argbFg: "FF5B4000" });
          ws.mergeCells(r, 4, r, lastCol);
        } else {
          for (let i = 0; i < nKelas; i++) {
            const info = infos[i];
            const ci   = tingkatIdx(kelasList[i].namaKelas);
            const cl   = C.KELAS[ci];
            if (info) {
              cell(rw, colMapel(i), info.mapel,
                { sz: 8, argbFill: cl.row, argbFg: cl.rowFg, wrap: true });
              cell(rw, colGmp(i), info.kodeGuru,
                { sz: 7, argbFill: cl.row, argbFg: cl.rowFg });
            } else {
              cell(rw, colMapel(i), "", { argbFill: C.KOSONG });
              cell(rw, colGmp(i),   "", { argbFill: C.KOSONG });
            }
          }
        }
      }
      r++;
    }
    if (slots.length > 1) ws.mergeCells(hariRowStart, 1, r - 1, 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WALI KELAS — satu baris: "WALI KELAS | kode per kolom kelas"
  //    Persis seperti di Excel asli (Row 69)
  // ═══════════════════════════════════════════════════════════════════════════
  r++;
  {
    const rw = ws.getRow(r); rw.height = 16;
    cell(rw, 1, "WALI KELAS", { b: true, sz: 8, argbFill: C.SECTION, border: true });
    ws.mergeCells(r, 1, r, 3); // span kolom 1-3

    for (let i = 0; i < nKelas; i++) {
      const wali = kelasList[i].waliKelas?.kodeGuru ?? "-";
      const ci   = tingkatIdx(kelasList[i].namaKelas);
      const cl   = C.KELAS[ci];
      cell(rw, colMapel(i), wali, { b: true, sz: 8, argbFill: cl.hdr, argbFg: cl.hdrFg });
      ws.mergeCells(r, colMapel(i), r, colGmp(i)); // merge mapel+gmp per kelas
    }
    r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. KODE GURU | EKSTRAKURIKULER | JADWAL PIKET
  //    Tiga kolom besar — mengikuti posisi Excel asli
  // ═══════════════════════════════════════════════════════════════════════════
  r++;
  const sectionRow = r;

  // Tentukan lebar kolom section (sama seperti di Excel asli):
  // Kolom A-D  → KODE GURU  (col 1..4)
  // Kolom E-L  → EKSKUL     (col 5..12)  ≈ lastCol*0.45
  // Kolom M-Z  → PIKET      (col 13..lastCol)
  const colEkskul = 5;
  const colPiket  = Math.min(13, Math.round(lastCol * 0.55));

  // Header seksi
  {
    const rw = ws.getRow(r); rw.height = 15;
    cell(rw, 1, "KODE GURU", { b: true, sz: 9, argbFill: C.SECTION });
    ws.mergeCells(r, 1, r, colEkskul - 1);

    cell(rw, colEkskul, "EKSTRAKURIKULER", { b: true, sz: 9, argbFill: C.SECTION });
    ws.mergeCells(r, colEkskul, r, colPiket - 1);

    cell(rw, colPiket, "JADWAL PIKET HARIAN", { b: true, sz: 9, argbFill: C.SECTION });
    ws.mergeCells(r, colPiket, r, lastCol);
    r++;
  }

  // ── KODE GURU (2 sub-kolom kiri-kanan) ───────────────────────────────────
  const half     = Math.ceil(guruAll.length / 2);
  const midGuruCol = Math.round((colEkskul - 1) / 2) + 1; // tengah area kode guru

  // ── EKSKUL list ────────────────────────────────────────────────────────────
  // Header sub-ekskul
  const ekskulWajib = ekskulAll; // semua ekskul (bisa dibagi wajib/pilihan jika ada field)

  // ── PIKET PER HARI ─────────────────────────────────────────────────────────
  // Header hari piket harian
  const hariPiketOrder = [...HARI_LIST] as HariType[];
  const colPerHari = Math.max(2, Math.floor((lastCol - colPiket + 1) / hariPiketOrder.length));

  // Tulis header hari piket
  {
    const rw = ws.getRow(r); rw.height = 13;
    let hCol = colPiket;
    for (const h of hariPiketOrder) {
      cell(rw, hCol, HARI_LABEL[h], { b: true, sz: 8, argbFill: C.PIKET_H });
      ws.mergeCells(r, hCol, r, Math.min(hCol + colPerHari - 1, lastCol));
      hCol += colPerHari;
    }
    r++;
  }

  // Baris piket konten
  const piketHarianRows = Math.max(
    ...hariPiketOrder.map((h) => hariPiket.get(h)?.HARIAN.length ?? 0),
    1
  );
  for (let pi = 0; pi < piketHarianRows; pi++) {
    const rw = ws.getRow(r); rw.height = 13;
    let hCol = colPiket;
    for (const h of hariPiketOrder) {
      const nama = hariPiket.get(h)?.HARIAN[pi] ?? "";
      cell(rw, hCol, nama ? `${pi + 1}. ${nama}` : "", { sz: 8, argbFill: C.PIKET_H, al: left });
      ws.mergeCells(r, hCol, r, Math.min(hCol + colPerHari - 1, lastCol));
      hCol += colPerHari;
    }
    // Kode guru (kiri)
    const g = guruAll[pi];
    if (g) {
      const jp = g.bebanMengajar.reduce((s, b) => s + b.jp, 0);
      cell(rw, 1, g.kodeGuru, { b: true, sz: 8, al: left });
      cell(rw, 2, `: ${g.nama} (${jp} JP)`, { sz: 8, al: left });
      ws.mergeCells(r, 2, r, midGuruCol - 1);
      const g2 = guruAll[pi + half];
      if (g2) {
        const jp2 = g2.bebanMengajar.reduce((s, b) => s + b.jp, 0);
        cell(rw, midGuruCol, g2.kodeGuru, { b: true, sz: 8, al: left });
        cell(rw, midGuruCol + 1, `: ${g2.nama} (${jp2} JP)`, { sz: 8, al: left });
        ws.mergeCells(r, midGuruCol + 1, r, colEkskul - 1);
      }
    }
    // Ekskul
    const ek = ekskulWajib[pi];
    if (ek) {
      const pembina = ek.pembina ? `${ek.pembina.nama}` : "-";
      cell(rw, colEkskul, `${pi + 1}.  ${ek.nama}`, { sz: 8, argbFill: C.EKSKUL_H, al: left });
      ws.mergeCells(r, colEkskul, r, colPiket - 1);
      // pembina di sebelah kanan ekskul (jika ada ruang)
    }
    r++;
  }

  // Sisa kode guru yang belum tertulis
  const startGuruIdx = piketHarianRows;
  for (let gi = startGuruIdx; gi < half; gi++) {
    const rw = ws.getRow(r); rw.height = 12;
    const g1 = guruAll[gi];
    if (!g1) { r++; continue; }
    const jp1 = g1.bebanMengajar.reduce((s, b) => s + b.jp, 0);
    cell(rw, 1, g1.kodeGuru, { b: true, sz: 8, al: left });
    cell(rw, 2, `: ${g1.nama} (${jp1} JP)`, { sz: 8, al: left });
    ws.mergeCells(r, 2, r, midGuruCol - 1);
    const g2 = guruAll[gi + half];
    if (g2) {
      const jp2 = g2.bebanMengajar.reduce((s, b) => s + b.jp, 0);
      cell(rw, midGuruCol, g2.kodeGuru, { b: true, sz: 8, al: left });
      cell(rw, midGuruCol + 1, `: ${g2.nama} (${jp2} JP)`, { sz: 8, al: left });
      ws.mergeCells(r, midGuruCol + 1, r, colEkskul - 1);
    }
    // Sisa ekskul
    const ek = ekskulWajib[gi];
    if (ek) {
      cell(rw, colEkskul, `${gi + 1}.  ${ek.nama}`, { sz: 8, argbFill: C.EKSKUL_H, al: left });
      ws.mergeCells(r, colEkskul, r, colPiket - 1);
    }
    r++;
  }

  // ── PIKET KARAKTER (baris baru setelah Harian) ────────────────────────────
  r++;
  {
    const rw = ws.getRow(r); rw.height = 14;
    cell(rw, colPiket, "JADWAL PIKET KARAKTER", { b: true, sz: 9, argbFill: C.PIKET_K });
    ws.mergeCells(r, colPiket, r, lastCol);
    r++;
  }
  // Sub-header hari
  {
    const rw = ws.getRow(r); rw.height = 13;
    let hCol = colPiket;
    for (const h of hariPiketOrder) {
      cell(rw, hCol, HARI_LABEL[h], { b: true, sz: 8, argbFill: C.PIKET_K });
      ws.mergeCells(r, hCol, r, Math.min(hCol + colPerHari - 1, lastCol));
      hCol += colPerHari;
    }
    r++;
  }
  const piketKarRows = Math.max(
    ...hariPiketOrder.map((h) => hariPiket.get(h)?.KARAKTER.length ?? 0),
    1
  );
  for (let pi = 0; pi < piketKarRows; pi++) {
    const rw = ws.getRow(r); rw.height = 13;
    let hCol = colPiket;
    for (const h of hariPiketOrder) {
      const nama = hariPiket.get(h)?.KARAKTER[pi] ?? "";
      cell(rw, hCol, nama ? `${pi + 1}. ${nama}` : "", { sz: 8, argbFill: C.PIKET_K, al: left });
      ws.mergeCells(r, hCol, r, Math.min(hCol + colPerHari - 1, lastCol));
      hCol += colPerHari;
    }
    r++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. TANDA TANGAN
  //    Format asli: kiri = Urusan Kurikulum, kanan = Kepala Sekolah
  //    Tanggal di atas posisi Kepala Sekolah
  // ═══════════════════════════════════════════════════════════════════════════
  if (ttd) {
    r += 2;
    const today     = new Date();
    const tanggal   = `${identitas?.kecamatan ?? "Bakti Makmur"}, ${today.getDate()} ${bulanId[today.getMonth()]} ${today.getFullYear()}`;
    const colWaka   = 1;
    const colKepsek = Math.round(lastCol * 0.6);
    const wBoth     = Math.floor(lastCol * 0.38);

    // Tanggal (sebelah kepsek)
    ws.mergeCells(r, colKepsek, r, lastCol);
    { const rw = ws.getRow(r); rw.height = 13;
      const ce = rw.getCell(colKepsek);
      ce.value = tanggal; ce.font = { name: "Arial", size: 9 };
      ce.alignment = mid; r++; }

    // Label jabatan
    { const rw = ws.getRow(r); rw.height = 13;
      ws.mergeCells(r, colWaka, r, colWaka + wBoth - 1);
      const cw = rw.getCell(colWaka);
      cw.value = "          URUSAN KURIKULUM"; cw.font = { name: "Arial", size: 9 };
      cw.alignment = mid;
      ws.mergeCells(r, colKepsek, r, lastCol);
      const ck = rw.getCell(colKepsek);
      ck.value = "KEPALA SEKOLAH"; ck.font = { name: "Arial", size: 9 };
      ck.alignment = mid; r += 5; } // ruang ttd

    // Nama Waka
    { const rw = ws.getRow(r); rw.height = 13;
      ws.mergeCells(r, colWaka, r, colWaka + wBoth - 1);
      const cw = rw.getCell(colWaka);
      cw.value = ttd.namaWaka ?? ""; cw.font = { name: "Arial", size: 10, bold: true, underline: true };
      cw.alignment = mid;
      ws.mergeCells(r, colKepsek, r, lastCol);
      const ck = rw.getCell(colKepsek);
      ck.value = ttd.namaKepsek; ck.font = { name: "Arial", size: 10, bold: true, underline: true };
      ck.alignment = mid; r++; }

    // NIP
    { const rw = ws.getRow(r); rw.height = 12;
      ws.mergeCells(r, colWaka, r, colWaka + wBoth - 1);
      const cw = rw.getCell(colWaka);
      cw.value = ttd.nipWaka ? `NIP. ${ttd.nipWaka}` : ""; cw.font = { name: "Arial", size: 9 };
      cw.alignment = mid;
      ws.mergeCells(r, colKepsek, r, lastCol);
      const ck = rw.getCell(colKepsek);
      ck.value = ttd.nipKepsek ? `NIP. ${ttd.nipKepsek}` : ""; ck.font = { name: "Arial", size: 9 };
      ck.alignment = mid; }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jadwal-pelajaran.xlsx"`,
    },
  });
}
