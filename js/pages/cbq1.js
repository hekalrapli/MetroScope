import {
  YEARS,
  WILAYAH,
  YEAR_COLORS,
  COLORS,
  filterRows,
  countByYear,
  regionYearCounts,
  pctChange,
  fmtInt,
  fmtSignedPct,
} from "../data.js?v=20261119ab";
import {
  initChart,
  disposeAll,
  axisCategory,
  axisValue,
  VALUE_LABEL,
  FONT,
  hatchFill,
} from "../charts.js?v=20261119ab";
import {
  esc,
  pageHead,
  filterBar,
  filterSelect,
  scorecardGrid,
  chartPanel,
  dataTable,
  amberNote,
  deltaMark,
} from "../ui.js?v=20261119ab";

function answerTitle(counts, delta) {
  const a = counts[2023];
  const b = counts[2024];
  const c = counts[2025];
  if (a === null) {
    if (b !== null && c !== null) {
      return `Catatan RW 2023 tidak tersedia; 2024 → 2025: ${fmtInt(
        b
      )} → ${fmtInt(c)}`;
    }
    return "Catatan RW 2023 tidak tersedia";
  }
  if (c === null) return "Catatan RW 2025 tidak tersedia";
  const direction = c > a ? "naik" : c < a ? "turun" : "tetap";
  return `Catatan RW ${direction} ${fmtInt(a)} → ${fmtInt(b)} → ${fmtInt(
    c
  )} (${fmtSignedPct(delta)} sejak 2023)`;
}

function lineOption(counts) {
  return {
    grid: { left: 10, right: 24, top: 40, bottom: 16, containLabel: true },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const point = params[0];
        if (!point || point.value === null || point.value === undefined) {
          return `${point?.axisValue ?? ""}<br>data tidak tersedia`;
        }
        return `<strong>${point.axisValue}</strong><br>${fmtInt(
          point.value
        )} catatan RW<br><span style="color:${COLORS.muted}">Satu catatan = satu RW pada satu tahun.</span>`;
      },
    },
    xAxis: axisCategory(YEARS.map(String), { boundaryGap: false }),
    yAxis: axisValue({
      min: 0,
      name: "Catatan RW",
      nameTextStyle: { fontFamily: FONT, fontSize: 14, color: COLORS.muted },
      max(value) {
        return Math.max(10, Math.ceil((value.max * 1.2) / 10) * 10);
      },
    }),
    series: [
      {
        name: "Catatan RW",
        type: "line",
        data: YEARS.map((year) => counts[year]),
        connectNulls: false,
        symbol: "circle",
        symbolSize: 9,
        lineStyle: { width: 2, color: COLORS.primary },
        itemStyle: {
          color: COLORS.primary,
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
    ],
  };
}

function bottomOption(matrix, regionOrder) {
  const missing = [];
  regionOrder.forEach((region, index) => {
    for (const year of YEARS) {
      if (matrix[region][year] === null) {
        missing.push({ value: [index, 0], region, year });
      }
    }
  });

  const series = YEARS.map((year) => ({
    name: String(year),
    type: "bar",
    barWidth: 14,
    barGap: "22%",
    barCategoryGap: "42%",
    itemStyle: { color: YEAR_COLORS[year] },
    data: regionOrder.map((region) => matrix[region][year]),
    label: {
      ...VALUE_LABEL,
      position: "right",
      formatter: (params) =>
        params.value === null || params.value === undefined
          ? ""
          : fmtInt(params.value),
    },
    emphasis: { focus: "series" },
  }));

  if (missing.length > 0) {
    series.push({
      name: "Data tidak tersedia",
      type: "custom",
      data: missing,
      tooltip: {
        formatter(params) {
          const item = params.data;
          return `${item.region} ${item.year}<br><span style="color:${COLORS.muted}">data tidak tersedia; bukan nol.</span>`;
        },
      },
      renderItem(params, api) {
        const point = api.coord([0, api.value(0)]);
        const width = 10;
        const height = 16;
        return {
          type: "group",
          children: [
            {
              type: "rect",
              shape: {
                x: point[0],
                y: point[1] - height / 2,
                width,
                height,
              },
              style: {
                fill: hatchFill(),
                stroke: COLORS.amber,
                lineWidth: 1,
              },
            },
          ],
        };
      },
    });
  }

  return {
    grid: { left: 10, right: 120, top: 12, bottom: 52, containLabel: true },
    legend: {
      show: true,
      bottom: 0,
      left: 0,
      data: YEARS.map(String),
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const lines = [`<strong>${params[0]?.axisValue ?? ""}</strong>`];
        for (const point of params) {
          if (point.seriesType === "custom") continue;
          if (point.value === null || point.value === undefined) {
            lines.push(`${point.seriesName}: data tidak tersedia`);
          } else {
            lines.push(
              `${point.seriesName}: ${fmtInt(point.value)} catatan RW`
            );
          }
        }
        return lines.join("<br>");
      },
    },
    xAxis: axisValue({
      min: 0,
      max(value) {
        return Math.max(10, Math.ceil((value.max * 1.18) / 10) * 10);
      },
    }),
    yAxis: axisCategory(regionOrder, { inverse: true }),
    series,
  };
}

export function render(root, rows) {
  let wilayah = "all";

  function view() {
    disposeAll();
    const filtered = filterRows(rows, { wilayah });
    const counts = countByYear(filtered);
    const matrix = regionYearCounts(filtered);
    const total = filtered.length;
    const delta = pctChange(counts[2025], counts[2023]);
    const delta2024 = pctChange(counts[2024], counts[2023]);
    const missing2023 = counts[2023] === null;

    const regionTotals = Object.fromEntries(
      WILAYAH.map((region) => [region, matrix[region][2025] !== null || matrix[region][2024] !== null || matrix[region][2023] !== null
        ? [2023, 2024, 2025].reduce((sum, year) => sum + (matrix[region][year] ?? 0), 0)
        : null])
    );
    const regionOrder = WILAYAH.filter((region) => regionTotals[region] !== null).sort(
      (a, b) => regionTotals[b] - regionTotals[a]
    );

    const lineTable = dataTable({
      caption: "Data alternatif: catatan RW per tahun",
      columns: [{ label: "Tahun" }, { label: "Catatan RW", num: true }],
      rows: YEARS.map((year) => [
        String(year),
        counts[year] === null ? '<span class="muted">tidak tersedia</span>' : fmtInt(counts[year]),
      ]),
    });

    const bottomTable = dataTable({
      caption: "Data alternatif: catatan RW per wilayah dan tahun",
      columns: [
        { label: "Wilayah" },
        { label: "2023", num: true },
        { label: "2024", num: true },
        { label: "2025", num: true },
      ],
      rows: regionOrder.map((region) => [
        esc(region),
        ...YEARS.map((year) =>
          matrix[region][year] === null
            ? '<span class="muted">tidak tersedia</span>'
            : fmtInt(matrix[region][year])
        ),
      ]),
    });

    root.innerHTML = `
      ${pageHead({
        answer: "Tren Catatan RW",
      })}

      ${filterBar(
        filterSelect({
          id: "filter-wilayah",
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
            value: fmtInt(total),
            label: "Total catatan RW 2023–2025",
            meta: wilayah === "all" ? "Semua wilayah" : esc(wilayah),
          },
          {
            value: counts[2025] === null ? "—" : fmtInt(counts[2025]),
            label: "Catatan RW 2025",
            delta:
              delta === null
                ? "data 2023 tidak tersedia"
                : `${deltaMark(delta)} ${fmtSignedPct(delta)} vs 2023`,
          },
          {
            value: counts[2024] === null ? "—" : fmtInt(counts[2024]),
            label: "Catatan RW 2024",
            delta:
              delta2024 === null
                ? "data 2023 tidak tersedia"
                : `${deltaMark(delta2024)} ${fmtSignedPct(delta2024)} vs 2023`,
          },
        ])}
      </div>
      <div class="zone">
        ${chartPanel({
          title: "Catatan RW per tahun",
          chartId: "line-cbq1",
          height: 360,
          ariaLabel:
            "Line chart jumlah catatan RW per tahun 2023, 2024, dan 2025. Sum bu Y mulai nol. Jakarta Timur 2023 tidak tersedia.",
          tableHtml: lineTable,
        })}
        ${
          missing2023
            ? amberNote(
                "<strong>Data 2023 tidak tersedia.</strong> Tahun 2023 tidak digambar sebagai 0 dan tidak dihubungkan ke titik 2024."
              )
            : ""
        }
      </div>

      <div class="zone">
        ${chartPanel({
          title: "Catatan RW per wilayah dan tahun",
          chartId: "bars-cbq1",
          height: 500,
          ariaLabel:
            "Grouped horizontal bar catatan RW per wilayah untuk tahun 2023, 2024, dan 2025. Jakarta Timur 2023 bertanda data tidak tersedia.",
          tableHtml: bottomTable,
        })}
      </div>
    `;

    root.querySelector("#filter-wilayah").addEventListener("change", (event) => {
      wilayah = event.target.value;
      view();
    });

    initChart(root.querySelector("#line-cbq1"), lineOption(counts));
    initChart(root.querySelector("#bars-cbq1"), bottomOption(matrix, regionOrder));
  }

  view();
}
