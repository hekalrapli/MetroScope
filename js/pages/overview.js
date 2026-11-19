import {
  YEARS,
  WILAYAH,
  COLORS,
  REGION_COLORS,
  countByYear,
  uniqueRW,
  uniqueKelurahan,
  multiYearRW,
  psuTotal,
  psuByYear,
  regionYearCounts,
  topKelurahan,
  filterRows,
  uniqueKelurahanByYear,
  coverageByYear,
  fmtInt,
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
  panel,
  chartPanel,
  dataTable,
  tableToggle,
  legend,
} from "../ui.js?v=20261119ab";
import {
  createPsuChoropleth,
  disposeAllMaps,
  scopeLabel,
} from "../choropleth.js?v=20261119ab";

const CBQ2_YEAR_COLORS = {
  2023: "#9DBAD5",
  2024: "#4F7FAE",
  2025: "#1F4E79",
};

const UNIQUE_KEL_COLOR = COLORS.text;

function detailLink(href) {
  return `<a class="detail-link" href="${href}">Lihat Detail</a>`;
}

function yearFilter(selectedYear) {
  return `
    <div class="filter" role="group" aria-label="Filter tahun analisis">
      <span>Tahun analisis</span>
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
  `;
}

function scorecardRow(values) {
  return `
    <div class="overview-scores">
      ${values
        .map(
          (item) => `
            <section class="panel scorecard">
              <div class="score-label">${item.label}</div>
              <div class="score-value">${item.value}</div>
              ${item.meta ? `<div class="score-meta">${item.meta}</div>` : ""}
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function lineCbq1Option(counts, selectedYear) {
  const markLine =
    selectedYear === "all"
      ? undefined
      : {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: COLORS.muted,
            type: "dashed",
            width: 1,
            opacity: 0.6,
          },
          label: { show: false },
          data: [{ xAxis: String(selectedYear) }],
        };
  return {
    grid: { left: 10, right: 20, top: 42, bottom: 24, containLabel: true },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const point = params[0];
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
        return Math.max(10, Math.ceil((value.max * 1.1) / 10) * 10);
      },
    }),
    series: [
      {
        name: "Catatan RW",
        type: "line",
        data: YEARS.map((year) => ({
          value: counts[year],
          symbolSize: selectedYear === year ? 12 : 9,
        })),
        symbol: "circle",
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
        markLine,
      },
    ],
  };
}

function groupedCbq2Option(matrix, regionOrder, selectedYear) {
  const shortLabel = (region) =>
    region === "Kep. Seribu" ? "Kep.\nSeribu" : region.replace("Jakarta ", "");
  const missing = [];
  regionOrder.forEach((region, index) => {
    if (matrix[region][2023] === null) {
      missing.push({ value: [index, 4], region, year: 2023 });
    }
  });
  const series = YEARS.map((year) => ({
    name: String(year),
    type: "bar",
    barWidth: 10,
    barGap: "18%",
    barCategoryGap: "28%",
    itemStyle: { color: CBQ2_YEAR_COLORS[year] },
    data: regionOrder.map((region) => {
      const value = matrix[region][year];
      if (value === null) return null;
      const dim = selectedYear !== "all" && year !== selectedYear;
      return { value, itemStyle: { opacity: dim ? 0.22 : 1 } };
    }),
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
        return {
          type: "rect",
          shape: {
            x: point[0] - 9,
            y: point[1] - 8,
            width: 18,
            height: 8,
          },
          style: {
            fill: hatchFill(),
            stroke: COLORS.amber,
            lineWidth: 1,
          },
        };
      },
    });
  }
  return {
    grid: { left: 20, right: 16, top: 18, bottom: 58, containLabel: true },
    legend: { show: true, bottom: 0, left: 0, data: YEARS.map(String) },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const region = regionOrder[params[0]?.dataIndex] ?? "";
        const lines = [`<strong>${esc(region)}</strong>`];
        for (const point of params) {
          if (point.seriesType === "custom") continue;
          lines.push(
            `${point.seriesName}: ${
              point.value === null || point.value === undefined
                ? "tidak tersedia"
                : `${fmtInt(point.value)} catatan RW`
            }`
          );
        }
        return lines.join("<br>");
      },
    },
    xAxis: axisCategory(regionOrder.map(shortLabel), {
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
  };
}

function top10Option(items) {
  return {
    grid: { left: 8, right: 42, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter(params) {
        const item = params.data;
        return `<strong>${esc(item.kelurahan)}</strong><br>${fmtInt(
          item.value
        )} catatan RW<br><span style="color:${COLORS.muted}">${esc(
          item.kecamatan
        )}, ${esc(item.wilayah)}</span>`;
      },
    },
    xAxis: axisValue({
      min: 0,
      max(value) {
        return Math.max(2, Math.ceil(value.max * 1.18));
      },
      axisLabel: { show: false },
    }),
    yAxis: axisCategory(
      items.map((item) => item.kelurahan),
      { inverse: true }
    ),
    series: [
      {
        type: "bar",
        barWidth: "55%",
        data: items.map((item) => ({
          value: item.count,
          kelurahan: item.kelurahan,
          kecamatan: item.kecamatan,
          wilayah: item.wilayah,
          itemStyle: { color: REGION_COLORS[item.wilayah] },
        })),
        label: {
          ...VALUE_LABEL,
          position: "right",
          formatter: (params) => fmtInt(params.value),
        },
        emphasis: { focus: "self" },
      },
    ],
  };
}

function lineCbq4Option(kelCounts, coverage, selectedYear) {
  const baruByYear = Object.fromEntries(
    coverage.map((item) => [item.tahun, item.baru])
  );
  const markLine =
    selectedYear === "all"
      ? undefined
      : {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: COLORS.muted,
            type: "dashed",
            width: 1,
            opacity: 0.6,
          },
          label: { show: false },
          data: [{ xAxis: String(selectedYear) }],
        };
  return {
    grid: { left: 28, right: 20, top: 42, bottom: 44, containLabel: true },
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
          lines.push(
            `${point.seriesName}: ${
              point.value === null || point.value === undefined
                ? "tidak tersedia"
                : fmtInt(point.value)
            }`
          );
        }
        lines.push(
          `<span style="color:${COLORS.muted}">RW baru = belum tercatat pada tahun sebelumnya.</span>`
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
        return Math.max(10, Math.ceil((value.max * 1.2) / 10) * 10);
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
            symbolSize: selectedYear === year ? 11 : 8,
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
        markLine,
      },
      {
        name: "RW baru",
        type: "line",
        data: YEARS.map((year) => {
          const value = baruByYear[year];
          const other = kelCounts[year];
          return {
            value,
            symbolSize: selectedYear === year ? 11 : 8,
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
      },
    ],
  };
}

export function render(root, rows) {
  let selectedYear = "all";

  function view() {
    disposeAll();
    disposeAllMaps();
    const counts = countByYear(rows);
    const matrix = regionYearCounts(rows);
    const regionOrder = [...WILAYAH].sort(
      (a, b) =>
        YEARS.reduce((sum, year) => sum + (matrix[b][year] ?? 0), 0) -
        YEARS.reduce((sum, year) => sum + (matrix[a][year] ?? 0), 0)
    );
    const filteredYear = selectedYear === "all" ? rows : filterRows(rows, { tahun: selectedYear });
    const topItems = topKelurahan(filteredYear, 10);
    const usedRegions = WILAYAH.filter((region) =>
      topItems.some((item) => item.wilayah === region)
    );
    const kelCounts = uniqueKelurahanByYear(rows);
    const coverage = coverageByYear(rows);
    const scope = scopeLabel(selectedYear);
    const yearCount =
      selectedYear === "all" ? rows.length : counts[selectedYear];
    const rwUniqueValue =
      selectedYear === "all" ? uniqueRW(rows) : uniqueRW(filteredYear);
    const kelUniqueValue =
      selectedYear === "all"
        ? uniqueKelurahan(rows)
        : uniqueKelurahan(filteredYear);
    const psuByYearValues = psuByYear(rows);
    const psuValue =
      selectedYear === "all"
        ? psuTotal(rows)
        : psuByYearValues[selectedYear];
    const repeatValue =
      selectedYear === "all"
        ? multiYearRW(rows).length
        : coverage.find((item) => item.tahun === selectedYear)?.berulang ?? 0;
    const repeatCard =
      selectedYear === "all"
        ? {
            label: "RW muncul >1 tahun",
            value: fmtInt(repeatValue),
            meta: "unik, bukan segmen per tahun",
          }
        : {
            label: `RW berulang ${selectedYear}`,
            value: fmtInt(repeatValue),
            meta:
              selectedYear === 2023
                ? "tahun pertama"
                : "sudah tercatat di tahun sebelumnya",
          };

    const lineTable = dataTable({
      caption: "Data alternatif: catatan RW per tahun",
      columns: [{ label: "Tahun" }, { label: "Catatan RW", num: true }],
      rows: YEARS.map((year) => [String(year), fmtInt(counts[year])]),
    });

    const barsTable = dataTable({
      caption: "Data alternatif: catatan RW per wilayah dan tahun",
      columns: [
        { label: "Wilayah" },
        ...YEARS.map((year) => ({ label: String(year), num: true })),
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

    const topTable = dataTable({
      caption: `Data alternatif: top 10 kelurahan, ${scope}`,
      columns: [
        { label: "Kelurahan" },
        { label: "Kecamatan" },
        { label: "Wilayah" },
        { label: "Catatan", num: true },
      ],
      rows: topItems.map((item) => [
        esc(item.kelurahan),
        esc(item.kecamatan),
        esc(item.wilayah),
        fmtInt(item.count),
      ]),
    });

    const coverageTable = dataTable({
      caption: "Data alternatif: kelurahan unik dan RW baru per tahun",
      columns: [
        { label: "Tahun" },
        { label: "Kelurahan unik", num: true },
        { label: "RW baru", num: true },
      ],
      rows: YEARS.map((year, index) => [
        String(year),
        fmtInt(kelCounts[year]),
        fmtInt(coverage[index].baru),
      ]),
    });

    const mapTable = `
      <table>
        <caption id="ov-map-caption">Data alternatif peta: PSU per kelurahan, ${scope}</caption>
        <thead>
          <tr>
            <th scope="col">Wilayah</th>
            <th scope="col">Kecamatan</th>
            <th scope="col">Kelurahan</th>
            <th scope="col" class="num">PSU</th>
            <th scope="col">Keterangan</th>
          </tr>
        </thead>
        <tbody id="ov-map-body"></tbody>
      </table>
    `;

    root.innerHTML = `
      ${pageHead({
        answer: "Ringkasan Program CIP",
      })}

      ${filterBar(yearFilter(selectedYear))}

      <div class="zone">
        ${scorecardRow([
          {
            label: `Catatan RW ${scope}`,
            value: fmtInt(yearCount),
          },
          {
            label: "RW unik",
            value: fmtInt(rwUniqueValue),
          },
          {
            label: "Kelurahan unik",
            value: fmtInt(kelUniqueValue),
          },
          repeatCard,
          {
            label: `PSU ${scope}`,
            value: fmtInt(psuValue),
          },
        ])}
      </div>

      <div class="zone grid">
        ${chartPanel({
          title: "CBQ 1 — Tren tahunan catatan RW",
          chartId: "ov-cbq1",
          height: 560,
          ariaLabel:
            "Line chart jumlah catatan RW per tahun 2023, 2024, dan 2025.",
          tableHtml: lineTable,
          className: "col-6",
          tools: detailLink("#cbq1"),
        })}
        ${panel({
          title: "CBQ 5 — Persebaran PSU per kelurahan",
          className: "col-6",
          tools: detailLink("#cbq5"),
          body: `
            <div id="ov-map" class="choropleth choropleth--overview" role="img" aria-label="Choropleth jumlah PSU per kelurahan DKI Jakarta, ${scope}."></div>
            <div class="map-actions">
              <button type="button" class="link-btn" data-map-fit="mainland">Jakarta</button>
              <button type="button" class="link-btn" data-map-fit="all">Semua DKI</button>
              <button type="button" class="link-btn" data-map-labels aria-pressed="true">Sembunyikan label wilayah</button>
            </div>
            <div class="map-legend" id="ov-map-legend"></div>
            <p class="note" id="ov-map-status">Memuat batas kelurahan…</p>
            ${tableToggle(mapTable, "ov-map-table")}
          `,
        })}
      </div>

      <div class="zone grid">
        ${chartPanel({
          title: "CBQ 2 — Perbandingan antarwilayah",
          chartId: "ov-cbq2",
          height: 380,
          ariaLabel:
            "Grouped bar catatan RW per wilayah untuk tahun 2023, 2024, dan 2025.",
          tableHtml: barsTable,
          className: "col-4",
          tools: detailLink("#cbq2"),
        })}
        ${chartPanel({
          title: "CBQ 3 — Konsentrasi lokasi",
          chartId: "ov-cbq3",
          height: 340,
          ariaLabel: `Horizontal bar top 10 kelurahan berdasarkan catatan RW, ${scope}, dengan warna wilayah induk.`,
          tableHtml: topTable,
          className: "col-4",
          tools: detailLink("#cbq3"),
          extraHtml: legend(
            usedRegions.map((region) => ({
              color: REGION_COLORS[region],
              label: region,
            }))
          ),
        })}
        ${chartPanel({
          title: "CBQ 4 — Perubahan cakupan",
          chartId: "ov-cbq4",
          height: 380,
          ariaLabel:
            "Line chart dua seri: kelurahan unik dan RW baru per tahun 2023, 2024, 2025.",
          tableHtml: coverageTable,
          className: "col-4",
          tools: detailLink("#cbq4"),
        })}
      </div>
    `;

    root.querySelectorAll("[data-year]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedYear =
          button.dataset.year === "all" ? "all" : Number(button.dataset.year);
        view();
      });
    });

    initChart(root.querySelector("#ov-cbq1"), lineCbq1Option(counts, selectedYear));
    initChart(
      root.querySelector("#ov-cbq2"),
      groupedCbq2Option(matrix, regionOrder, selectedYear)
    );
    initChart(root.querySelector("#ov-cbq3"), top10Option(topItems));
    initChart(
      root.querySelector("#ov-cbq4"),
      lineCbq4Option(kelCounts, coverage, selectedYear)
    );

    createPsuChoropleth({
      container: root.querySelector("#ov-map"),
      legendEl: root.querySelector("#ov-map-legend"),
      statusEl: root.querySelector("#ov-map-status"),
      tableBodyEl: root.querySelector("#ov-map-body"),
      tableCaptionEl: root.querySelector("#ov-map-caption"),
      rows,
      tahun: selectedYear,
      fit: "mainland",
      labelStyle: "short",
    })
      .then((handle) => {
        if (!handle) return;
        const mainland = root.querySelector('[data-map-fit="mainland"]');
        const all = root.querySelector('[data-map-fit="all"]');
        const labels = root.querySelector("[data-map-labels]");
        function updateLabelButton(visible) {
          if (!labels) return;
          labels.textContent = visible
            ? "Sembunyikan label wilayah"
            : "Tampilkan label wilayah";
          labels.setAttribute("aria-pressed", String(visible));
        }
        if (labels && !handle.hasLabels) {
          labels.disabled = true;
          labels.textContent = "Label tidak tersedia";
        }
        if (mainland) {
          mainland.addEventListener("click", () => {
            handle.fitMainland();
            updateLabelButton(handle.setLabelsVisible(true));
          });
        }
        if (all) {
          all.addEventListener("click", () => {
            handle.fitAll();
            updateLabelButton(handle.setLabelsVisible(false));
          });
        }
        if (labels && handle.hasLabels) {
          updateLabelButton(handle.labelsVisible);
          labels.addEventListener("click", () => {
            updateLabelButton(handle.toggleLabels());
          });
        }
      })
      .catch((error) => {
        const status = root.querySelector("#ov-map-status");
        if (status) {
          status.textContent = `Peta tidak dapat dimuat: ${error.message}`;
          status.classList.add("error-text");
        }
      });
  }

  view();
}
