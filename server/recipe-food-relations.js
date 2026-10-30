"use strict";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]/g, " ").toLowerCase();
// Culinary relatedness is only for adaptations and suggested alternatives.
// It never replaces catalog identity or converts dry/cooked quantities.
function family(value) {
  const text = normalize(value);
  if (/\b(?:pasulj\w*|beans?)\b/.test(text) && !/\b(?:green|long|string|soy\w*|broad|fava|mung|sprout\w*|boranij\w*|chickpea\w*|lentil\w*)\b/.test(text)) return "beans";
  if (/\b(?:ribs?|rebr\w*)\b/.test(text)) {
    if (/\b(?:beef|goved\w*|junec\w*)\b/.test(text)) return "beef-ribs";
    if (/\b(?:lamb|jagnj\w*)\b/.test(text)) return "lamb-ribs";
    if (/\b(?:pork|svinj\w*)\b/.test(text)) return "pork-ribs";
    return "ribs";
  }
  if (/\b(?:chicken|pilet\w*|pilec\w*|pileci\w*)\b/.test(text)) return "chicken";
  return null;
}
const foodFamily = food => food ? family(food.englishName + " " + food.name) : null;
const compatible = (a, b) => Boolean(a && b && (a === b || a === "ribs" && /-ribs$/.test(b) || b === "ribs" && /-ribs$/.test(a)));
function requested(text) {
  const value = normalize(text), groups = [];
  if (/\b(?:pasulj\w*|beans?)\b/.test(value) && family(value) === "beans") groups.push({ key: "beans", sr: "Pasulj", en: "Beans" });
  if (/\b(?:ribs?|rebr\w*)\b/.test(value)) {
    const key = family(value.replace(/\b(?:pasulj\w*|beans?)\b/g, ""));
    groups.push({ key: key?.endsWith("ribs") ? key : "ribs", sr: "Rebra", en: "Ribs" });
  }
  if (/\b(?:chicken|pilet\w*|pilec\w*)\b/.test(value)) groups.push({ key: "chicken", sr: "Piletina", en: "Chicken" });
  return groups;
}
function alternatives(name, foods) {
  const target = family(name);
  if (target) return foods.filter(food => compatible(target, foodFamily(food))).slice(0, 8);
  const tokens = normalize(name).split(/\W+/).filter(token => token.length >= 4);
  return foods.filter(food => tokens.some(token => normalize(food.name + " " + food.englishName).split(/\W+/).some(word => word.startsWith(token.slice(0, Math.max(4, token.length - 2)))))).slice(0, 8);
}
module.exports = { family, foodFamily, compatible, requested, alternatives };
