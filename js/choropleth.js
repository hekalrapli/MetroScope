import {
  WILAYAH,
  psuKelurahanYearMap,
  kelurahanKey,
  fmtInt,
  COLORS,
} from "./data.js?v=20261119ac";
import { scaleColor } from "./charts.js?v=20261125c";
import { esc } from "./ui.js?v=20261119ac";

const GEOJSON_URL = "data/kelurahan.geojson";
const KOTA_GEOJSON_URL = "data/kota.geojson";
const maps = new Set();
let geoPromise = null;
let kotaGeoPromise = null;

export function scopeLabel(tahun) {
  return tahun === "all" ? "2023–2025" : String(tahun);
}

export async function loadKelurahanGeoJSON() {
  if (!geoPromise) {
    geoPromise = fetch(GEOJSON_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `GeoJSON kelurahan gagal dimuat (HTTP ${response.status}).`
          );
        }
        return response.json();
      })
      .then((geojson) => {
        if (
          geojson.type !== "FeatureCollection" ||
          !Array.isArray(geojson.features) ||
          geojson.features.length === 0
        ) {
          throw new Error("GeoJSON kelurahan tidak valid atau kosong.");
        }
        return geojson;
      })
      .catch((error) => {
        geoPromise = null;
        throw error;
      });
  }
  return geoPromise;
}

export async function loadKotaGeoJSON() {
  if (!kotaGeoPromise) {
    kotaGeoPromise = fetch(KOTA_GEOJSON_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GeoJSON kota gagal dimuat (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((geojson) => {
        if (
          geojson.type !== "FeatureCollection" ||
          !Array.isArray(geojson.features) ||
          geojson.features.length === 0
        ) {
          throw new Error("GeoJSON kota tidak valid atau kosong.");
        }
        return geojson;
      })
      .catch((error) => {
        kotaGeoPromise = null;
        throw error;
      });
  }
  return kotaGeoPromise;
}

function ringAreaAndCentroid(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const count = Math.max(1, ring.length - 1);
    return [
      ring.slice(0, -1).reduce((sum, point) => sum + point[0], 0) / count,
      ring.slice(0, -1).reduce((sum, point) => sum + point[1], 0) / count,
    ];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

function cityLabelPoint(feature) {
  const geometry = feature.geometry;
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.coordinates;
  let best = null;
  let bestArea = 0;
  for (const polygon of polygons) {
    const ring = polygon[0];
    const area = Math.abs(
      ring.reduce((sum, point, index) => {
        if (index === ring.length - 1) return sum;
        const next = ring[index + 1];
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0) / 2
    );
    if (area > bestArea) {
      bestArea = area;
      best = ring;
    }
  }
  const [lng, lat] = ringAreaAndCentroid(best);
  return [lat, lng];
}

export function computeMapData(geojson, rows, tahun) {
  const psuMap = psuKelurahanYearMap(rows);
  const values = new Map();
  for (const item of psuMap.values()) {
    if (tahun !== "all" && item.tahun !== Number(tahun)) continue;
    const key = kelurahanKey(item);
    values.set(key, (values.get(key) ?? 0) + item.psu);
  }

  const features = geojson.features;
  const geoKeys = new Set(
    features
      .map((feature) => feature.properties?.join_key)
      .filter(Boolean)
  );
  const csvKeys = new Set(rows.map(kelurahanKey));
  const unmatchedKeys = [...csvKeys].filter((key) => !geoKeys.has(key));
  const unmatched = unmatchedKeys.map((key) => {
    const [wilayah, kecamatan, kelurahan] = key.split("|");
    return {
      key,
      wilayah,
      kecamatan,
      kelurahan,
      value: values.has(key) ? values.get(key) : null,
    };
  });

  let matchedSum = 0;
  let matchedWithValue = 0;
  for (const [key, value] of values) {
    if (geoKeys.has(key)) {
      matchedSum += value;
      matchedWithValue += 1;
    }
  }
  const unmatchedSum = unmatched.reduce(
    (sum, item) => sum + (item.value ?? 0),
    0
  );
  const maxValue = Math.max(
    1,
    ...[...values.entries()]
      .filter(([key]) => geoKeys.has(key))
      .map(([, value]) => value)
  );

  return {
    values,
    maxValue,
    matchedSum,
    unmatchedSum,
    unmatched,
    matchedWithValue,
    matchedFeatures: geoKeys.size,
    featuresWithValue: features.filter(
      (feature) =>
        feature.properties?.join_key &&
        values.has(feature.properties.join_key)
    ).length,
    geoWithoutData: features.length - geoKeys.size,
    featureCount: features.length,
  };
}

function tooltipHtml(feature, values, tahun) {
  const props = feature.properties;
  const value = props.join_key ? values.get(props.join_key) : null;
  const mapped = Boolean(props.join_key);
  const valueText = mapped
    ? value === undefined
      ? "Tidak ada data PSU pada periode ini"
      : `${fmtInt(value)} PSU`
    : "Tidak ada data yang dapat dipetakan";
  return `
    <strong>${esc(props.kelurahan)}</strong><br>
    ${esc(props.kecamatan)}, ${esc(props.wilayah)}<br>
    ${valueText}<br>
    <span style="color:${COLORS.muted}">${scopeLabel(tahun)} · bukan ukuran kebutuhan atau keberhasilan pembangunan.</span>
  `;
}

function baseStyle(feature, values, maxValue) {
  const key = feature.properties?.join_key;
  const value = key ? values.get(key) : undefined;
  const hasData = key && value !== undefined;
  return {
    fillColor: hasData ? scaleColor(value, 0, maxValue) : "#E3E5E6",
    fillOpacity: hasData ? 0.9 : 0.68,
    color: hasData ? "#FFFFFF" : "#A7ADB2",
    weight: hasData ? 0.7 : 0.6,
    dashArray: hasData ? null : "3 2",
  };
}

function fillTable(tableBodyEl, tableCaptionEl, geojson, data, tahun) {
  if (!tableBodyEl) return;
  const rows = geojson.features
    .filter((feature) => feature.properties?.join_key)
    .map((feature) => {
      const props = feature.properties;
      const value = data.values.get(props.join_key);
      return {
        wilayah: props.wilayah,
        kecamatan: props.kecamatan,
        kelurahan: props.kelurahan,
        value: value === undefined ? null : value,
        status:
          value === undefined
            ? "Tidak ada PSU pada filter"
            : "Terpetakan",
        order: 0,
      };
    })
    .sort(
      (a, b) =>
        a.wilayah.localeCompare(b.wilayah, "id") ||
        a.kecamatan.localeCompare(b.kecamatan, "id") ||
        a.kelurahan.localeCompare(b.kelurahan, "id")
    );
  for (const item of data.unmatched) {
    rows.push({
      ...item,
      status: "Tidak dapat dipetakan (nama lama)",
      order: 1,
    });
  }
  tableBodyEl.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${esc(row.wilayah)}</td>
          <td>${esc(row.kecamatan)}</td>
          <td>${esc(row.kelurahan)}</td>
          <td class="num">${
            row.value === null || row.value === undefined
              ? '<span class="muted">tidak ada data</span>'
              : fmtInt(row.value)
          }</td>
          <td>${esc(row.status)}</td>
        </tr>
      `
    )
    .join("");
  if (tableCaptionEl) {
    tableCaptionEl.textContent = `Data alternatif peta: PSU per kelurahan, ${scopeLabel(
      tahun
    )}`;
  }
}

export async function createPsuChoropleth({
  container,
  legendEl,
  noteEl,
  statusEl,
  tableBodyEl,
  tableCaptionEl,
  qualityEl,
  rows,
  tahun,
  fit = "mainland",
  labelStyle = "full",
}) {
  if (!container) return null;
  if (typeof globalThis.L === "undefined") {
    throw new Error(
      "Leaflet tidak tersedia. Periksa koneksi ke CDN atau jalankan halaman melalui server lokal."
    );
  }
  if (statusEl) statusEl.textContent = "Memuat batas kelurahan…";
  const geojson = await loadKelurahanGeoJSON();
  let kotaGeo = null;
  try {
    kotaGeo = await loadKotaGeoJSON();
  } catch {
    kotaGeo = null;
  }
  if (!container.isConnected) return null;

  const data = computeMapData(geojson, rows, tahun);
  const map = globalThis.L.map(container, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 8,
    maxZoom: 16,
  });
  for (const [name, zIndex] of [
    ["kelurahanPane", 410],
    ["kotaPane", 420],
    ["labelPane", 430],
  ]) {
    map.createPane(name);
    map.getPane(name).style.zIndex = String(zIndex);
  }

  let selectedLayer = null;
  let selectedFeature = null;

  const layer = globalThis.L.geoJSON(geojson, {
    pane: "kelurahanPane",
    style: (feature) => baseStyle(feature, data.values, data.maxValue),
    onEachFeature(feature, featureLayer) {
      const infoHtml = tooltipHtml(feature, data.values, tahun);
      featureLayer.bindTooltip(infoHtml, {
        sticky: true,
        direction: "top",
        className: "psu-tooltip",
        opacity: 1,
      });
      featureLayer.bindPopup(infoHtml, {
        className: "psu-popup",
        maxWidth: 220,
        autoPanPadding: [36, 20],
        closeButton: true,
      });
      featureLayer.on({
        mouseover(event) {
          event.target.setStyle({
            weight: 2,
            color: COLORS.text,
            fillOpacity: 1,
          });
          event.target.bringToFront();
        },
        mouseout(event) {
          if (event.target === selectedLayer) return;
          event.target.setStyle(
            baseStyle(feature, data.values, data.maxValue)
          );
        },
        click(event) {
          if (selectedLayer && selectedLayer !== event.target && selectedFeature) {
            selectedLayer.setStyle(
              baseStyle(selectedFeature, data.values, data.maxValue)
            );
          }
          selectedLayer = event.target;
          selectedFeature = feature;
          event.target.setStyle({
            weight: 2.2,
            color: COLORS.text,
            fillOpacity: 1,
          });
          event.target.bringToFront();
          event.target.closeTooltip();
        },
        popupclose(event) {
          if (event.target === selectedLayer) {
            selectedLayer = null;
            selectedFeature = null;
          }
          event.target.setStyle(
            baseStyle(feature, data.values, data.maxValue)
          );
        },
      });
    },
  }).addTo(map);

  let kotaLayer = null;
  let labelsLayer = null;
  let labelsVisible = false;
  if (kotaGeo) {
    kotaLayer = globalThis.L.geoJSON(kotaGeo, {
      pane: "kotaPane",
      interactive: false,
      style: {
        fill: false,
        color: COLORS.text,
        weight: 1.6,
        opacity: 0.62,
        interactive: false,
      },
    }).addTo(map);
    labelsLayer = globalThis.L.layerGroup(
      kotaGeo.features.map((feature) => {
        const name = feature.properties.wilayah;
        const labelText =
          labelStyle === "short" ? name.replace(/^Jakarta /, "") : name;
        return globalThis.L.marker(cityLabelPoint(feature), {
          icon: globalThis.L.divIcon({
            className: "city-label-anchor",
            html: "",
            iconSize: [0, 0],
          }),
          pane: "labelPane",
          interactive: false,
          keyboard: false,
        }).bindTooltip(`<span class="city-label-text">${esc(labelText)}</span>`, {
          permanent: true,
          direction: "center",
          className: "city-label-tooltip",
          opacity: 1,
        });
      })
    );
    labelsVisible = container.clientWidth >= 480;
    if (labelsVisible) labelsLayer.addTo(map);
  }

  const mainlandGeo = {
    type: "FeatureCollection",
    features: geojson.features.filter(
      (feature) => feature.properties.wilayah !== "Kep. Seribu"
    ),
  };
  const mainlandLayer = globalThis.L.geoJSON(mainlandGeo);
  const mainlandBounds = mainlandLayer.getBounds();
  const allBounds = layer.getBounds();
  const fitMainland = () =>
    map.fitBounds(mainlandBounds, { padding: [10, 10] });
  const fitAll = () => map.fitBounds(allBounds, { padding: [10, 10] });
  if (fit === "all") fitAll();
  else fitMainland();
  setTimeout(() => {
    map.invalidateSize();
    if (fit === "all") fitAll();
    else fitMainland();
  }, 120);

  if (legendEl) {
    legendEl.innerHTML = `
      <div class="map-legend-head">PSU ${scopeLabel(tahun)}</div>
      <div class="map-legend-scale">
        <span>0</span>
        <span class="scale-bar"></span>
        <span>${fmtInt(data.maxValue)}</span>
      </div>
      <div class="map-legend-subhead">Wilayah administrasi</div>
      <p class="map-admin-list">${WILAYAH.map((region) => esc(region)).join(" · ")}</p>
      <div class="map-legend-lines">
        <span><i class="line-swatch line-kota"></i>Batas kota</span>
        <span><i class="line-swatch line-kelurahan"></i>Batas kelurahan</span>
      </div>
    `;
  }

  const unmatchedText = data.unmatched.length
    ? `${data.unmatched
        .map(
          (item) =>
            `${item.kelurahan} (${item.wilayah}) PSU ${
              item.value === null ? "tidak ada pada filter" : fmtInt(item.value)
            } tidak dapat dipetakan karena nama lama; nilainya tidak dianggap nol.`
        )
        .join(" ")}`
    : "";
  if (noteEl) {
    const grayCount = data.featureCount - data.featuresWithValue;
    const grayMatchedNoData = grayCount - data.geoWithoutData;
    const grayText =
      grayMatchedNoData > 0
        ? `${grayCount} kelurahan abu: ${grayMatchedNoData} tanpa PSU pada filter ini dan ${data.geoWithoutData} tanpa catatan pada dataset.`
        : `${grayCount} kelurahan tidak memiliki catatan pada dataset (abu putus-putus).`;
    noteEl.innerHTML = `<strong>${data.featuresWithValue} kelurahan berwarna</strong> pada ${scopeLabel(
      tahun
    )}. ${grayText} PSU terpetakan: ${fmtInt(
      data.matchedSum
    )}${
      data.unmatchedSum ? `; di luar peta: ${fmtInt(data.unmatchedSum)}` : ""
    }.`;
  }
  if (qualityEl) {
    qualityEl.innerHTML = unmatchedText
      ? `<strong>Data tidak dapat dipetakan.</strong> ${unmatchedText}`
      : "";
    qualityEl.hidden = !unmatchedText;
  }

  fillTable(tableBodyEl, tableCaptionEl, geojson, data, tahun);
  if (statusEl) {
    statusEl.textContent = kotaGeo
      ? ""
      : "Batas kota administrasi tidak tersedia; label wilayah dimatikan.";
  }

  const setLabelsVisible = (visible) => {
    if (!labelsLayer) return false;
    if (visible === labelsVisible) return labelsVisible;
    if (visible) labelsLayer.addTo(map);
    else map.removeLayer(labelsLayer);
    labelsVisible = visible;
    return labelsVisible;
  };
  const toggleLabels = () => setLabelsVisible(!labelsVisible);

  const resizeObserver = new ResizeObserver(() => map.invalidateSize());
  resizeObserver.observe(container);
  const entry = {
    map,
    layer,
    kotaLayer,
    data,
    hasLabels: Boolean(labelsLayer),
    labelsVisible,
    fitMainland,
    fitAll,
    setLabelsVisible,
    toggleLabels,
    destroy() {
      resizeObserver.disconnect();
      map.remove();
      maps.delete(entry);
    },
  };
  maps.add(entry);
  return entry;
}

export function disposeAllMaps() {
  for (const entry of [...maps]) entry.destroy();
  maps.clear();
}
