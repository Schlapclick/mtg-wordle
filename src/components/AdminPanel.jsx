import { useState, useRef, useEffect } from "react";
import { autocompleteCards, getCardByFuzzyName } from "../utils/scryfall";

export default function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null); // { type: "success"|"error", msg }
  const [loading, setLoading] = useState(false);
  const [currentDaily, setCurrentDaily] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch current daily card on mount
  useEffect(() => {
    async function fetchCurrent() {
      try {
        const res = await fetch("/api/daily");
        const data = await res.json();
        if (data.ok) {
          setCurrentDaily(data);
        }
      } catch {
        // No daily set, that's fine
      }
    }
    fetchCurrent();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleCardChange(e) {
    const val = e.target.value;
    setCardQuery(val);
    setActiveIndex(-1);
    setPreview(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocompleteCards(val);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }

  async function fillCard(name) {
    setCardQuery(name);
    setSuggestions([]);
    setShowDropdown(false);
    try {
      const card = await getCardByFuzzyName(name);
      setPreview(card);
    } catch {
      setPreview(null);
    }
  }

  function handleKeyDown(e) {
    if (!showDropdown) return;

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
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  async function handleSubmit() {
    if (!secret.trim() || !cardQuery.trim()) {
      setStatus({ type: "error", msg: "Secret and card name are required." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secret.trim(),
          cardName: cardQuery.trim(),
          date,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setStatus({
          type: "success",
          msg: `Daily card for ${data.date} set to "${data.cardName}"`,
        });
        setCurrentDaily(data);
      } else {
        setStatus({ type: "error", msg: data.error || "Failed to set daily card." });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Are you on the deployed site?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-mtg-gold mb-1 text-center">
          Admin Panel
        </h1>
        <p className="text-text-muted text-xs text-center mb-6">
          Set the daily card for MTG Wordle
        </p>

        {/* Current daily */}
        {currentDaily && (
          <div className="bg-surface-raised border border-border rounded-lg p-3 mb-6 text-center">
            <p className="text-[11px] uppercase tracking-widest text-text-muted mb-1">
              Current daily ({currentDaily.date})
            </p>
            <p className="text-sm font-semibold text-text">{currentDaily.cardName}</p>
          </div>
        )}

        {/* Secret */}
        <label className="block text-xs text-text-muted mb-1.5">Admin Secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter your admin secret..."
          className="w-full px-4 py-3 mb-4 bg-surface-raised border border-border rounded-lg
                     text-text placeholder:text-text-muted text-sm
                     focus:outline-none focus:border-mtg-gold focus:ring-1 focus:ring-mtg-gold/30
                     transition-all duration-200"
        />

        {/* Date */}
        <label className="block text-xs text-text-muted mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 mb-4 bg-surface-raised border border-border rounded-lg
                     text-text text-sm
                     focus:outline-none focus:border-mtg-gold focus:ring-1 focus:ring-mtg-gold/30
                     transition-all duration-200"
        />

        {/* Card name with autocomplete */}
        <label className="block text-xs text-text-muted mb-1.5">Card Name</label>
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            value={cardQuery}
            onChange={handleCardChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Type a card name..."
            className="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg
                       text-text placeholder:text-text-muted text-sm
                       focus:outline-none focus:border-mtg-gold focus:ring-1 focus:ring-mtg-gold/30
                       transition-all duration-200"
          />
          {showDropdown && (
            <ul
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-surface-raised border border-border
                         rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
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

        {/* Preview */}
        {preview && preview.image && (
          <div className="flex justify-center mb-4 animate-in">
            <img
              src={preview.image}
              alt={preview.name}
              className="w-48 rounded-lg shadow-xl border border-border/50"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm
                     bg-mtg-gold text-mtg-black
                     hover:brightness-110 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-150 cursor-pointer"
        >
          {loading ? "Setting..." : "Set Daily Card"}
        </button>

        {/* Status message */}
        {status && (
          <div
            className={`mt-4 text-center text-sm animate-in ${
              status.type === "success" ? "text-emerald-400" : "text-mtg-red"
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-text-muted hover:text-mtg-gold transition-colors underline">
            ← Back to game
          </a>
        </div>
      </div>
    </div>
  );
}