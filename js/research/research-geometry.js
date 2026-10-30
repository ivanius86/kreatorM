(function (root) {
  "use strict";

  function zoomCamera(camera, zoom, anchorX, anchorY, minimum, maximum) {
    const next = Math.max(minimum, Math.min(maximum, zoom));
    const ratio = next / camera.zoom;
    return {
      x: anchorX - (anchorX - camera.x) * ratio,
      y: anchorY - (anchorY - camera.y) * ratio,
      zoom: next
    };
  }

  function clampCardZoom(value, minimum, maximum, fallback) {
    const zoom = Number(value);
    return Number.isFinite(zoom)
      ? Math.round(Math.min(maximum, Math.max(minimum, zoom)) * 10) / 10
      : fallback;
  }

  function clampDockRect(rect, viewportWidth, viewportHeight) {
    const edge = 8;
    const maxWidth = Math.max(0, viewportWidth - edge * 2);
    const maxHeight = Math.max(0, viewportHeight - edge * 2);
    const width = Math.min(maxWidth, Math.max(Math.min(340, maxWidth), Number(rect.width) || 430));
    const height = Math.min(maxHeight, Math.max(Math.min(96, maxHeight), Number(rect.height) || 106));
    return {
      left: Math.min(Math.max(edge, Number(rect.left) || 0), Math.max(edge, viewportWidth - width - edge)),
      top: Math.min(Math.max(edge, Number(rect.top) || 0), Math.max(edge, viewportHeight - height - edge)),
      width,
      height
    };
  }

  function normalizeCanvasSize(size) {
    if (!Number.isFinite(size?.width) || !Number.isFinite(size?.height) || size.width <= 0 || size.height <= 0) return null;
    return { width: Math.round(size.width), height: Math.round(size.height) };
  }

  function focusDepthScale(depth) {
    const level = Math.max(1, Math.floor(Number(depth) || 1));
    return Math.max(0.25, 1.05 * Math.pow(0.975, level - 1));
  }

  function canvasDepthScale(cardKey, graph) {
    let depth = 0;
    let key = cardKey;
    const visited = new Set([key]);
    while (graph?.parentByKey?.has(key)) {
      key = graph.parentByKey.get(key);
      if (visited.has(key)) break;
      visited.add(key);
      depth++;
    }
    return depth === 0 ? 1.05 : focusDepthScale(depth);
  }

  function screenToWorld(clientX, clientY, viewportRect, clientLeft, clientTop, camera, scrollLeft = 0, scrollTop = 0) {
    return {
      x: (clientX - viewportRect.left - clientLeft + scrollLeft - camera.x) / camera.zoom,
      y: (clientY - viewportRect.top - clientTop + scrollTop - camera.y) / camera.zoom
    };
  }

  function normalizeRect(first, second) {
    return { left: Math.min(first.x, second.x), top: Math.min(first.y, second.y),
      right: Math.max(first.x, second.x), bottom: Math.max(first.y, second.y) };
  }

  function rectsIntersect(first, second) {
    return first.left <= second.right && first.right >= second.left &&
      first.top <= second.bottom && first.bottom >= second.top;
  }

  const SIDES = ["top", "right", "bottom", "left"];

  function isConnectionSide(side) { return SIDES.includes(side); }

  function borderGeometry(rect, matrix = [1, 0, 0, 1], localWidth = rect.width, localHeight = rect.height) {
    const [a, b, c, d] = matrix;
    const horizontal = Math.hypot(a, b) || 1, vertical = Math.hypot(c, d) || 1;
    const ux = a / horizontal, uy = b / horizontal, vx = c / vertical, vy = d / vertical;
    const determinant = Math.abs(ux) * Math.abs(vy) - Math.abs(vx) * Math.abs(uy);
    let width, height;
    if (Math.abs(determinant) > 0.000001) {
      width = (rect.width * Math.abs(vy) - rect.height * Math.abs(vx)) / determinant;
      height = (rect.height * Math.abs(ux) - rect.width * Math.abs(uy)) / determinant;
    } else {
      const scale = rect.width / (Math.abs(a) * localWidth + Math.abs(c) * localHeight || 1);
      width = localWidth * horizontal * scale; height = localHeight * vertical * scale;
    }
    const wx = ux * width, wy = uy * width, hx = vx * height, hy = vy * height;
    const x = rect.x - Math.min(0, wx, hx, wx + hx), y = rect.y - Math.min(0, wy, hy, wy + hy);
    const horizontalAngle = Math.atan2(wy, wx) * 180 / Math.PI;
    const verticalAngle = Math.atan2(hy, hx) * 180 / Math.PI - 90;
    return { ...rect, sidePoints: {
      top: { x: x + wx / 2, y: y + wy / 2 }, right: { x: x + wx + hx / 2, y: y + wy + hy / 2 },
      bottom: { x: x + hx + wx / 2, y: y + hy + wy / 2 }, left: { x: x + hx / 2, y: y + hy / 2 }
    }, sideAngles: { top: horizontalAngle, right: verticalAngle, bottom: horizontalAngle, left: verticalAngle } };
  }

  function sidePoint(rect, side) {
    if (rect.sidePoints?.[side]) return { ...rect.sidePoints[side] };
    if (side === "top") return { x: rect.x + rect.width / 2, y: rect.y };
    if (side === "right") return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    if (side === "bottom") return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    return { x: rect.x, y: rect.y + rect.height / 2 };
  }

  function oppositeConnectionSide(side) { return { top: "bottom", right: "left", bottom: "top", left: "right" }[side] || ""; }

  function nearestAllowedConnectionSide(rect, x, y, excludedSide = "") {
    if (rect.sidePoints) return SIDES.filter((side) => side !== excludedSide).reduce((best, side) => {
      const distance = (name) => {
        const point = rect.sidePoints[name], angle = (rect.sideAngles[name] || 0) * Math.PI / 180;
        const normal = name === "top" || name === "bottom" ? [-Math.sin(angle), Math.cos(angle)] : [Math.cos(angle), Math.sin(angle)];
        return Math.abs((x - point.x) * normal[0] + (y - point.y) * normal[1]) / Math.max(1, name === "top" || name === "bottom" ? rect.height : rect.width);
      };
      return !best || distance(side) < distance(best) ? side : best;
    }, "");
    const distances = {
      top: Math.abs(y - rect.top) / Math.max(1, rect.height),
      right: Math.abs(x - rect.right) / Math.max(1, rect.width),
      bottom: Math.abs(y - rect.bottom) / Math.max(1, rect.height),
      left: Math.abs(x - rect.left) / Math.max(1, rect.width)
    };
    return SIDES.filter((side) => side !== excludedSide)
      .reduce((best, side) => !best || distances[side] < distances[best] ? side : best, "");
  }

  function nearestConnectionSide(rect, x, y) { return nearestAllowedConnectionSide(rect, x, y); }

  function connectionAnchors(parent, child, sides = {}) {
    const parentCenterX = parent.x + parent.width / 2;
    const parentCenterY = parent.y + parent.height / 2;
    const childCenterX = child.x + child.width / 2;
    const childCenterY = child.y + child.height / 2;
    const dx = childCenterX - parentCenterX;
    const dy = childCenterY - parentCenterY;
    const vertical = Math.abs(dy) / Math.max(1, (parent.height + child.height) / 2) > Math.abs(dx) / Math.max(1, (parent.width + child.width) / 2);
    if (vertical) {
      const down = dy >= 0;
      const y1 = parent.y + (down ? parent.height : 0);
      const y2 = child.y + (down ? 0 : child.height);
      const bend = Math.max(34, Math.abs(y2 - y1) * 0.45) * (down ? 1 : -1);
      const fromSide = isConnectionSide(sides.parent) ? sides.parent : down ? "bottom" : "top";
      const toSide = isConnectionSide(sides.child) ? sides.child : down ? "top" : "bottom";
      return { from: sidePoint(parent, fromSide), to: sidePoint(child, toSide), fromSide, toSide,
        fromAngle: parent.sideAngles?.[fromSide] || 0, toAngle: child.sideAngles?.[toSide] || 0,
        vertical: true, bend, explicit: isConnectionSide(sides.parent) || isConnectionSide(sides.child) };
    }
    const right = dx >= 0;
    const x1 = parent.x + (right ? parent.width : 0);
    const x2 = child.x + (right ? 0 : child.width);
    const bend = Math.max(34, Math.abs(x2 - x1) * 0.45) * (right ? 1 : -1);
    const fromSide = isConnectionSide(sides.parent) ? sides.parent : right ? "right" : "left";
    const toSide = isConnectionSide(sides.child) ? sides.child : right ? "left" : "right";
    return { from: sidePoint(parent, fromSide), to: sidePoint(child, toSide), fromSide, toSide,
      fromAngle: parent.sideAngles?.[fromSide] || 0, toAngle: child.sideAngles?.[toSide] || 0,
      vertical: false, bend, explicit: isConnectionSide(sides.parent) || isConnectionSide(sides.child) };
  }


  function connectionPathFromAnchors(anchors, movingEndpoint = "") {
    const { from, to, vertical, bend } = anchors;
    if (anchors.explicit || anchors.fromAngle || anchors.toAngle) {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const fullTangent = Math.max(34, distance * 0.45);
      const shortTangent = Math.min(28, Math.max(10, distance * 0.12));
      const startTangent = movingEndpoint === "parent" ? shortTangent : fullTangent;
      const endTangent = movingEndpoint === "child" ? shortTangent : fullTangent;
      const vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
      const rotate = (vector, angle = 0) => {
        const radians = angle * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
        return [vector[0] * cosine - vector[1] * sine, vector[0] * sine + vector[1] * cosine];
      };
      const start = rotate(vectors[anchors.fromSide], anchors.fromAngle);
      const end = rotate(vectors[anchors.toSide], anchors.toAngle);
      return `M ${from.x} ${from.y} C ${from.x + start[0] * startTangent} ${from.y + start[1] * startTangent}, ${to.x + end[0] * endTangent} ${to.y + end[1] * endTangent}, ${to.x} ${to.y}`;
    }
    return vertical
      ? `M ${from.x} ${from.y} C ${from.x} ${from.y + bend}, ${to.x} ${to.y - bend}, ${to.x} ${to.y}`
      : `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
  }

  function connectionPath(parent, child, sides = {}) { return connectionPathFromAnchors(connectionAnchors(parent, child, sides)); }

  root.MentorResearchGeometry = {
    zoomCamera, clampCardZoom, clampDockRect, normalizeCanvasSize,
    focusDepthScale, canvasDepthScale, screenToWorld, normalizeRect, rectsIntersect,
    isConnectionSide, borderGeometry, sidePoint, oppositeConnectionSide, nearestAllowedConnectionSide,
    nearestConnectionSide, connectionAnchors, connectionPathFromAnchors, connectionPath
  };
})(window);
