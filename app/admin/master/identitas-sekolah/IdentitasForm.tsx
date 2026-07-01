"use client";

import { useActionState, useState, useRef } from "react";
import { updateIdentitas, type IdentitasFormState } from "./actions";

type DefaultValues = {
  namaSekolah:    string;
  npsn:           string | null;
  nss:            string | null;
  alamat:         string | null;
  email:          string | null;
  kecamatan:      string | null;
  namaPemerintah: string | null;
  namaDinas:      string | null;
  kurikulum:      string | null;
  tahunPelajaran: string | null;
  semester:       "GANJIL" | "GENAP";
  logoKiri:       string | null;
  logoKanan:      string | null;
  namaKepsek:     string | null;
  nipKepsek:      string | null;
  namaWaka:       string | null;
  nipWaka:        string | null;
};

type Props = { defaultValues: DefaultValues };

function Field({
  label, name, defaultValue, placeholder, hint,
}: {
  label: string; name: string; defaultValue?: string | null;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function LogoUpload({
  name, label, current, onChange,
}: {
  name: string; label: string; current: string; onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
          {current
            ? <img src={current} alt="logo" className="h-full w-full object-contain" />
            : <span className="text-[9px] text-zinc-400">Logo</span>}
        </div>
        <div className="space-y-1">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            {current ? "Ganti Gambar" : "Upload Gambar"}
          </button>
          {current && (
            <button type="button" onClick={() => onChange("")}
              className="block text-xs text-red-500 hover:underline">Hapus</button>
          )}
          <p className="text-[10px] text-zinc-400">PNG/JPG, maks. 2MB</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml"
        className="hidden" onChange={handleFile} />
      <input type="hidden" name={name} value={current} />
    </div>
  );
}

// ── Live KOP preview ────────────────────────────────────────────────────────
function KopPreview({
  logoKiri, logoKanan,
  namaPemerintah, namaDinas, namaSekolah, kecamatan,
  npsn, nss, alamat, email, tahunPelajaran, kurikulum,
  namaKepsek, nipKepsek, namaWaka, nipWaka,
  kota,
}: {
  logoKiri: string; logoKanan: string;
  namaPemerintah: string; namaDinas: string; namaSekolah: string;
  kecamatan: string; npsn: string; nss: string; alamat: string;
  email: string; tahunPelajaran: string; kurikulum: string;
  namaKepsek: string; nipKepsek: string; namaWaka: string; nipWaka: string;
  kota: string;
}) {
  return (
    <div className="rounded-md border border-zinc-300 bg-white p-4 text-center"
      style={{ fontFamily: "Arial, sans-serif", fontSize: 11 }}>

      {/* KOP */}
      <div className="flex items-center gap-2 border-b-2 border-zinc-900 pb-2 mb-1">
        <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-zinc-200 bg-zinc-50">
          {logoKiri
            ? <img src={logoKiri} className="w-full h-full object-contain" alt="" />
            : <span className="text-[8px] text-zinc-300">Logo</span>}
        </div>
        <div className="flex-1 text-center">
          {namaPemerintah && <p className="text-[10px] leading-tight">{namaPemerintah}</p>}
          {namaDinas      && <p className="text-[10px] leading-tight">{namaDinas}</p>}
          <p className="text-[15px] font-black leading-tight tracking-wide">
            {namaSekolah || <span className="text-zinc-300">NAMA SEKOLAH</span>}
          </p>
          {kecamatan && <p className="text-[9px] leading-tight">{kecamatan}</p>}
          <p className="text-[8px] font-bold">
            {[npsn && `NPSN: ${npsn}`, nss && `NSS: ${nss}`].filter(Boolean).join("    ")}
          </p>
          <p className="text-[8px] italic">
            {[alamat, email && `Email: ${email}`].filter(Boolean).join("  –  ")}
          </p>
        </div>
        <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-zinc-200 bg-zinc-50">
          {logoKanan
            ? <img src={logoKanan} className="w-full h-full object-contain" alt="" />
            : <span className="text-[8px] text-zinc-300">Logo</span>}
        </div>
      </div>

      {/* Judul */}
      <p className="text-[9px] font-bold mb-0.5">
        JADWAL PELAJARAN TAHUN PELAJARAN {tahunPelajaran || "____/____"}
      </p>
      {kurikulum && <p className="text-[9px] font-bold mb-2">{kurikulum}</p>}

      {/* Tabel jadwal placeholder */}
      <div className="my-2 h-12 rounded border border-dashed border-zinc-300 flex items-center justify-center">
        <span className="text-[9px] text-zinc-400">[ Tabel Jadwal ]</span>
      </div>

      {/* Tanda tangan */}
      {(namaWaka || namaKepsek) && (
        <div className="mt-3 flex justify-between px-4 text-left text-[9px]">
          {/* Waka Kurikulum — kiri */}
          <div className="w-40">
            <p>Mengetahui,</p>
            <p>Waka Kurikulum</p>
            <div className="my-5" />
            <p className="font-bold underline">{namaWaka || "_______________"}</p>
            {nipWaka && <p>NIP. {nipWaka}</p>}
          </div>
          {/* Kepala Sekolah — kanan */}
          <div className="w-40 text-right">
            <p>{kota || "____________"}, __________</p>
            <p>Kepala Sekolah</p>
            <div className="my-5" />
            <p className="font-bold underline">{namaKepsek || "_______________"}</p>
            {nipKepsek && <p>NIP. {nipKepsek}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ───────────────────────────────────────────────────────────────
export default function IdentitasForm({ defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<IdentitasFormState, FormData>(
    updateIdentitas, {}
  );

  const [logoKiri,    setLogoKiri]    = useState(defaultValues.logoKiri   ?? "");
  const [logoKanan,   setLogoKanan]   = useState(defaultValues.logoKanan  ?? "");

  // Live values untuk preview — pakai state minimal, sisanya dari defaultValues
  const [namaKepsek, setNamaKepsek] = useState(defaultValues.namaKepsek ?? "");
  const [nipKepsek,  setNipKepsek]  = useState(defaultValues.nipKepsek  ?? "");
  const [namaWaka,   setNamaWaka]   = useState(defaultValues.namaWaka   ?? "");
  const [nipWaka,    setNipWaka]    = useState(defaultValues.nipWaka    ?? "");

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Data berhasil disimpan.
        </div>
      )}

      {/* ── Kode & Nomor ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Kode &amp; Nomor Resmi
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="NPSN" name="npsn" defaultValue={defaultValues.npsn}
            placeholder="12345678" hint="Nomor Pokok Sekolah Nasional" />
          <Field label="NSS"  name="nss"  defaultValue={defaultValues.nss}
            placeholder="201140101234" hint="Nomor Statistik Sekolah" />
        </div>
      </section>

      {/* ── Nama Instansi ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Nama Instansi (untuk KOP)
        </h2>
        <Field label="Pemerintah / Yayasan" name="namaPemerintah"
          defaultValue={defaultValues.namaPemerintah}
          placeholder="PEMERINTAH KABUPATEN ROKAN HILIR"
          hint="Baris pertama KOP" />
        <Field label="Dinas / Unit" name="namaDinas"
          defaultValue={defaultValues.namaDinas}
          placeholder="DINAS PENDIDIKAN DAN KEBUDAYAAN"
          hint="Baris kedua KOP" />
        <Field label="Nama Sekolah ✱" name="namaSekolah"
          defaultValue={defaultValues.namaSekolah}
          placeholder="SMP NEGERI 3 BAGAN SINEMBAH"
          hint="Ditampilkan besar & tebal di tengah KOP" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kecamatan / Wilayah" name="kecamatan"
            defaultValue={defaultValues.kecamatan}
            placeholder="KECAMATAN BAGAN SINEMBAH" />
          <Field label="Kurikulum" name="kurikulum"
            defaultValue={defaultValues.kurikulum}
            placeholder="KURIKULUM MERDEKA" />
        </div>
      </section>

      {/* ── Kontak ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Kontak &amp; Lokasi
        </h2>
        <Field label="Alamat" name="alamat" defaultValue={defaultValues.alamat}
          placeholder="Jl. Lintas Bagan Batu, Desa Bagan Sinembah" />
        <Field label="Email"  name="email"  defaultValue={defaultValues.email}
          placeholder="smpn3bagansinembah@gmail.com" />
      </section>

      {/* ── Periode ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Periode Aktif
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tahun Pelajaran ✱" name="tahunPelajaran"
            defaultValue={defaultValues.tahunPelajaran}
            placeholder="2025 / 2026"
            hint="Muncul di judul laporan & menentukan periode aktif" />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Semester ✱</label>
            <select name="semester" defaultValue={defaultValues.semester}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none">
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Logo ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Logo KOP
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <LogoUpload name="logoKiri"  label="Logo Kiri (Pemda / Dinas)"
            current={logoKiri}  onChange={setLogoKiri} />
          <LogoUpload name="logoKanan" label="Logo Kanan (Sekolah / Akreditasi)"
            current={logoKanan} onChange={setLogoKanan} />
        </div>
      </section>

      {/* ── Tanda Tangan ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Tanda Tangan Laporan
        </h2>
        <p className="text-xs text-zinc-500">
          Nama & NIP yang muncul di bagian bawah laporan jadwal saat diekspor.
        </p>
        <div className="grid grid-cols-2 gap-6">
          {/* Waka Kurikulum */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Waka Kurikulum</p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nama</label>
              <input name="namaWaka" value={namaWaka}
                onChange={(e) => setNamaWaka(e.target.value)}
                placeholder="Nama Waka Kurikulum"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">NIP <span className="text-zinc-400 font-normal">(opsional)</span></label>
              <input name="nipWaka" value={nipWaka}
                onChange={(e) => setNipWaka(e.target.value)}
                placeholder="19XXXXXXXXXXXXXX"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </div>
          </div>
          {/* Kepala Sekolah */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Kepala Sekolah</p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nama</label>
              <input name="namaKepsek" value={namaKepsek}
                onChange={(e) => setNamaKepsek(e.target.value)}
                placeholder="Nama Kepala Sekolah"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">NIP <span className="text-zinc-400 font-normal">(opsional)</span></label>
              <input name="nipKepsek" value={nipKepsek}
                onChange={(e) => setNipKepsek(e.target.value)}
                placeholder="19XXXXXXXXXXXXXX"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Preview ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
          Preview Laporan
        </h2>
        <p className="text-xs text-zinc-400">
          Preview langsung update saat kamu mengetik di kolom Tanda Tangan. Kolom lain update setelah Simpan.
        </p>
        <KopPreview
          logoKiri={logoKiri}
          logoKanan={logoKanan}
          namaPemerintah={defaultValues.namaPemerintah ?? ""}
          namaDinas={defaultValues.namaDinas ?? ""}
          namaSekolah={defaultValues.namaSekolah ?? ""}
          kecamatan={defaultValues.kecamatan ?? ""}
          npsn={defaultValues.npsn ?? ""}
          nss={defaultValues.nss ?? ""}
          alamat={defaultValues.alamat ?? ""}
          email={defaultValues.email ?? ""}
          tahunPelajaran={defaultValues.tahunPelajaran ?? ""}
          kurikulum={defaultValues.kurikulum ?? ""}
          kota={defaultValues.kecamatan ?? ""}
          namaKepsek={namaKepsek}
          nipKepsek={nipKepsek}
          namaWaka={namaWaka}
          nipWaka={nipWaka}
        />
      </section>

      <button type="submit" disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
