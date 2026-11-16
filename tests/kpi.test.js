import fs from "node:fs";
import assert from "node:assert/strict";
import {
  YEARS,
  WILAYAH,
  normalizeRows,
  countByYear,
  uniqueKelurahan,
  uniqueKelurahanByYear,
  uniqueRW,
  multiYearRW,
  topKelurahan,
  topKecamatan,
  regionYearCounts,
  recordsPerRegion,
  psuByYear,
  psuTotal,
  psuByRegionYear,
  psuByRegion,
  psuKelurahanYearMap,
  kelurahanKey,
  coverageByYear,
  pctChange,
  fmtInt,
  fmtPct,
  fmtSignedPct,
} from "../js/data.js";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const csvText = fs.readFileSync(
  new URL("../data/peningkatan-kawasan-fasilitas-permukiman-dki-jakarta-2023-2025_v1.csv", import.meta.url),
  "utf8"
);
const table = parseCSV(csvText);
const header = table.shift();
const rawRows = table
  .filter((row) => row.length === header.length)
  .map((row) =>
    Object.fromEntries(header.map((column, index) => [column, row[index]]))
  );
const rows = normalizeRows(rawRows);

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    passed += 1;
    console.log(`PASS ${name}`);
  } catch {
    failures.push(name);
    console.log(
      `FAIL ${name}\n     got:      ${JSON.stringify(actual)}\n     expected: ${JSON.stringify(expected)}`
    );
  }
}

check("jumlah baris data", rows.length, 308);
check("catatan RW per tahun", countByYear(rows), {
  2023: 91,
  2024: 98,
  2025: 119,
});
check("total catatan = 308", Object.values(countByYear(rows)).reduce((a, b) => a + b, 0), 308);
check("perubahan 2023-2025", Number(pctChange(119, 91).toFixed(1)), 30.8);
check("format delta", fmtSignedPct(pctChange(119, 91)), "+30,8%");
check("format ribuan", fmtInt(1234), "1.234");
check("format persen", fmtPct(30.769, 1), "30,8%");

check("kelurahan unik total", uniqueKelurahan(rows), 88);
check("kelurahan unik per tahun", uniqueKelurahanByYear(rows), {
  2023: 28,
  2024: 38,
  2025: 49,
});
check("RW unik total", uniqueRW(rows), 237);
check(
  "RW unik per tahun",
  Object.fromEntries(
    [2023, 2024, 2025].map((year) => [
      year,
      uniqueRW(rows.filter((row) => row.tahun === year)),
    ])
  ),
  { 2023: 91, 2024: 98, 2025: 119 }
);
check("RW muncul di >1 tahun", multiYearRW(rows).length, 61);

const matrix = regionYearCounts(rows);
check("matriks wilayah x tahun", {
  "Jakarta Barat": [matrix["Jakarta Barat"][2023], matrix["Jakarta Barat"][2024], matrix["Jakarta Barat"][2025]],
  "Jakarta Pusat": [matrix["Jakarta Pusat"][2023], matrix["Jakarta Pusat"][2024], matrix["Jakarta Pusat"][2025]],
  "Jakarta Selatan": [matrix["Jakarta Selatan"][2023], matrix["Jakarta Selatan"][2024], matrix["Jakarta Selatan"][2025]],
  "Jakarta Timur": [matrix["Jakarta Timur"][2023], matrix["Jakarta Timur"][2024], matrix["Jakarta Timur"][2025]],
  "Jakarta Utara": [matrix["Jakarta Utara"][2023], matrix["Jakarta Utara"][2024], matrix["Jakarta Utara"][2025]],
  "Kep. Seribu": [matrix["Kep. Seribu"][2023], matrix["Kep. Seribu"][2024], matrix["Kep. Seribu"][2025]],
}, {
  "Jakarta Barat": [19, 19, 16],
  "Jakarta Pusat": [19, 12, 10],
  "Jakarta Selatan": [7, 12, 20],
  "Jakarta Timur": [null, 11, 39],
  "Jakarta Utara": [41, 40, 28],
  "Kep. Seribu": [5, 4, 6],
});

const allRegionTotals = recordsPerRegion(rows);
check("total per wilayah 2023-2025", allRegionTotals, {
  "Jakarta Barat": 54,
  "Jakarta Pusat": 41,
  "Jakarta Selatan": 39,
  "Jakarta Timur": 50,
  "Jakarta Utara": 109,
  "Kep. Seribu": 15,
});
check(
  "jumlah total per wilayah 2023-2025",
  Object.values(allRegionTotals).reduce((sum, value) => sum + value, 0),
  308
);
check(
  "jumlah kontribusi semua tahun = 100%",
  Number(
    WILAYAH.map((region) => (allRegionTotals[region] / 308) * 100)
      .reduce((sum, value) => sum + value, 0)
      .toFixed(6)
  ),
  100
);
check(
  "jumlah kontribusi tampilan 1 desimal = 100%",
  Number(
    WILAYAH.map((region) =>
      Number(((allRegionTotals[region] / 308) * 100).toFixed(1))
    )
      .reduce((sum, value) => sum + value, 0)
      .toFixed(1)
  ),
  100
);
check(
  "urutan peringkat mode semua tahun",
  [...WILAYAH].sort((a, b) => allRegionTotals[b] - allRegionTotals[a]),
  [
    "Jakarta Utara",
    "Jakarta Barat",
    "Jakarta Timur",
    "Jakarta Pusat",
    "Jakarta Selatan",
    "Kep. Seribu",
  ]
);

const top4 = topKelurahan(rows, 4).map((item) => [item.kelurahan, item.count]);
check("top 4 kelurahan (tie alfabetis)", top4, [
  ["Kalibaru", 22],
  ["Penjaringan", 21],
  ["Cipete Utara", 10],
  ["Koja", 10],
]);
check("kecamatan teratas", [topKecamatan(rows, 1)[0].kecamatan, topKecamatan(rows, 1)[0].count], ["Cilincing", 34]);

check("PSU per tahun (aturan MAX + dedup)", psuByYear(rows), {
  2023: 135,
  2024: 228,
  2025: 153,
});
check("total PSU 2023-2025", psuTotal(rows), 516);
check("jumlah PSU naif per baris (tidak dipakai)", rawRows.reduce((sum, row) => sum + Number(row.jumlah_peningkatan_psu_dilaksanakan), 0), 1234);
const psuRegion = psuByRegionYear(rows);
check("PSU Jakarta Timur 2023 tidak tersedia", psuRegion["Jakarta Timur"][2023], null);
check("PSU per wilayah total 2023-2025", psuByRegion(rows, "all"), {
  "Jakarta Barat": 107,
  "Jakarta Pusat": 131,
  "Jakarta Selatan": 102,
  "Jakarta Timur": 76,
  "Jakarta Utara": 85,
  "Kep. Seribu": 15,
});
check("wilayah PSU tertinggi 2023-2025", ["Jakarta Pusat", psuByRegion(rows, "all")["Jakarta Pusat"]], ["Jakarta Pusat", 131]);

const geojson = JSON.parse(
  fs.readFileSync(new URL("../data/kelurahan.geojson", import.meta.url), "utf8")
);
const joinReport = JSON.parse(
  fs.readFileSync(
    new URL("../data/kelurahan-join-report.json", import.meta.url),
    "utf8"
  )
);
const kotaGeojson = JSON.parse(
  fs.readFileSync(new URL("../data/kota.geojson", import.meta.url), "utf8")
);
const geoFeatures = geojson.features;
const geoKeys = geoFeatures
  .map((feature) => feature.properties.join_key)
  .filter(Boolean);
const geoKeySet = new Set(geoKeys);
const geometryCounts = geoFeatures.reduce((counts, feature) => {
  counts[feature.geometry.type] = (counts[feature.geometry.type] || 0) + 1;
  return counts;
}, {});
check("GeoJSON kelurahan ada dan 267 fitur", geoFeatures.length, 267);
check("GeoJSON tipe geometri", geometryCounts, {
  Polygon: 256,
  MultiPolygon: 11,
});
check(
  "GeoJSON kode kelurahan unik",
  new Set(geoFeatures.map((feature) => feature.properties.kode)).size,
  267
);
const kotaFeatures = kotaGeojson.features;
const kotaGeometryCounts = kotaFeatures.reduce((counts, feature) => {
  counts[feature.geometry.type] = (counts[feature.geometry.type] || 0) + 1;
  return counts;
}, {});
check("GeoJSON kota ada dan 6 fitur", kotaFeatures.length, 6);
check("GeoJSON kota tipe geometri", kotaGeometryCounts, {
  Polygon: 3,
  MultiPolygon: 3,
});
check(
  "GeoJSON kota kode unik",
  new Set(kotaFeatures.map((feature) => feature.properties.kode)).size,
  6
);
check(
  "GeoJSON kota mencakup enam wilayah",
  kotaFeatures.map((feature) => feature.properties.wilayah).sort(),
  [...WILAYAH].sort()
);
check("GeoJSON join key unik", geoKeySet.size, 87);
const csvKeySet = new Set(rows.map(kelurahanKey));
check(
  "CSV kelurahan yang tidak dapat dipetakan",
  [...csvKeySet].filter((key) => !geoKeySet.has(key)),
  ["Jakarta Barat|Grogol Petamburan|Tanjung Duren"]
);
const psuPerKelurahan = new Map();
for (const item of psuKelurahanYearMap(rows).values()) {
  const key = kelurahanKey(item);
  psuPerKelurahan.set(key, (psuPerKelurahan.get(key) || 0) + item.psu);
}
let psuMapped = 0;
let psuUnmapped = 0;
for (const [key, value] of psuPerKelurahan) {
  if (geoKeySet.has(key)) psuMapped += value;
  else psuUnmapped += value;
}
check("PSU terpetakan semua tahun", psuMapped, 513);
check("PSU tidak dapat dipetakan semua tahun", psuUnmapped, 3);
check("PSU terpetakan + tidak terpetakan = total", psuMapped + psuUnmapped, 516);
const psuMappedByYear = { 2023: 0, 2024: 0, 2025: 0 };
for (const item of psuKelurahanYearMap(rows).values()) {
  if (geoKeySet.has(kelurahanKey(item))) {
    psuMappedByYear[item.tahun] += item.psu;
  }
}
check("PSU terpetakan per tahun", psuMappedByYear, {
  2023: 135,
  2024: 225,
  2025: 153,
});
check("laporan join: fitur", joinReport.feature_count, 267);
check("laporan join: matched", joinReport.matched_kelurahan, 87);
check("laporan join: tanpa data", joinReport.geo_without_data, 180);
check(
  "laporan join: PSU Tanjung Duren 2024",
  joinReport.unmatched_csv[0].psu_by_year["2024"],
  3
);

check("cakupan RW baru vs RW berulang per tahun", coverageByYear(rows), [
  { tahun: 2023, baru: 91, berulang: 0, total: 91 },
  { tahun: 2024, baru: 68, berulang: 30, total: 98 },
  { tahun: 2025, baru: 78, berulang: 41, total: 119 },
]);

check("semua wilayah acuan ada", WILAYAH.every((region) => matrix[region]), true);
check("tahun acuan", YEARS, [2023, 2024, 2025]);

console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length > 0) {
  console.error(`Gagal: ${failures.join(", ")}`);
  process.exit(1);
}
