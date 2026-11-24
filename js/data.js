export const YEARS = [2023, 2024, 2025];

export const WILAYAH = [
  "Jakarta Barat",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Utara",
  "Kep. Seribu",
];

export const YEAR_COLORS = {
  2023: "#5470C6",
  2024: "#91CC75",
  2025: "#FAC858",
};

export const REGION_COLORS = {
  "Jakarta Barat": "#0072B2",
  "Jakarta Pusat": "#E69F00",
  "Jakarta Selatan": "#009E73",
  "Jakarta Timur": "#CC79A7",
  "Jakarta Utara": "#56B4E9",
  "Kep. Seribu": "#7A7A7A",
};

export const COLORS = {
  background: "#F7F7F5",
  panel: "#FFFFFF",
  text: "#1F2933",
  muted: "#5B6770",
  border: "#D9DCDF",
  amber: "#B7791F",
  amberTint: "#FBF6EC",
  baru: "#4F7FAE",
  berulang: "#D4812A",
  primary: "#1F4E79",
  sequentialLight: "#E8F0F7",
  sequentialDark: "#1F4E79",
};

export const PSU_RULE =
  "PSU dihitung dari SATU nilai per (tahun, wilayah, kecamatan, kelurahan) memakai MAX, lalu dijumlahkan. Nilai PSU tidak boleh dijumlahkan per baris RW karena pencatatannya agregat per kelurahan.";

const integerFormatter = new Intl.NumberFormat("id-ID");
const decimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const shareFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function fmtInt(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return integerFormatter.format(value);
}

export function fmtPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (digits === 0) return `${shareFormatter.format(value)}%`;
  return `${decimalFormatter.format(value)}%`;
}

export function fmtSignedPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fmtPct(Math.abs(value), digits)}`;
}

export function fmtShare(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${shareFormatter.format(value)}%`;
}

export function pctChange(current, previous) {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export function normalizeRows(rawRows) {
  return rawRows
    .filter((row) => row && row.periode_data && row.wilayah && row.kelurahan)
    .map((row) => ({
      tahun: Number(row.periode_data),
      wilayah: String(row.wilayah).trim(),
      kecamatan: String(row.kecamatan).trim(),
      kelurahan: String(row.kelurahan).trim(),
      rw: String(row.rw).trim(),
      psu: Number(row.jumlah_peningkatan_psu_dilaksanakan) || 0,
      permukiman: Number(row.jumlah_permukiman_kumuh_ditingkatkan) || 0,
      baris_sumber: row.baris_sumber,
    }));
}

export async function loadData() {
  let response;
  try {
    response = await fetch("data/peningkatan-kawasan-fasilitas-permukiman-dki-jakarta-2023-2025_v1.csv", { cache: "no-store" });
  } catch {
    throw new Error(
      "CSV gagal dimuat. Pastikan server lokal berjalan dari folder MetroScope dan file data/peningkatan-kawasan-fasilitas-permukiman-dki-jakarta-2023-2025_v1.csv tersedia."
    );
  }
  if (!response.ok) {
    throw new Error(
      `CSV gagal dimuat (HTTP ${response.status}). Pastikan server lokal berjalan dari folder MetroScope.`
    );
  }
  const text = await response.text();
  if (typeof globalThis.Papa === "undefined") {
    throw new Error(
      "PapaParse tidak tersedia. Periksa koneksi ke CDN atau jalankan halaman melalui server lokal."
    );
  }
  const parsed = globalThis.Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });
  const fatal = parsed.errors.filter((error) => error.type === "Quotes");
  if (fatal.length > 0) {
    throw new Error(`CSV tidak dapat dibaca: ${fatal[0].message}`);
  }
  const rows = normalizeRows(parsed.data);
  if (rows.length === 0) {
    throw new Error("CSV berhasil dibaca tetapi tidak berisi baris data yang valid.");
  }
  return rows;
}

export function filterRows(rows, { wilayah = "all", tahun = "all" } = {}) {
  const year = tahun === "all" ? null : Number(tahun);
  return rows.filter(
    (row) =>
      (wilayah === "all" || row.wilayah === wilayah) &&
      (year === null || row.tahun === year)
  );
}

export const rwKey = (row) =>
  `${row.wilayah}|${row.kecamatan}|${row.kelurahan}|${row.rw}`;
export const kelurahanKey = (row) =>
  `${row.wilayah}|${row.kecamatan}|${row.kelurahan}`;
export const kecamatanKey = (row) => `${row.wilayah}|${row.kecamatan}`;

export function countByYear(rows) {
  const out = {};
  for (const year of YEARS) {
    const count = rows.filter((row) => row.tahun === year).length;
    out[year] = count > 0 ? count : null;
  }
  return out;
}

export function uniqueKelurahan(rows) {
  return new Set(rows.map(kelurahanKey)).size;
}

export function uniqueKelurahanByYear(rows) {
  const out = {};
  for (const year of YEARS) {
    const set = new Set(
      rows.filter((row) => row.tahun === year).map(kelurahanKey)
    );
    out[year] = set.size > 0 ? set.size : null;
  }
  return out;
}

export function uniqueRW(rows) {
  return new Set(rows.map(rwKey)).size;
}

export function uniqueRWByYear(rows) {
  const out = {};
  for (const year of YEARS) {
    out[year] = new Set(
      rows.filter((row) => row.tahun === year).map(rwKey)
    );
  }
  return out;
}

export function multiYearRW(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = rwKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        wilayah: row.wilayah,
        kecamatan: row.kecamatan,
        kelurahan: row.kelurahan,
        rw: row.rw,
        tahun: new Set(),
      });
    }
    map.get(key).tahun.add(row.tahun);
  }
  return [...map.values()]
    .filter((item) => item.tahun.size > 1)
    .map((item) => ({ ...item, tahun: [...item.tahun].sort((a, b) => a - b) }))
    .sort((a, b) => {
      const region =
        WILAYAH.indexOf(a.wilayah) - WILAYAH.indexOf(b.wilayah);
      if (region !== 0) return region;
      return (
        a.kecamatan.localeCompare(b.kecamatan, "id") ||
        a.kelurahan.localeCompare(b.kelurahan, "id") ||
        Number(a.rw) - Number(b.rw)
      );
    });
}

export function topKelurahan(rows, limit = 10) {
  const map = new Map();
  for (const row of rows) {
    const key = kelurahanKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        wilayah: row.wilayah,
        kecamatan: row.kecamatan,
        kelurahan: row.kelurahan,
        count: 0,
      });
    }
    map.get(key).count += 1;
  }
  const sorted = [...map.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.kelurahan.localeCompare(b.kelurahan, "id") ||
      a.wilayah.localeCompare(b.wilayah, "id") ||
      a.kecamatan.localeCompare(b.kecamatan, "id")
  );
  return limit === null ? sorted : sorted.slice(0, limit);
}

export function topKecamatan(rows, limit = 10) {
  const map = new Map();
  for (const row of rows) {
    const key = kecamatanKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        wilayah: row.wilayah,
        kecamatan: row.kecamatan,
        count: 0,
      });
    }
    map.get(key).count += 1;
  }
  const sorted = [...map.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.kecamatan.localeCompare(b.kecamatan, "id") ||
      a.wilayah.localeCompare(b.wilayah, "id")
  );
  return limit === null ? sorted : sorted.slice(0, limit);
}

export function regionYearCounts(rows) {
  const out = {};
  for (const region of WILAYAH) {
    out[region] = {};
    for (const year of YEARS) {
      const count = rows.filter(
        (row) => row.wilayah === region && row.tahun === year
      ).length;
      out[region][year] = count > 0 ? count : null;
    }
  }
  return out;
}

export function recordsPerRegion(rows) {
  const out = {};
  for (const region of WILAYAH) {
    const count = rows.filter((row) => row.wilayah === region).length;
    out[region] = count > 0 ? count : null;
  }
  return out;
}

export function rwPerRegion(rows) {
  const out = {};
  for (const region of WILAYAH) {
    const set = new Set(
      rows.filter((row) => row.wilayah === region).map(rwKey)
    );
    out[region] = rows.some((row) => row.wilayah === region) ? set.size : null;
  }
  return out;
}

export function psuKelurahanYearMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.tahun}|${kelurahanKey(row)}`;
    const current = map.get(key);
    if (!current || row.psu > current.psu) {
      map.set(key, {
        tahun: row.tahun,
        wilayah: row.wilayah,
        kecamatan: row.kecamatan,
        kelurahan: row.kelurahan,
        psu: row.psu,
      });
    }
  }
  return map;
}

export function psuByYear(rows) {
  const map = psuKelurahanYearMap(rows);
  const out = {};
  for (const year of YEARS) {
    let sum = 0;
    let hasValue = false;
    for (const item of map.values()) {
      if (item.tahun === year) {
        sum += item.psu;
        hasValue = true;
      }
    }
    out[year] = hasValue ? sum : null;
  }
  return out;
}

export function psuTotal(rows) {
  return [...psuKelurahanYearMap(rows).values()].reduce(
    (sum, item) => sum + item.psu,
    0
  );
}

export function psuByRegionYear(rows) {
  const map = psuKelurahanYearMap(rows);
  const out = {};
  for (const region of WILAYAH) {
    out[region] = {};
    for (const year of YEARS) {
      let sum = 0;
      let hasValue = false;
      for (const item of map.values()) {
        if (item.wilayah === region && item.tahun === year) {
          sum += item.psu;
          hasValue = true;
        }
      }
      out[region][year] = hasValue ? sum : null;
    }
  }
  return out;
}

export function psuByRegion(rows, tahun = "all") {
  const map = psuKelurahanYearMap(rows);
  const year = tahun === "all" ? null : Number(tahun);
  const out = {};
  for (const region of WILAYAH) {
    let sum = 0;
    let hasValue = false;
    for (const item of map.values()) {
      if (
        item.wilayah === region &&
        (year === null || item.tahun === year)
      ) {
        sum += item.psu;
        hasValue = true;
      }
    }
    out[region] = hasValue ? sum : null;
  }
  return out;
}

export function coverageByYear(rows) {
  const byYear = uniqueRWByYear(rows);
  const seen = new Set();
  return YEARS.map((year) => {
    const set = byYear[year];
    if (!set || set.size === 0) {
      return { tahun: year, baru: null, berulang: null, total: null };
    }
    let baru = 0;
    let berulang = 0;
    for (const key of set) {
      if (seen.has(key)) berulang += 1;
      else baru += 1;
    }
    for (const key of set) seen.add(key);
    return { tahun: year, baru, berulang, total: set.size };
  });
}

export function sortRegionsByValue(values, useTotal = null) {
  return [...WILAYAH].sort((a, b) => {
    const av = values[a];
    const bv = values[b];
    const aValid = av !== null && av !== undefined;
    const bValid = bv !== null && bv !== undefined;
    if (!aValid && !bValid) {
      return (
        (useTotal ? (useTotal[b] ?? -1) - (useTotal[a] ?? -1) : 0) ||
        WILAYAH.indexOf(a) - WILAYAH.indexOf(b)
      );
    }
    if (!aValid) return 1;
    if (!bValid) return -1;
    return bv - av || WILAYAH.indexOf(a) - WILAYAH.indexOf(b);
  });
}

export function yearLabel(year) {
  return String(year);
}
