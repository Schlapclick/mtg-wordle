/**
 * Compare two normalized cards and return per-attribute results.
 */
export function compareCards(guess, secret) {
  const results = [];

  // --- Color (per-color breakdown) ---
  const allColors = ["W", "U", "B", "R", "G"];
  const colorNames = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
  };

  const guessColors = new Set(guess.colors);
  const secretColors = new Set(secret.colors);

  const colorItems = [];

  if (guessColors.size === 0 && secretColors.size === 0) {
    colorItems.push({ label: "Colorless", status: "correct" });
  } else if (guessColors.size === 0 && secretColors.size > 0) {
    colorItems.push({ label: "Colorless", status: "incorrect" });
  } else {
    for (const c of allColors) {
      if (guessColors.has(c)) {
        colorItems.push({
          label: colorNames[c],
          status: secretColors.has(c) ? "correct" : "incorrect",
        });
      }
    }
  }

  results.push({ label: "Color", type: "color", colors: colorItems });

  // --- CMC ---
  results.push({
    label: "Mana Value",
    value: String(guess.cmc),
    status:
      guess.cmc === secret.cmc
        ? "correct"
        : guess.cmc < secret.cmc
          ? "higher"
          : "lower",
  });

  // --- Card Type ---
  results.push({
    label: "Type",
    value: guess.simpleType,
    status: guess.simpleType === secret.simpleType ? "correct" : "incorrect",
  });

  // --- Supertype ---
  const guessSupertypes = new Set(guess.supertypes.map((s) => s.toLowerCase()));
  const secretSupertypes = new Set(secret.supertypes.map((s) => s.toLowerCase()));

  const supertypeItems = [];

  if (guessSupertypes.size === 0 && secretSupertypes.size === 0) {
    supertypeItems.push({ label: "None", status: "correct" });
  } else if (guessSupertypes.size === 0 && secretSupertypes.size > 0) {
    supertypeItems.push({ label: "None", status: "incorrect" });
  } else {
    for (const st of guess.supertypes) {
      supertypeItems.push({
        label: st,
        status: secretSupertypes.has(st.toLowerCase()) ? "correct" : "incorrect",
      });
    }
  }

  results.push({ label: "Supertype", type: "supertype", supertypes: supertypeItems });

  // --- Subtype ---
  const guessSubtypes = new Set(guess.subtypes.map((s) => s.toLowerCase()));
  const secretSubtypes = new Set(secret.subtypes.map((s) => s.toLowerCase()));

  const subtypeItems = [];

  if (guessSubtypes.size === 0 && secretSubtypes.size === 0) {
    subtypeItems.push({ label: "None", status: "correct" });
  } else if (guessSubtypes.size === 0 && secretSubtypes.size > 0) {
    subtypeItems.push({ label: "None", status: "incorrect" });
  } else {
    for (const st of guess.subtypes) {
      subtypeItems.push({
        label: st,
        status: secretSubtypes.has(st.toLowerCase()) ? "correct" : "incorrect",
      });
    }
  }

  results.push({ label: "Subtype", type: "subtype", subtypes: subtypeItems });

  // --- Power ---
  const guessPow = parseStat(guess.power);
  const secretPow = parseStat(secret.power);
  if (secretPow !== null) {
    results.push({
      label: "Power",
      value: guess.power ?? "N/A",
      status:
        guessPow === null
          ? "incorrect"
          : guessPow === secretPow
            ? "correct"
            : guessPow < secretPow
              ? "higher"
              : "lower",
    });
  } else {
    results.push({
      label: "Power",
      value: guess.power ?? "N/A",
      status: guessPow === null ? "correct" : "incorrect",
    });
  }

  // --- Toughness ---
  const guessTou = parseStat(guess.toughness);
  const secretTou = parseStat(secret.toughness);
  if (secretTou !== null) {
    results.push({
      label: "Toughness",
      value: guess.toughness ?? "N/A",
      status:
        guessTou === null
          ? "incorrect"
          : guessTou === secretTou
            ? "correct"
            : guessTou < secretTou
              ? "higher"
              : "lower",
    });
  } else {
    results.push({
      label: "Toughness",
      value: guess.toughness ?? "N/A",
      status: guessTou === null ? "correct" : "incorrect",
    });
  }

  // --- Set (with date comparison for arrows) ---
  const guessDate = guess.setReleasedAt;
  const secretDate = secret.setReleasedAt;
  let setStatus;
  if (guess.setCode === secret.setCode) {
    setStatus = "correct";
  } else if (guessDate && secretDate) {
    setStatus = guessDate < secretDate ? "higher" : "lower";
  } else {
    setStatus = "incorrect";
  }

  results.push({
    label: "Set",
    value: guess.setName,
    status: setStatus,
    extra:
      setStatus === "higher"
        ? "(newer ▲)"
        : setStatus === "lower"
          ? "(older ▼)"
          : null,
  });

  // --- Rarity ---
  results.push({
    label: "Rarity",
    value: guess.rarity,
    status: guess.rarity === secret.rarity ? "correct" : "incorrect",
  });

  return results;
}

function parseStat(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!isNaN(n)) return n;
  if (val === "*") return 0;
  const match = String(val).match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}