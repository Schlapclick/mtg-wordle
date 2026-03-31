const LABELS = [
  "Color",
  "Mana Value",
  "Type",
  "Supertype",
  "Subtype",
  "Power",
  "Toughness",
  "Set",
  "Rarity",
];

export default function GuessHeader() {
  return (
    <div className="grid grid-cols-9 gap-1.5 mb-3 px-1">
      {LABELS.map((label) => (
        <div
          key={label}
          className="text-center text-[10px] uppercase tracking-widest text-text-muted font-semibold py-1"
        >
          {label}
        </div>
      ))}
    </div>
  );
}