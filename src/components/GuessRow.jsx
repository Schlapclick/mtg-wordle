const STATUS_STYLES = {
  correct: "bg-correct border-correct/50 text-emerald-100",
  incorrect: "bg-incorrect border-incorrect/50 text-red-100",
  partial: "bg-partial border-partial/50 text-amber-100",
  higher: "bg-incorrect border-incorrect/50 text-red-100",
  lower: "bg-incorrect border-incorrect/50 text-red-100",
};

const COLOR_DOT = {
  White: "bg-mtg-white",
  Blue: "bg-mtg-blue",
  Black: "bg-mtg-black",
  Red: "bg-mtg-red",
  Green: "bg-mtg-green",
  Colorless: "bg-mtg-colorless",
};

const ARROWS = {
  higher: "▲",
  lower: "▼",
};

function PillList({ items, dotMap }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {items.map((item, idx) => (
        <span
          key={`${item.label}-${idx}`}
          title={`${item.label}: ${item.status === "correct" ? "Match!" : "Not in secret"}`}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold
            ${
              item.status === "correct"
                ? "bg-correct/80 text-emerald-100"
                : "bg-incorrect/80 text-red-100"
            }`}
        >
          {dotMap && dotMap[item.label] && (
            <span
              className={`w-2 h-2 rounded-full ${dotMap[item.label]} flex-shrink-0`}
            />
          )}
          {dotMap ? item.label.slice(0, 1) : item.label}
        </span>
      ))}
    </div>
  );
}

export default function GuessRow({ guess, results, index }) {
  return (
    <div className="animate-in" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Card name header */}
      <div className="flex items-center gap-3 mb-2 px-1">
        {guess.image && (
          <img
            src={guess.image}
            alt={guess.name}
            className="w-8 h-11 rounded-sm object-cover shadow-md border border-border/50"
          />
        )}
        <span className="font-display text-sm font-semibold tracking-wide text-text">
          {guess.name}
        </span>
      </div>

      {/* Attribute tiles — 9 columns */}
      <div className="grid grid-cols-9 gap-1.5">
        {results.map((r, i) => {
          // Color column
          if (r.type === "color") {
            return (
              <div
                key={r.label}
                className="relative flex flex-col items-center justify-center
                           rounded-md border border-border bg-surface-raised px-1 py-2 min-h-[56px]"
                style={{ animationDelay: `${(index * 9 + i) * 60}ms` }}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1 font-semibold text-text-muted">
                  Color
                </span>
                <PillList items={r.colors} dotMap={COLOR_DOT} />
              </div>
            );
          }

          // Subtype column
          if (r.type === "subtype") {
            return (
              <div
                key={r.label}
                className="relative flex flex-col items-center justify-center
                           rounded-md border border-border bg-surface-raised px-1 py-2 min-h-[56px]"
                style={{ animationDelay: `${(index * 9 + i) * 60}ms` }}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1 font-semibold text-text-muted">
                  Subtype
                </span>
                <PillList items={r.subtypes} />
              </div>
            );
          }

          // Supertype column
          if (r.type === "supertype") {
            return (
              <div
                key={r.label}
                className="relative flex flex-col items-center justify-center
                           rounded-md border border-border bg-surface-raised px-1 py-2 min-h-[56px]"
                style={{ animationDelay: `${(index * 9 + i) * 60}ms` }}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1 font-semibold text-text-muted">
                  Supertype
                </span>
                <PillList items={r.supertypes} />
              </div>
            );
          }

          // Normal attribute tile
          return (
            <div
              key={r.label}
              className={`relative flex flex-col items-center justify-center
                          rounded-md border px-1 py-2 min-h-[56px]
                          transition-all duration-300 ${STATUS_STYLES[r.status]}`}
              style={{ animationDelay: `${(index * 9 + i) * 60}ms` }}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5 font-semibold">
                {r.label}
              </span>
              <span className="text-xs font-bold text-center leading-tight">
                {r.extra
                  ? `${r.value}`
                  : ARROWS[r.status]
                    ? `${r.value} ${ARROWS[r.status]}`
                    : r.value}
              </span>
              {r.extra && (
                <span className="text-[9px] opacity-70 mt-0.5">{r.extra}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}