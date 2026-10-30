(function () {
  "use strict";
  const factors = { g: ["mass", 1], kg: ["mass", 1000], ml: ["volume", 1], l: ["volume", 1000], kom: ["count", 1], package:["package",1], box:["box",1], bag:["bag",1], jar:["jar",1], can:["can",1], bottle:["bottle",1] };
  const normalizeUnit = (unit) => String(unit || "").trim().toLocaleLowerCase();
  const isCompatible = (from, to) => {
    const source = factors[normalizeUnit(from)], target = factors[normalizeUnit(to)];
    return Boolean(source && target && source[0] === target[0]);
  };
  function convert(amount, from, to) {
    const value = Number(amount), source = factors[normalizeUnit(from)], target = factors[normalizeUnit(to)];
    if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_QUANTITY");
    if (!source || !target || source[0] !== target[0]) throw new Error("INCOMPATIBLE_UNITS");
    return value * source[1] / target[1];
  }
  function eggGrams(food) { return food?.categoryId === "eggs" ? 50 : null; }
  function isCompatibleForFood(from, to, food) {
    if (isCompatible(from, to)) return true;
    const source = factors[normalizeUnit(from)], target = factors[normalizeUnit(to)];
    return Boolean(eggGrams(food) && source && target && [source[0], target[0]].every((kind) => ["count", "mass"].includes(kind)));
  }
  function convertForFood(amount, from, to, food) {
    if (isCompatible(from, to)) return convert(amount, from, to);
    const value = Number(amount), sourceUnit = normalizeUnit(from), targetUnit = normalizeUnit(to), gramsPerPiece = eggGrams(food);
    if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_QUANTITY");
    if (!gramsPerPiece || !isCompatibleForFood(sourceUnit, targetUnit, food)) throw new Error("INCOMPATIBLE_UNITS");
    if (sourceUnit === "kom") return convert(value * gramsPerPiece, "g", targetUnit);
    if (targetUnit === "kom") return convert(value, sourceUnit, "g") / gramsPerPiece;
    throw new Error("INCOMPATIBLE_UNITS");
  }
  function toGrams(amount, portion) {
    if (!Number.isFinite(amount) || amount < 0 || !portion || !Number.isFinite(portion.equivalentGrams) || portion.equivalentGrams <= 0) throw new Error("INVALID_QUANTITY");
    return amount * portion.equivalentGrams / portion.amount;
  }
  window.MentorNutritionUnitConversion = { convert, isCompatible, convertForFood, isCompatibleForFood, normalizeUnit, toGrams };
})();
