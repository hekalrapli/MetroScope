# Peningkatan Kawasan dan Fasilitas Permukiman DKI Jakarta 2023–2025

Dashboard statis untuk tugas Visualisasi Data (Munzner Level 3: idiom visual dan visual encoding). Satu halaman **Overview** sebagai dashboard default dan lima halaman analisis CBQ 1–CBQ 5, tanpa framework dan tanpa build step aplikasi. Library chart: Apache ECharts 5.5.1 (CDN), Leaflet 1.9.4 (CDN) untuk choropleth, dan PapaParse 5.4.1 (CDN) untuk CSV.

## Cara menjalankan

Jalankan dari folder ini, bukan dengan membuka `index.html` langsung (`file://` akan memblokir `fetch` CSV dan ES module):

```bash
cd dashboard-vis5
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Halaman default adalah `#overview`; navigasi memakai hash `#overview` dan `#cbq1` … `#cbq5`. GeoJSON sudah tersedia secara lokal. Untuk meregenerasi data spasial dari layanan resmi:

```bash
python3 scripts/build_geojson.py
```

Tes angka acuan:

```bash
node tests/kpi.test.js
# atau
npm test
```

Butuh Node.js 18+ (untuk `node --check` dan import ES module). Hasil saat ini: **46/46 checks passed**.

## Struktur folder

```text
dashboard-vis5/
├── index.html                 # shell: header, tab CBQ, footer, panel Tentang data
├── css/style.css              # tema, grid 12 kolom, komponen, responsif <900px
├── js/
│   ├── data.js                # load CSV + konstanta + semua fungsi KPI + PSU_RULE
│   ├── router.js              # routing hash, error handling, toggle tabel, cleanup map
│   ├── charts.js              # tema ECharts, skala warna, pola hatch, helper chart
│   ├── choropleth.js          # Leaflet, GeoJSON kelurahan, join PSU, legend, cleanup
│   ├── ui.js                  # helper DOM, scorecard, panel, tabel
│   └── pages/overview.js, cbq1.js … cbq5.js
├── data/
│   ├── peningkatan-kawasan-fasilitas-permukiman-dki-jakarta-2023-2025_v1.csv  # 308 baris
│   ├── kelurahan.geojson      # 267 polygon/multipolygon kelurahan DKI
│   ├── kota.geojson           # 6 batas kota administrasi DKI
│   └── kelurahan-join-report.json
├── scripts/build_geojson.py   # unduh + validasi + konversi GeoJSON (data prep)
├── docs/
│   ├── wireframe/             # wireframe Overview + CBQ 1–5
│   ├── overview-design.md     # desain tiga zona, Munzner, rules of thumb
│   ├── design-notes.md        # catatan desain per halaman (dipindah dari UI)
│   └── spatial-data-source.md # sumber, lisensi, join, keterbatasan geometri
├── screenshots/               # screenshot halaman dan wireframe
├── tests/kpi.test.js
├── package.json               # hanya untuk type=module dan npm test
└── README.md
```

## Data dan definisi KPI

Satu baris CSV = **satu catatan RW pada satu tahun**, bukan satu RW unik. Identitas RW adalah gabungan `wilayah|kecamatan|kelurahan|rw`, karena nomor RW yang sama dapat muncul di kelurahan berbeda.

| KPI | Definisi |
|---|---|
| Catatan RW per tahun | Jumlah baris pada tahun tersebut: 2023 = 91, 2024 = 98, 2025 = 119; total 308. |
| Perubahan 2023–2025 | `(119 − 91) / 91 × 100 = +30,8%`. |
| Kelurahan unik | Jumlah kunci `wilayah|kecamatan|kelurahan` yang berbeda. Total 88; per tahun 28 / 38 / 49. |
| RW unik | Jumlah kunci `wilayah|kecamatan|kelurahan|rw` yang berbeda. Total 237. |
| RW muncul di >1 tahun (unik) | RW unik yang muncul pada lebih dari satu tahun: 61. |
| Matriks wilayah × tahun | 2023/2024/2025: Jakarta Barat 19/19/16; Jakarta Pusat 19/12/10; Jakarta Selatan 7/12/20; Jakarta Timur —/11/39; Jakarta Utara 41/40/28; Kep. Seribu 5/4/6. |
| Top kelurahan | Urut menurun, tie diurutkan alfabetis: Kalibaru 22, Penjaringan 21, Cipete Utara 10, Koja 10. |
| RW baru vs RW berulang per tahun | Per tahun: RW baru = belum tercatat pada tahun sebelumnya; RW berulang per tahun = sudah tercatat. Hasil 2023: 91/0; 2024: 68/30; 2025: 78/41. |
| Kelurahan tersentuh | Jumlah kelurahan berbeda pada filter aktif (tanpa filter = 88). |

Catatan penting untuk CBQ 4: KPI **61** adalah jumlah RW unik yang muncul di lebih dari satu tahun. Angka segmen **RW berulang per tahun 30 (2024) + 41 (2025) = 71 kejadian**, bukan 61 RW unik. Penjelasan ini juga ditampilkan di halaman.

### Aturan PSU

`PSU_RULE` disimpan sebagai konstanta di `js/data.js`:

> PSU dihitung dari SATU nilai per (tahun, wilayah, kecamatan, kelurahan) memakai MAX, lalu dijumlahkan. Nilai PSU tidak boleh dijumlahkan per baris RW karena pencatatannya agregat per kelurahan.

Hasil dedup: PSU 2023 = 135, 2024 = 228, 2025 = 153; total 2023–2025 = **516**. Jumlah naif seluruh baris adalah 1.234 dan **tidak dipakai**. Aturan ini menjadi catatan kaki di halaman CBQ 5 dan dijelaskan di panel data alternatif.

## Halaman dan idiom utama

| Halaman | Pertanyaan | Zona tengah | Zona bawah |
|---|---|---|---|
| Overview | Ringkasan terpadu lima CBQ | Scorecard, line CBQ 1, choropleth PSU CBQ 5 | Grouped bar CBQ 2, Top 10 CBQ 3 (warna wilayah induk), line CBQ 4 |
| CBQ 1 | Perkembangan jumlah RW yang tercatat menerima peningkatan | Line chart catatan RW per tahun | Grouped bar catatan per wilayah × tahun |
| CBQ 2 | Perbandingan catatan RW antarwilayah | Grouped bar vertikal wilayah × tahun, lebar penuh | Tabel peringkat wilayah |
| CBQ 3 | Kecamatan/kelurahan dengan catatan tertinggi | Top 10 horizontal bar (kelurahan/kecamatan), lebar penuh | Tabel detail RW saat batang diklik |
| CBQ 4 | Perubahan cakupan geografis | Line chart dua seri: kelurahan unik dan RW baru | Stacked bar RW baru vs RW berulang per tahun + tabel RW muncul >1 tahun dengan pencarian |
| CBQ 5 | Persebaran jumlah peningkatan PSU | **Choropleth polygon kelurahan DKI**, toggle tahun | Bar PSU dan heatmap wilayah × tahun |

Dokumentasi desain Overview, pemetaan idiom, marks/channels, serta rules of thumb ada di `docs/overview-design.md`. Sumber geometri, lisensi, dan validasi join ada di `docs/spatial-data-source.md`.

Justifikasi CBQ 3: data tidak memiliki koordinat kelurahan, sehingga Top 10 horizontal bar menjadi visual utama (Locate pada level kelurahan). Filter wilayah tersedia di bagian atas halaman, jadi tidak perlu peta filter tambahan. Justifikasi ini juga ada di `docs/design-notes.md`.

## Filter dan interaksi

- **CBQ 1**: filter wilayah. Angka, judul jawaban, line chart, dan bar bawah dihitung ulang.
- **Overview**: halaman default. Segmented control [Semua tahun | 2023 | 2024 | 2025] menyorot tahun pada CBQ 1/CBQ 2/CBQ 4, memfilter Top 10 CBQ 3, dan memperbarui choropleth PSU. Scorecard mengikuti filter tahun; mode Semua tahun memakai total 2023–2025. Setiap panel punya tautan “Lihat Detail”.
- **CBQ 2**: segmented control [Semua tahun | 2023 | 2024 | 2025], default **Semua tahun**. Mode semua tahun menampilkan ketiga hue penuh, skor total 2023–2025, urutan wilayah berdasarkan total, dan tabel dengan rincian per tahun; mode satu tahun menyorot satu hue, mengurutkan wilayah menurut tahun itu, dan menampilkan selisih vs tahun sebelumnya. Klik batang atau baris tabel untuk menyorot wilayah; klik lagi untuk melepas. State filter tercermin di hash, misalnya `#cbq2?tahun=semua` atau `#cbq2?tahun=2025`.
- **CBQ 3**: filter tahun dan wilayah di bagian atas. Toggle Kelurahan/Kecamatan. Klik batang untuk membuka rincian RW.
- **CBQ 4**: filter wilayah. Status baru/berulang dihitung ulang di dalam wilayah terpilih. Tabel RW muncul >1 tahun punya pencarian.
- **CBQ 5**: filter tahun (default semua tahun). Choropleth polygon kelurahan, bar PSU, dan outline kolom heatmap mengikuti pilihan. Tombol Jakarta/Semua DKI mengatur fokus peta; tooltip memuat wilayah, kecamatan, kelurahan, dan PSU.
- Semua chart ECharts memiliki `aria-label` dan tombol **Lihat sebagai tabel**. Peta/heatmap juga punya tabel alternatif. Tooltip menampilkan nilai eksak dan definisi singkat. Fokus keyboard memakai outline 2px.

## Kualitas data dan keterbatasan

- **Jakarta Timur 2023 tidak tersedia.** Semua halaman menandainya dengan pola/hatch amber atau teks “tidak tersedia”; tidak ada nilai 0 yang digambar. Pada total 2023, Jakarta Timur tidak ikut dijumlahkan.
- Data hanya memuat RW yang tercatat menerima peningkatan pada periode ini. Kenaikan 2025 kemungkinan mencerminkan perluasan pencatatan.
- Jumlah catatan rendah **bukan** ukuran kinerja buruk karena data tidak memuat total RW kumuh per wilayah.
- PSU adalah nilai agregat per kelurahan. Nilai PSU yang sama muncul pada beberapa RW di kelurahan yang sama; nilai itu tidak boleh dijumlahkan per RW dan tidak ada rata-rata PSU per RW.
- CBQ 5 dan Overview memakai choropleth polygon kelurahan dari layanan resmi Jakarta Satu (Pemprov DKI Jakarta), diakses 15 November 2026, dengan simplifikasi server-side 0.00005 derajat. Lapisan batas kota administrasi (6 fitur) dan label kota dipakai untuk identitas wilayah; geometri bukan untuk keputusan hukum.
- Detail sumber, lisensi, query, dan validasi join ada di `docs/spatial-data-source.md`. GeoJSON lokal berisi 267 kelurahan (256 Polygon, 11 MultiPolygon). Dari 88 kelurahan unik pada CSV, 87 berhasil di-join; Tanjung Duren (nama lama, kini Tanjung Duren Utara/Selatan) tidak dapat dipetakan dan PSU 2024 = 3 ditampilkan di catatan kualitas data, bukan sebagai nol. 180 polygon tidak memiliki catatan program dan ditampilkan abu putus-putus.
- PSU yang berhasil dipetakan berjumlah 513 dari 516 pada seluruh tahun (2024: 225 dari 228); selisih 3 adalah Tanjung Duren. Nilai peta tidak boleh dianggap sebagai total lengkap tanpa membaca catatan kualitas data.
- Karena Jakarta Timur 2023 kosong, RW Jakarta Timur 2024 tampak semuanya baru. Catatan amber ini ditampilkan di CBQ 4.
- Tidak ada paket atau file Zenodo yang dibuat; pengemasan Zenodo dilakukan manual oleh pengguna.

## Kepatuhan rules of thumb

Keterangan lengkap per halaman ada di **`docs/design-notes.md`** (panel Catatan desain sudah dihapus dari UI). Ringkasannya:

| Halaman | No unjustified 3D | Eyes beat memory | Shneiderman |
|---|---|---|---|
| Overview | Sesuai — semua 2D | Sesuai — KPI di atas, visual utama berdampingan, label/tooltip eksak | Sesuai — Overview First (default), filter tahun, tooltip/tabel/tautan detail |
| CBQ 1 | Sesuai — line dan batang 2D | Sesuai — label langsung di titik/ujung batang, hue tahun dipakai ulang | Sesuai — scorecard + line (overview), filter wilayah, tooltip/tabel (detail) |
| CBQ 2 | Sesuai — batang 2D | Sesuai — label nilai langsung di batang dan angka eksak di tabel; urutan wilayah sama | Sesuai — scorecard + grouped bar, filter tahun, klik batang/baris untuk sorotan |
| CBQ 3 | Sesuai — batang horizontal 2D | Sesuai — Top 10 berlabel langsung, legenda wilayah dekat data | Sesuai — scorecard + Top 10, filter tahun/wilayah di atas, detail RW saat batang diklik |
| CBQ 4 | Sesuai — garis dan batang 2D | Sesuai — dua seri diberi marker dan hue berbeda; segmen stacked berlabel angka | Sesuai — scorecard + line, filter wilayah, tabel RW muncul >1 tahun dengan pencarian |
| CBQ 5 | Sesuai — choropleth, heatmap, dan batang 2D | Sesuai — bar PSU dan heatmap memakai urutan wilayah yang konsisten | Sesuai — scorecard + choropleth, filter tahun, tooltip/tabel alternatif |

Kebijakan warna: CBQ 1 memakai hue tahun kontras biru-hijau-kuning, sedangkan CBQ 2 memakai biru berurutan `#9DBAD5` / `#4F7FAE` / `#1F4E79`; choropleth CBQ 5/Overview memakai satu hue biru sekuensial dengan polygon abu putus-putus untuk data kosong; wilayah memakai enam hue kategorikal yang aman buta warna hanya di CBQ 3; RW baru `#4F7FAE` dan berulang `#D4812A` di CBQ 4; **amber `#B7791F` khusus penanda kualitas data**. Hijau dipakai sebagai identitas tahun 2024, bukan penilaian kinerja; tidak ada merah/hijau untuk menilai kinerja wilayah karena data tidak memuat total RW kumuh. Pie/donut tidak dipakai karena sudut dan area kurang akurat dibandingkan posisi dan panjang.

## Angka acuan dan hasil tes

| Pemeriksaan | Nilai |
|---|---|
| Baris data | 308 |
| Catatan per tahun | 91 / 98 / 119 |
| Perubahan 2023–2025 | +30,8% |
| Kelurahan unik total / per tahun | 88 / 28, 38, 49 |
| RW unik total | 237 |
| RW di lebih dari satu tahun | 61 |
| Matriks wilayah × tahun | 19/19/16; 19/12/10; 7/12/20; —/11/39; 41/40/28; 5/4/6 |
| Top kelurahan | Kalibaru 22, Penjaringan 21, Cipete Utara 10, Koja 10 |
| PSU per tahun | 135 / 228 / 153 |
| Total PSU 2023–2025 | 516 |
| PSU naif per baris (tidak dipakai) | 1.234 |
| RW baru / berulang per tahun | 91/0; 68/30; 78/41 |
| Total per wilayah 2023–2025 | Barat 54; Pusat 41; Selatan 39; Timur 50; Utara 109; Kep. Seribu 15 (jumlah 308) |
| Urutan peringkat semua tahun | Utara, Barat, Timur, Pusat, Selatan, Kep. Seribu |
| GeoJSON kelurahan | 267 fitur; 256 Polygon, 11 MultiPolygon; 267 kode unik |
| GeoJSON kota administrasi | 6 fitur; 3 Polygon, 3 MultiPolygon; 6 kode unik |
| Join spasial | 88 kelurahan CSV; 87 matched; 1 unmatched (Tanjung Duren); 180 polygon tanpa data |
| PSU terpetakan | 513 dari 516 (2023: 135; 2024: 225; 2025: 153); 3 di luar peta |

Hasil tes: **46/46 checks passed** (`node tests/kpi.test.js`).

## Keputusan implementasi

- Overview adalah halaman default. Tahun default CBQ 2, CBQ 3, dan CBQ 5 adalah **Semua tahun**.
- Filter wilayah CBQ 4 menghitung ulang status baru/berulang di dalam wilayah terpilih, sehingga definisi tetap konsisten dengan filter.
- Varian “data tidak tersedia” tidak pernah digambar sebagai nol. Pada grouped bar dipakai hatch amber; pada choropleth dipakai polygon abu putus-putus; pada heatmap dipakai sel amber; semuanya disertai tooltip/tabel.
- CBQ 1 memakai palet tahun biru `#5470C6`, hijau `#91CC75`, dan kuning `#FAC858` atas permintaan pengguna agar tiap tahun kontras. CBQ 2 memakai biru berurutan `#9DBAD5`, `#4F7FAE`, `#1F4E79` sesuai revisi CBQ 2. Magnitude tetap dibaca dari panjang/posisi, bukan dari warna.
- Router mendukung query setelah hash. CBQ 2 membaca/menulis `tahun=semua|2023|2024|2025` memakai `history.replaceState`, sehingga tautan dapat dibagikan tanpa memicu render ulang. Perubahan filter CBQ 2 memakai transisi chart 120ms.
- Choropleth memakai GeoJSON lokal (kelurahan dan kota); tidak ada permintaan GeoJSON eksternal saat runtime. Leaflet tetap dimuat dari CDN seperti ECharts/PapaParse. Peta default menampilkan Jakarta mainland; tombol Semua DKI menampilkan kepulauan. Label kota dan garis batas kota memberi identitas wilayah tanpa mengubah warna PSU; label otomatis disembunyikan pada tampilan Semua DKI/layar sempit agar tidak bertumpuk.
- Filter wilayah global tidak dipasang di Overview karena akan menghilangkan perbandingan enam wilayah dan mengubah makna perbandingan antarwilayah; filter wilayah tersedia di halaman detail CBQ 2, CBQ 3, dan CBQ 4.
- Peta/tile-grid/heatmap dihapus sepenuhnya dari CBQ 2. Idiom CBQ 2 hanya grouped bar + tabel peringkat; helper peta tetap dipertahankan untuk CBQ 5 dan Overview.
- Untuk CBQ 4, seri “kelurahan unik” memakai charcoal gelap `#1F2933` dan seri “RW baru” memakai biru `#4F7FAE`; kontras luminansi lebih kuat, ditambah bentuk marker (lingkaran vs belah ketupat) sebagai identity channel. Ini menghindari pemakaian hue wilayah di luar CBQ 3.
- Angka pada sel stacked bar dan sel heatmap diberi latar putih kecil agar kontras teks tetap memenuhi 4,5:1 pada warna segmen/sel.
- Heatmap CBQ 5 dan legenda choropleth memakai HTML/CSS grid; choropleth CBQ 5/Overview memakai Leaflet 1.9.4. Lapisan batas kota dan label kota berasal dari layer resmi yang sama; label dapat disembunyikan. Chart lain memakai ECharts. Tidak ada klaim geometri batas wilayah.
- Wireframe low-fidelity berada di `docs/wireframe/` dan memakai abu-abu tanpa warna data, sesuai urutan kerja (data + tes → wireframe → kerangka → halaman → catatan desain di dokumentasi).
