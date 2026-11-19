import {
  YEARS,
  WILAYAH,
  COLORS,
  psuTotal,
  psuByYear,
  psuByRegion,
  psuByRegionYear,
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
  VALUE_LABEL,
  FONT,
  hatchFill,
  scaleColor,
} from "../charts.js?v=20261119ac";
import {
  esc,
  pageHead,
  filterBar,
  filterSelect,
  scorecardGrid,
  chartPanel,
  panel,
  dataTable,
  tableToggle,
  deltaMark,
} from "../ui.js?v=20261119ac";
import {
  createPsuChoropleth,
  disposeAllMaps,
} from "../choropleth.js?v=20261119ac";

function horizontalBarOption({ values, order, color, unit, definition }) {
  const valid = order
    .map((region) => values[region])
    .filter((value) => value !== null);
  const maxValue = Math.max(...valid, 1);
  const missing = [];
  order.forEach((region, index) => {
    if (values[region] === null) {
      missing.push({ value: [index, 0], region });
    }
  });

  const series = [
    {
      name: unit,
      type: "bar",
      barWidth: "58%",
      data: order.map((region) => {
        const value = values[region];
        return value === null
          ? null
          : { value, itemStyle: { color } };
      }),
      label: {
        ...VALUE_LABEL,
        position: "right",
        formatter: (params) =>
          params.value === null || params.value === undefined
            ? ""
            : fmtInt(params.value),
      },
      emphasis: { focus: "self" },
    },
  ];

  if (missing.length > 0) {
    series.push({
      name: "Data tidak tersedia",
      type: "custom",
      data: missing,
      tooltip: {
        formatter(params) {
          return `${params.data.region}<br><span style="color:${COLORS.muted}">data tidak tersedia; bukan nol.</span>`;
        },
      },
      renderItem(params, api) {
        const point = api.coord([0, api.value(0)]);
        const width = 10;
        const height = 14;
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
            {
              type: "text",
              style: {
                text: "tidak ada data",
                x: point[0] + width + 6,
                y: point[1],
                fill: COLORS.text,
                fontFamily: FONT,
                fontSize: 14,
                textVerticalAlign: "middle",
              },
            },
          ],
        };
      },
    });
  }

  return {
    grid: { left: 10, right: 118, top: 12, bottom: 12, containLabel: true },
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
            lines.push(`${point.seriesName}: ${fmtInt(point.value)}`);
          }
        }
        lines.push(`<span style="color:${COLORS.muted}">${definition}</span>`);
        return lines.join("<br>");
      },
    },
    xAxis: axisValue({
      min: 0,
      max: Math.max(1, Math.ceil((maxValue * 1.2) / 10) * 10),
    }),
    yAxis: axisCategory(order, { inverse: true }),
    series,
  };
}

export function render(root, rows) {
  let tahun = "all";

  function view() {
    disposeAll();
    disposeAllMaps();
    const scopeLabel = tahun === "all" ? "2023–2025" : tahun;
    const values = psuByRegion(rows, tahun);
    const matrix = psuByRegionYear(rows);
    const order = sortRegionsByValue(values);
    const valid = order
      .map((region) => ({ region, value: values[region] }))
      .filter((item) => item.value !== null);
    const top = valid[0];
    const scopedTotal = valid.reduce((sum, item) => sum + item.value, 0);
    const missing = WILAYAH.filter((region) => values[region] === null);
    const totalAll = psuTotal(rows);
    const byYear = psuByYear(rows);
    const allRegion = psuByRegion(rows, "all");
    const topAll = sortRegionsByValue(allRegion)
      .map((region) => ({ region, value: allRegion[region] }))
      .filter((item) => item.value !== null)[0];
    const delta2024 = pctChange(byYear[2024], byYear[2023]);
    const delta2025 = pctChange(byYear[2025], byYear[2024]);

    const heatValues = WILAYAH.flatMap((region) =>
      YEARS.map((year) => matrix[region][year])
    ).filter((value) => value !== null);
    const heatMax = Math.max(...heatValues, 1);

    const answer =
      scopedTotal === 0
        ? "Tidak ada data PSU pada filter ini"
        : `PSU ${scopeLabel} berjumlah ${fmtInt(
            scopedTotal
          )}; ${top.region} tertinggi dengan ${fmtInt(top.value)} (${fmtPct(
            (top.value / scopedTotal) * 100,
            1
          )})${missing.length ? `; ${missing.join(", ")} tidak tersedia` : ""}`;

    const mapTable = `
      <table>
        <caption id="cbq5-map-caption">Data alternatif peta: PSU per kelurahan, ${scopeLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Wilayah</th>
            <th scope="col">Kecamatan</th>
            <th scope="col">Kelurahan</th>
            <th scope="col" class="num">PSU</th>
            <th scope="col">Keterangan</th>
          </tr>
        </thead>
        <tbody id="cbq5-map-body"></tbody>
      </table>
    `;

    const psuTable = dataTable({
      caption: `Data alternatif: total PSU per wilayah, ${scopeLabel}`,
      columns: [{ label: "Wilayah" }, { label: "PSU", num: true }],
      rows: order.map((region) => [
        esc(region),
        values[region] === null
          ? '<span class="muted">tidak tersedia</span>'
          : fmtInt(values[region]),
      ]),
    });

    const heatTable = dataTable({
      caption: "Data alternatif heatmap: PSU wilayah x tahun",
      columns: [
        { label: "Wilayah" },
        ...YEARS.map((year) => ({ label: String(year), num: true })),
      ],
      rows: order.map((region) => [
        esc(region),
        ...YEARS.map((year) =>
          matrix[region][year] === null
            ? '<span class="muted">tidak ada data</span>'
            : fmtInt(matrix[region][year])
        ),
      ]),
    });

    const heatRows = order
      .map((region) => {
        const cells = YEARS.map((year) => {
          const value = matrix[region][year];
          const missingCell = value === null;
          const background = missingCell
            ? COLORS.amberTint
            : scaleColor(value, 0, heatMax);
          const selected =
            tahun !== "all" && Number(tahun) === Number(year);
          return `
            <div
              class="heatmap-cell${missingCell ? " is-missing" : ""}${
                selected ? " is-selected" : ""
              }"
              style="${missingCell ? "" : `background:${background};border-color:${background};`}"
              aria-label="${esc(region)} ${year}: ${
                missingCell
                  ? "data tidak ada"
                  : `${fmtInt(value)} PSU`
              }"
              title="${esc(region)} ${year}: ${
                missingCell
                  ? "data tidak ada"
                  : `${fmtInt(value)} PSU`
              }"
            >
              <span class="heatmap-value">${
                missingCell ? "tidak ada data" : fmtInt(value)
              }</span>
            </div>
          `;
        }).join("");
        return `
          <div class="heatmap-row-label">${esc(region)}</div>
          ${cells}
        `;
      })
      .join("");

    root.innerHTML = `
      ${pageHead({
        answer: "Sebaran PSU",
      })}

      ${filterBar(
        filterSelect({
          id: "filter-tahun-cbq5",
          label: "Tahun",
          value: tahun,
          options: [
            { value: "all", label: "Semua tahun" },
            ...YEARS.map((year) => ({ value: year, label: String(year) })),
          ],
        })
      )}

      <div class="zone">
        ${scorecardGrid([
          {
            value: fmtInt(totalAll),
            label: "Total PSU 2023–2025",
            meta: topAll
              ? `Wilayah tertinggi: ${esc(topAll.region)} (${fmtInt(
                  topAll.value
                )})`
              : "",
          },
          {
            value: byYear[2023] === null ? "—" : fmtInt(byYear[2023]),
            label: "PSU 2023",
          },
          {
            value: byYear[2024] === null ? "—" : fmtInt(byYear[2024]),
            label: "PSU 2024",
            delta:
              delta2024 === null
                ? "tahun sebelumnya tidak tersedia"
                : `${deltaMark(delta2024)} ${fmtSignedPct(delta2024)} vs 2023`,
          },
          {
            value: byYear[2025] === null ? "—" : fmtInt(byYear[2025]),
            label: "PSU 2025",
            delta:
              delta2025 === null
                ? "tahun sebelumnya tidak tersedia"
                : `${deltaMark(delta2025)} ${fmtSignedPct(delta2025)} vs 2024`,
          },
        ])}
      </div>
      <div class="zone grid map-zone">
        ${panel({
          title: "Choropleth PSU per kelurahan",
          className: "col-7",
          body: `
            <div id="cbq5-map" class="choropleth choropleth--cbq5" role="img" aria-label="Choropleth jumlah PSU per kelurahan DKI Jakarta, ${scopeLabel}."></div>
            ${tableToggle(mapTable, "cbq5-map-table")}
          `,
        })}
        ${panel({
          title: "Legenda peta",
          className: "col-5",
          body: `
            <div class="map-actions">
              <button type="button" class="link-btn" data-map-fit="mainland">Jakarta</button>
              <button type="button" class="link-btn" data-map-fit="all">Semua DKI</button>
              <button type="button" class="link-btn" data-map-labels aria-pressed="true">Sembunyikan label wilayah</button>
            </div>
            <div class="map-legend" id="cbq5-map-legend"></div>
            <p class="note" id="cbq5-map-status">Memuat batas kelurahan…</p>
          `,
        })}
      </div>

      <div class="zone grid">
        ${chartPanel({
          title:
            tahun === "all"
              ? "Total PSU per wilayah"
              : `PSU ${tahun} per wilayah`,
          chartId: "psu-cbq5",
          height: 260,
          ariaLabel: `Horizontal bar PSU per wilayah, ${scopeLabel}.`,
          tableHtml: psuTable,
          className: "col-6",
        })}
        ${panel({
          title: "Heatmap PSU wilayah × tahun",
          className: "col-6",
          body: `
            <div class="heatmap" role="group" aria-label="Heatmap PSU per wilayah dan tahun. Sel Jakarta Timur 2023 tidak ada data.">
              <div class="heatmap-head">Wilayah</div>
              ${YEARS.map(
                (year) =>
                  `<div class="heatmap-head${
                    tahun !== "all" && Number(tahun) === Number(year)
                      ? " is-selected"
                      : ""
                  }">${year}</div>`
              ).join("")}
              ${heatRows}
            </div>
            <div class="scale" aria-hidden="true">
              <span>0</span>
              <span class="scale-bar"></span>
              <span>${fmtInt(heatMax)}</span>
            </div>
            ${tableToggle(heatTable, "heat-cbq5-table")}
          `,
        })}
      </div>
    `;

    root.querySelector("#filter-tahun-cbq5").addEventListener("change", (event) => {
      tahun = event.target.value;
      view();
    });

    initChart(
      root.querySelector("#psu-cbq5"),
      horizontalBarOption({
        values,
        order,
        color: COLORS.primary,
        unit: "PSU",
        definition:
          "PSU dihitung dengan MAX per kelurahan per tahun, lalu dijumlahkan.",
      })
    );
    createPsuChoropleth({
      container: root.querySelector("#cbq5-map"),
      legendEl: root.querySelector("#cbq5-map-legend"),
      statusEl: root.querySelector("#cbq5-map-status"),
      tableBodyEl: root.querySelector("#cbq5-map-body"),
      tableCaptionEl: root.querySelector("#cbq5-map-caption"),
      rows,
      tahun,
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
        const status = root.querySelector("#cbq5-map-status");
        if (status) {
          status.textContent = `Peta tidak dapat dimuat: ${error.message}`;
          status.classList.add("error-text");
        }
      });
  }

  view();
}
