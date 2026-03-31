import { useState } from "react";

const CARD_TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Artifact",
  "Planeswalker",
  "Land",
  "Battle",
];

export default function FilterPanel({ sets, filters, onFiltersChange }) {
  const [expanded, setExpanded] = useState(false);
  const [setSearch, setSetSearch] = useState("");

  const filteredSets = sets.filter((s) =>
    s.name.toLowerCase().includes(setSearch.toLowerCase())
  );

  function toggleType(type) {
    const current = filters.types || [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, types: next });
  }

  function toggleSet(code) {
    const current = filters.sets || [];
    const next = current.includes(code)
      ? current.filter((s) => s !== code)
      : [...current, code];
    onFiltersChange({ ...filters, sets: next });
  }

  function clearAll() {
    onFiltersChange({ sets: [], types: [] });
  }

  const activeCount =
    (filters.sets?.length || 0) + (filters.types?.length || 0);

  return (
    <div className="w-full max-w-lg mx-auto mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-text
                   transition-colors cursor-pointer mx-auto"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="bg-mtg-gold/20 text-mtg-gold px-1.5 py-0.5 rounded-full text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 bg-surface-raised border border-border rounded-xl p-4 animate-in">
          {/* Card Types */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-text-muted font-semibold">
                Card Types
              </span>
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-text-muted hover:text-mtg-red transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CARD_TYPES.map((type) => {
                const active = filters.types?.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer
                      ${
                        active
                          ? "bg-mtg-gold/20 text-mtg-gold border border-mtg-gold/40"
                          : "bg-surface-hover text-text-muted border border-border hover:border-text-muted/30"
                      }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sets */}
          <div>
            <span className="text-[11px] uppercase tracking-widest text-text-muted font-semibold block mb-2">
              Sets
              {filters.sets?.length > 0 && (
                <span className="text-mtg-gold ml-1">
                  ({filters.sets.length} selected)
                </span>
              )}
            </span>

            <input
              type="text"
              value={setSearch}
              onChange={(e) => setSetSearch(e.target.value)}
              placeholder="Search sets..."
              className="w-full px-3 py-2 mb-2 bg-surface border border-border rounded-lg
                         text-text text-xs placeholder:text-text-muted
                         focus:outline-none focus:border-mtg-gold/50 transition-colors"
            />

            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
              {filteredSets.slice(0, 50).map((s) => {
                const active = filters.sets?.includes(s.code);
                return (
                  <button
                    key={s.code}
                    onClick={() => toggleSet(s.code)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all duration-100 cursor-pointer flex items-center gap-2
                      ${
                        active
                          ? "bg-mtg-gold/15 text-mtg-gold"
                          : "text-text-muted hover:bg-surface-hover hover:text-text"
                      }`}
                  >
                    <span
                      className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center
                        ${active ? "bg-mtg-gold border-mtg-gold" : "border-text-muted/40"}`}
                    >
                      {active && (
                        <svg
                          className="w-2 h-2 text-mtg-black"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-[10px] opacity-50 flex-shrink-0">
                      {s.code.toUpperCase()}
                    </span>
                  </button>
                );
              })}
              {filteredSets.length === 0 && (
                <p className="text-text-muted text-xs text-center py-2">
                  No sets found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}