import { useState, useRef, useEffect } from "react";
import { autocompleteCards, getCardByFuzzyName } from "../utils/scryfall";

export default function SearchInput({ onGuess, disabled }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef(null);
  const previewDebounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    setPreview(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await autocompleteCards(val);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }

  function fillCard(name) {
    setQuery(name);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();

    // Load preview for the selected card
    loadPreview(name);
  }

  function loadPreview(name) {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    setPreview(null);
    setPreviewLoading(true);

    previewDebounceRef.current = setTimeout(async () => {
      try {
        const card = await getCardByFuzzyName(name);
        setPreview(card);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 100);
  }

  function submitGuess() {
    if (!query.trim()) return;
    const name = query.trim();
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setPreview(null);
    onGuess(name);
  }

  function handleKeyDown(e) {
    if (!showDropdown) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        fillCard(suggestions[activeIndex]);
      } else if (e.key === "Enter") {
        submitGuess();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Preview card */}
      {(preview || previewLoading) && (
        <div className="flex justify-center mb-4 animate-in">
          {previewLoading ? (
            <div className="w-48 h-67 rounded-lg bg-surface-raised border border-border flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-mtg-gold/30 border-t-mtg-gold rounded-full animate-spin" />
            </div>
          ) : preview?.image ? (
            <img
              src={preview.image}
              alt={preview.name}
              className="w-48 rounded-lg shadow-xl border border-border/50 transition-all duration-300"
            />
          ) : null}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            disabled={disabled}
            placeholder={disabled ? "Game over!" : "Type a card name..."}
            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg
                       text-text placeholder:text-text-muted
                       focus:outline-none focus:border-mtg-gold focus:ring-1 focus:ring-mtg-gold/30
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 font-body text-sm"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-mtg-gold/30 border-t-mtg-gold rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={submitGuess}
          disabled={disabled || !query.trim()}
          className="px-5 py-3 rounded-lg font-bold text-sm
                     bg-mtg-gold text-mtg-black
                     hover:brightness-110 active:scale-[0.98]
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100
                     transition-all duration-150 cursor-pointer flex-shrink-0"
        >
          Guess
        </button>
      </div>

      {showDropdown && (
        <ul
          ref={dropdownRef}
          className="absolute z-50 mt-1 bg-surface-raised border border-border
                     rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
          style={{ width: inputRef.current?.parentElement?.offsetWidth }}
        >
          {suggestions.map((name, i) => (
            <li
              key={name}
              onMouseDown={() => fillCard(name)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors duration-100
                ${
                  i === activeIndex
                    ? "bg-mtg-gold/15 text-mtg-gold"
                    : "text-text hover:bg-surface-hover"
                }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}