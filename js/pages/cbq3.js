import {
  YEARS,
  WILAYAH,
  REGION_COLORS,
  COLORS,
  filterRows,
  topKelurahan,
  topKecamatan,
  uniqueKelurahan,
  kelurahanKey,
  kecamatanKey,
  rwKey,
  fmtInt,
  fmtPct,
} from "../data.js?v=20261119aa";
import {
  initChart,
  disposeAll,
  axisCategory,
  axisValue,
  VALUE_LABEL,
  FONT,
} from "../charts.js?v=20261119aa";
import {
  esc,
  pageHead,
  filterBar,
  filterSelect,
  scorecardGrid,
  chartPanel,
  panel,
  dataTable,
  legend,
} from "../ui.js?v=20261119aa";

function titleText(items, total) {
  if (total === 0 || items.length === 0) {
    return "Tidak ada catatan RW pada filter ini";
  }
  if (items.length === 1) {
    const only = items[0];
    return `${only.kelurahan} (${fmtInt(
      only.count
    )}) memegang ${fmtInt(only.count)} dari ${fmtInt(total)} catatan (${fmtPct(
      (only.count / total) * 100,
      0
    )})`;
  }
  const [first, second] = items;
  const sum = first.count + second.count;
  const sameRegion = first.wilayah === second.wilayah;
  const place = sameRegion ? `, keduanya di ${first.wilayah},` : "";
  return `${first.kelurahan} (${fmtInt(first.count)}) dan ${
    second.kelurahan
  } (${fmtInt(second.count)})${place} memegang ${fmtInt(sum)} dari ${fmtInt(
    total
  )} catatan (${fmtPct((sum / total) * 100, 0)})`;
}

function topOption(items, mode) {
  const labels = items.map((item) =>
    mode === "kelurahan" ? item.kelurahan : item.kecamatan
  );
  const maxCount = Math.max(...items.map((item) => item.count), 1);
  return {
    grid: { left: 8, right: 64, top: 12, bottom: 12, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter(params) {
        const item = params.data;
        if (!item) return "";
        const name = mode === "kelurahan" ? item.kelurahan : item.kecamatan;
        return `<strong>${esc(name)}</strong><br>${fmtInt(
          item.value
        )} catatan RW<br><span style="color:${COLORS.muted}">${
          mode === "kelurahan"
            ? `${esc(item.kecamatan)}, ${esc(item.wilayah)}`
            : esc(item.wilayah)
        }</span>`;
      },
    },
    xAxis: axisValue({
      min: 0,
      max: Math.max(1, Math.ceil((maxCount * 1.2) / 5) * 5),
      axisLabel: { show: false },
      splitLine: { show: true, lineStyle: { color: "#E8EAEC" } },
    }),
    yAxis: axisCategory(labels, { inverse: true }),
    series: [
      {
        name: mode === "kelurahan" ? "Kelurahan" : "Kecamatan",
        type: "bar",
        barWidth: "58%",
        data: items.map((item) => ({
          value: item.count,
          key: item.key,
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

function detailTableHtml(detail, mode) {
  if (!detail) {
    return '<p class="muted">Klik salah satu batang untuk melihat daftar RW di wilayah tersebut.</p>';
  }
  const groups = new Map();
  for (const row of detail.rows) {
    const key = rwKey(row);
    if (!groups.has(key)) {
      groups.set(key, {
        rw: row.rw,
        kelurahan: row.kelurahan,
        kecamatan: row.kecamatan,
        years: new Set(),
        count: 0,
      });
    }
    const group = groups.get(key);
    group.years.add(row.tahun);
    group.count += 1;
  }
  const list = [...groups.values()].sort(
    (a, b) =>
      Number(a.rw) - Number(b.rw) ||
      a.kelurahan.localeCompare(b.kelurahan, "id")
  );
  const yearColumns = YEARS.map((year) => ({
    label: String(year),
    num: true,
  }));
  const columns =
    mode === "kelurahan"
      ? [
          { label: "RW", num: true },
          ...yearColumns,
          { label: "Catatan", num: true },
        ]
      : [
          { label: "RW", num: true },
          { label: "Kelurahan" },
          ...yearColumns,
          { label: "Catatan", num: true },
        ];
  const tableRows = list.map((item) => {
    const years = YEARS.map((year) => (item.years.has(year) ? "✓" : "—"));
    if (mode === "kelurahan") {
      return [esc(item.rw), ...years, fmtInt(item.count)];
    }
    return [esc(item.rw), esc(item.kelurahan), ...years, fmtInt(item.count)];
  });
  const scope =
    mode === "kelurahan"
      ? `Kelurahan ${esc(detail.label)} — ${esc(detail.wilayah)}, ${esc(
          detail.kecamatan
        )}`
      : `Kecamatan ${esc(detail.label)} — ${esc(detail.wilayah)}`;
  return `
    <p class="muted">${scope}</p>
    <div class="detail-table-wrap">
      ${dataTable({
        caption: `Daftar RW — ${detail.label}`,
        columns,
        rows: tableRows,
      })}
    </div>
    <p class="note">✓ = ada catatan RW pada tahun itu; — = tidak ada catatan (bukan nol). Satu RW dapat tercatat pada beberapa tahun, sehingga jumlah catatan bisa lebih besar dari jumlah baris RW.</p>
  `;
}

export function render(root, rows) {
  let tahun = "all";
  let wilayah = "all";
  let mode = "kelurahan";
  let detailKey = null;

  function view() {
    disposeAll();
    const filtered = filterRows(rows, { tahun, wilayah });
    const total = filtered.length;
    const kelurahanTop = topKelurahan(filtered, null);
    const kecamatanTop = topKecamatan(filtered, null);
    const top2 = kelurahanTop.slice(0, 2);
    const topKel = kelurahanTop[0] ?? null;
    const topKec = kecamatanTop[0] ?? null;
    const uniqueKel = uniqueKelurahan(filtered);
    const items = (
      mode === "kelurahan" ? kelurahanTop : kecamatanTop
    ).slice(0, 10);
    const detail = detailKey
      ? items.find((item) => item.key === detailKey) ??
        (mode === "kelurahan" ? kelurahanTop : kecamatanTop).find(
          (item) => item.key === detailKey
        )
      : null;

    if (detail) {
      const detailRows =
        mode === "kelurahan"
          ? filtered.filter((row) => kelurahanKey(row) === detail.key)
          : filtered.filter((row) => kecamatanKey(row) === detail.key);
      detail.rows = detailRows;
      detail.label =
        mode === "kelurahan" ? detail.kelurahan : detail.kecamatan;
    }

    const topTable = dataTable({
      caption: `Data alternatif: top 10 ${
        mode === "kelurahan" ? "kelurahan" : "kecamatan"
      }`,
      columns: [
        { label: mode === "kelurahan" ? "Kelurahan" : "Kecamatan" },
        { label: "Wilayah" },
        { label: "Catatan RW", num: true },
      ],
      rows: items.map((item) => [
        esc(mode === "kelurahan" ? item.kelurahan : item.kecamatan),
        esc(item.wilayah),
        fmtInt(item.count),
      ]),
    });

    const usedRegions = WILAYAH.filter((region) =>
      items.some((item) => item.wilayah === region)
    );

    const detailPrompt = detailTableHtml(detail, mode);

    root.innerHTML = `
      ${pageHead({
        answer: "Kecamatan &amp; Kelurahan Teratas",
      })}

      ${filterBar(
        filterSelect({
          id: "filter-tahun-cbq3",
          label: "Tahun",
          value: tahun,
          options: [
            { value: "all", label: "Semua tahun" },
            ...YEARS.map((year) => ({ value: year, label: String(year) })),
          ],
        }) +
        filterSelect({
          id: "filter-wilayah-cbq3",
          label: "Wilayah",
          value: wilayah,
          options: [
            { value: "all", label: "Semua wilayah" },
            ...WILAYAH.map((region) => ({
              value: region,
              label: region,
            })),
          ],
        })
      )}

      <div class="zone">
        ${scorecardGrid([
          {
            value: topKel ? fmtInt(topKel.count) : "—",
            label: topKel
              ? `${topKel.kelurahan} — catatan RW terbanyak`
              : "Kelurahan teratas",
            meta: topKel
              ? `${esc(topKel.wilayah)} · ${esc(topKel.kecamatan)}`
              : "tidak ada catatan",
          },
          {
            value: topKec ? fmtInt(topKec.count) : "—",
            label: topKec
              ? `${topKec.kecamatan} — catatan RW terbanyak`
              : "Kecamatan teratas",
            meta: topKec ? esc(topKec.wilayah) : "tidak ada catatan",
          },
          {
            value: total > 0 ? fmtInt(uniqueKel) : "—",
            label: "Kelurahan tersentuh",
            meta:
              total > 0
                ? `${fmtInt(total)} catatan RW pada filter ini`
                : "tidak ada catatan",
          },
        ])}
      </div>
      <div class="zone">
        ${chartPanel({
          title: `Top 10 ${mode === "kelurahan" ? "kelurahan" : "kecamatan"}`,
          sub: "Batang = jumlah catatan RW (satu RW dapat tercatat pada beberapa tahun).",
          chartId: "top-cbq3",
          height: 400,
          ariaLabel: `Horizontal bar top 10 ${
            mode === "kelurahan" ? "kelurahan" : "kecamatan"
          } berdasarkan jumlah catatan RW. Warna batang menunjukkan wilayah induk.`,
          tableHtml: topTable,
          tools: `
            <div class="segmented" role="group" aria-label="Pilih tingkat wilayah">
              <button type="button" data-mode="kelurahan" class="${
                mode === "kelurahan" ? "active" : ""
              }" aria-pressed="${mode === "kelurahan"}">Kelurahan</button>
              <button type="button" data-mode="kecamatan" class="${
                mode === "kecamatan" ? "active" : ""
              }" aria-pressed="${mode === "kecamatan"}">Kecamatan</button>
            </div>
          `,
          extraHtml:
            items.length > 0
              ? legend(
                  usedRegions.map((region) => ({
                    color: REGION_COLORS[region],
                    label: region,
                  }))
                )
              : "",
        })}
      </div>

      <div class="zone">
        ${panel({
          title: "Rincian RW",
          body: `
            <div id="detail-cbq3" class="detail-body" aria-live="polite">${detailPrompt}</div>
          `,
        })}
      </div>
    `;

    root.querySelector("#filter-tahun-cbq3").addEventListener("change", (event) => {
      tahun = event.target.value;
      detailKey = null;
      view();
    });
    root.querySelector("#filter-wilayah-cbq3").addEventListener("change", (event) => {
      wilayah = event.target.value;
      detailKey = null;
      view();
    });
    root.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        mode = button.dataset.mode;
        detailKey = null;
        view();
      });
    });
    if (items.length > 0) {
      const chart = initChart(
        root.querySelector("#top-cbq3"),
        topOption(items, mode)
      );
      chart.on("click", (params) => {
        if (!params.data?.key) return;
        detailKey = params.data.key;
        const selected = items.find((item) => item.key === detailKey);
        if (!selected) return;
        selected.rows = filtered.filter((row) =>
          mode === "kelurahan"
            ? kelurahanKey(row) === selected.key
            : kecamatanKey(row) === selected.key
        );
        selected.label =
          mode === "kelurahan" ? selected.kelurahan : selected.kecamatan;
        const detailContainer = root.querySelector("#detail-cbq3");
        detailContainer.innerHTML = detailTableHtml(selected, mode);
      });
    } else {
      const chartEl = root.querySelector("#top-cbq3");
      if (chartEl) {
        chartEl.outerHTML =
          '<p class="empty-state">Tidak ada catatan RW pada filter ini. Coba ubah tahun atau wilayah.</p>';
      }
    }
  }

  view();
}
