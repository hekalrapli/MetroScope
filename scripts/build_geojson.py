#!/usr/bin/env python3
"""Build local DKI Jakarta kelurahan GeoJSON from the official Jakarta Satu ArcGIS service.

The dashboard itself does not run this script. It is a one-time data preparation step.
Source: Jakarta Satu (Pemprov DKI Jakarta), Batas Administrasi Kelurahan, ArcGIS REST.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import re
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BASE_QUERY = (
    "https://jakartasatu.jakarta.go.id/server/rest/services/"
    "Batas_Administrasi_Update/Batas_Administrasi_DKI_Jakarta_Update_View/"
    "FeatureServer/{layer}/query?where=1%3D1&outFields=*&returnGeometry=true"
    "&outSR=4326&f=geojson&maxAllowableOffset=0.00005"
)
KELURAHAN_QUERY = BASE_QUERY.format(layer=3)
KOTA_QUERY = BASE_QUERY.format(layer=5)
CITY_MAP = {
    "Kota Adm. Jakarta Pusat": "Jakarta Pusat",
    "Kota Adm. Jakarta Utara": "Jakarta Utara",
    "Kota Adm. Jakarta Barat": "Jakarta Barat",
    "Kota Adm. Jakarta Selatan": "Jakarta Selatan",
    "Kota Adm. Jakarta Timur": "Jakarta Timur",
    "Kab. Adm. Kep. Seribu": "Kep. Seribu",
}


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = value.upper()
    value = re.sub(r"\b(KEL|KEC|KOTA|KAB|KABUPATEN|ADM|ADMINISTRASI)\b", " ", value)
    return re.sub(r"[^A-Z0-9]+", "", value)


def normalized_triple(wilayah: str, kecamatan: str, kelurahan: str) -> tuple[str, str, str]:
    w, k, kl = norm(wilayah), norm(kecamatan), norm(kelurahan)
    # Nama lama pada CSV: Kampung Tengah sekarang tercatat sebagai Tengah.
    if w == norm("Jakarta Timur") and k == norm("Kramat Jati") and kl == norm("Kampung Tengah"):
        kl = norm("Tengah")
    return w, k, kl


def round_coordinates(value, digits: int = 6):
    if isinstance(value, (int, float)):
        return round(float(value), digits)
    return [round_coordinates(item, digits) for item in value]


def read_csv_rows():
    with (DATA / "peningkatan-kawasan-fasilitas-permukiman-dki-jakarta-2023-2025_v1.csv").open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    DATA.mkdir(exist_ok=True)
    headers = {"User-Agent": "MetroScope-data-prep/1.0 (academic use)"}
    with urllib.request.urlopen(
        urllib.request.Request(KELURAHAN_QUERY, headers=headers), timeout=120
    ) as response:
        source = json.loads(response.read())
    if source.get("type") != "FeatureCollection":
        raise SystemExit("Respons kelurahan ArcGIS bukan FeatureCollection GeoJSON.")
    with urllib.request.urlopen(
        urllib.request.Request(KOTA_QUERY, headers=headers), timeout=120
    ) as response:
        kota_source = json.loads(response.read())
    if kota_source.get("type") != "FeatureCollection":
        raise SystemExit("Respons kota ArcGIS bukan FeatureCollection GeoJSON.")

    csv_rows = read_csv_rows()
    csv_by_norm = {}
    csv_orig = {}
    for row in csv_rows:
        orig = (row["wilayah"], row["kecamatan"], row["kelurahan"])
        key = normalized_triple(*orig)
        csv_by_norm[key] = orig
        csv_orig[orig] = True

    # PSU rule: max per (year, wilayah, kecamatan, kelurahan), then sum.
    psu = {}
    rw_sets = defaultdict(set)
    for row in csv_rows:
        year = int(row["periode_data"])
        key = (year, row["wilayah"], row["kecamatan"], row["kelurahan"])
        psu[key] = max(psu.get(key, 0), int(row["jumlah_peningkatan_psu_dilaksanakan"]))
        rw_sets[(row["wilayah"], row["kecamatan"], row["kelurahan"])].add(row["rw"])

    features = []
    matched_keys = set()
    city_counts = Counter()
    polygon_count = 0
    multipolygon_count = 0
    for feature in source["features"]:
        props = feature["properties"]
        wilayah = CITY_MAP[props["WADMKK"]]
        kecamatan = props["WADMKC"]
        kelurahan = props["WADMKD"]
        triple = (wilayah, kecamatan, kelurahan)
        joined = csv_by_norm.get(normalized_triple(*triple))
        join_key = "|".join(joined) if joined else None
        if join_key:
            matched_keys.add(join_key)
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            polygon_count += 1
        elif geometry["type"] == "MultiPolygon":
            multipolygon_count += 1
        else:
            raise SystemExit(f"Geometri tidak didukung: {geometry['type']}")
        city_counts[wilayah] += 1
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": geometry["type"],
                    "coordinates": round_coordinates(geometry["coordinates"]),
                },
                "properties": {
                    "kode": props["KDEPUM"],
                    "kelurahan": kelurahan,
                    "kecamatan": kecamatan,
                    "wilayah": wilayah,
                    "luas_ha": props.get("LUASWH"),
                    "join_key": join_key,
                    "join_status": "matched" if join_key else "no_data",
                },
            }
        )

    all_csv_keys = {"|".join(key) for key in csv_orig}
    unmatched_keys = sorted(all_csv_keys - matched_keys)
    unmatched = []
    for key in unmatched_keys:
        wilayah, kecamatan, kelurahan = key.split("|")
        by_year = {}
        for year in (2023, 2024, 2025):
            by_year[str(year)] = psu.get((year, wilayah, kecamatan, kelurahan), 0)
        unmatched.append(
            {
                "wilayah": wilayah,
                "kecamatan": kecamatan,
                "kelurahan": kelurahan,
                "rows": sum(
                    1
                    for row in csv_rows
                    if (row["wilayah"], row["kecamatan"], row["kelurahan"])
                    == (wilayah, kecamatan, kelurahan)
                ),
                "rw_unique": len(rw_sets[(wilayah, kecamatan, kelurahan)]),
                "psu_by_year": by_year,
                "psu_total": sum(by_year.values()),
                "reason": "Nama lama/ambiguitas batas: geometri saat ini memakai Tanjung Duren Utara dan Tanjung Duren Selatan.",
            }
        )

    psu_all = sum(psu.values())
    psu_matched = sum(
        value
        for (year, wilayah, kecamatan, kelurahan), value in psu.items()
        if "|".join((wilayah, kecamatan, kelurahan)) in matched_keys
    )
    geo_without_data = len(features) - len(matched_keys)

    geojson = {"type": "FeatureCollection", "features": features}
    (DATA / "kelurahan.geojson").write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    kota_features = []
    kota_polygon = 0
    kota_multipolygon = 0
    kota_names = []
    for feature in kota_source["features"]:
        props = feature["properties"]
        wilayah = CITY_MAP[props["WADMKK"]]
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            kota_polygon += 1
        elif geometry["type"] == "MultiPolygon":
            kota_multipolygon += 1
        else:
            raise SystemExit(f"Geometri kota tidak didukung: {geometry['type']}")
        kota_names.append(wilayah)
        kota_features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": geometry["type"],
                    "coordinates": round_coordinates(geometry["coordinates"]),
                },
                "properties": {
                    "kode": props["KDPKAB"],
                    "wilayah": wilayah,
                    "luas_ha": props.get("LUASWH"),
                },
            }
        )
    (DATA / "kota.geojson").write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": kota_features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    report = {
        "source": "Jakarta Satu — Batas Administrasi Kelurahan (ArcGIS REST)",
        "institution": "Pemerintah Provinsi DKI Jakarta",
        "source_url": KELURAHAN_QUERY,
        "source_url_kota": KOTA_QUERY,
        "accessed_at": dt.date.today().isoformat(),
        "license": "Metadata layanan tidak mencantumkan lisensi eksplisit; digunakan untuk tugas akademik non-komersial dengan atribusi. Sumber resmi Pemprov DKI Jakarta.",
        "geometry_format": "GeoJSON FeatureCollection, WGS84 (EPSG:4326), Polygon/MultiPolygon",
        "simplification": "maxAllowableOffset=0.00005 derajat (disederhanakan server-side untuk web)",
        "feature_count": len(features),
        "polygon_count": polygon_count,
        "multipolygon_count": multipolygon_count,
        "kota_feature_count": len(kota_features),
        "kota_polygon_count": kota_polygon,
        "kota_multipolygon_count": kota_multipolygon,
        "kota_names": sorted(kota_names),
        "city_counts": dict(city_counts),
        "csv_unique_kelurahan": len(all_csv_keys),
        "matched_kelurahan": len(matched_keys),
        "geo_with_data": len(matched_keys),
        "geo_without_data": geo_without_data,
        "unmatched_csv": unmatched,
        "psu_all_years": psu_all,
        "psu_matched_all_years": psu_matched,
        "psu_unmatched_all_years": psu_all - psu_matched,
        "aliases": [
            "Kampung Tengah (CSV) -> Tengah (geometri)",
            "Normalisasi menghapus spasi/tanda baca: Pal Merah -> Palmerah; Kramat Jati -> Kramatjati; Kali Anyar -> Kalianyar",
        ],
    }
    (DATA / "kelurahan-join-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({k: report[k] for k in [
        "feature_count", "polygon_count", "multipolygon_count",
        "kota_feature_count", "kota_polygon_count", "kota_multipolygon_count",
        "csv_unique_kelurahan", "matched_kelurahan", "geo_without_data",
        "psu_all_years", "psu_matched_all_years", "psu_unmatched_all_years",
    ]}, ensure_ascii=False, indent=2))
    print("Unmatched:", unmatched)


if __name__ == "__main__":
    main()
