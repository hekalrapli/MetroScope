# Sumber Data Spasial dan Validasi Join

## Sumber yang dipakai

| Item | Nilai |
|---|---|
| Nama layanan | Batas Administrasi Kelurahan |
| Instansi | Pemerintah Provinsi DKI Jakarta — Jakarta Satu |
| Portal | https://jakartasatu.jakarta.go.id/ |
| Layanan | https://jakartasatu.jakarta.go.id/server/rest/services/Batas_Administrasi_Update/Batas_Administrasi_DKI_Jakarta_Update_View/FeatureServer/3 |
| Format ekspor | GeoJSON (`f=geojson`), WGS84 (`outSR=4326`) |
| Tanggal akses | 15 November 2026 |
| Tingkat administrasi | Kelurahan |
| Jumlah fitur | 267 kelurahan + 6 kota administrasi |
| Geometri | Kelurahan: 256 Polygon, 11 MultiPolygon; kota: 3 Polygon, 3 MultiPolygon |
| Simplifikasi | `maxAllowableOffset=0.00005` derajat (server-side), koordinat dibulatkan 6 desimal |
| Lisensi | Metadata layanan tidak mencantumkan field lisensi atau `copyrightText`. Digunakan untuk tugas akademik non-komersial dengan atribusi kepada Pemprov DKI Jakarta/Jakarta Satu. Untuk penggunaan ulang publik, cek ketentuan portal. |
| File lokal | `data/kelurahan.geojson`, `data/kota.geojson` |
| Laporan join | `data/kelurahan-join-report.json` |

Query yang dipakai oleh `scripts/build_geojson.py`:

```text
https://jakartasatu.jakarta.go.id/server/rest/services/Batas_Administrasi_Update/
Layer 3 (kelurahan):
Batas_Administrasi_DKI_Jakarta_Update_View/FeatureServer/3/query
?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326
&f=geojson&maxAllowableOffset=0.00005

Layer 5 (kota administrasi):
Batas_Administrasi_DKI_Jakarta_Update_View/FeatureServer/5/query
?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326
&f=geojson&maxAllowableOffset=0.00005
```

## Mengapa sumber ini

Sumber ini dipilih karena merupakan layanan resmi Pemprov DKI Jakarta, menyediakan layer **Batas Administrasi Kelurahan** (bukan hanya kecamatan/kota), memiliki atribut kode dan nama kelurahan/kecamatan/wilayah, serta dapat diekspor menjadi GeoJSON. Endpoint ini dapat diakses dari environment pengembangan dan mengembalikan 267 fitur kelurahan DKI.

Upaya sumber lain:

- `geoportal.jakarta.go.id` dan `gisservices.jakarta.go.id` tidak dapat di-resolve dari environment ini.
- Portal Jakarta Satu dapat diakses; folder `Batas_Administrasi_Update` menyediakan FeatureServer layer 1–5. Layer 3 adalah kelurahan, layer 5 adalah kabupaten/kota administrasi. Keduanya dipakai: layer 3 untuk choropleth PSU, layer 5 untuk garis batas kota dan label.
- Alternatif `cahyadsn/wilayah_boundaries` (MIT) juga diperiksa: 267 kelurahan, tetapi bukan layanan resmi. Alternatif ini tidak dipakai karena layanan Jakarta Satu tersedia.
- BIG/Ina-Geoportal tidak menyediakan ekspor kelurahan DKI yang langsung dapat dipakai dalam alur ini.

## Atribut dan normalisasi

Atribut asli yang dipertahankan/dipetakan:

| Asli | Properti lokal | Keterangan |
|---|---|---|
| `KDEPUM` | `kode` | Kode kelurahan, contoh `31.71.03.1005` |
| `WADMKD` | `kelurahan` | Nama kelurahan |
| `WADMKC` | `kecamatan` | Nama kecamatan |
| `WADMKK` | `wilayah` | Dinormalisasi ke `Jakarta Pusat/Utara/Barat/Selatan/Timur` dan `Kep. Seribu` |
| `LUASWH` | `luas_ha` | Luas wilayah (ha), opsional |
| hasil join | `join_key` | `wilayah|kecamatan|kelurahan` dari CSV, atau `null` |
| hasil join | `join_status` | `matched` atau `no_data` |

CSV tidak memiliki kode wilayah, sehingga join terutama memakai nama dengan normalisasi:

- huruf besar, hapus tanda baca dan spasi;
- `Pal Merah` → `Palmerah`;
- `Kramat Jati` → `Kramatjati`;
- `Kali Anyar` → `Kalianyar`;
- `Kampung Tengah` → `Tengah` (nama saat ini);
- kota `Kab. Adm. Kep. Seribu` → `Kep. Seribu`.

Kode `KDEPUM` tetap disimpan untuk audit, tetapi bukan kunci join karena CSV tidak menyediakannya. Duplikasi kode dan duplikasi `join_key` sudah diperiksa: 267 kode unik dan 87 `join_key` unik.

## Validasi join

| Pemeriksaan | Hasil |
|---|---|
| Fitur GeoJSON kelurahan | 267 |
| Polygon / MultiPolygon kelurahan | 256 / 11 |
| Fitur GeoJSON kota administrasi | 6 |
| Polygon / MultiPolygon kota | 3 / 3 |
| Kelurahan unik pada CSV | 88 |
| Kelurahan berhasil di-join | 87 |
| Kelurahan CSV tidak dapat dipetakan | 1: Tanjung Duren (Jakarta Barat, Grogol Petamburan) |
| Fitur GeoJSON tanpa catatan program | 180 |
| PSU seluruh CSV 2023–2025 | 516 |
| PSU pada fitur yang berhasil dipetakan | 513 |
| PSU di luar peta | 3 (Tanjung Duren, 2024) |
| PSU 2023 terpetakan | 135 |
| PSU 2024 terpetakan | 225 (dari 228; 3 Tanjung Duren) |
| PSU 2025 terpetakan | 153 |

Tanjung Duren tidak dipetakan karena geometri kelurahan saat ini memisahkan wilayah itu menjadi **Tanjung Duren Utara** dan **Tanjung Duren Selatan**. Data CSV memakai nama lama dan tidak memiliki kode/RW geometry yang dapat menentukan pecahannya. Nilainya tidak dianggap nol: `data/kelurahan-join-report.json` dan panel “Lihat sebagai tabel” menampilkan baris Tanjung Duren dengan keterangan “Tidak dapat dipetakan (nama lama)”.

## Lapisan kota administrasi dan label

Layer 5 menghasilkan 6 fitur: Jakarta Pusat, Jakarta Barat, Jakarta Selatan, Jakarta Timur, Jakarta Utara, dan Kep. Seribu. Lapisan ini tidak mengubah warna PSU; ia hanya menambah garis batas kota yang lebih tebal dan label nama kota. Label kota dihitung dari centroid ring terbesar setiap fitur kota, bukan koordinat yang dikarang. Tombol “Sembunyikan/Tampilkan label wilayah” mengatur visibilitas label; label otomatis disembunyikan pada tampilan Semua DKI dan layar sempit agar tidak bertumpuk. Daftar enam wilayah juga ada di panel legenda.

## Aturan PSU pada peta

PSU dihitung dengan aturan yang sama seperti dashboard:

> Ambil SATU nilai per (tahun, wilayah, kecamatan, kelurahan) memakai MAX, lalu jumlahkan. Jangan menjumlahkan PSU per baris RW.

Filter **Semua tahun** menjumlahkan nilai MAX per kelurahan dari tahun 2023–2025. Filter satu tahun hanya memakai nilai MAX kelurahan pada tahun itu. Polygon tanpa data pada filter aktif diberi warna abu putus-putus, bukan nol. Nilai nol (jika ada) akan memakai warna paling terang pada skala sekuensial.

## Keterbatasan

- Lisensi layanan tidak dinyatakan eksplisit pada metadata; penggunaan di sini untuk tugas akademik non-komersial. Atribusi tetap dicantumkan.
- Geometri disederhanakan untuk web; bukan batas resmi untuk keperluan hukum.
- 180 kelurahan tidak memiliki catatan program pada CSV, sehingga tampil abu. Ini bukan berarti PSU nol.
- Nama lama/ambiguitas administrasi menyebabkan satu kelurahan CSV tidak dapat dipetakan.
- PSU adalah jumlah peningkatan yang tercatat, bukan ukuran kebutuhan, kualitas, atau keberhasilan pembangunan.
- Peta tidak memakai basemap tile eksternal; latar netral dipakai agar dashboard tetap berjalan lokal. Pengguna dapat memakai zoom/pan Leaflet dan tombol Jakarta/Semua DKI.

## Reproduksi

```bash
cd dashboard-vis5
python3 scripts/build_geojson.py
```

Skrip mengunduh layanan resmi, menulis `data/kelurahan.geojson`, `data/kota.geojson`, dan `data/kelurahan-join-report.json`, lalu mencetak ringkasan join. Aplikasi hanya membaca file lokal ini saat runtime.
