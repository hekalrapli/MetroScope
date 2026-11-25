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
} from "../data.js?v=20261119ac";
import {
  initChart,
  disposeChart,
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
  panel,
  chartPanel,
  dataTable,
  tableToggle,
  legend,
} from "../ui.js?v=20261119ac";
import {
  createPsuChoropleth,
  disposeAllMaps,
  scopeLabel,
} from "../choropleth.js?v=20261125a";

const CBQ2_YEAR_COLORS = {
  2023: "#9DBAD5",
  2024: "#4F7FAE",
  2025: "#1F4E79",
};

const UNIQUE_KEL_COLOR = COLORS.text;

function detailLink(href, testMode, panelKey, label) {
  if (testMode) {
    return `<button type="button" class="zoom-panel-btn" data-zoom-panel="${esc(panelKey)}" aria-label="Perbesar ${esc(label)}">Perbesar</button>`;
  }
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

export function render(root, rows, options = {}) {
  const {
    testMode = false,
    initialYear = "all",
    onYearChange = null,
    onZoomOpen = null,
  } = options;
  let selectedYear = initialYear;
  let activeModal = null;

  function closeModal() {
    if (!activeModal) return;
    const closing = activeModal;
    activeModal = null;
    closing.cleanup();
  }

  function view() {
    closeModal();
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
          tools: detailLink("#cbq1", testMode, "cbq1", "CBQ 1 — Tren tahunan catatan RW"),
        })}
        ${panel({
          title: "CBQ 5 — Persebaran PSU per kelurahan",
          className: "col-6",
          tools: detailLink("#cbq5", testMode, "cbq5", "CBQ 5 — Persebaran PSU per kelurahan"),
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
          tools: detailLink("#cbq2", testMode, "cbq2", "CBQ 2 — Perbandingan antarwilayah"),
        })}
        ${chartPanel({
          title: "CBQ 3 — Konsentrasi lokasi",
          chartId: "ov-cbq3",
          height: 340,
          ariaLabel: `Horizontal bar top 10 kelurahan berdasarkan catatan RW, ${scope}, dengan warna wilayah induk.`,
          tableHtml: topTable,
          className: "col-4",
          tools: detailLink("#cbq3", testMode, "cbq3", "CBQ 3 — Konsentrasi lokasi"),
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
          tools: detailLink("#cbq4", testMode, "cbq4", "CBQ 4 — Perubahan cakupan"),
        })}
      </div>
    `;

    function openZoomModal(panelKey) {
      closeModal();
      if (typeof onZoomOpen === "function") onZoomOpen(panelKey);

      const modalSpecs = {
        cbq1: {
          title: `CBQ 1 — Tren tahunan catatan RW (${scope})`,
          type: "chart",
          option: () => lineCbq1Option(counts, selectedYear),
          tableHtml: lineTable,
          ariaLabel: "Line chart jumlah catatan RW per tahun 2023, 2024, dan 2025.",
        },
        cbq2: {
          title: `CBQ 2 — Perbandingan antarwilayah (${scope})`,
          type: "chart",
          option: () => groupedCbq2Option(matrix, regionOrder, selectedYear),
          tableHtml: barsTable,
          ariaLabel: "Grouped bar catatan RW per wilayah untuk tahun 2023, 2024, dan 2025.",
        },
        cbq3: {
          title: `CBQ 3 — Konsentrasi lokasi (${scope})`,
          type: "chart",
          option: () => top10Option(topItems),
          tableHtml: topTable,
          extraHtml: legend(
            usedRegions.map((region) => ({
              color: REGION_COLORS[region],
              label: region,
            }))
          ),
          ariaLabel: `Horizontal bar top 10 kelurahan berdasarkan catatan RW, ${scope}.`,
        },
        cbq4: {
          title: `CBQ 4 — Perubahan cakupan (${scope})`,
          type: "chart",
          option: () => lineCbq4Option(kelCounts, coverage, selectedYear),
          tableHtml: coverageTable,
          ariaLabel: "Line chart dua seri: kelurahan unik dan RW baru per tahun 2023, 2024, 2025.",
        },
        cbq5: {
          title: `CBQ 5 — Persebaran PSU per kelurahan (${scope})`,
          type: "map",
        },
      };

      const spec = modalSpecs[panelKey];
      if (!spec) return;

      const backdrop = document.createElement("div");
      backdrop.className = "zoom-modal-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-labelledby", "zoom-modal-title");

      const zoomMapTable = `
        <table>
          <caption id="zoom-map-caption">Data alternatif peta: PSU per kelurahan, ${scope}</caption>
          <thead>
            <tr>
              <th scope="col">Wilayah</th>
              <th scope="col">Kecamatan</th>
              <th scope="col">Kelurahan</th>
              <th scope="col" class="num">PSU</th>
              <th scope="col">Keterangan</th>
            </tr>
          </thead>
          <tbody id="zoom-map-body"></tbody>
        </table>
      `;

      const bodyHtml =
        spec.type === "map"
          ? `
            <div id="zoom-ov-map" class="choropleth zoom-modal-map" role="img" aria-label="Choropleth jumlah PSU per kelurahan DKI Jakarta, ${scope}."></div>
            <div class="map-actions">
              <button type="button" class="link-btn" data-zoom-map-fit="mainland">Jakarta</button>
              <button type="button" class="link-btn" data-zoom-map-fit="all">Semua DKI</button>
              <button type="button" class="link-btn" data-zoom-map-labels aria-pressed="true">Sembunyikan label wilayah</button>
            </div>
            <div class="map-legend" id="zoom-map-legend"></div>
            <p class="note" id="zoom-map-status">Memuat batas kelurahan…</p>
            ${tableToggle(zoomMapTable, "zoom-map-table")}
          `
          : `
            ${spec.extraHtml || ""}
            <div class="chart zoom-modal-chart" id="zoom-ov-chart" role="img" aria-label="${esc(spec.ariaLabel)}"></div>
            ${spec.tableHtml ? tableToggle(spec.tableHtml, "zoom-chart-table") : ""}
          `;

      backdrop.innerHTML = `
        <div class="zoom-modal-card panel">
          <div class="zoom-modal-head">
            <h2 id="zoom-modal-title" class="panel-title">${esc(spec.title)}</h2>
            <button type="button" class="zoom-modal-close" data-zoom-close aria-label="Tutup tampilan perbesar">Tutup ×</button>
          </div>
          <div class="zoom-modal-body">${bodyHtml}</div>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.classList.add("has-zoom-modal");

      let modalChart = null;
      let modalMapHandle = null;
      let disposed = false;

      const onKeyDown = (event) => {
        if (event.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", onKeyDown);

      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop || event.target.closest("[data-zoom-close]")) {
          closeModal();
        }
      });

      activeModal = {
        cleanup() {
          disposed = true;
          document.removeEventListener("keydown", onKeyDown);
          if (modalChart) disposeChart(modalChart);
          if (modalMapHandle) modalMapHandle.destroy();
          backdrop.remove();
          document.body.classList.remove("has-zoom-modal");
        },
      };

      if (spec.type === "chart") {
        modalChart = initChart(
          backdrop.querySelector("#zoom-ov-chart"),
          spec.option()
        );
      } else {
        createPsuChoropleth({
          container: backdrop.querySelector("#zoom-ov-map"),
          legendEl: backdrop.querySelector("#zoom-map-legend"),
          statusEl: backdrop.querySelector("#zoom-map-status"),
          tableBodyEl: backdrop.querySelector("#zoom-map-body"),
          tableCaptionEl: backdrop.querySelector("#zoom-map-caption"),
          rows,
          tahun: selectedYear,
          fit: "mainland",
          labelStyle: "short",
        })
          .then((handle) => {
            if (!handle) return;
            if (disposed) {
              handle.destroy();
              return;
            }
            modalMapHandle = handle;
            const mainland = backdrop.querySelector('[data-zoom-map-fit="mainland"]');
            const all = backdrop.querySelector('[data-zoom-map-fit="all"]');
            const labels = backdrop.querySelector("[data-zoom-map-labels]");
            function updateZoomLabels(visible) {
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
                updateZoomLabels(handle.setLabelsVisible(true));
              });
            }
            if (all) {
              all.addEventListener("click", () => {
                handle.fitAll();
                updateZoomLabels(handle.setLabelsVisible(false));
              });
            }
            if (labels && handle.hasLabels) {
              updateZoomLabels(handle.labelsVisible);
              labels.addEventListener("click", () => {
                updateZoomLabels(handle.toggleLabels());
              });
            }
          })
          .catch((error) => {
            const status = backdrop.querySelector("#zoom-map-status");
            if (status) {
              status.textContent = `Peta tidak dapat dimuat: ${error.message}`;
              status.classList.add("error-text");
            }
          });
      }
    }

    root.querySelectorAll("[data-year]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedYear =
          button.dataset.year === "all" ? "all" : Number(button.dataset.year);
        if (typeof onYearChange === "function") onYearChange(selectedYear);
        view();
      });
    });

    if (testMode) {
      root.querySelectorAll("[data-zoom-panel]").forEach((button) => {
        button.addEventListener("click", () => {
          openZoomModal(button.dataset.zoomPanel);
        });
      });
    }

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

  return {
    getSelectedYear: () => selectedYear,
    setYear(year) {
      selectedYear = year;
      view();
    },
    closeModal,
    destroy() {
      closeModal();
      disposeAll();
      disposeAllMaps();
    },
  };
}
