# Desain Dashboard Overview — Level 3 Munzner dan Rules of Thumb

Wireframe aktual: `docs/wireframe/wireframe-overview.svg`.

## 1. Tujuan dan hierarki tiga zona

Overview adalah halaman default (`#overview`). Tujuannya bukan sekadar kumpulan KPI, tetapi dashboard analisis terpadu: pengguna mendapat gambaran umum, lalu dapat memfilter tahun, membuka detail, dan membaca tabel alternatif.

### Zona A — Top banner / executive scorecards

- Judul dan filter tahun.
- Lima scorecard dengan deskripsi singkat di atas angka: Catatan RW 2023–2025 308, RW unik 237, Kelurahan unik 88, RW muncul >1 tahun 61, PSU 2023–2025 516. Saat filter satu tahun dipakai, nilai dan label ikut berubah: catatan tahun itu, RW unik tahun itu, kelurahan unik tahun itu, RW berulang tahun itu, dan PSU tahun itu.
- Mode **Semua tahun** menampilkan total 2023–2025; mode satu tahun menampilkan KPI tahun tersebut. Ini menjaga angka acuan default sekaligus membuat filter terasa langsung memengaruhi ringkasan.
- Scorecard adalah teks dan angka; magnitude dibaca dari ukuran/posisi angka, identity dari label KPI.

### Zona B — Main analytical area

- **CBQ 1 — Line chart** catatan RW per tahun 2023–2025. Sumbu Y dari 0, marker di setiap titik, dan label nilai.
- **CBQ 5 — Choropleth map** PSU per kelurahan dengan polygon batas administrasi Jakarta Satu. Identitas = spatial region + label/garis batas kota; magnitude = luminance biru. Tooltip, legend, zoom, tombol Jakarta/Semua DKI, dan toggle label kota.
- Keduanya diberi lebar 6 kolom; tinggi visual dibuat seimbang. Ini adalah area paling dominan di halaman.

### Zona C — Breakdown dan komparasi

- **CBQ 2 — Grouped bar** enam wilayah × tiga tahun. Length pada baseline nol; hue tahun; label wilayah disingkat pada Overview, nama lengkap di tooltip/tabel.
- **CBQ 3 — Horizontal bar Top 10 kelurahan**. Length dan label langsung; warna batang = hue wilayah induk; filter tahun ikut mengubah peringkat dan legenda wilayah yang muncul.
- **CBQ 4 — Multi-series line** kelurahan unik dan RW baru per tahun; marker berbeda; penjelasan RW baru vs berulang.
- Setiap panel punya “Lihat Detail” ke halaman CBQ terkait, tooltip, dan “Lihat sebagai tabel”.

## 2. Pemetaan KPI ke idiom visual

| Bagian | KPI / data | Idiom | Alasan | Alternatif yang ditolak |
|---|---|---|---|---|
| Atas | 308, 237, 88, 61, 516 | Scorecard | Ringkasan satu nilai, cepat dibaca | Gauge: tidak ada target |
| Tengah kiri | Catatan RW per tahun | Line chart | Position menunjukkan perubahan waktu | Pie: tidak menunjukkan tren |
| Tengah kanan | PSU per kelurahan | Choropleth polygon + garis/label kota | Spatial region + luminance menunjukkan pola lokasi; label kota memperjelas wilayah | Tile-grid: tidak merepresentasikan batas kelurahan |
| Bawah kiri | Catatan RW wilayah × tahun | Grouped bar | Length pada baseline nol akurat untuk enam kategori | Line: wilayah kategorikal tak berurutan |
| Bawah tengah | Top 10 kelurahan | Horizontal bar | Length dan label memudahkan peringkat; hue wilayah induk menambah identitas | Treemap: area lebih sulit dibandingkan |
| Bawah kanan | Kelurahan unik dan RW baru | Multi-series line | Position + marker untuk dua seri waktu | Stacked bar: fokus perubahan, bukan komposisi |

## 3. Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Scorecard | Teks/angka | Ukuran dan posisi angka | Label KPI |
| Line CBQ 1 | Garis + titik | Posisi vertikal | Posisi horizontal tahun; marker |
| Choropleth CBQ 5 | Polygon kelurahan + garis batas kota | Luminance biru | Spatial region; label kota; tooltip wilayah/kecamatan/kelurahan |
| Grouped bar CBQ 2 | Batang vertikal | Length + posisi dari baseline 0 | Hue tahun; posisi horizontal wilayah |
| Top 10 CBQ 3 | Batang horizontal | Length | Posisi peringkat, label kelurahan, dan hue wilayah induk |
| Multi-line CBQ 4 | Garis + titik | Posisi vertikal | Hue dan bentuk marker |

## 4. No unjustified 3D

Semua elemen 2D: line chart, batang, polygon Leaflet, dan heatmap. Tidak ada perspektif, bayangan 3D, atau efek kedalaman yang tidak menambah informasi.

## 4b. Kebijakan warna dan pie/donut

- CBQ 1 memakai hue tahun kontras biru-hijau-kuning; CBQ 2 memakai biru berurutan `#9DBAD5`/`#4F7FAE`/`#1F4E79`.
- Choropleth memakai satu hue biru sekuensial untuk PSU; polygon abu putus-putus menandakan data tidak tersedia, bukan nol.
- Amber `#B7791F` hanya untuk catatan kualitas data; tidak ada merah/hijau untuk menilai kinerja karena PSU bukan ukuran kebutuhan atau keberhasilan.
- Pie/donut tidak dipakai karena sudut dan area kurang akurat dibandingkan posisi, panjang, dan luminance.

## 5. Eyes beat memory

- KPI berada di atas; dua visual utama berdampingan; tiga breakdown di bawah.
- Warna dan urutan wilayah konsisten antara grouped bar dan tabel.
- Label/tooltip memberi angka eksak tanpa mengharuskan pengguna mengingat nilai dari halaman lain.
- Peta dan bar PSU/RW memakai skala/urutan yang konsisten; detail ada di satu halaman.

## 6. Shneiderman's mantra

**Overview First**
- Overview adalah halaman default dan memuat kelima CBQ.
- Pengguna tidak perlu membuka halaman detail untuk mendapatkan gambaran umum.

**Zoom & Filter**
- Filter tahun [Semua tahun | 2023 | 2024 | 2025] menyorot tahun pada CBQ 1/CBQ 2/CBQ 4, memfilter Top 10 CBQ 3, dan memperbarui choropleth PSU.
- Filter wilayah tersedia di halaman detail CBQ 2, CBQ 3, dan CBQ 4. Filter wilayah global sengaja tidak dipasang di Overview karena akan menghilangkan perbandingan enam wilayah dan mengubah makna KPI eksekutif; keputusan ini didokumentasikan agar tidak dianggap kelalaian.
- Peta punya zoom/pan Leaflet dan tombol Jakarta/Semua DKI. Label kota otomatis disembunyikan pada Semua DKI dan layar sempit agar tidak bertumpuk; tombol label dapat menampilkannya kembali.

**Details on Demand**
- Tooltip pada semua chart dan polygon.
- Tombol “Lihat sebagai tabel” pada setiap visual, termasuk tabel 88 baris untuk choropleth.
- Tautan “Lihat Detail” ke halaman CBQ yang lengkap.

## 7. Checklist kesesuaian tugas

- [x] Overview adalah halaman default dan tab pertama.
- [x] Lima halaman CBQ lama tetap berfungsi.
- [x] KPI Overview cocok dengan data: 308, 237, 88, 61, 516.
- [x] CBQ 1 line chart dengan 91/98/119 dan sumbu Y dari 0.
- [x] CBQ 5 memakai choropleth polygon kelurahan, bukan tile-grid.
- [x] GeoJSON resmi Jakarta Satu disimpan lokal (`data/kelurahan.geojson`).
- [x] PSU memakai MAX per kelurahan per tahun, lalu dijumlahkan.
- [x] Filter tahun memperbarui warna/nilai polygon dan panel terkait.
- [x] Tooltip polygon memuat wilayah, kecamatan, kelurahan, dan PSU.
- [x] Garis batas kota dan label enam kota administrasi tersedia; label dapat disembunyikan.
- [x] Wilayah tanpa data ditampilkan abu putus-putus, bukan nol.
- [x] Join spasial tervalidasi: 267 fitur; 87 matched; 1 unmatched (Tanjung Duren); 180 tanpa data.
- [x] Tidak ada duplikasi PSU saat join (87 kunci unik; 513 PSU terpetakan).
- [x] Responsif desktop/mobile.
- [x] Tidak ada error JavaScript pada pengujian browser.
- [x] `node tests/kpi.test.js` lulus 46/46.
- [x] Dokumentasi sumber spasial dan keputusan desain tersedia.

## 8. Keputusan desain yang diambil

1. KPI eksekutif mengikuti filter tahun. Mode Semua tahun menampilkan angka acuan 308/237/88/61/516; mode satu tahun menampilkan KPI tahun itu (termasuk RW berulang tahun tersebut).
2. Filter tahun global dipakai; filter wilayah global tidak, dengan alasan konsistensi perbandingan dan KPI. Detail wilayah ada di halaman CBQ.
3. Peta default menampilkan Jakarta mainland agar padat; tombol “Semua DKI” menampilkan Kepulauan Seribu dan otomatis menyembunyikan label kota yang akan bertumpuk; label juga default tersembunyi pada layar sempit.
4. Peta memakai latar netral tanpa basemap tile eksternal agar tetap lokal dan andal; geometri tetap batas resmi.
5. Tanjung Duren tidak dipetakan karena nama lama; nilainya 3 PSU 2024 ditampilkan di catatan kualitas dan tabel, bukan nol.
6. CBQ 2 pada Overview memakai label wilayah singkat agar tidak padat; nama lengkap ada di tooltip/tabel.
7. Peta CBQ 5 memakai layout map + panel legenda/catatan agar proporsi visual lebih baik.
