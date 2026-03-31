export default function DailyBanner({ dailyDate, onExitDaily }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-4 animate-in">
      <div className="bg-mtg-gold/10 border border-mtg-gold/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-mtg-gold text-sm">✦</span>
          <span className="text-sm font-semibold text-mtg-gold">Daily Challenge</span>
          <span className="text-xs text-text-muted">{dailyDate}</span>
        </div>
        <button
          onClick={onExitDaily}
          className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          Free Play →
        </button>
      </div>
    </div>
  );
}