export const HARI_LIST = [
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
] as const;

export type HariType = (typeof HARI_LIST)[number];

export const HARI_LABEL: Record<HariType, string> = {
  SENIN: "Senin",
  SELASA: "Selasa",
  RABU: "Rabu",
  KAMIS: "Kamis",
  JUMAT: "Jumat",
  SABTU: "Sabtu",
};

export const STATUS_GURU_LABEL: Record<"PNS" | "HONOR", string> = {
  PNS: "PNS",
  HONOR: "Honor",
};

export const SEMESTER_LABEL: Record<"GANJIL" | "GENAP", string> = {
  GANJIL: "Ganjil",
  GENAP: "Genap",
};

export const JENIS_SLOT_LABEL: Record<"PELAJARAN" | "NON_PELAJARAN", string> = {
  PELAJARAN: "Pelajaran",
  NON_PELAJARAN: "Non-Pelajaran",
};
