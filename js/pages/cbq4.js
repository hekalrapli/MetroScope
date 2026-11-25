import {
  YEARS,
  WILAYAH,
  COLORS,
  filterRows,
  uniqueKelurahanByYear,
  uniqueRW,
  multiYearRW,
  coverageByYear,
  pctChange,
  fmtInt,
  fmtSignedPct,
} from "../data.js?v=20261119ac";
import {
  initChart,
  disposeAll,
  axisCategory,
  axisValue,
  VALUE_LABEL,
  FONT,
} from "../charts.js?v=20261125a";
import {
  esc,
  pageHead,
  filterBar,
  filterSelect,
  scorecardGrid,
  chartPanel,
  panel,
  dataTable,
  amberNote,
  deltaMark,
} from "../ui.js?v=20261119ac";

const UNIQUE_KEL_COLOR = COLORS.text;

function coverageTitle(kelCounts, rwTotal, repeatTotal) {
  const a = kelCounts[2023];
  const b = kelCounts[2024];
  const c = kelCounts[2025];
  if (a === null) {
    if (b !== null && c !== null) {
      return `Cakupan 2023 tidak tersedia; 2024 → 2025: ${fmtInt(
        b
      )} → ${fmtInt(c)} kelurahan; ${fmtInt(rwTotal)} RW unik, ${fmtInt(
        repeatTotal
      )} di antaranya muncul di >1 tahun`;
    }
    return "Cakupan 2023 tidak tersedia";
  }
  if (c === null) return "Cakupan 2025 tidak tersedia";
  const direction = c > a ? "meluas" : c < a ? "menyempit" : "stabil";
  return `Cakupan ${direction}: ${fmtInt(a)} → ${fmtInt(b)} → ${fmtInt(
    c
  )} kelurahan; ${fmtInt(rwTotal)} RW unik, ${fmtInt(
    repeatTotal
  )} di antaranya muncul di >1 tahun`;
}

function lineOption(kelCounts, coverage) {
  const baruByYear = Object.fromEntries(
    coverage.map((item) => [item.tahun, item.baru])
  );
  return {
    grid: { left: 28, right: 24, top: 40, bottom: 48, containLabel: true },
    legend: {
      show: true,
      bottom: 0,
      left: 0,
      data: [
        { name: "Kelurahan unik", icon: "circle" },
        { name: "RW baru", icon: "diamond" },
      ],
    },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const lines = [`<strong>${params[0]?.axisValue ?? ""}</strong>`];
        for (const point of params) {
          if (point.value === null || point.value === undefined) {
            lines.push(`${point.seriesName}: tidak tersedia`);
          } else {
            lines.push(`${point.seriesName}: ${fmtInt(point.value)}`);
          }
        }
        lines.push(
          `<span style="color:${COLORS.muted}">Kelurahan unik = kelurahan berbeda yang tercatat. RW baru = RW yang belum tercatat pada tahun sebelumnya.</span>`
        );
        return lines.join("<br>");
      },
    },
    xAxis: axisCategory(YEARS.map(String), { boundaryGap: false }),
    yAxis: axisValue({
      min: 0,
      name: "Jumlah",
      nameTextStyle: { fontFamily: FONT, fontSize: 14, color: COLORS.muted },
      max(value) {
        return Math.max(10, Math.ceil(value.max / 10) * 10);
      },
    }),
    series: [
      {
        name: "Kelurahan unik",
        type: "line",
        data: YEARS.map((year) => {
          const value = kelCounts[year];
          const other = baruByYear[year];
          return {
            value,
            label: {
              position:
                value === null || other === null || value >= other
                  ? "top"
                  : "bottom",
              ...(year === YEARS[0] ? { offset: [10, 0] } : {}),
            },
          };
        }),
        symbol: "circle",
        symbolSize: 9,
        lineStyle: { width: 2, color: UNIQUE_KEL_COLOR },
        itemStyle: {
          color: UNIQUE_KEL_COLOR,
          borderColor: COLORS.panel,
          borderWidth: 2,
        },
        label: {
          ...VALUE_LABEL,
          position: "top",
          formatter: (params) => fmtInt(params.value),
        },
        emphasis: { scale: false },
      },
      {
        name: "RW baru",
        type: "line",
        data: YEARS.map((year) => {
          const value = baruByYear[year];
          const other = kelCounts[year];
          return {
            value,
            label: {
              position:
                value === null || other === null || value > other
                  ? "top"
                  : "bottom",
              ...(year === YEARS[0] ? { offset: [10, 0] } : {}),
            },
          };
        }),
        symbol: "diamond",
        symbolSize: 11,
        lineStyle: { width: 2, color: COLORS.baru },
        itemStyle: {
          color: COLORS.baru,
          borderColor: COLORS.panel,
          borderWidth: 2,
        },
        label: {
          ...VALUE_LABEL,
          position: "bottom",
          formatter: (params) => fmtInt(params.value),
        },
        emphasis: { scale: false },
      },
    ],
  };
}

function stackedOption(coverage) {
  const commonLabel = {
    show: true,
    position: "inside",
    fontFamily: FONT,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.panel,
    padding: [1, 4],
    borderRadius: 2,
    formatter: (params) =>
      params.value === null || params.value === undefined || params.value === 0
        ? ""
        : fmtInt(params.value),
  };
  return {
    grid: { left: 10, right: 18, top: 44, bottom: 48, containLabel: true },
    legend: {
      show: true,
      bottom: 0,
      left: 0,
      data: ["RW baru", "RW berulang per tahun"],
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const lines = [`<strong>${params[0]?.axisValue ?? ""}</strong>`];
        for (const point of params) {
          lines.push(
            `${point.seriesName}: ${
              point.value === null || point.value === undefined
                ? "tidak tersedia"
                : fmtInt(point.value)
            } RW`
          );
        }
        lines.push(
          `<span style="color:${COLORS.muted}">RW berulang per tahun = sudah tercatat pada tahun sebelumnya; RW baru = pertama kali tercatat.</span>`
        );
        return lines.join("<br>");
      },
    },
    xAxis: axisCategory(YEARS.map(String)),
    yAxis: axisValue({
      min: 0,
      name: "RW unik",
      nameTextStyle: { fontFamily: FONT, fontSize: 14, color: COLORS.muted },
    }),
    series: [
      {
        name: "RW baru",
        type: "bar",
        stack: "coverage",
        barWidth: "42%",
        data: coverage.map((item) => item.baru),
        itemStyle: { color: COLORS.baru },
        label: commonLabel,
        emphasis: { focus: "series" },
      },
      {
        name: "RW berulang per tahun",
        type: "bar",
        stack: "coverage",
        barWidth: "42%",
        data: coverage.map((item) => item.berulang),
        itemStyle: { color: COLORS.berulang },
        label: commonLabel,
        emphasis: { focus: "series" },
      },
    ],
  };
}

export function render(root, rows) {
  let wilayah = "all";

  function view() {
    disposeAll();
    const filtered = filterRows(rows, { wilayah });
    const kelCounts = uniqueKelurahanByYear(filtered);
    const coverage = coverageByYear(filtered);
    const rwTotal = uniqueRW(filtered);
    const repeatList = multiYearRW(filtered);
    const repeatTotal = repeatList.length;
    const delta2025 = pctChange(kelCounts[2025], kelCounts[2023]);
    const delta2024 = pctChange(kelCounts[2024], kelCounts[2023]);

    const lineTable = dataTable({
      caption: "Data alternatif: kelurahan unik dan RW baru per tahun",
      columns: [
        { label: "Tahun" },
        { label: "Kelurahan unik", num: true },
        { label: "RW baru", num: true },
      ],
      rows: YEARS.map((year, index) => [
        String(year),
        kelCounts[year] === null
          ? '<span class="muted">tidak tersedia</span>'
          : fmtInt(kelCounts[year]),
        coverage[index].baru === null
          ? '<span class="muted">tidak tersedia</span>'
          : fmtInt(coverage[index].baru),
      ]),
    });

    const stackedTable = dataTable({
      caption: "Data alternatif: RW baru vs berulang per tahun",
      columns: [
        { label: "Tahun" },
        { label: "RW baru", num: true },
        { label: "RW berulang per tahun", num: true },
        { label: "Total", num: true },
      ],
      rows: coverage.map((item) => [
        String(item.tahun),
        item.baru === null ? '<span class="muted">tidak tersedia</span>' : fmtInt(item.baru),
        item.berulang === null ? "—" : fmtInt(item.berulang),
        item.total === null ? '<span class="muted">tidak tersedia</span>' : fmtInt(item.total),
      ]),
    });

    const repeatRows = repeatList.map((item) => [
      esc(item.wilayah),
      esc(item.kecamatan),
      esc(item.kelurahan),
      esc(item.rw),
      item.tahun.join(", "),
    ]);

    const repeatTable = dataTable({
      caption: "RW yang tercatat di lebih dari satu tahun",
      columns: [
        { label: "Wilayah" },
        { label: "Kecamatan" },
        { label: "Kelurahan" },
        { label: "RW", num: true },
        { label: "Tahun tercatat" },
      ],
      rows: repeatRows,
    });

    root.innerHTML = `
      ${pageHead({
        answer: "Cakupan Wilayah",
      })}

      ${filterBar(
        filterSelect({
          id: "filter-wilayah-cbq4",
          label: "Wilayah",
          value: wilayah,
          options: [
            { value: "all", label: "Semua wilayah" },
            ...WILAYAH.map((region) => ({ value: region, label: region })),
          ],
        })
      )}

      <div class="zone">
        ${scorecardGrid([
          {
            value: kelCounts[2025] === null ? "—" : fmtInt(kelCounts[2025]),
            label: "Kelurahan unik 2025",
            delta:
              delta2025 === null
                ? "data 2023 tidak tersedia"
                : `${deltaMark(delta2025)} ${fmtSignedPct(delta2025)} vs 2023`,
            meta: `2023: ${
              kelCounts[2023] === null ? "—" : fmtInt(kelCounts[2023])
            } · 2024: ${
              kelCounts[2024] === null ? "—" : fmtInt(kelCounts[2024])
            }`,
          },
          {
            value: kelCounts[2024] === null ? "—" : fmtInt(kelCounts[2024]),
            label: "Kelurahan unik 2024",
            delta:
              delta2024 === null
                ? "data 2023 tidak tersedia"
                : `${deltaMark(delta2024)} ${fmtSignedPct(delta2024)} vs 2023`,
          },
          {
            value: fmtInt(rwTotal),
            label: "RW unik kumulatif",
          },
          {
            value: fmtInt(repeatTotal),
            label: "RW muncul >1 tahun",
            meta: "unik; bukan segmen per tahun",
          },
        ])}
      </div>
      <div class="zone">
        ${chartPanel({
          title: "Kelurahan unik dan RW baru per tahun",
          chartId: "line-cbq4",
          height: 360,
          ariaLabel:
            "Line chart dua seri: jumlah kelurahan unik per tahun dan jumlah RW baru per tahun 2023, 2024, 2025.",
          tableHtml: lineTable,
        })}
        ${
          kelCounts[2023] === null
            ? amberNote(
                "<strong>Data 2023 tidak tersedia.</strong> Garis dimulai dari 2024; nilai 2023 tidak digambar sebagai nol."
              )
            : ""
        }
      </div>

      <div class="zone grid">
        ${chartPanel({
          title: "RW baru vs RW berulang per tahun",
          chartId: "stacked-cbq4",
          height: 360,
          ariaLabel:
            "Stacked bar jumlah RW baru dan RW berulang per tahun untuk 2023, 2024, dan 2025.",
          tableHtml: stackedTable,
          className: "col-7",
        })}
        ${panel({
          title: "RW muncul >1 tahun",
          className: "col-5",
          body: `
            <div class="table-toolbar">
              <label class="filter" for="search-rw">
                <span>Pencarian</span>
                <input id="search-rw" class="search-input" type="search" placeholder="Cari RW…" />
              </label>
              <span id="rw-count" class="muted">${fmtInt(
                repeatTotal
              )} RW muncul >1 tahun</span>
            </div>
            <div class="table-wrap" id="rw-table-wrap">${repeatTable}</div>
          `,
        })}
      </div>

      <div class="zone">
        ${amberNote(
          "<strong>Catatan kualitas data:</strong> Jakarta Timur 2023 kosong, sehingga RW Jakarta Timur 2024 tampak semuanya baru."
        )}
      </div>
    `;

    root.querySelector("#filter-wilayah-cbq4").addEventListener("change", (event) => {
      wilayah = event.target.value;
      view();
    });

    initChart(root.querySelector("#line-cbq4"), lineOption(kelCounts, coverage));
    initChart(root.querySelector("#stacked-cbq4"), stackedOption(coverage));

    const search = root.querySelector("#search-rw");
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      root.querySelectorAll("#rw-table-wrap tbody tr").forEach((row) => {
        const match = row.textContent.toLowerCase().includes(query);
        row.hidden = !match;
        if (match) visible += 1;
      });
      root.querySelector("#rw-count").textContent = `${fmtInt(
        visible
      )} RW muncul >1 tahun`;
    });
  }

  view();
}
