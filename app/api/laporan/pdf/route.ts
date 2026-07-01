import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { HariType } from "@/lib/constants";
import { getSession } from "@/lib/auth";

// ─── Warna CSS (sama persis dengan Excel) ────────────────────────────────────
const WARNA = {
  VII:  { bg: "#dbeafe", fg: "#1e3a8a", hdr: "#1e40af", hdrFg: "#fff" },
  VIII: { bg: "#ccfbf1", fg: "#134e4a", hdr: "#065f46", hdrFg: "#fff" },
  IX:   { bg: "#fed7aa", fg: "#7c2d12", hdr: "#7c2d12", hdrFg: "#fff" },
  DEF:  { bg: "#f3f4f6", fg: "#374151", hdr: "#374151", hdrFg: "#fff" },
};

function tingkat(namaKelas: string) {
  if (namaKelas.startsWith("IX"))   return "IX";
  if (namaKelas.startsWith("VIII")) return "VIII";
  if (namaKelas.startsWith("VII"))  return "VII";
  return "DEF";
}

function w(namaKelas: string) { return WARNA[tingkat(namaKelas) as keyof typeof WARNA]; }

const bulanId = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"];

function esc(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

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
          guru:   { select: { kodeGuru: true } },
          kelas:  { select: { id: true } },
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

  // ── Lookup jadwal ──────────────────────────────────────────────────────────
  type JInfo = { mapel: string; kodeGuru: string };
  const lookup = new Map<string, JInfo>();
  for (const j of jadwalAll) {
    lookup.set(`${j.hari}__${j.slotWaktuId}__${j.kelasId}`, {
      mapel: j.bebanMengajar.mapel.kodeMapel || j.bebanMengajar.mapel.namaMapel,
      kodeGuru: j.guru.kodeGuru,
    });
  }

  // ── Piket per hari ─────────────────────────────────────────────────────────
  const hariPiket = new Map<string, { HARIAN: string[]; KARAKTER: string[] }>();
  for (const p of piketAll) {
    const h = p.hari as string;
    if (!hariPiket.has(h)) hariPiket.set(h, { HARIAN: [], KARAKTER: [] });
    const e = hariPiket.get(h)!;
    const lbl = `${p.guru.nama}`;
    if (p.jenisPiket === "HARIAN") e.HARIAN.push(lbl);
    else                            e.KARAKTER.push(lbl);
  }

  const nKelas = kelasList.length;
  const today  = new Date();
  const tanggal = `${identitas?.kecamatan ?? ""}, ${today.getDate()} ${bulanId[today.getMonth()]} ${today.getFullYear()}`;

  // ── KOP SEKOLAH ─────────────────────────────────────────────────────────────
  const kopHtml = `
<div class="kop">
  <div class="kop-logo">
    ${identitas?.logoKiri ? `<img src="${identitas.logoKiri}" alt="logo"/>` : '<div class="logo-placeholder"></div>'}
  </div>
  <div class="kop-tengah">
    ${identitas?.namaPemerintah ? `<div class="kop-line sm">${esc(identitas.namaPemerintah)}</div>` : ""}
    ${identitas?.namaDinas      ? `<div class="kop-line sm">${esc(identitas.namaDinas)}</div>`      : ""}
    <div class="kop-line school">${esc(identitas?.namaSekolah ?? "SMP")}</div>
    ${identitas?.kecamatan ? `<div class="kop-line sm">KEC. ${esc(identitas.kecamatan.toUpperCase())}</div>` : ""}
    <div class="kop-line xs bold">
      ${[identitas?.npsn ? `NPSN : ${identitas.npsn}` : "", identitas?.nss ? `NSS : ${identitas.nss}` : ""].filter(Boolean).join("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")}
    </div>
    <div class="kop-line xs">
      ${identitas?.alamat ? `Alamat : ${esc(identitas.alamat)}` : ""}
      ${identitas?.email  ? `&nbsp;&nbsp;Email : ${esc(identitas.email)}` : ""}
    </div>
  </div>
  <div class="kop-logo">
    ${identitas?.logoKanan ? `<img src="${identitas.logoKanan}" alt="logo"/>` : '<div class="logo-placeholder"></div>'}
  </div>
</div>
<div class="judul-block">
  <div class="judul-utama">JADWAL PELAJARAN/ DISTRIBUSI WAKTU TAHUN PELAJARAN ${identitas?.tahunPelajaran ?? periode.tahun}</div>
  ${identitas?.kurikulum ? `<div class="judul-sub">${esc(identitas.kurikulum)}</div>` : ""}
</div>`;

  // ── HEADER TABEL ────────────────────────────────────────────────────────────
  const kelasHeaderHTML = kelasList.map((k) => {
    const wk = w(k.namaKelas);
    return `<th colspan="2" style="background:${wk.hdr};color:${wk.hdrFg};">${esc(k.namaKelas)}</th>`;
  }).join("");

  // ── BODY JADWAL ─────────────────────────────────────────────────────────────
  let bodyHTML = "";
  for (const hari of HARI_LIST) {
    const slots = slotAll.filter((s) => s.hari === hari);
    if (!slots.length) continue;
    const rowspan = slots.length;
    let first = true;

    for (const slot of slots) {
      const waktu = slot.jamMulai && slot.jamSelesai
        ? `${slot.jamMulai}–${slot.jamSelesai}` : esc(slot.namaSlot);

      const hariTd = first
        ? `<td rowspan="${rowspan}" class="td-hari">${HARI_LABEL[hari as HariType]}</td>`
        : "";
      first = false;

      if (slot.jenisSlot === "NON_PELAJARAN") {
        bodyHTML += `<tr class="tr-istirahat">
          ${hariTd}
          <td class="td-waktu">${waktu}</td>
          <td class="td-jam">-</td>
          <td colspan="${nKelas * 2}" class="td-acara-istirahat">${esc(slot.namaSlot)}</td>
        </tr>`;
        continue;
      }

      const infos = kelasList.map((k) => lookup.get(`${hari}__${slot.id}__${k.id}`));
      const allSame = infos.every(Boolean) && infos.every((x) => x?.mapel === infos[0]?.mapel);

      let kelasTd = "";
      if (allSame && infos[0]) {
        kelasTd = `<td colspan="${nKelas * 2}" class="td-acara">${esc(infos[0].mapel.toUpperCase())}</td>`;
      } else {
        kelasTd = infos.map((info, i) => {
          const wk = w(kelasList[i].namaKelas);
          if (info) {
            return `<td class="td-mapel" style="background:${wk.bg};color:${wk.fg};">${esc(info.mapel)}</td>` +
                   `<td class="td-gmp"   style="background:${wk.bg};color:${wk.fg};">${esc(info.kodeGuru)}</td>`;
          }
          return `<td class="td-mapel td-kosong"></td><td class="td-gmp td-kosong"></td>`;
        }).join("");
      }

      bodyHTML += `<tr>
        ${hariTd}
        <td class="td-waktu">${waktu}</td>
        <td class="td-jam">${slot.urutan}</td>
        ${kelasTd}
      </tr>`;
    }
  }

  // ── WALI KELAS ──────────────────────────────────────────────────────────────
  const waliKelasHTML = `
<tr class="tr-wali">
  <td colspan="3" class="td-section-label">WALI KELAS</td>
  ${kelasList.map((k) => {
    const wk = w(k.namaKelas);
    return `<td colspan="2" class="td-wali" style="background:${wk.hdr};color:${wk.hdrFg};">${esc(k.waliKelas?.kodeGuru ?? "-")}</td>`;
  }).join("")}
</tr>`;

  // ── SEKSI BAWAH ─────────────────────────────────────────────────────────────
  // Tiga kolom: Kode Guru | Ekstrakurikuler | Piket
  // Kita bangun sebagai tabel terpisah di bawah tabel utama, mengikuti layout Excel

  const hariPiketOrder = HARI_LIST as HariType[];

  // Piket Harian per hari
  const piketHarianHTML = hariPiketOrder.map((h) => {
    const list = hariPiket.get(h)?.HARIAN ?? [];
    return `<td class="td-piket-hari"><strong>${HARI_LABEL[h]}</strong><br/>${
      list.length
        ? list.map((n, i) => `${i + 1}. ${esc(n)}`).join("<br/>")
        : '<span class="empty">-</span>'
    }</td>`;
  }).join("");

  const piketKarHTML = hariPiketOrder.map((h) => {
    const list = hariPiket.get(h)?.KARAKTER ?? [];
    return `<td class="td-piket-hari td-piket-kar"><strong>${HARI_LABEL[h]}</strong><br/>${
      list.length
        ? list.map((n, i) => `${i + 1}. ${esc(n)}`).join("<br/>")
        : '<span class="empty">-</span>'
    }</td>`;
  }).join("");

  // Kode guru (2 kolom)
  const half = Math.ceil(guruAll.length / 2);
  const guruRows = Array.from({ length: half }, (_, i) => {
    const g1 = guruAll[i];
    const g2 = guruAll[i + half];
    const jp1 = g1.bebanMengajar.reduce((s, b) => s + b.jp, 0);
    const jp2 = g2 ? g2.bebanMengajar.reduce((s, b) => s + b.jp, 0) : 0;
    return `<tr>
      <td class="kode-cell">${esc(g1.kodeGuru)}</td>
      <td class="nama-cell">: ${esc(g1.nama)} (${jp1} JP)</td>
      ${g2 ? `<td class="kode-cell">${esc(g2.kodeGuru)}</td><td class="nama-cell">: ${esc(g2.nama)} (${jp2} JP)</td>` : "<td></td><td></td>"}
    </tr>`;
  }).join("");

  // Ekskul list
  const ekskulRows = ekskulAll.map((e, i) => {
    const pembina = e.pembina ? `${esc(e.pembina.nama)}` : "-";
    return `<tr><td class="ekskul-no">${i + 1}.</td><td class="ekskul-nama">${esc(e.nama)}</td><td class="ekskul-pembina">${pembina}</td></tr>`;
  }).join("");

  // TTD
  const ttdHTML = ttd ? `
<div class="ttd-block">
  <div class="ttd-left">
    <div class="ttd-jabatan">URUSAN KURIKULUM,</div>
    <div class="ttd-spasi"></div>
    <div class="ttd-nama">${esc(ttd.namaWaka ?? "")}</div>
    ${ttd.nipWaka ? `<div class="ttd-nip">NIP. ${esc(ttd.nipWaka)}</div>` : ""}
  </div>
  <div class="ttd-right">
    <div class="ttd-tanggal">${esc(tanggal)}</div>
    <div class="ttd-jabatan">KEPALA SEKOLAH,</div>
    <div class="ttd-spasi"></div>
    <div class="ttd-nama">${esc(ttd.namaKepsek)}</div>
    ${ttd.nipKepsek ? `<div class="ttd-nip">NIP. ${esc(ttd.nipKepsek)}</div>` : ""}
  </div>
</div>` : "";

  // ── HTML LENGKAP ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>Jadwal Pelajaran – ${identitas?.namaSekolah ?? ""}</title>
<style>
/* ── Page setup: A3 landscape ── */
@page {
  size: A3 landscape;
  margin: 8mm 10mm 10mm 10mm;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8px;
  color: #000;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── KOP ── */
.kop {
  display: flex;
  align-items: center;
  border-bottom: 3px solid #000;
  padding-bottom: 5px;
  margin-bottom: 3px;
  gap: 8px;
}
.kop-logo { width: 65px; height: 65px; flex-shrink: 0; }
.kop-logo img { width: 65px; height: 65px; object-fit: contain; }
.logo-placeholder { width: 65px; height: 65px; border: 0.5px solid #bbb; }
.kop-tengah { flex: 1; text-align: center; }
.kop-line.school { font-size: 18px; font-weight: 900; line-height: 1.1; margin: 2px 0; }
.kop-line.sm   { font-size: 9px; }
.kop-line.xs   { font-size: 7.5px; margin-top: 1px; }
.kop-line.bold { font-weight: bold; }

/* ── Judul ── */
.judul-block { text-align: center; padding: 4px 0 2px; border-bottom: 1px solid #000; }
.judul-utama { font-size: 10px; font-weight: bold; }
.judul-sub   { font-size: 9px; font-weight: bold; }

/* ── Tabel utama ── */
table.jadwal {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
  table-layout: fixed;
}
table.jadwal td,
table.jadwal th {
  border: 1px solid #000;
  vertical-align: middle;
  padding: 2px 2px;
  word-break: break-word;
  line-height: 1.25;
}
/* Header baris 1 */
table.jadwal thead tr:first-child th {
  background: #FFC000;
  color: #000;
  font-size: 8px;
  font-weight: bold;
  text-align: center;
}
/* Kolom fixed */
.th-hari  { width: 22px; }
.th-waktu { width: 58px; }
.th-jam   { width: 18px; }

.td-hari {
  background: #eeeeee;
  font-weight: bold;
  font-size: 8px;
  text-align: center;
  vertical-align: middle;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: 4px 1px;
  letter-spacing: 0.04em;
}
.td-waktu {
  text-align: center;
  font-size: 7.5px;
  white-space: nowrap;
  color: #222;
}
.td-jam {
  text-align: center;
  font-weight: bold;
  font-size: 8px;
}
.td-mapel {
  text-align: center;
  font-size: 7px;
  font-weight: 600;
  padding: 1px;
}
.td-gmp {
  text-align: center;
  font-size: 6.5px;
  padding: 1px;
  opacity: 0.85;
}
.td-kosong {
  background: #fff5f5;
}
.tr-istirahat td {
  background: #fafafa;
  font-style: italic;
  color: #888;
}
.td-acara {
  text-align: center;
  font-weight: bold;
  font-size: 8px;
  background: #fffde7;
  color: #5b4000;
}
.td-acara-istirahat {
  text-align: center;
  font-style: italic;
  font-size: 8px;
  color: #888;
  background: #fafafa;
}
/* Wali kelas */
.tr-wali td {
  background: #dde8f0;
  font-weight: bold;
  text-align: center;
  font-size: 8px;
  padding: 3px 2px;
  border-top: 2px solid #888;
}
.td-section-label {
  text-align: left !important;
  font-size: 8px;
}
.td-wali { font-size: 9px; }

/* ── Seksi bawah: 3 kolom ── */
.seksi-bawah {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  align-items: flex-start;
}
.col-kode {
  flex: 0 0 28%;
}
.col-ekskul {
  flex: 0 0 28%;
}
.col-piket {
  flex: 1;
}

.seksi-header {
  background: #dde8f0;
  font-weight: bold;
  font-size: 8px;
  padding: 3px 5px;
  border: 1px solid #bbb;
  text-align: center;
  letter-spacing: 0.04em;
}

/* Kode Guru */
table.tbl-kode {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5px;
}
table.tbl-kode td { padding: 1px 3px; vertical-align: top; border: none; }
.kode-cell { font-weight: bold; white-space: nowrap; min-width: 20px; }
.nama-cell { color: #222; }

/* Ekskul */
table.tbl-ekskul {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5px;
}
table.tbl-ekskul td { padding: 1px 3px; vertical-align: top; }
.ekskul-no    { width: 12px; font-weight: bold; }
.ekskul-nama  { font-weight: 600; }
.ekskul-pembina { color: #444; }

/* Piket */
.piket-row {
  display: flex;
  gap: 3px;
  font-size: 7px;
  margin-top: 2px;
}
.td-piket-hari {
  flex: 1;
  border: 1px solid #d1b896;
  background: #fef3c7;
  padding: 2px 3px;
  line-height: 1.4;
  min-height: 30px;
  vertical-align: top;
}
.td-piket-kar {
  background: #ede9fe;
  border-color: #c4b5fd;
}
.piket-sub-header {
  background: #dde8f0;
  font-weight: bold;
  font-size: 7.5px;
  padding: 2px 5px;
  border: 1px solid #bbb;
  text-align: center;
  margin-top: 3px;
}
.empty { color: #bbb; }

/* ── TTD ── */
.ttd-block {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 9px;
  page-break-inside: avoid;
}
.ttd-left, .ttd-right {
  text-align: center;
  min-width: 140px;
}
.ttd-jabatan { font-weight: normal; }
.ttd-spasi   { height: 42px; }
.ttd-nama    { font-weight: bold; text-decoration: underline; font-size: 10px; }
.ttd-nip     { font-size: 8px; }
.ttd-tanggal { margin-bottom: 3px; }

/* Print */
@media print {
  .no-print { display: none !important; }
  body { font-size: 7.5px; }
  .kop-line.school { font-size: 16px; }
}
</style>
</head>
<body>

${kopHtml}

<!-- Tabel Jadwal Utama -->
<table class="jadwal">
  <colgroup>
    <col class="th-hari"/>
    <col class="th-waktu"/>
    <col class="th-jam"/>
    ${kelasList.map(() => `<col style="width:${Math.max(34, Math.floor(200/nKelas))}px;"/><col style="width:18px;"/>`).join("")}
  </colgroup>
  <thead>
    <tr>
      <th rowspan="2" class="th-hari">HARI</th>
      <th rowspan="2" class="th-waktu">WAKTU</th>
      <th rowspan="2" class="th-jam">JAM<br/>KE</th>
      <th colspan="${nKelas * 2}" style="background:#FFC000;font-size:9px;font-weight:bold;">
        K &nbsp; U &nbsp; R &nbsp; I &nbsp; K &nbsp; U &nbsp; L &nbsp; U &nbsp; M &nbsp;&nbsp; M E R D E K A
      </th>
    </tr>
    <tr>
      <th colspan="${nKelas * 2}" style="background:#FFC000;font-size:8px;font-weight:bold;">K &nbsp; E &nbsp; L &nbsp; A &nbsp; S</th>
    </tr>
    <tr>
      <th></th><th></th><th></th>
      ${kelasList.map((k) => {
        const wk = w(k.namaKelas);
        return `<th colspan="2" style="background:${wk.hdr};color:${wk.hdrFg};font-size:8px;">${esc(k.namaKelas)}<br/><span style="font-weight:normal;font-size:6.5px;">GMP</span></th>`;
      }).join("")}
    </tr>
  </thead>
  <tbody>
    ${bodyHTML}
    ${waliKelasHTML}
  </tbody>
</table>

<!-- Seksi Bawah: Kode Guru | Ekskul | Piket -->
<div class="seksi-bawah">

  <!-- Kode Guru -->
  <div class="col-kode">
    <div class="seksi-header">KODE GURU</div>
    <table class="tbl-kode">
      <tbody>${guruRows}</tbody>
    </table>
  </div>

  <!-- Ekstrakurikuler -->
  <div class="col-ekskul">
    <div class="seksi-header">EKSTRAKURIKULER</div>
    <table class="tbl-ekskul">
      <tbody>
        <tr><td colspan="3" style="font-weight:bold;padding:2px 3px;background:#f0fdf4;">A. WAJIB</td></tr>
        ${ekskulRows || '<tr><td colspan="3" class="empty" style="padding:2px 3px;">-</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Piket -->
  <div class="col-piket">
    <div class="seksi-header">JADWAL PIKET HARIAN</div>
    <div class="piket-row">
      ${hariPiketOrder.map((h) => {
        const list = hariPiket.get(h)?.HARIAN ?? [];
        return `<div class="td-piket-hari">
          <strong>${HARI_LABEL[h as HariType]}</strong><br/>
          ${list.length ? list.map((n, i) => `${i+1}. ${esc(n)}`).join("<br/>") : '<span class="empty">-</span>'}
        </div>`;
      }).join("")}
    </div>
    <div class="piket-sub-header">JADWAL PIKET KARAKTER</div>
    <div class="piket-row">
      ${hariPiketOrder.map((h) => {
        const list = hariPiket.get(h)?.KARAKTER ?? [];
        return `<div class="td-piket-hari td-piket-kar">
          <strong>${HARI_LABEL[h as HariType]}</strong><br/>
          ${list.length ? list.map((n, i) => `${i+1}. ${esc(n)}`).join("<br/>") : '<span class="empty">-</span>'}
        </div>`;
      }).join("")}
    </div>
  </div>
</div>

${ttdHTML}

<!-- Tombol cetak -->
<div class="no-print" style="margin-top:20px;text-align:center;">
  <button onclick="window.print()" style="padding:10px 28px;font-size:13px;cursor:pointer;background:#1a1a1a;color:#fff;border:none;border-radius:7px;font-weight:600;">
    🖨&nbsp; Cetak / Simpan PDF
  </button>
  <p style="margin-top:8px;font-size:11px;color:#888;">Saat dialog cetak muncul, pilih <strong>Simpan sebagai PDF</strong> &rarr; Ukuran kertas <strong>A3</strong> &rarr; Orientasi <strong>Landscape</strong></p>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
