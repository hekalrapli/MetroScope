import {
  YEARS,
  WILAYAH,
  COLORS,
  regionYearCounts,
  recordsPerRegion,
  sortRegionsByValue,
  pctChange,
  fmtInt,
  fmtPct,
  fmtSignedPct,
} from "../data.js?v=20261119ac";
import {
  initChart,
  disposeAll,
  axisCategory,
  axisValue,
  AXIS_LABEL,
  VALUE_LABEL,
  FONT,
  hatchFill,
} from "../charts.js?v=20261119ac";
import {
  esc,
  pageHead,
  filterBar,
  scorecardGrid,
  chartPanel,
  panel,
  dataTable,
  amberNote,
  deltaMark,
} from "../ui.js?v=20261119ac";

const HASH_ALL = "semua";

const CBQ2_YEAR_COLORS = {
  2023: "#9DBAD5",
  2024: "#4F7FAE",
  2025: "#1F4E79",
};

function readYearFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const param = new URLSearchParams(query).get("tahun");
  if (param === HASH_ALL) return "all";
  const year = Number(param);
  return YEARS.includes(year) ? year : "all";
}

function writeYearToHash(year) {
  const raw = window.location.hash.replace(/^#/, "");
  const route = raw.split("?")[0] || "cbq2";
  const value = year === "all" ? HASH_ALL : String(year);
  const next = `#${route}?tahun=${value}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", next);
  }
}

function displayRegion(region) {
  return region === "Kep. Seribu" ? "Kepulauan Seribu" : region;
}

function changeCell(value, previous, missingPrevious = false) {
  if (missingPrevious) {
    return '<span class="muted">n/a (2023 kosong)</span>';
  }
  if (value === null || previous === null) {
    return '<span class="muted">-</span>';
  }
  const delta = value - previous;
  return `<span class="muted">${deltaMark(delta)} ${fmtInt(
    Math.abs(delta)
  )}</span>`;
}

function groupedOption(matrix, regionOrder, selectedYear, focus) {
  const isAll = selectedYear === "all";
  const missing = [];
  regionOrder.forEach((region, index) => {
    if (matrix[region][2023] === null) {
      missing.push({ value: [index, 4], region, year: 2023 });
    }
  });

  const series = YEARS.map((year) => ({
    name: String(year),
    type: "bar",
    barGap: "10%",
    barCategoryGap: "30%",
    itemStyle: { color: CBQ2_YEAR_COLORS[year] },
    data: regionOrder.map((region) => {
      const value = matrix[region][year];
      if (value === null) return null;
      const dim = isAll
        ? Boolean(focus) && region !== focus
        : (Boolean(focus) && region !== focus) || year !== selectedYear;
      return {
        value,
        itemStyle: { opacity: dim ? 0.22 : 1 },
      };
    }),
    label: {
      ...VALUE_LABEL,
      position: "top",
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
          return `${params.data.region} ${params.data.year}<br><span style="color:${COLORS.muted}">data tidak tersedia; bukan nol.</span>`;
        },
      },
      renderItem(params, api) {
        const point = api.coord([api.value(0), api.value(1)]);
        const width = 20;
        const height = 9;
        return {
          type: "group",
          children: [
            {
              type: "rect",
              shape: {
                x: point[0] - width / 2,
                y: point[1] - height,
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
    animation: true,
    animationDuration: 120,
    animationDurationUpdate: 120,
    animationEasing: "linear",
    animationEasingUpdate: "linear",
    grid: { left: 20, right: 24, top: 32, bottom: 54, containLabel: true },
    legend: { show: true, bottom: 0, left: 0, data: YEARS.map(String) },
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
    xAxis: axisCategory(regionOrder, {
      axisLabel: {
        ...VALUE_LABEL,
        fontFamily: FONT,
        fontSize: 14,
        interval: 0,
        color: COLORS.muted,
      },
    }),
    yAxis: axisValue({
      min: 0,
      name: "Catatan RW",
      nameTextStyle: { fontFamily: FONT, fontSize: 14, color: COLORS.muted },
    }),
    series,
    media: [
      {
        query: { maxWidth: 700 },
        option: {
          grid: { bottom: 96 },
          xAxis: {
            axisLabel: {
              ...AXIS_LABEL,
              rotate: 45,
              align: "right",
              verticalAlign: "top",
              interval: 0,
            },
          },
        },
      },
    ],
  };
}

export function render(root, rows) {
  let selectedYear = readYearFromHash();
  let focus = null;
  const matrix = regionYearCounts(rows);
  const allTotals = recordsPerRegion(rows);
  const allTotal = rows.length;
  const allOrder = sortRegionsByValue(allTotals);

  writeYearToHash(selectedYear);

  function view() {
    disposeAll();
    const isAll = selectedYear === "all";
    const values = isAll
      ? allTotals
      : Object.fromEntries(
          WILAYAH.map((region) => [region, matrix[region][selectedYear]])
        );
    const rankOrder = isAll ? allOrder : sortRegionsByValue(values);
    const valid = isAll
      ? allOrder.map((region) => ({ region, value: values[region] }))
      : WILAYAH.map((region) => ({ region, value: values[region] }))
          .filter((item) => item.value !== null)
          .sort((a, b) => b.value - a.value);
    const top = valid[0];
    const low = valid[valid.length - 1];
    const total = isAll
      ? allTotal
      : valid.reduce((sum, item) => sum + item.value, 0);
    const missing = isAll
      ? []
      : WILAYAH.filter((region) => values[region] === null);
    const previousYear = !isAll && selectedYear !== 2023 ? selectedYear - 1 : null;
    const totalPrevious = previousYear
      ? WILAYAH.reduce(
          (sum, region) => sum + (matrix[region][previousYear] ?? 0),
          0
        )
      : null;
    const totalDelta = pctChange(total, totalPrevious);
    const topDelta = previousYear
      ? pctChange(values[top.region], matrix[top.region][previousYear])
      : null;
    const lowDelta = previousYear
      ? pctChange(values[low.region], matrix[low.region][previousYear])
      : null;

    const answer = isAll
      ? `${displayRegion(top.region)} mencatat RW terbanyak selama 2023-2025 (${fmtInt(
          top.value
        )} dari ${fmtInt(total)} catatan, ${fmtPct(
          (top.value / total) * 100,
          0
        )}); ${displayRegion(low.region)} paling sedikit (${fmtInt(low.value)}).`
      : `${top.region} tertinggi (${fmtInt(
          top.value
        )}) dan ${low.region} terendah (${fmtInt(
          low.value
        )}) pada ${selectedYear}; total ${fmtInt(total)} catatan.${
          missing.length
            ? ` ${missing.join(", ")} tidak tersedia pada tahun ini.`
            : ""
        }`;

    const groupedTable = dataTable({
      caption: "Data alternatif: catatan RW per wilayah dan tahun",
      columns: [
        { label: "Wilayah" },
        ...YEARS.map((year) => ({ label: String(year), num: true })),
      ],
      rows: rankOrder.map((region) => [
        esc(region),
        ...YEARS.map((year) =>
          matrix[region][year] === null
            ? '<span class="muted">tidak tersedia</span>'
            : fmtInt(matrix[region][year])
        ),
      ]),
    });

    const rankRows = rankOrder.map((region, index) => {
      if (isAll) {
        const totalRegion = allTotals[region];
        const breakdown = YEARS.map((year) =>
          matrix[region][year] === null
            ? "—"
            : fmtInt(matrix[region][year])
        ).join(" / ");
        return [
          String(index + 1),
          esc(region),
          fmtInt(totalRegion),
          fmtPct((totalRegion / allTotal) * 100, 1),
          breakdown,
          changeCell(
            matrix[region][2025],
            matrix[region][2023],
            matrix[region][2023] === null
          ),
        ];
      }
      const value = values[region];
      const previous =
        selectedYear === 2023 ? null : matrix[region][selectedYear - 1];
      let change;
      if (selectedYear === 2023) {
        change = '<span class="muted">-</span>';
      } else if (previous === null) {
        change = '<span class="muted">n/a (2023 kosong)</span>';
      } else {
        const delta = value - previous;
        change = `<span class="muted">${deltaMark(delta)} ${fmtInt(
          Math.abs(delta)
        )}</span>`;
      }
      return [
        value === null ? "—" : String(index + 1),
        esc(region),
        value === null
          ? '<span class="muted">tidak tersedia</span>'
          : fmtInt(value),
        value === null ? "—" : fmtPct((value / total) * 100, 1),
        change,
      ];
    });

    const rankColumns = isAll
      ? [
          { label: "Peringkat", num: true },
          { label: "Wilayah" },
          { label: "Total 2023–2025", num: true },
          { label: "Kontribusi", num: true },
          { label: "2023 / 2024 / 2025", num: true },
          { label: "Perubahan 2023 → 2025", num: true },
        ]
      : [
          { label: "Peringkat", num: true },
          { label: "Wilayah" },
          { label: `Catatan ${selectedYear}`, num: true },
          { label: "Kontribusi", num: true },
          { label: "Selisih vs tahun sebelumnya", num: true },
        ];

    root.innerHTML = `
      ${pageHead({
        answer: "Catatan RW per Wilayah",
      })}

      ${filterBar(`
        <div class="filter" role="group" aria-label="Filter tahun">
          <span>Tahun</span>
          <div class="segmented">
            ${[
              ["all", "Semua tahun"],
              ...YEARS.map((year) => [String(year), String(year)]),
            ]
              .map(
                ([value, label]) => `
                  <button
                    type="button"
                    data-year="${value}"
                    class="${String(selectedYear) === value ? "active" : ""}"
                    aria-pressed="${String(selectedYear) === value}"
                  >${label}</button>
                `
              )
              .join("")}
          </div>
        </div>
      `)}

      <div class="zone">
        ${scorecardGrid(
          isAll
            ? [
                {
                  value: fmtInt(top.value),
                  label: `${displayRegion(top.region)} — tertinggi 2023–2025`,
                },
                {
                  value: fmtInt(low.value),
                  label: `${displayRegion(low.region)} — terendah 2023–2025`,
                },
                {
                  value: fmtInt(total),
                  label: "Total catatan RW 2023–2025",
                },
              ]
            : [
                {
                  value: fmtInt(top.value),
                  label: `${top.region} — tertinggi ${selectedYear}`,
                  delta:
                    topDelta === null
                      ? "tahun sebelumnya tidak tersedia"
                      : `${deltaMark(topDelta)} ${fmtSignedPct(
                          topDelta
                        )} vs ${previousYear}`,
                },
                {
                  value: fmtInt(low.value),
                  label: `${low.region} — terendah ${selectedYear}`,
                  delta:
                    lowDelta === null
                      ? "tahun sebelumnya tidak tersedia"
                      : `${deltaMark(lowDelta)} ${fmtSignedPct(
                          lowDelta
                        )} vs ${previousYear}`,
                },
                {
                  value: fmtInt(total),
                  label: `Total catatan RW ${selectedYear}`,
                  delta:
                    totalDelta === null
                      ? "tahun sebelumnya tidak tersedia"
                      : `${deltaMark(totalDelta)} ${fmtSignedPct(
                          totalDelta
                        )} vs ${previousYear}`,
                },
              ]
        )}
      </div>
      <div class="zone">
        ${chartPanel({
          title: "Catatan RW per wilayah dan tahun",
          chartId: "bars-cbq2",
          height: 440,
          ariaLabel:
            "Grouped bar vertikal catatan RW per wilayah untuk tahun 2023, 2024, dan 2025.",
          tableHtml: groupedTable,
        })}
      </div>

      <div class="zone">
        ${panel({
          title: "Peringkat wilayah",
          body: `
            <div id="rank-cbq2">${dataTable({
              caption: isAll
                ? "Peringkat wilayah 2023–2025"
                : `Peringkat wilayah ${selectedYear}`,
              columns: rankColumns,
              rows: rankRows,
            })}</div>
            ${
              isAll
                ? amberNote(
                    "Total Jakarta Timur hanya mencakup 2024-2025 karena data 2023 kosong; jangan bandingkan langsung dengan wilayah lain."
                  )
                : ""
            }
          `,
        })}
      </div>
    `;

    root.querySelectorAll("[data-year]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.year;
        selectedYear = value === "all" ? "all" : Number(value);
        focus = null;
        writeYearToHash(selectedYear);
        view();
      });
    });

    const chart = initChart(
      root.querySelector("#bars-cbq2"),
      groupedOption(matrix, rankOrder, selectedYear, focus)
    );

    function applyFocus() {
      root.querySelectorAll("#rank-cbq2 tbody tr").forEach((row, index) => {
        row.classList.toggle("row-focus", rankOrder[index] === focus);
      });
      chart.setOption(groupedOption(matrix, rankOrder, selectedYear, focus));
    }

    function toggleFocus(region) {
      focus = focus === region ? null : region;
      applyFocus();
    }

    root.querySelectorAll("#rank-cbq2 tbody tr").forEach((row, index) => {
      row.tabIndex = 0;
      row.addEventListener("click", () => toggleFocus(rankOrder[index]));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleFocus(rankOrder[index]);
        }
      });
    });

    chart.on("click", (params) => {
      if (WILAYAH.includes(params.name)) toggleFocus(params.name);
    });
  }

  view();
}
