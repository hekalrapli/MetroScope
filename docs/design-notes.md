# Catatan Desain per Halaman

Dokumen ini menggantikan panel **Catatan desain** yang sebelumnya ditampilkan di setiap halaman. Panel tersebut sudah dihapus dari UI Overview dan CBQ 1–5; isi desainnya dipindahkan ke dokumen ini agar dashboard tetap ringkas.

Dokumen terkait:
- `docs/overview-design.md` — desain tiga zona Overview.
- `docs/spatial-data-source.md` — sumber geometri, lisensi, dan validasi join choropleth.

## 1. Overview

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| KPI eksekutif (mengikuti filter tahun) | Scorecard angka | Ringkasan satu nilai per KPI untuk gambaran umum dalam beberapa detik. | Gauge: membutuhkan target yang tidak ada dalam data. |
| Tren catatan RW (CBQ 1) | Line chart | Position pada sumbu Y menunjukkan perubahan tahunan; marker dan label menjaga nilai eksak. | Pie/donut: tidak dapat menunjukkan perubahan sepanjang waktu. |
| Persebaran PSU (CBQ 5) | Choropleth polygon kelurahan + garis batas & label kota | Spatial region membawa identitas lokasi, luminance membawa magnitude PSU, dan garis/label kota memperjelas wilayah administrasi; geometri berasal dari Jakarta Satu. | Tile-grid: tidak merepresentasikan bentuk dan batas kelurahan yang sebenarnya. |
| Perbandingan wilayah (CBQ 2) | Grouped bar vertikal | Length pada baseline nol paling akurat untuk membandingkan enam wilayah; hue tahun membedakan periode. | Line chart: wilayah adalah kategori tak berurutan sehingga garis menyiratkan tren yang tidak ada. |
| Konsentrasi lokasi (CBQ 3) | Horizontal bar Top 10 | Length dan label langsung memudahkan peringkat kelurahan; hue wilayah induk menambah identitas. | Treemap: area lebih sulit dibandingkan untuk peringkat sederhana. |
| Cakupan geografis (CBQ 4) | Multi-series line chart | Position menunjukkan perubahan kelurahan unik dan RW baru; marker membedakan seri. | Stacked bar: fokus halaman ini adalah perubahan antar tahun, bukan komposisi. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Scorecard | Teks dan angka | Ukuran angka dan posisi | Label KPI |
| Line CBQ 1 dan CBQ 4 | Garis + titik | Posisi vertikal | Hue dan bentuk marker; sumbu X tahun |
| Choropleth CBQ 5 | Polygon kelurahan + garis batas kota | Luminance biru | Spatial region; label kota; tooltip wilayah/kecamatan/kelurahan |
| Grouped bar CBQ 2 | Batang vertikal | Length dan position dari baseline 0 | Hue tahun; posisi horizontal wilayah |
| Horizontal bar CBQ 3 | Batang horizontal | Length | Posisi peringkat, label kelurahan, dan hue wilayah induk |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Semua chart dan polygon 2D; tidak ada perspektif atau bayangan 3D. |
| Eyes beat memory | Sesuai | KPI dan tren berada di atas; visual utama berdampingan; label dan tooltip memberi nilai eksak; urutan wilayah konsisten pada grouped bar. |
| Shneiderman | Sesuai | Overview First: halaman default menampilkan KPI dan lima CBQ. Zoom & Filter: filter tahun menyorot tren dan memperbarui choropleth. Details on Demand: tooltip, tabel alternatif, dan tautan Lihat Detail. |

**Shape sebagai identity channel.** Marker lingkaran dan belah ketupat membedakan seri CBQ 4; hue dan opacity menyorot tahun pada CBQ 1/CBQ 2/CBQ 4; pada choropleth, garis tebal dan label kota menandai wilayah administrasi, sedangkan abu menandakan data tidak tersedia, bukan nol.

**Kebijakan warna.** Choropleth memakai satu hue biru sekuensial untuk PSU; tahun pada CBQ 2 memakai biru berurutan; CBQ 1/CBQ 4 memakai warna seri yang konsisten dengan halaman detail. Amber hanya untuk catatan kualitas data; tidak ada merah/hijau untuk menilai kinerja.

**Mengapa bukan pie/donut.** Pie/donut tidak dipakai karena sudut dan area kurang akurat dibandingkan posisi, panjang, dan luminance untuk perbandingan serta pola spasial.

## 2. CBQ 1 — Tren tahunan

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Tren jumlah catatan RW per tahun | Line chart dengan titik dan label langsung | Perubahan sepanjang waktu paling mudah dibaca lewat posisi vertikal yang berurutan. | Grouped bar: menekankan kategori diskret, bukan kontinuitas tahun. |
| Total, nilai 2025, dan delta terhadap 2023 | Scorecard angka 24px + panah naik/turun | Ringkasan satu nilai per KPI; panah memberi identitas arah perubahan tanpa warna penilaian. | Gauge: membutuhkan target yang tidak ada dalam data. |
| Perbandingan catatan antarwilayah per tahun | Grouped horizontal bar dengan hue tahun | Panjang batang akurat untuk perbandingan dan tahun diletakkan berdampingan. | Stacked bar: total dan komposisi tahun sulit dibandingkan sekaligus. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Line chart tren | Garis + titik | Posisi vertikal (jumlah catatan) | Posisi horizontal (tahun); bentuk titik lingkaran |
| Grouped bar wilayah | Batang horizontal | Panjang batang | Hue tahun; posisi vertikal wilayah |
| Scorecard | Angka + teks | Nilai angka (bukan panjang) | Bentuk panah ▲/▼ untuk arah delta |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Line chart dan batang digambar 2D tanpa perspektif atau kedalaman semu. |
| Eyes beat memory | Sesuai | Label nilai langsung di titik dan ujung batang; hue tahun yang sama dipakai ulang tanpa perlu menghafal legenda jauh. |
| Shneiderman | Sesuai | Overview ada di scorecard dan line chart; filter wilayah menjadi zoom/filter; tooltip dan tombol Lihat sebagai tabel memberi detail saat diminta. |

**Shape sebagai identity channel.** Titik lingkaran menandai nilai tahun pada garis. Panah ▲/▼ pada scorecard adalah identity channel tambahan untuk arah delta, bukan penilaian merah/hijau.

**Kebijakan warna.** Tahun memakai hue kategorikal kontras biru-hijau-kuning agar tiap tahun mudah dibedakan. Amber `#B7791F` tetap khusus penanda kualitas data (misalnya sel data tidak tersedia). Hijau di sini adalah identitas tahun 2024, bukan penilaian kinerja; tidak ada merah/hijau untuk menilai kinerja wilayah karena data tidak memuat total RW kumuh.

**Mengapa bukan pie/donut.** Pie/donut tidak dipakai: sudut dan luas lebih sulit dibandingkan daripada posisi dan panjang, terutama untuk membandingkan beberapa kategori dan tahun.

## 3. CBQ 2 — Perbandingan antarwilayah

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Perbandingan wilayah × tahun | Grouped bar vertikal | Panjang batang pada baseline nol paling akurat untuk membandingkan enam kategori; posisi batang menjaga urutan wilayah. | Line chart: wilayah adalah kategori tak berurutan sehingga garis menyiratkan tren yang tidak ada. Peta juga tidak dipakai karena pertanyaan ini membandingkan enam kategori, bukan mencari pola spasial; panjang batang pada baseline nol lebih akurat. |
| Peringkat dan kontribusi | Tabel peringkat | Angka eksak dan urutan dibutuhkan setelah perbandingan visual. | Pie/donut: sudut dan area kurang akurat untuk perbandingan kontribusi. |
| Ringkasan filter | Scorecard angka | Ringkasan satu nilai untuk wilayah tertinggi, terendah, dan total pada filter aktif. | Gauge: membutuhkan target yang tidak ada dalam data. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Grouped bar | Batang vertikal | Posisi dan panjang batang dari baseline nol | Hue tahun; posisi horizontal wilayah; opacity untuk sorotan; hatch amber untuk data kosong |
| Tabel peringkat | Baris dan kolom | Angka eksak | Nama wilayah dan posisi baris |
| Scorecard | Angka + teks | Nilai angka | Bentuk panah ▲/▼ untuk arah delta |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Batang 2D; tidak ada perspektif atau bayangan 3D. |
| Eyes beat memory | Sesuai | Nilai diberi label langsung di atas batang; tabel memakai angka eksak dengan urutan yang sama; tidak perlu menghafal legenda jauh. |
| Shneiderman | Sesuai | Overview di scorecard dan grouped bar; filter tahun memilih hue yang disorot; klik batang/baris dan tabel memberi detail saat diminta. |

**Shape sebagai identity channel.** Pada mode per tahun, tahun terpilih disorot lewat opacity; pada mode semua tahun ketiga hue ditampilkan penuh. Panah ▲/▼ pada delta scorecard dan tabel adalah identity channel tambahan untuk arah perubahan. Hatch amber adalah penanda kualitas data.

**Kebijakan warna.** Tahun memakai hue biru berurutan: 2023 `#9DBAD5`, 2024 `#4F7FAE`, 2025 `#1F4E79`. Amber `#B7791F` hanya untuk data tidak tersedia. Tidak ada merah/hijau untuk menilai kinerja wilayah karena data tidak memuat total RW kumuh.

**Mengapa bukan pie/donut.** Pie/donut tidak dipakai karena sudut dan area lebih sulit dibandingkan daripada panjang batang dan posisi; kontribusi tetap ditampilkan sebagai angka persentase di tabel.

## 4. CBQ 3 — Konsentrasi lokasi

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Konsentrasi kelurahan/kecamatan | Top 10 horizontal bar | Panjang batang akurat untuk peringkat dan label langsung menghindari beban memori. | Treemap: area lebih sulit dibandingkan dan hierarki tidak dibutuhkan untuk Top 10. |
| Identitas wilayah induk | Hue kategorikal pada batang | Warna wilayah yang aman buta warna membawa identitas induk tanpa mengubah panjang batang. | Pie/donut: sudut dan area tidak akurat untuk perbandingan; tidak ada bagian-dari-keseluruhan yang perlu ditonjolkan. |
| Rincian RW | Tabel on-demand setelah klik batang | Detail eksak baru diminta setelah pengguna memilih kelurahan/kecamatan. | Menampilkan seluruh 308 baris sekaligus: mengganggu overview dan memperlambat pembacaan. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Top 10 bar | Batang horizontal | Panjang batang | Hue wilayah induk; posisi vertikal peringkat; label nama |
| Tabel detail | Baris dan kolom | Angka eksak | Nama RW, tahun, dan kelurahan |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Batang horizontal 2D; tidak ada perspektif atau efek kedalaman. |
| Eyes beat memory | Sesuai | Top 10 diurutkan menurun dengan label nilai langsung; legenda wilayah berada dekat batang; tabel detail memakai angka eksak. |
| Shneiderman | Sesuai | Overview di scorecard dan Top 10; filter tahun/wilayah di bagian atas menjadi zoom/filter; detail RW muncul saat batang diklik. |

**Shape sebagai identity channel.** Hue wilayah adalah identity channel utama di halaman ini. Tidak ada delta pada halaman ini sehingga panah naik/turun tidak dipaksakan.

**Kebijakan warna.** Enam hue wilayah yang aman buta warna menandai wilayah induk batang. Amber hanya menandai data tidak tersedia. Tidak ada merah/hijau untuk menilai kinerja karena data tidak memuat total RW kumuh.

**Mengapa bukan pie/donut.** Pie/donut ditolak karena angle dan area kurang akurat dibandingkan panjang batang; selain itu halaman ini membutuhkan peringkat, bukan komposisi bagian-dari-keseluruhan.

## 5. CBQ 4 — Perubahan cakupan geografis

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Perubahan cakupan kelurahan dan RW baru | Line chart dua seri dengan marker berbeda | Dua besaran waktu dibandingkan pada skala yang sama; posisi vertikal menunjukkan perubahan tiap tahun. | Dual-axis chart: dua sumbu Y mudah disalahartikan dan tidak diperlukan karena skala masih sebanding. |
| Komposisi RW baru vs RW berulang per tahun | Stacked bar per tahun | Bagian-dari-keseluruhan per tahun lebih jelas dengan batang bertumpuk dan label langsung di segmen. | Line chart untuk komposisi: tidak menunjukkan bagian-dari-keseluruhan. |
| RW muncul >1 tahun | Tabel dengan pencarian | Daftar eksak dan pencarian dibutuhkan setelah pola cakupan terlihat. | Menampilkan semua RW sebagai grafik: tidak menjawab pertanyaan detail dan memenuhi layar. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Line chart cakupan | Garis + titik | Posisi vertikal | Bentuk marker (lingkaran vs belah ketupat) dan hue berbeda; posisi horizontal tahun |
| Stacked bar | Batang vertikal bertumpuk | Panjang/tinggi segmen dan total batang | Hue baru (`#4F7FAE`) vs berulang per tahun (`#D4812A`); label angka |
| Tabel RW muncul >1 tahun | Baris | Angka eksak tahun | Nama wilayah, kecamatan, kelurahan, nomor RW |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Garis dan batang 2D; tidak ada perspektif atau bayangan semu. |
| Eyes beat memory | Sesuai | Dua seri diberi marker dan hue berbeda serta label langsung; segmen stacked bar diberi angka sehingga legenda tidak perlu dihafal. |
| Shneiderman | Sesuai | Overview di scorecard dan line chart; filter wilayah menjadi zoom/filter; tabel RW muncul >1 tahun dengan pencarian adalah details on demand. |

**Shape sebagai identity channel.** Lingkaran menandai kelurahan unik dan belah ketupat menandai RW baru, sehingga identitas seri tidak bergantung pada warna saja. Panah ▲/▼ pada scorecard menunjukkan arah delta tanpa warna penilaian.

**Kebijakan warna.** RW baru memakai `#4F7FAE` dan RW berulang per tahun `#D4812A` sesuai palet. Amber hanya muncul pada catatan kualitas data Jakarta Timur 2023. Tidak ada merah/hijau untuk menilai kinerja wilayah.

**Mengapa bukan pie/donut.** Pie/donut tidak dipakai karena sudut dan area kurang akurat; stacked bar menjaga total tahunan tetap sebanding dan memungkinkan label angka langsung.

## 6. CBQ 5 — Persebaran PSU

Sumber geometri, lisensi, dan validasi join: `docs/spatial-data-source.md`.

### Pemetaan KPI ke idiom visual

| KPI / data | Idiom visual | Alasan | Alternatif yang ditolak |
|---|---|---|---|
| Persebaran PSU antar kelurahan | Choropleth polygon kelurahan + garis batas & label kota | Spatial region membawa identitas kelurahan yang sebenarnya; luminance biru membawa magnitude PSU; garis batas kota dan label kota memperjelas wilayah administrasi. | Tile-grid: tidak merepresentasikan bentuk dan batas kelurahan; sudah tidak dipakai di CBQ 5. |
| PSU wilayah × tahun | Heatmap dengan angka di sel | Matriks dua dimensi lebih ringkas daripada tiga grouped bar terpisah dan memudahkan melihat sel kosong. | Grouped bar: masih mungkin, tetapi sel data kosong dan pola tahun lebih sulit dipindai. |
| Total PSU dan delta tahunan | Scorecard angka + panah | Ringkasan satu nilai per tahun dan arah perubahan. | Gauge: tidak ada target kinerja dalam data. |

### Marks dan channels

| Visual | Mark | Magnitude channel | Identity channel |
|---|---|---|---|
| Choropleth PSU | Polygon kelurahan + garis batas kota | Luminance hue biru | Spatial region (batas kelurahan); garis & label kota; tooltip wilayah/kecamatan/kelurahan; abu putus-putus untuk data kosong |
| Heatmap | Sel matriks | Luminance hue biru | Posisi baris wilayah dan kolom tahun; pola hatch amber untuk data kosong |
| Bar PSU | Batang horizontal | Panjang batang | Posisi vertikal wilayah; satu warna untuk magnitude, bukan hue identitas |

### Kepatuhan rules of thumb

| Aturan | Status | Penjelasan |
|---|---|---|
| No unjustified 3D | Sesuai | Peta, heatmap, dan batang seluruhnya 2D; tidak ada perspektif atau bayangan. |
| Eyes beat memory | Sesuai | Bar PSU dan heatmap memakai urutan wilayah yang konsisten; heatmap memberi angka di setiap sel. |
| Shneiderman | Sesuai | Overview di scorecard dan choropleth; filter tahun mengganti nilai/warna peta dan menyorot kolom heatmap; tooltip, tabel alternatif, dan tautan Lihat Detail memberi detail saat diminta. |

**Shape sebagai identity channel.** Panah ▲/▼ pada delta scorecard adalah identity channel untuk arah perubahan. Pada choropleth, abu putus-putus menandakan data tidak tersedia; amber hanya pada catatan kualitas data. Peta dan heatmap memakai luminance, bukan bentuk, untuk magnitude.

**Kebijakan warna.** Choropleth dan heatmap memakai satu hue biru sekuensial; abu putus-putus menandakan data tidak tersedia, berbeda dari nilai nol. Amber `#B7791F` hanya untuk catatan kualitas data. Tidak ada merah/hijau untuk menilai kinerja karena PSU bukan ukuran kebutuhan atau keberhasilan wilayah.

**Mengapa bukan pie/donut.** Pie/donut tidak dipakai: sudut dan area kurang akurat dibandingkan panjang dan luminance, terutama untuk membandingkan enam wilayah pada skala yang berbeda.
