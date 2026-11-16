export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function deltaMark(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value > 0 ? "▲" : value < 0 ? "▼" : "■";
}

export function pageHead({ answer }) {
  return `
    <div class="page-head">
      <div class="page-head-text">
        <h1 class="answer">${answer}</h1>
      </div>
    </div>
  `;
}

export function filterBar(filters) {
  return filters
    ? `<div class="filters filter-bar" aria-label="Filter halaman">${filters}</div>`
    : "";
}

export function filterSelect({ id, label, options, value }) {
  const optionHtml = options
    .map(
      (option) =>
        `<option value="${esc(option.value)}"${
          String(option.value) === String(value) ? " selected" : ""
        }>${esc(option.label)}</option>`
    )
    .join("");
  return `
    <label class="filter" for="${esc(id)}">
      <span>${esc(label)}</span>
      <select id="${esc(id)}">${optionHtml}</select>
    </label>
  `;
}

export function scorecardGrid(cards) {
  const span = cards.length === 4 ? "col-3" : "col-4";
  const items = cards
    .map(
      (card) => `
        <section class="panel scorecard ${span}">
          <div class="score-label">${card.label}</div>
          <div class="score-value">${card.value}</div>
          ${card.delta ? `<div class="score-delta">${card.delta}</div>` : ""}
          ${card.meta ? `<div class="score-meta">${card.meta}</div>` : ""}
        </section>
      `
    )
    .join("");
  return `<div class="grid">${items}</div>`;
}

export function panel({ title, sub = "", body, className = "", tools = "" }) {
  return `
    <section class="panel ${className}">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${title}</h2>
          ${sub ? `<p class="panel-sub">${sub}</p>` : ""}
        </div>
        ${tools}
      </div>
      <div class="panel-body">${body}</div>
    </section>
  `;
}

export function chartPanel({
  title,
  sub = "",
  chartId,
  height = 340,
  ariaLabel,
  tableHtml = "",
  note = "",
  extraHtml = "",
  className = "",
  tools = "",
}) {
  const tableId = `${chartId}-table`;
  const toggle = tableHtml
    ? `
      <div class="chart-toolbar">
        <button class="link-btn" type="button" data-table-toggle aria-expanded="false" aria-controls="${tableId}">
          Lihat sebagai tabel
        </button>
      </div>
      <div class="chart-table" id="${tableId}" hidden>${tableHtml}</div>
    `
    : "";
  return panel({
    title,
    sub,
    className,
    tools,
    body: `
      ${extraHtml}
      <div class="chart" id="${chartId}" style="height:${height}px" role="img" aria-label="${esc(ariaLabel)}"></div>
      ${note ? `<p class="note">${note}</p>` : ""}
      ${toggle}
    `,
  });
}

export function tableToggle(tableHtml, id) {
  return `
    <div class="chart-toolbar">
      <button class="link-btn" type="button" data-table-toggle aria-expanded="false" aria-controls="${id}">
        Lihat sebagai tabel
      </button>
    </div>
    <div class="chart-table" id="${id}" hidden>${tableHtml}</div>
  `;
}

export function dataTable({ caption = "", columns, rows, className = "" }) {
  const head = columns
    .map(
      (column) =>
        `<th scope="col"${column.num ? ' class="num"' : ""}>${column.label}</th>`
    )
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, index) =>
              `<td${columns[index]?.num ? ' class="num"' : ""}>${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return `
    <table class="${className}">
      ${caption ? `<caption>${caption}</caption>` : ""}
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function amberNote(html) {
  return `<p class="amber-note" role="note">${html}</p>`;
}

export function legend(items) {
  return `
    <div class="legend" aria-label="Legenda warna">
      ${items
        .map(
          (item) =>
            `<span class="legend-item"><span class="swatch" style="background:${item.color}"></span>${esc(item.label)}</span>`
        )
        .join("")}
    </div>
  `;
}
