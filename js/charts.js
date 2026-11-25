import { COLORS } from "./data.js?v=20261119ac";

export const FONT = "'Public Sans', system-ui, sans-serif";

export const AXIS_LABEL = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 700,
  color: COLORS.muted,
};

export const AXIS_LINE = {
  lineStyle: { color: COLORS.border },
};

export const SPLIT_LINE = {
  lineStyle: { color: "#E8EAEC", width: 1 },
};

export const VALUE_LABEL = {
  show: true,
  fontFamily: FONT,
  fontSize: 14,
  color: COLORS.text,
};

const BASE_TOOLTIP = {
  trigger: "item",
  backgroundColor: COLORS.panel,
  borderColor: COLORS.border,
  borderWidth: 1,
  padding: [8, 10],
  textStyle: {
    fontFamily: FONT,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  extraCssText: "border-radius:4px;box-shadow:none;",
};

const BASE_LEGEND = {
  show: false,
  textStyle: {
    fontFamily: FONT,
    fontSize: 14,
    color: COLORS.muted,
  },
  icon: "rect",
  itemWidth: 12,
  itemHeight: 12,
  itemGap: 16,
};

const BASE_TEXT = {
  fontFamily: FONT,
  fontSize: 14,
  color: COLORS.text,
};

const charts = new Set();
let resizeBound = false;

function ensureResizeBinding() {
  if (resizeBound) return;
  resizeBound = true;
  window.addEventListener("resize", () => {
    for (const chart of charts) chart.resize();
  });
}

function withBase(option) {
  const merged = {
    ...option,
    animation: option.animation ?? false,
    textStyle: { ...BASE_TEXT, ...(option.textStyle || {}) },
    tooltip: { ...BASE_TOOLTIP, ...(option.tooltip || {}) },
  };
  if (option.legend) {
    merged.legend = { ...BASE_LEGEND, ...option.legend };
  }
  return merged;
}

export function initChart(element, option) {
  if (!element) return null;
  if (typeof globalThis.echarts === "undefined") {
    throw new Error(
      "ECharts tidak tersedia. Periksa koneksi ke CDN atau jalankan halaman melalui server lokal."
    );
  }
  const chart = globalThis.echarts.init(element, null, { renderer: "canvas" });
  chart.setOption(withBase(option));
  charts.add(chart);
  ensureResizeBinding();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    chart.__resizeObserver = observer;
  }
  return chart;
}

export function disposeChart(chart) {
  if (!chart) return;
  if (chart.__resizeObserver) chart.__resizeObserver.disconnect();
  chart.dispose();
  charts.delete(chart);
}

export function disposeAll() {
  for (const chart of charts) {
    if (chart.__resizeObserver) chart.__resizeObserver.disconnect();
    chart.dispose();
  }
  charts.clear();
}

export function axisCategory(data, extra = {}) {
  const { axisLabel, ...rest } = extra;
  return {
    type: "category",
    data,
    axisLabel: { ...AXIS_LABEL, ...axisLabel },
    axisLine: AXIS_LINE,
    axisTick: { show: false },
    splitLine: { show: false },
    ...rest,
  };
}

export function axisValue(extra = {}) {
  const { axisLabel, ...rest } = extra;
  return {
    type: "value",
    axisLabel: { ...AXIS_LABEL, ...axisLabel },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: SPLIT_LINE,
    ...rest,
  };
}

let hatchPattern = null;

export function hatchFill() {
  if (hatchPattern) return hatchPattern;
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext("2d");
  context.fillStyle = COLORS.amberTint;
  context.fillRect(0, 0, 8, 8);
  context.strokeStyle = "rgba(183, 121, 31, 0.55)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-2, 10);
  context.lineTo(10, -2);
  context.stroke();
  context.beginPath();
  context.moveTo(2, 14);
  context.lineTo(14, 2);
  context.stroke();
  hatchPattern = { image: canvas, repeat: "repeat" };
  return hatchPattern;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableText(backgroundHex) {
  const dark = COLORS.text;
  const white = "#FFFFFF";
  return contrast(backgroundHex, dark) >= contrast(backgroundHex, white)
    ? dark
    : white;
}

export function mixColor(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  const ratio = Math.max(0, Math.min(1, t));
  const toHexChannel = (value) =>
    Math.round(value).toString(16).padStart(2, "0");
  return `#${toHexChannel(a.r + (b.r - a.r) * ratio)}${toHexChannel(
    a.g + (b.g - a.g) * ratio
  )}${toHexChannel(a.b + (b.b - a.b) * ratio)}`;
}

export function scaleColor(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const span = max - min;
  const t = span === 0 ? 0.5 : (value - min) / span;
  return mixColor(COLORS.sequentialLight, COLORS.sequentialDark, t);
}
