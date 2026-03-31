// In dev, requests go through Vite's proxy to avoid CORS.
// In production, call Scryfall directly.
const BASE = import.meta.env.DEV ? "/api/scryfall" : "https://api.scryfall.com";

// Respect Scryfall rate limits — 100ms between requests
let lastRequest = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 100 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

/** Custom error class so the UI can distinguish error types */
export class ScryfallError extends Error {
  constructor(message, type = "unknown") {
    super(message);
    this.name = "ScryfallError";
    this.type = type;
  }
}

async function scryfall(path) {
  await throttle();
  const url = `${BASE}${path}`;
  console.log("[scryfall] fetching:", url);

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new ScryfallError(
      "Cannot reach Scryfall. Check your internet connection.",
      "network"
    );
  }

  if (res.status === 503) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new ScryfallError(
        "Scryfall is currently down for maintenance. Please try again later.",
        "maintenance"
      );
    }
    throw new ScryfallError(
      "Scryfall is temporarily unavailable (503). Please try again in a moment.",
      "unavailable"
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[scryfall] error:", res.status, err);
    throw new ScryfallError(
      err.details || `Scryfall error ${res.status}`,
      "api"
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ScryfallError(
      "Scryfall is currently down for maintenance. Please try again later.",
      "maintenance"
    );
  }

  return res.json();
}

// ─── Set data cache ───
let setsCache = null;
let setsMap = null;

export async function loadSets() {
  if (setsCache) return setsCache;
  const data = await scryfall("/sets");
  setsCache = data.data || [];
  setsMap = {};
  for (const s of setsCache) {
    setsMap[s.code] = {
      name: s.name,
      released_at: s.released_at,
      set_type: s.set_type,
      code: s.code,
    };
  }
  return setsCache;
}

export function getSetInfo(code) {
  return setsMap?.[code] || null;
}

/**
 * Returns sets filtered to "main" playable sets for the filter UI.
 */
export function getFilterableSets() {
  if (!setsCache) return [];
  const validTypes = new Set([
    "core",
    "expansion",
    "masters",
    "draft_innovation",
    "commander",
    "starter",
  ]);
  return setsCache
    .filter((s) => validTypes.has(s.set_type) && s.card_count > 0)
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
}

/**
 * Get a random card, optionally filtered by sets and/or types.
 * @param {Object} filters - { sets: string[], types: string[] }
 */
export async function getRandomCard(filters = {}) {
  const qParts = [];

  if (filters.sets && filters.sets.length > 0) {
    const setClauses = filters.sets.map((s) => `s:${s}`).join(" OR ");
    qParts.push(`(${setClauses})`);
  }

  if (filters.types && filters.types.length > 0) {
    const typeClauses = filters.types.map((t) => `t:${t}`).join(" OR ");
    qParts.push(`(${typeClauses})`);
  }

  let card;
  if (qParts.length > 0) {
    const q = encodeURIComponent(qParts.join(" "));
    card = await scryfall(`/cards/random?q=${q}`);
  } else {
    card = await scryfall("/cards/random");
    if (
      card.layout === "token" ||
      card.layout === "art_series" ||
      card.set_type === "token"
    ) {
      card = await scryfall("/cards/random");
    }
  }

  return normalizeCard(card);
}

/**
 * Autocomplete card names for the search input
 */
export async function autocompleteCards(query) {
  if (!query || query.length < 2) return [];
  const data = await scryfall(
    `/cards/autocomplete?q=${encodeURIComponent(query)}`
  );
  return data.data || [];
}

/**
 * Fetch a specific card by exact name
 */
export async function getCardByName(name) {
  const data = await scryfall(
    `/cards/named?exact=${encodeURIComponent(name)}`
  );
  return normalizeCard(data);
}

/**
 * Fetch a card by fuzzy name match (for preview)
 */
export async function getCardByFuzzyName(name) {
  const data = await scryfall(
    `/cards/named?fuzzy=${encodeURIComponent(name)}`
  );
  return normalizeCard(data);
}

/**
 * Normalize a Scryfall card object into the fields we care about.
 */
export function normalizeCard(card) {
  const face = card.card_faces?.[0] || card;

  const colors = face.colors || card.colors || [];
  const colorLabel =
    colors.length === 0
      ? "Colorless"
      : colors
          .map(
            (c) =>
              ({
                W: "White",
                U: "Blue",
                B: "Black",
                R: "Red",
                G: "Green",
              }[c] || c)
          )
          .sort()
          .join(", ");

  const cmc = card.cmc ?? 0;
  const typeLine = face.type_line || card.type_line || "Unknown";
  const simpleType = getSimpleType(typeLine);
  const subtypes = getSubtypes(typeLine);
  const supertypes = getSupertypes(typeLine);
  const power = face.power ?? card.power ?? null;
  const toughness = face.toughness ?? card.toughness ?? null;
  const setName = card.set_name || "Unknown";
  const setCode = card.set || "???";
  const rarity = capitalize(card.rarity || "unknown");

  const image =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const artCrop =
    card.image_uris?.art_crop ||
    card.card_faces?.[0]?.image_uris?.art_crop ||
    null;

  const setInfo = getSetInfo(setCode);
  const setReleasedAt = setInfo?.released_at || null;

  return {
    name: card.name,
    colors,
    colorLabel,
    cmc,
    typeLine,
    simpleType,
    subtypes,
    supertypes,
    power,
    toughness,
    setName,
    setCode,
    setReleasedAt,
    rarity,
    image,
    artCrop,
    artist: card.artist || "Unknown",
  };
}

function getSimpleType(typeLine) {
  const line = typeLine.toLowerCase();
  if (line.includes("creature")) return "Creature";
  if (line.includes("planeswalker")) return "Planeswalker";
  if (line.includes("instant")) return "Instant";
  if (line.includes("sorcery")) return "Sorcery";
  if (line.includes("enchantment")) return "Enchantment";
  if (line.includes("artifact")) return "Artifact";
  if (line.includes("land")) return "Land";
  if (line.includes("battle")) return "Battle";
  return "Other";
}

/**
 * Extract subtypes from the type line.
 * Type lines look like "Creature — Human Wizard" or "Enchantment — Aura"
 */
function getSubtypes(typeLine) {
  const parts = typeLine.split("—");
  if (parts.length < 2) return [];
  return parts[1]
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

/**
 * Extract supertypes from the type line.
 * Supertypes come before the main type: "Legendary Creature — Human Wizard"
 * Known supertypes: Legendary, Basic, Snow, World, Ongoing
 */
function getSupertypes(typeLine) {
  const mainPart = typeLine.split("—")[0].trim().toLowerCase();
  const known = ["legendary", "basic", "snow", "world", "ongoing"];
  return known.filter((st) => mainPart.includes(st)).map(capitalize);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}