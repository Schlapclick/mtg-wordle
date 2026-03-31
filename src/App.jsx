import { useState, useEffect, useCallback } from "react";
import {
  getRandomCard,
  getCardByName,
  ScryfallError,
  loadSets,
  getFilterableSets,
} from "./utils/scryfall";
import { compareCards } from "./utils/compare";
import SearchInput from "./components/SearchInput";
import GuessRow from "./components/GuessRow";
import GuessHeader from "./components/GuessHeader";
import WinModal from "./components/WinModal";
import FilterPanel from "./components/FilterPanel";
import DailyBanner from "./components/DailyBanner";
import AdminPanel from "./components/AdminPanel";

const MAX_GUESSES = 8;

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function onPop() {
      setPath(window.location.pathname);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(to) {
    window.history.pushState({}, "", to);
    setPath(to);
  }

  return [path, navigate];
}

export default function App() {
  const [path, navigate] = useRoute();

  // If on admin route, show admin panel
  if (path === "/admin") {
    return (
      <div className="min-h-screen">
        <AdminPanel />
      </div>
    );
  }

  return <Game navigate={navigate} />;
}

function Game({ navigate }) {
  const [secret, setSecret] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [gameState, setGameState] = useState("loading");
  const [error, setError] = useState(null);
  const [loadingGuess, setLoadingGuess] = useState(false);
  const [filterableSets, setFilterableSets] = useState([]);
  const [filters, setFilters] = useState({ sets: [], types: [] });
  const [isDaily, setIsDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);

  const startFreePlay = useCallback(
    async (currentFilters) => {
      const f = currentFilters || filters;
      setGameState("loading");
      setGuesses([]);
      setError(null);
      setIsDaily(false);
      setDailyDate(null);
      try {
        await loadSets();
        setFilterableSets(getFilterableSets());
        const card = await getRandomCard(f);
        setSecret(card);
        setGameState("playing");
      } catch (err) {
        console.error(err);
        handleLoadError(err);
      }
    },
    [filters]
  );

  const startDaily = useCallback(async () => {
    setGameState("loading");
    setGuesses([]);
    setError(null);
    setIsDaily(true);

    try {
      await loadSets();
      setFilterableSets(getFilterableSets());

      // Check if already completed today
      const today = new Date().toISOString().split("T")[0];
      const savedDaily = localStorage.getItem(`mtgwordle-daily-${today}`);
      if (savedDaily) {
        const parsed = JSON.parse(savedDaily);
        if (parsed.completed) {
          setDailyCompleted(true);
          // Still load the card to show results
        }
      }

      // Fetch daily card name from the worker
      const res = await fetch("/api/daily");
      const data = await res.json();

      if (!data.ok) {
        setError("No daily card has been set for today. Try Free Play instead!");
        setGameState("error");
        return;
      }

      setDailyDate(data.date);

      // Fetch the actual card data from Scryfall
      const card = await getCardByName(data.cardName);
      setSecret(card);

      // Restore saved guesses if any
      if (savedDaily) {
        const parsed = JSON.parse(savedDaily);
        if (parsed.guesses && parsed.guesses.length > 0) {
          // Re-fetch and compare each saved guess
          const restoredGuesses = [];
          for (const guessName of parsed.guesses) {
            try {
              const guessCard = await getCardByName(guessName);
              const results = compareCards(guessCard, card);
              restoredGuesses.push({ card: guessCard, results });
            } catch {
              // Skip failed restores
            }
          }
          setGuesses(restoredGuesses);

          if (parsed.completed) {
            setGameState(parsed.won ? "won" : "lost");
            return;
          }
        }
      }

      setGameState("playing");
    } catch (err) {
      console.error(err);
      handleLoadError(err);
    }
  }, []);

  function handleLoadError(err) {
    if (
      err instanceof ScryfallError &&
      (err.type === "maintenance" || err.type === "unavailable")
    ) {
      setGameState("maintenance");
    } else if (err instanceof ScryfallError && err.type === "network") {
      setError("Cannot reach Scryfall. Check your internet connection.");
      setGameState("error");
    } else {
      setError(err.message || "Failed to load a card. Please try again.");
      setGameState("error");
    }
  }

  useEffect(() => {
    startFreePlay();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save daily progress to localStorage
  function saveDailyProgress(newGuesses, won, completed) {
    if (!isDaily || !dailyDate) return;
    const guessNames = newGuesses.map((g) => g.card.name);
    localStorage.setItem(
      `mtgwordle-daily-${dailyDate}`,
      JSON.stringify({ guesses: guessNames, won, completed })
    );
  }

  async function handleGuess(name) {
    if (gameState !== "playing" || loadingGuess) return;

    if (guesses.some((g) => g.card.name.toLowerCase() === name.toLowerCase())) {
      setError("You already guessed that card!");
      setTimeout(() => setError(null), 2000);
      return;
    }

    setLoadingGuess(true);
    setError(null);

    try {
      const card = await getCardByName(name);
      const results = compareCards(card, secret);
      const isCorrect = card.name.toLowerCase() === secret.name.toLowerCase();
      const newGuesses = [...guesses, { card, results }];

      setGuesses(newGuesses);

      if (isCorrect) {
        setGameState("won");
        saveDailyProgress(newGuesses, true, true);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameState("lost");
        saveDailyProgress(newGuesses, false, true);
      } else {
        saveDailyProgress(newGuesses, false, false);
      }
    } catch (err) {
      if (
        err instanceof ScryfallError &&
        (err.type === "maintenance" || err.type === "unavailable")
      ) {
        setError(
          "Scryfall is down for maintenance. Your game is saved — try guessing again later."
        );
      } else {
        setError("Card not found. Try selecting from the dropdown.");
      }
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoadingGuess(false);
    }
  }

  function handleGiveUp() {
    if (gameState === "playing") {
      setGameState("lost");
      if (isDaily) {
        saveDailyProgress(guesses, false, true);
      }
    }
  }

  function handleFiltersChange(newFilters) {
    setFilters(newFilters);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Subtle background texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wide">
          <span className="text-mtg-gold">MTG</span>{" "}
          <span className="text-text">Wordle</span>
        </h1>
        <p className="text-text-muted text-xs mt-1.5 tracking-wide">
          Guess the Magic: The Gathering card in {MAX_GUESSES} tries
        </p>

        {/* Mode toggle buttons */}
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={() => {
              if (!isDaily) return;
              startFreePlay();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer
              ${
                !isDaily
                  ? "bg-mtg-gold/20 text-mtg-gold border border-mtg-gold/40"
                  : "bg-surface-raised text-text-muted border border-border hover:border-text-muted/30"
              }`}
          >
            Free Play
          </button>
          <button
            onClick={() => {
              if (isDaily) return;
              startDaily();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer
              ${
                isDaily
                  ? "bg-mtg-gold/20 text-mtg-gold border border-mtg-gold/40"
                  : "bg-surface-raised text-text-muted border border-border hover:border-text-muted/30"
              }`}
          >
            ✦ Daily Card
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 pb-8">
        {/* Daily banner */}
        {isDaily && dailyDate && (
          <DailyBanner dailyDate={dailyDate} onExitDaily={() => startFreePlay()} />
        )}

        {/* Filters (only in free play) */}
        {!isDaily &&
          (gameState === "playing" || gameState === "loading") &&
          filterableSets.length > 0 && (
            <FilterPanel
              sets={filterableSets}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          )}

        {/* New game button when filters changed mid-game (free play only) */}
        {!isDaily && gameState === "playing" && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => startFreePlay(filters)}
              className="text-[11px] text-text-muted hover:text-mtg-gold transition-colors cursor-pointer
                         underline underline-offset-2 decoration-text-muted/30"
            >
              New game with current filters
            </button>
          </div>
        )}

        {/* Search + status */}
        <div className="mb-6">
          <SearchInput
            onGuess={handleGuess}
            disabled={gameState !== "playing" || loadingGuess}
          />

          {error && (
            <div className="mt-3 text-center text-sm text-mtg-red animate-in">
              {error}
            </div>
          )}

          {gameState === "loading" && (
            <div className="flex flex-col items-center mt-12 gap-3">
              <div className="w-8 h-8 border-3 border-mtg-gold/20 border-t-mtg-gold rounded-full animate-spin" />
              <p className="text-text-muted text-sm">
                Summoning a card from the multiverse...
              </p>
            </div>
          )}

          {gameState === "maintenance" && (
            <div className="mt-8 max-w-md mx-auto text-center animate-in">
              <div className="bg-surface-raised border border-partial/30 rounded-xl p-6">
                <div className="text-3xl mb-3">🔧</div>
                <h2 className="font-display text-lg font-bold text-partial mb-2">
                  Scryfall is Down for Maintenance
                </h2>
                <p className="text-text-muted text-sm mb-5 leading-relaxed">
                  The card database we use is currently offline for scheduled
                  maintenance. This usually doesn't take long.
                </p>
                <button
                  onClick={() => (isDaily ? startDaily() : startFreePlay())}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm
                             bg-partial/20 text-partial border border-partial/30
                             hover:bg-partial/30 active:scale-[0.98]
                             transition-all duration-150 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {gameState === "error" && (
            <div className="mt-8 max-w-md mx-auto text-center animate-in">
              <div className="bg-surface-raised border border-incorrect/30 rounded-xl p-6">
                <div className="text-3xl mb-3">⚠️</div>
                <h2 className="font-display text-lg font-bold text-incorrect mb-2">
                  {isDaily ? "Daily Card Unavailable" : "Connection Error"}
                </h2>
                <p className="text-text-muted text-sm mb-5 leading-relaxed">
                  {error || "Something went wrong loading the game."}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => (isDaily ? startDaily() : startFreePlay())}
                    className="px-6 py-2.5 rounded-lg font-semibold text-sm
                               bg-incorrect/20 text-incorrect border border-incorrect/30
                               hover:bg-incorrect/30 active:scale-[0.98]
                               transition-all duration-150 cursor-pointer"
                  >
                    Retry
                  </button>
                  {isDaily && (
                    <button
                      onClick={() => startFreePlay()}
                      className="px-6 py-2.5 rounded-lg font-semibold text-sm
                                 bg-surface-hover text-text-muted border border-border
                                 hover:border-text-muted/30 active:scale-[0.98]
                                 transition-all duration-150 cursor-pointer"
                    >
                      Free Play
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-text-muted text-xs">
                Guess{" "}
                <span className="text-text font-semibold">
                  {guesses.length}
                </span>{" "}
                / {MAX_GUESSES}
              </p>
              <button
                onClick={handleGiveUp}
                className="text-xs text-text-muted hover:text-mtg-red transition-colors cursor-pointer"
              >
                Give up
              </button>
            </div>
          )}
        </div>

        {/* Guess grid */}
        {guesses.length > 0 && (
          <div className="space-y-3">
            <GuessHeader />
            {guesses.map((g, i) => (
              <GuessRow
                key={`${g.card.name}-${i}`}
                guess={g.card}
                results={g.results}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Lost state */}
        {gameState === "lost" && secret && (
          <div className="mt-8 text-center animate-in">
            <p className="text-text-muted text-sm mb-4">The card was...</p>
            <div className="inline-block">
              {secret.image && (
                <img
                  src={secret.image}
                  alt={secret.name}
                  className="w-56 mx-auto rounded-lg shadow-xl border border-border mb-3"
                />
              )}
              <p className="font-display text-lg font-semibold text-mtg-gold">
                {secret.name}
              </p>
              <p className="text-text-muted text-xs mt-1">
                {secret.setName} · {secret.rarity}
                {secret.artist && ` · Art by ${secret.artist}`}
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              {!isDaily && (
                <button
                  onClick={() => startFreePlay()}
                  className="px-8 py-3 rounded-lg font-bold text-sm
                             bg-mtg-gold text-mtg-black
                             hover:brightness-110 active:scale-[0.98]
                             transition-all duration-150 cursor-pointer"
                >
                  Play Again
                </button>
              )}
              {isDaily && (
                <button
                  onClick={() => startFreePlay()}
                  className="px-8 py-3 rounded-lg font-bold text-sm
                             bg-surface-raised text-text border border-border
                             hover:border-text-muted/30 active:scale-[0.98]
                             transition-all duration-150 cursor-pointer"
                >
                  Try Free Play
                </button>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        {gameState === "playing" && guesses.length === 0 && (
          <div className="mt-8 max-w-md mx-auto">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 text-center">
              How to play
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-correct flex-shrink-0" />
                <span className="text-text-muted">
                  <span className="text-text font-semibold">Green</span> — exact
                  match
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-partial flex-shrink-0" />
                <span className="text-text-muted">
                  <span className="text-text font-semibold">Yellow</span> —
                  partial match (shares some colors/subtypes)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-incorrect flex-shrink-0" />
                <span className="text-text-muted">
                  <span className="text-text font-semibold">Red</span> — no
                  match. Arrows (▲▼) show if the answer is higher/lower or
                  newer/older.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Win modal */}
      {gameState === "won" && secret && (
        <WinModal
          secret={secret}
          guessCount={guesses.length}
          onPlayAgain={isDaily ? () => startFreePlay() : () => startFreePlay()}
          isDaily={isDaily}
        />
      )}

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-[10px] text-text-muted/50">
        Card data from{" "}<a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted transition-colors">Scryfall</a>. Not affiliated with Wizards of the Coast.
      </footer>
    </div>
  );
}