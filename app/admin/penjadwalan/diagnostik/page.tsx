import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { HariType } from "@/lib/constants";
import Link from "next/link";
import { sortKelas } from "@/lib/kelas-sort";

export default async function DiagnostikPage() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Diagnostik Jadwal</h1>
        <p className="text-sm text-zinc-500">Belum ada periode akademik aktif.</p>
      </div>
    );
  }

  const [kelasList, bebanList, slotAll, jadwalAll, slotTerkunciList] = await Promise.all([
    sortKelas(await prisma.kelas.findMany({})),
    prisma.bebanMengajar.findMany({
      where: { periodeAkademikId: periode.id },
      include: { guru: true, kelas: true, mapel: true },
    }),
    prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] }),
    prisma.jadwal.findMany({
      where: { periodeAkademikId: periode.id },
      include: { slotWaktu: true, guru: true, kelas: true, bebanMengajar: { include: { mapel: true } } },
    }),
    prisma.slotTerkunci.findMany({
      where: { periodeAkademikId: periode.id },
      include: { slotWaktuMulai: true },
    }),
  ]);

  const slotPelajaran = slotAll.filter((s) => s.jenisSlot === "PELAJARAN");

  // ── Slot yang diblokir global (upacara, slot terkunci tanpa kelasId) ─────
  const globalBlockedSlotIds = new Set<string>();
  for (const st of slotTerkunciList) {
    if (!st.kelasId) {
      const slotsInRange = slotAll.filter(
        (s) => s.hari === st.hari &&
               s.urutan >= st.slotWaktuMulai.urutan &&
               s.urutan < st.slotWaktuMulai.urutan + st.durasiSlot
      );
      slotsInRange.forEach((s) => globalBlockedSlotIds.add(`${st.hari}__${s.id}`));
    }
  }

  // ── Lookup cepat ─────────────────────────────────────────────────────────
  // Jadwal per guru per slot: guruId__hari__slotId → namaKelas
  const guruSlotOccupied = new Map<string, string>();
  for (const j of jadwalAll) {
    guruSlotOccupied.set(`${j.guruId}__${j.hari}__${j.slotWaktuId}`, j.kelas.namaKelas);
  }

  // JP terjadwal per beban
  const jpTerjadwalMap = new Map<string, number>();
  for (const j of jadwalAll) {
    jpTerjadwalMap.set(j.bebanMengajarId, (jpTerjadwalMap.get(j.bebanMengajarId) ?? 0) + 1);
  }

  // Slot pelajaran (bukan blokir global) per hari yang TERSEDIA untuk kelas tertentu
  function slotTersediaHari(kelasId: string, hari: HariType) {
    return slotPelajaran.filter((s) => {
      if (s.hari !== hari) return false;
      if (globalBlockedSlotIds.has(`${hari}__${s.id}`)) return false;
      return true;
    });
  }

  // Cek apakah ada blok berurutan sepanjang N slot di hari ini yang BEBAS untuk kelas & guru ini
  function adaBlokBebas(kelasId: string, guruId: string, hari: HariType, n: number): boolean {
    const tersedia = slotTersediaHari(kelasId, hari);
    // Slot sudah terisi di kelas ini
    const kelasOccupied = new Set(
      jadwalAll.filter((j) => j.kelasId === kelasId && j.hari === hari).map((j) => j.slotWaktuId)
    );
    // Slot yang guru ini sudah isi di hari ini
    const guruOccupied = new Set(
      jadwalAll.filter((j) => j.guruId === guruId && j.hari === hari).map((j) => j.slotWaktuId)
    );

    // Cari blok N slot berurutan yang bebas dari keduanya
    for (let i = 0; i <= tersedia.length - n; i++) {
      const blok = tersedia.slice(i, i + n);
      // Pastikan benar-benar berurutan (urutan berturut-turut)
      const berurutan = blok.every((s, idx) => idx === 0 || s.urutan === blok[idx - 1].urutan + 1);
      if (!berurutan) continue;
      const semuaBebas = blok.every(
        (s) => !kelasOccupied.has(s.id) && !guruOccupied.has(s.id)
      );
      if (semuaBebas) return true;
    }
    return false;
  }

  // ── Slot pelajaran tersedia per kelas (tidak terblokir global) ───────────
  function slotPelajaranTersediaKelas(kelasId: string) {
    // Slot pelajaran yang tidak diblokir secara global
    return slotPelajaran.filter(
      (s) => !globalBlockedSlotIds.has(`${s.hari}__${s.id}`)
    );
  }

  // ── Kelas tanpa beban mengajar sama sekali ────────────────────────────────
  type KelasKosong = {
    kelas: { id: string; namaKelas: string };
    slotTersedia: number;
    alasan: "no_beban" | "slot_sisa";
    jpBeban: number;
    jpTerjadwal: number;
    slotKosong: number;
  };

  const kelasKosongList: KelasKosong[] = [];

  for (const kelas of kelasList) {
    const bebanKelas = bebanList.filter((b) => b.kelasId === kelas.id);
    const slotTersedia = slotPelajaranTersediaKelas(kelas.id).length;
    const jpBeban = bebanKelas.reduce((s, b) => s + b.jp, 0);
    const jpTerjadwal = jadwalAll.filter((j) => j.kelasId === kelas.id).length;
    const slotKosong = slotTersedia - jpTerjadwal;

    if (bebanKelas.length === 0 && slotTersedia > 0) {
      // Belum dikonfigurasi sama sekali
      kelasKosongList.push({ kelas, slotTersedia, alasan: "no_beban", jpBeban: 0, jpTerjadwal: 0, slotKosong });
    } else if (
      bebanKelas.length > 0 &&
      jpTerjadwal >= jpBeban && // beban sudah terpenuhi semua
      slotKosong > 0            // tapi masih ada slot kosong
    ) {
      // Beban terpenuhi tapi JP beban < slot tersedia
      kelasKosongList.push({ kelas, slotTersedia, alasan: "slot_sisa", jpBeban, jpTerjadwal, slotKosong });
    }
  }

  // ── Analisis per beban yang belum lengkap ─────────────────────────────────
  type PenyebabItem = {
    label: string;
    detail: string;
    tipe: "bentrok_guru" | "slot_habis" | "blok_tidak_muat" | "kapasitas_kurang";
  };

  type BebanAnalisis = {
    bebanId: string;
    mapel: string;
    guru: string;
    kodeGuru: string;
    jpTarget: number;
    jpTerjadwal: number;
    jpKurang: number;
    jpMaksBerurutan: number;
    penyebab: PenyebabItem[];
  };

  type KelasAnalisis = {
    kelas: { id: string; namaKelas: string };
    targetJp: number;
    terjadwalJp: number;
    bebanBermasalah: BebanAnalisis[];
  };

  const analisisList: KelasAnalisis[] = [];

  for (const kelas of kelasList) {
    const bebanKelas = bebanList.filter((b) => b.kelasId === kelas.id);
    const targetJp = bebanKelas.reduce((s, b) => s + b.jp, 0);
    const terjadwalJp = jadwalAll.filter((j) => j.kelasId === kelas.id).length;

    const bebanBermasalah: BebanAnalisis[] = [];

    for (const b of bebanKelas) {
      const jpTerjadwal = jpTerjadwalMap.get(b.id) ?? 0;
      if (jpTerjadwal >= b.jp) continue; // sudah terpenuhi

      const jpKurang = b.jp - jpTerjadwal;
      const penyebab: PenyebabItem[] = [];

      // ── Analisis per hari ──────────────────────────────────────────────
      // 1. Hitung slot bebas total (bukan diblokir, bukan terisi kelas, bukan terisi guru)
      let totalSlotBebasKelas = 0;
      let totalSlotBebasGuru = 0;
      const hariDenganBentrok: { hari: HariType; bentrokDenganKelas: string }[] = [];
      const hariTidakAdaBlok: HariType[] = [];

      for (const hari of HARI_LIST) {
        const slotHari = slotTersediaHari(kelas.id, hari);
        if (slotHari.length === 0) continue;

        const kelasOccupied = new Set(
          jadwalAll.filter((j) => j.kelasId === kelas.id && j.hari === hari).map((j) => j.slotWaktuId)
        );
        const guruOccupied = new Map(
          jadwalAll
            .filter((j) => j.guruId === b.guruId && j.hari === hari)
            .map((j) => [j.slotWaktuId, j.kelas.namaKelas])
        );

        const bebasKelas = slotHari.filter((s) => !kelasOccupied.has(s.id));
        totalSlotBebasKelas += bebasKelas.length;

        // Slot yang bebas untuk kelas ini tapi guru bentrok
        const bebasKelasGuru = bebasKelas.filter((s) => !guruOccupied.has(s.id));
        totalSlotBebasGuru += bebasKelasGuru.length;

        // Catat hari mana guru bentrok
        const bentrokDiHariIni = bebasKelas.filter((s) => guruOccupied.has(s.id));
        for (const s of bentrokDiHariIni) {
          const namaKelasLain = guruOccupied.get(s.id)!;
          if (!hariDenganBentrok.some((h) => h.hari === hari && h.bentrokDenganKelas === namaKelasLain)) {
            hariDenganBentrok.push({ hari, bentrokDenganKelas: namaKelasLain });
          }
        }

        // Cek apakah ada blok berurutan sepanjang jpMaksBerurutan yang bebas
        if (b.mapel.jpMaksBerurutan > 1) {
          const adaBlok = adaBlokBebas(kelas.id, b.guruId, hari, b.mapel.jpMaksBerurutan);
          if (!adaBlok && bebasKelasGuru.length > 0) {
            hariTidakAdaBlok.push(hari);
          }
        }
      }

      // 2. Klasifikasi penyebab berdasarkan data
      if (totalSlotBebasKelas === 0) {
        penyebab.push({
          tipe: "slot_habis",
          label: "Slot kelas habis",
          detail: `Tidak ada slot pelajaran yang tersisa di kelas ${kelas.namaKelas} — semua sudah terisi mapel lain.`,
        });
      } else if (totalSlotBebasGuru === 0 && hariDenganBentrok.length > 0) {
        const kelasList2 = [...new Set(hariDenganBentrok.map((h) => h.bentrokDenganKelas))];
        penyebab.push({
          tipe: "bentrok_guru",
          label: "Guru selalu bentrok",
          detail: `${b.guru.nama} di semua slot kosong kelas ini sudah mengajar di: ${kelasList2.join(", ")}. Slot kelas ada (${totalSlotBebasKelas}), tapi guru tidak pernah bebas di saat yang sama.`,
        });
      } else if (totalSlotBebasGuru > 0 && hariTidakAdaBlok.length > 0) {
        penyebab.push({
          tipe: "blok_tidak_muat",
          label: `Blok ${b.mapel.jpMaksBerurutan} JP berurutan tidak tersedia`,
          detail: `Mapel ${b.mapel.namaMapel} butuh ${b.mapel.jpMaksBerurutan} JP berurutan per sesi, tapi tidak ada blok berurutan sebesar itu yang bebas (hari tanpa blok: ${hariTidakAdaBlok.map((h) => HARI_LABEL[h]).join(", ")}). Coba kurangi "JP Maks Berurutan" di Master Mapel.`,
        });
      } else if (hariDenganBentrok.length > 0) {
        const kelasBentrok = [...new Set(hariDenganBentrok.map((h) => h.bentrokDenganKelas))];
        penyebab.push({
          tipe: "bentrok_guru",
          label: "Guru bentrok di sebagian slot",
          detail: `${b.guru.nama} sebagian slot kosong sudah dipakai mengajar di: ${kelasBentrok.join(", ")}. Masih ada ${totalSlotBebasGuru} slot yang bebas — coba generate ulang, atau cek apakah beban JP terlalu besar.`,
        });
      }

      // Tambahan: JP target melebihi slot bebas yang ada untuk guru ini
      if (totalSlotBebasGuru < jpKurang) {
        penyebab.push({
          tipe: "kapasitas_kurang",
          label: "Slot bebas kurang dari JP yang dibutuhkan",
          detail: `Perlu ${jpKurang} JP lagi, tapi hanya tersisa ${totalSlotBebasGuru} slot yang bebas untuk ${b.guru.nama} di kelas ini. Solusi: tambah slot waktu, kurangi JP beban, atau ganti guru.`,
        });
      }

      if (penyebab.length === 0) {
        penyebab.push({
          tipe: "bentrok_guru",
          label: "Penyebab tidak teridentifikasi",
          detail: `Coba jalankan Generate Ulang — kemungkinan scheduler belum menemukan kombinasi yang optimal. Jika masih gagal, cek beban mengajar guru ini.`,
        });
      }

      bebanBermasalah.push({
        bebanId: b.id,
        mapel: b.mapel.namaMapel,
        guru: b.guru.nama,
        kodeGuru: b.guru.kodeGuru,
        jpTarget: b.jp,
        jpTerjadwal,
        jpKurang,
        jpMaksBerurutan: b.mapel.jpMaksBerurutan,
        penyebab,
      });
    }

    if (bebanBermasalah.length > 0) {
      analisisList.push({ kelas, targetJp, terjadwalJp, bebanBermasalah });
    }
  }

  // ── Summary global ────────────────────────────────────────────────────────
  const totalJpKurang = analisisList.reduce(
    (s, a) => s + a.bebanBermasalah.reduce((s2, b) => s2 + b.jpKurang, 0), 0
  );
  const totalJpTarget = bebanList.reduce((s, b) => s + b.jp, 0);
  const totalJpTerjadwal = jadwalAll.length;
  const totalSlotPelajaran = slotPelajaran.length;
  const kapasitasTotal = totalSlotPelajaran * kelasList.length;

  const tipeCounts = { bentrok_guru: 0, slot_habis: 0, blok_tidak_muat: 0, kapasitas_kurang: 0 };
  for (const a of analisisList) {
    for (const b of a.bebanBermasalah) {
      for (const p of b.penyebab) tipeCounts[p.tipe]++;
    }
  }

  const TIPE_COLOR = {
    bentrok_guru: "bg-amber-100 text-amber-800 border-amber-200",
    slot_habis: "bg-red-100 text-red-800 border-red-200",
    blok_tidak_muat: "bg-blue-100 text-blue-800 border-blue-200",
    kapasitas_kurang: "bg-purple-100 text-purple-800 border-purple-200",
  };
  const TIPE_ICON = {
    bentrok_guru: "👥",
    slot_habis: "🈳",
    blok_tidak_muat: "📐",
    kapasitas_kurang: "📊",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Diagnostik Jadwal</h1>
        <p className="text-sm text-zinc-500">
          Analisis spesifik kenapa ada slot kosong — per kelas, per mapel, dan akar penyebabnya.
        </p>
      </div>

      {/* ── Summary kartu ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`rounded-lg border p-4 ${analisisList.length > 0 || kelasKosongList.length > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-xs text-zinc-500">Kelas Bermasalah</p>
          <p className={`mt-1 text-3xl font-bold ${analisisList.length > 0 || kelasKosongList.length > 0 ? "text-red-600" : "text-green-600"}`}>
            {analisisList.length + kelasKosongList.length}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            dari {kelasList.length} kelas
            {kelasKosongList.length > 0 && (
              <span className="ml-1 text-amber-600">({kelasKosongList.length} slot grid kosong)</span>
            )}
          </p>
        </div>
        <div className={`rounded-lg border p-4 ${totalJpKurang > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-xs text-zinc-500">JP Belum Terjadwal</p>
          <p className={`mt-1 text-3xl font-bold ${totalJpKurang > 0 ? "text-amber-600" : "text-green-600"}`}>
            {totalJpKurang}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{totalJpTerjadwal}/{totalJpTarget} JP terjadwal</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Slot Pelajaran/Minggu</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{totalSlotPelajaran}</p>
          <p className="mt-1 text-xs text-zinc-400">× {kelasList.length} kelas = {kapasitasTotal} JP kapasitas</p>
        </div>
        <div className={`rounded-lg border p-4 ${totalJpTarget > kapasitasTotal ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white"}`}>
          <p className="text-xs text-zinc-500">Target vs Kapasitas</p>
          <p className={`mt-1 text-2xl font-bold ${totalJpTarget > kapasitasTotal ? "text-red-600" : "text-zinc-900"}`}>
            {totalJpTarget}/{kapasitasTotal}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {totalJpTarget > kapasitasTotal ? "⚠ Melebihi kapasitas" : "Kapasitas cukup"}
          </p>
        </div>
      </div>

      {/* ── Ringkasan penyebab global ── */}
      {analisisList.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-900">Distribusi Penyebab</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(tipeCounts) as [keyof typeof tipeCounts, number][])
              .filter(([, n]) => n > 0)
              .map(([tipe, n]) => (
                <span key={tipe} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TIPE_COLOR[tipe]}`}>
                  {TIPE_ICON[tipe]} {
                    tipe === "bentrok_guru" ? "Guru Bentrok" :
                    tipe === "slot_habis" ? "Slot Habis" :
                    tipe === "blok_tidak_muat" ? "Blok JP Tidak Muat" :
                    "Kapasitas Kurang"
                  } ({n})
                </span>
              ))}
          </div>

          {/* Solusi cepat berdasarkan penyebab dominan */}
          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            {tipeCounts.bentrok_guru > 0 && (
              <div className="text-xs text-zinc-600 flex gap-2">
                <span>👥</span>
                <span><strong>Guru bentrok</strong> — guru yang sama mengajar terlalu banyak kelas di waktu yang berdekatan. Solusi: ganti guru pengampu di beberapa kelas, atau tambah slot agar ada lebih banyak pilihan waktu.</span>
              </div>
            )}
            {tipeCounts.blok_tidak_muat > 0 && (
              <div className="text-xs text-zinc-600 flex gap-2">
                <span>📐</span>
                <span><strong>Blok JP tidak muat</strong> — mapel butuh N JP berurutan tapi slot yang bebas tidak cukup berurutan. Solusi: buka <Link href="/admin/master/mapel" className="underline font-medium">Master Mapel</Link> dan kurangi nilai "JP Maks Berurutan".</span>
              </div>
            )}
            {tipeCounts.slot_habis > 0 && (
              <div className="text-xs text-zinc-600 flex gap-2">
                <span>🈳</span>
                <span><strong>Slot habis</strong> — slot pelajaran di kelas ini sudah penuh. Solusi: tambah jam di <Link href="/admin/master/slot-waktu" className="underline font-medium">Master Slot Waktu</Link>, atau kurangi JP beban mengajar.</span>
              </div>
            )}
            {tipeCounts.kapasitas_kurang > 0 && (
              <div className="text-xs text-zinc-600 flex gap-2">
                <span>📊</span>
                <span><strong>Kapasitas kurang</strong> — slot bebas yang tersisa lebih sedikit dari JP yang masih dibutuhkan. Kombinasi dari penyebab di atas.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Kelas dengan slot kosong meski beban OK ── */}
      {kelasKosongList.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-700">
            Kelas dengan Slot Kosong di Grid ({kelasKosongList.length})
          </p>
          <p className="text-xs text-zinc-400">
            Kelas-kelas ini jadwal bebannya sudah terpenuhi, tapi masih ada slot pelajaran kosong
            di Excel/matriks karena alasan berikut:
          </p>
          <div className="space-y-2">
            {kelasKosongList.map((k) => (
              <div
                key={k.kelas.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{k.kelas.namaKelas}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        k.alasan === "no_beban"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {k.alasan === "no_beban" ? "⚠️ Belum ada beban mengajar" : "ℹ️ JP beban < slot tersedia"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {k.alasan === "no_beban" ? (
                      <>Kelas ini punya <strong>{k.slotTersedia} slot pelajaran</strong> tapi belum ada satu pun beban mengajar yang dikonfigurasi untuk periode ini.Kosong karena tidak ada yang mau dijadwalkan.
                        {" "}<Link href="/admin/master/mapel" className="underline text-zinc-600">Buka Mata Pelajaran →</Link>
                      </>
                    ) : (
                      <>Beban mengajar total <strong>{k.jpBeban} JP</strong> sudah terjadwal semua,
                        tapi slot pelajaran tersedia <strong>{k.slotTersedia} slot</strong> &mdash;
                        masih ada <strong className="text-amber-700">{k.slotKosong} slot kosong</strong> yang
                        memang tidak ada mapelnya. Ini normal kalau jadwal belum penuh, atau tambah beban mengajar
                        untuk kelas ini kalau seharusnya terisi.
                        {" "}<Link href="/admin/master/mapel" className="underline text-zinc-600">Tambah mapel →</Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400 shrink-0">
                  <div>{k.jpTerjadwal}/{k.slotTersedia} slot terisi</div>
                  <div className="text-amber-600 font-medium">{k.slotKosong} kosong</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail per kelas bermasalah (JP belum terpenuhi) ── */}
      {analisisList.length === 0 && kelasKosongList.length === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-10 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-semibold text-green-800">Semua kelas terjadwal lengkap</p>
          <p className="text-xs text-green-600 mt-1">Tidak ada beban mengajar yang JP-nya belum terpenuhi.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {analisisList.map((a) => (
            <div key={a.kelas.id} className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {/* Header kelas */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-900">{a.kelas.namaKelas}</span>
                  <span className="text-sm text-zinc-500">
                    {a.terjadwalJp}/{a.targetJp} JP
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    -{a.targetJp - a.terjadwalJp} JP
                  </span>
                </div>
                <Link href={`/admin/penjadwalan/kelas?kelasId=${a.kelas.id}`} className="text-xs text-zinc-500 hover:underline">
                  Lihat jadwal →
                </Link>
              </div>

              {/* Beban bermasalah */}
              <div className="divide-y divide-zinc-100">
                {a.bebanBermasalah.map((b) => (
                  <div key={b.bebanId} className="p-4 space-y-3">
                    {/* Info mapel */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-zinc-900">{b.mapel}</span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {b.guru}{" "}
                          <span className="font-mono text-zinc-400">({b.kodeGuru})</span>
                        </span>
                        {b.jpMaksBerurutan > 1 && (
                          <span className="ml-2 text-[10px] rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-500">
                            {b.jpMaksBerurutan} JP/sesi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-zinc-400">Target <strong>{b.jpTarget} JP</strong></span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-green-600">Terjadwal <strong>{b.jpTerjadwal}</strong></span>
                        <span className="rounded bg-red-200 px-1.5 py-0.5 font-bold text-red-800">
                          -{b.jpKurang} JP
                        </span>
                      </div>
                    </div>

                    {/* Penyebab */}
                    <div className="space-y-2">
                      {b.penyebab.map((p, i) => (
                        <div
                          key={i}
                          className={`rounded-md border px-3 py-2 text-xs ${TIPE_COLOR[p.tipe]}`}
                        >
                          <span className="font-semibold">
                            {TIPE_ICON[p.tipe]} {p.label}
                          </span>
                          <span className="ml-2 opacity-80">{p.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Navigasi ── */}
      <div className="flex flex-wrap gap-4 pt-2 text-sm border-t border-zinc-100">
        <Link href="/admin/penjadwalan/generate" className="text-zinc-700 hover:underline font-medium">
          ← Generate Ulang
        </Link>
        <Link href="/admin/laporan/jadwal" className="text-zinc-700 hover:underline">
          Preview Matriks →
        </Link>
        <Link href="/admin/master/mapel" className="text-zinc-700 hover:underline">
          Master Mapel →
        </Link>
        <Link href="/admin/master/slot-waktu" className="text-zinc-700 hover:underline">
          Master Slot Waktu →
        </Link>
        <Link href="/admin/beban-mengajar" className="text-zinc-700 hover:underline">
          Beban Mengajar →
        </Link>
      </div>
    </div>
  );
}
