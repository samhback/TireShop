"use client";

import { useState } from "react";

const knownBrands = [
  "BFGoodrich",
  "Bridgestone",
  "Continental",
  "Cooper",
  "Falken",
  "Firestone",
  "General",
  "Goodyear",
  "Hankook",
  "Kumho",
  "Mastercraft",
  "Michelin",
  "Nexen",
  "Pirelli",
  "Toyo",
  "Yokohama",
];

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2 && /^[a-z]+$/.test(word)) {
        return word.toUpperCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function setField(name: string, value: string) {
  const field = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[name="${name}"]`);

  if (!field || !value) {
    return;
  }

  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function parseTireText(input: string) {
  const cleaned = input
    .replace(/\r/g, "\n")
    .replace(/[|,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sizeMatch = cleaned.match(
    /\b(?:LT|P)?\s*\d{3}\s*\/\s*\d{2}\s*R\s*\d{2}\b/i,
  );
  const tireSize = sizeMatch
    ? sizeMatch[0].replace(/\s+/g, "").replace(/r/i, "R")
    : "";

  const afterSize = sizeMatch
    ? cleaned.slice(sizeMatch.index! + sizeMatch[0].length).trim()
    : "";
  const loadMatch = afterSize.match(/\b\d{2,3}[A-Z]\b/i);
  const loadRating = loadMatch ? loadMatch[0].toUpperCase() : "";

  const extraCodes = loadMatch
    ? afterSize.slice(loadMatch.index! + loadMatch[0].length).trim()
    : afterSize;

  const brand =
    knownBrands.find((knownBrand) =>
      new RegExp(`\\b${knownBrand}\\b`, "i").test(cleaned),
    ) ?? lines[0] ?? "";

  let model = "";

  if (lines.length >= 2 && new RegExp(`^${brand}$`, "i").test(lines[0])) {
    model = lines[1];
  } else if (sizeMatch) {
    const beforeSize = cleaned.slice(0, sizeMatch.index).trim();
    model = beforeSize.replace(new RegExp(`^${brand}\\b`, "i"), "").trim();
  }

  const formattedBrand = titleCase(brand);
  const formattedModel = titleCase(model);
  const itemName = [formattedBrand, formattedModel, tireSize]
    .filter(Boolean)
    .join(" ");

  return {
    brand: formattedBrand,
    model: formattedModel,
    tireSize,
    loadRating,
    itemName,
    extraCodes,
  };
}

export function TireSmartFill() {
  const [rawText, setRawText] = useState("");

  function fillTireDetails() {
    const parsed = parseTireText(rawText);

    setField("brand", parsed.brand);
    setField("model", parsed.model);
    setField("tireSize", parsed.tireSize);
    setField("loadRating", parsed.loadRating);
    setField("name", parsed.itemName);

    if (parsed.extraCodes) {
      setField("notes", `Sidewall / extra codes: ${parsed.extraCodes}`);
    }
  }

  return (
    <div className="smart-fill">
      <div>
        <h2>Smart Fill</h2>
        <p className="helper">
          Paste a tire description and fill the tire fields automatically.
        </p>
      </div>

      <div className="field">
        <label htmlFor="tireSmartFill">Tire Info</label>
        <textarea
          id="tireSmartFill"
          onChange={(event) => setRawText(event.target.value)}
          placeholder={`PIRELLI
SCORPION ZERO ALL SEASON
245 /60 R18 105H SL BSW HK`}
          value={rawText}
        />
      </div>

      <button
        className="secondary-button"
        onClick={fillTireDetails}
        type="button"
      >
        Fill Tire Details
      </button>
    </div>
  );
}
