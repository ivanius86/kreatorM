(function (root) {
  "use strict";
  const core = () => root.MentorResearchStickerCore;
  const dimensions = { currency: ["EUR", "USD", "RSD", "GBP", "CHF"], length: ["mm", "cm", "m", "km", "in", "ft"], mass: ["g", "kg", "t", "lb"], distance: ["m", "km", "mi"], quantity: ["pcs", "pair", "pack"], volume: ["ml", "l", "m3"], time: ["s", "min", "h", "day"], other: [] };
  const measurementLimit = 4;
  const measurementCount = (entry, context) => context.getMeasurementCount?.() ?? entry.content.measurements.length;
  const defaultUnit = (dimension, context) => dimension === "quantity" ? context.t?.("designer.quantityUnit") || "pcs" : ({ currency: "EUR", length: "cm", mass: "kg", distance: "km", volume: "l", time: "min", other: "" }[dimension] || "");
  function unitControls(measurement, context) {
    const { t, escape } = context, unit = String(measurement.unit || "");
    const choices = [...new Set([...(measurement.dimension === "quantity" ? [defaultUnit("quantity", context)] : []), ...(dimensions[measurement.dimension] || [])])];
    const textInput = '<input data-measure-field="unit" value="' + escape(unit) + '">';
    if (!choices.length) return '<label><span>' + escape(t("designer.unit")) + '</span>' + textInput + '</label>';
    const custom = !choices.includes(unit);
    return '<label><span>' + escape(t("designer.unit")) + '</span><select data-measure-field="unit" data-unit-choice>' + choices.map((choice) => '<option value="' + escape(choice) + '"' + (unit === choice ? ' selected' : '') + '>' + escape(choice) + '</option>').join("") + '<option value="__custom__"' + (custom ? ' selected' : '') + '>' + escape(t("designer.customUnit")) + '</option></select></label><label data-unit-custom-wrap' + (custom ? '' : ' hidden') + '><span>' + escape(t("designer.customUnit")) + '</span>' + textInput + '</label>';
  }
  function render(entry, context) {
    const { t, escape } = context, c = entry.content, type = entry.sectionType;
    const label = (key, control) => '<label><span>' + escape(t("designer." + key)) + '</span>' + control + '</label>';
    const input = (field, value, kind = "text") => '<input type="' + kind + '" data-field="' + field + '" value="' + escape(value ?? "") + '">';
    const button = (action, key, extra = "") => '<button type="button" data-editor-action="' + action + '"' + extra + '>' + escape(t("designer." + key)) + '</button>';
    const upload = (accept, multiple = true) => label("upload", '<input type="file" data-sticker-upload' + (multiple ? ' multiple' : '') + (accept ? ' accept="' + accept + '"' : '') + '>');
    const assetList = (items) => '<div class="research-sticker-editor-assets">' + items.map((asset, index) => '<div class="research-sticker-editor-asset" data-editor-asset="' + escape(asset.id) + '">' + (asset.kind === "image" ? '<img data-sticker-asset="' + escape(asset.id) + '"' + (root.MentorResearchStickerSections.safeUrl(asset.url, true) ? ' src="' + escape(asset.url) + '"' : '') + ' alt="" draggable="false">' : '<span aria-hidden="true">' + (asset.kind === "image" ? '▧' : asset.kind === "file" ? '▤' : '♫') + '</span>') + '<span class="research-sticker-asset-name">' + escape(asset.name || t("designer.sections." + type)) + '</span><span class="research-sticker-asset-actions">' + button("open-asset", "open", ' data-asset-id="' + escape(asset.id) + '"') + (type === "media" ? button("primary", c.primaryId === asset.id ? "primarySelected" : "primary", ' data-asset-id="' + escape(asset.id) + '" aria-pressed="' + (c.primaryId === asset.id) + '"') : '') + button("asset-up", "up", ' data-asset-id="' + escape(asset.id) + '"' + (!index ? ' disabled' : '')) + button("asset-down", "down", ' data-asset-id="' + escape(asset.id) + '"' + (index === items.length - 1 ? ' disabled' : '')) + button("remove-asset", "remove", ' data-asset-id="' + escape(asset.id) + '"') + '</span></div>').join("") + '</div>';
    if (type === "notes") return '<div class="research-sticker-format-toolbar">' + button("bold", "bold") + button("italic", "italic") + '</div><textarea data-field="text" rows="5" aria-label="' + escape(t("designer.sections.notes")) + '">' + escape(c.text || "") + '</textarea>';
    if (type === "link") return label("url", input("url", c.url, "url")) + label("linkTitle", input("title", c.title)) + button("open-url", "open") + button("clear-url", "remove");
    if (type === "image") return '<div class="research-sticker-image-sources">' + upload("image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp", false) + label("imageUrl", input("url", c.asset?.mediaId || /^blob:/.test(c.asset?.url || "") ? "" : c.asset?.url || "", "url")) + '</div>' + (c.asset ? assetList([c.asset]) : '') + '<div class="research-sticker-image-settings">' + label("fit", '<select data-setting="fit"><option value="contain"' + (entry.settings.fit !== "cover" ? ' selected' : '') + '>' + escape(t("designer.contain")) + '</option><option value="cover"' + (entry.settings.fit === "cover" ? ' selected' : '') + '>' + escape(t("designer.cover")) + '</option></select>') + [ ["zoom", 1, 4, .05, 1], ["x", 0, 100, 1, 50], ["y", 0, 100, 1, 50], ["rotation", -180, 180, 90, 0] ].map(([field, min, max, step, fallback]) => label(field, '<input type="range" data-setting="' + field + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + (entry.settings[field] ?? fallback) + '">')).join("") + '</div><div class="research-sticker-image-actions">' + button("reset-image", "reset") + button("fullscreen", "fullscreen") + '</div>';
    if (type === "video") return upload("video/*,.mkv,.mov,.avi,.m4v,.wmv,.flv,.ts,.mpg,.mpeg,.3gp,.m2ts,.mts,.vob,.asf", false) + label("videoUrl", input("url", c.url, "url")) + (c.asset ? assetList([c.asset]) : '') + button("open-url", "open");
    if (type === "source") return upload("") + '<small>' + escape(t("designer.sourceHint")) + '</small>' + label("url", input("url", c.url, "url")) + assetList(c.files || []);
    if (type === "unit") return '<div class="research-sticker-measurement-editor">' + (c.measurements || []).map((measurement) => '<fieldset data-measure-id="' + escape(measurement.id) + '" aria-label="' + escape(t("designer.measurement")) + '">' + label("dimension", '<select data-measure-field="dimension">' + Object.keys(dimensions).map((dimension) => '<option value="' + dimension + '"' + (measurement.dimension === dimension ? ' selected' : '') + '>' + escape(t("designer.dimensions." + dimension)) + '</option>').join("") + '</select>') + '<div class="research-sticker-unit-controls" data-unit-controls>' + unitControls(measurement, context) + '</div>' + label("value", '<input type="number" step="any" data-measure-field="value" value="' + escape(measurement.value) + '">') + button("remove-measurement", "remove", ' data-measurement-id="' + escape(measurement.id) + '"') + '</fieldset>').join("") + '</div>' + button("add-measurement", "addMeasurement", measurementCount(entry, context) >= measurementLimit ? ' disabled' : '');
    return (type === "av" ? '<div class="research-sticker-record-actions">' + button("record-audio", "recordAudio") + button("record-video", "recordVideo") + '</div>' : '') + upload(type === "av" ? "audio/*,video/*" : "image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,audio/*,video/*") + assetList(c.items || []);
  }
  function update(entry, input, context = {}) {
    const field = input.dataset.field, setting = input.dataset.setting, measureField = input.dataset.measureField;
    if (setting) entry.settings[setting] = setting === "fit" ? input.value : Number(input.value);
    if (measureField) {
      const row = input.closest("[data-measure-id]");
      const measurement = entry.content.measurements.find((item) => item.id === row.dataset.measureId);
      if (measurement && measureField === "unit" && input.dataset.unitChoice !== undefined) {
        const custom = input.value === "__custom__", customWrap = row.querySelector("[data-unit-custom-wrap]");
        if (customWrap) customWrap.hidden = !custom;
        if (custom) {
          const textInput = customWrap?.querySelector("input");
          if (textInput) { textInput.value = measurement.unit; textInput.focus({ preventScroll: true }); }
          return;
        }
      }
      if (measurement) measurement[measureField] = measureField === "value" ? input.value === "" ? "" : Number(input.value) : input.value;
      if (measurement && measureField === "dimension") {
        measurement.unit = defaultUnit(input.value, context);
        const controls = row.querySelector("[data-unit-controls]");
        if (controls) controls.innerHTML = unitControls(measurement, context);
      }
    }
    if (!field) return;
    if (entry.sectionType === "image" && field === "url") {
      if (input.value.trim()) entry.content.asset = { id: core().uid("asset"), kind: "image", name: "", url: input.value.trim(), mediaId: "", entityType: "" };
      else entry.content.asset = null;
    } else { entry.content[field] = input.value; if (entry.sectionType === "video" && field === "url") entry.content.asset = null; }
  }
  function action(entry, button, context) {
    const name = button.dataset.editorAction, c = entry.content;
    const items = c.items || c.files || (c.asset ? [c.asset] : []);
    const asset = items.find((item) => item.id === button.dataset.assetId);
    if (name === "open-asset" || name === "fullscreen") { context.openAsset(asset || c.asset, button); return false; }
    if (name === "open-url") { context.openUrl(c.url || c.asset?.url, button); return false; }
    if (name === "record-audio" || name === "record-video") { context.record(entry, name === "record-video" ? "video" : "audio"); return false; }
    if (name === "clear-url") c.url = "";
    if (name === "remove-asset") { if (c.asset) c.asset = null; else items.splice(items.indexOf(asset), 1); if (c.primaryId === asset?.id) c.primaryId = items[0]?.id || ""; }
    if (name === "primary") { c.primaryId = asset.id; const index = items.indexOf(asset); items.splice(index, 1); items.unshift(asset); }
    if (name === "asset-up" || name === "asset-down") { const index = items.indexOf(asset); const next = index + (name === "asset-up" ? -1 : 1); if (index >= 0 && next >= 0 && next < items.length) { items.splice(index, 1); items.splice(next, 0, asset); } }
    if (name === "reset-image") entry.settings = { fit: "contain", zoom: 1, x: 50, y: 50, rotation: 0 };
    if (name === "add-measurement") {
      if (measurementCount(entry, context) >= measurementLimit) return false;
      c.measurements.push({ id: core().uid("measurement"), label: "", value: "", dimension: "quantity", unit: defaultUnit("quantity", context) });
    }
    if (name === "remove-measurement") c.measurements = c.measurements.filter((measurement) => measurement.id !== button.dataset.measurementId);
    if (name === "bold" || name === "italic") {
      const textarea = button.closest("[data-designer-section]").querySelector("textarea");
      const mark = name === "bold" ? "**" : "*", start = textarea.selectionStart, end = textarea.selectionEnd;
      textarea.setRangeText(mark + textarea.value.slice(start, end) + mark, start, end, "select"); c.text = textarea.value; c.format = "markdown"; textarea.focus(); return "preview";
    }
    return true;
  }
  root.MentorResearchStickerEditors = { render, update, action, dimensions, measurementLimit };
})(window);
