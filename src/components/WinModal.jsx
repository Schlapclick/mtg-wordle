export default function WinModal({ secret, guessCount, onPlayAgain, isDaily }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in">
      <div
        className="bg-surface-raised border border-mtg-gold/30 rounded-2xl p-8 max-w-sm w-full mx-4
                    shadow-2xl shadow-mtg-gold/10 text-center"
      >
        <div className="text-4xl mb-3">✨</div>
        <h2 className="font-display text-2xl font-bold text-mtg-gold mb-2">
          {isDaily ? "Daily Solved!" : "Victory!"}
        </h2>
        <p className="text-text-muted text-sm mb-5">
          You found the card in{" "}
          <span className="text-mtg-gold font-bold">{guessCount}</span>{" "}
          {guessCount === 1 ? "guess" : "guesses"}!
        </p>

        {secret.image && (
          <img
            src={secret.image}
            alt={secret.name}
            className="w-48 mx-auto rounded-lg shadow-xl mb-5 border border-border"
          />
        )}

        <p className="font-display text-lg font-semibold mb-1">{secret.name}</p>
        <p className="text-text-muted text-xs mb-6">
          {secret.setName} · {secret.rarity}
          {secret.artist && ` · Art by ${secret.artist}`}
        </p>

        <button
          onClick={onPlayAgain}
          className="w-full py-3 rounded-lg font-bold text-sm
                     bg-mtg-gold text-mtg-black
                     hover:brightness-110 active:scale-[0.98]
                     transition-all duration-150 cursor-pointer"
        >
          {isDaily ? "Try Free Play" : "Play Again"}
        </button>
      </div>
    </div>
  );
}