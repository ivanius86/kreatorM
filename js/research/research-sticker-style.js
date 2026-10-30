(function (root) {
  "use strict";

  const colors = ["backgroundColor", "borderColor", "textColor", "unitFillColor"];
  const fonts = ["Inter", "Georgia", "Arial", "monospace"];

  function sanitize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const style = {};
    colors.forEach((field) => {
      if (/^#[0-9a-fA-F]{6}$/.test(String(value[field] || ""))) style[field] = value[field];
    });
    if (fonts.includes(value.fontFamily)) style.fontFamily = value.fontFamily;
    const size = Number(value.fontSize);
    if (value.fontSize !== undefined && Number.isFinite(size)) style.fontSize = Math.max(11, Math.min(24, Math.round(size)));
    return style;
  }

  function read(idea, key) {
    return sanitize(idea?.pathData?.researchCanvasStickerStyles?.[key]);
  }

  function defaults(type) {
    return type === "note"
      ? { backgroundColor: "#efdda9", borderColor: "#e9cb83", textColor: "#302615", fontFamily: "Inter", fontSize: 14 }
      : { backgroundColor: "#26352b", borderColor: "#f3dead", textColor: "#fbf0d6", fontFamily: "Inter", fontSize: 14 };
  }

  function css(value) {
    const style = sanitize(value);
    return [
      style.backgroundColor && "--research-sticker-background:" + style.backgroundColor,
      style.borderColor && "--research-sticker-border:" + style.borderColor,
      style.textColor && "--research-sticker-text:" + style.textColor,
      style.unitFillColor && "--research-sticker-unit-fill:" + style.unitFillColor,
      style.backgroundColor && "--research-sticker-control:" + controlColor(style.backgroundColor),
      style.fontFamily && "--research-sticker-font:" + style.fontFamily,
      style.fontSize && "--research-sticker-size:" + style.fontSize + "px"
    ].filter(Boolean).join(";");
  }

  function controlColor(background) {
    const color = /^#[0-9a-fA-F]{6}$/.test(String(background || "")) ? background : "#203729";
    const channels = [1, 3, 5].map((start) => {
      const channel = parseInt(color.slice(start, start + 2), 16) / 255;
      return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4);
    });
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] > .179 ? "#000000" : "#ffffff";
  }

  root.MentorResearchStickerStyle = { sanitize, read, defaults, css, controlColor };
})(window);
