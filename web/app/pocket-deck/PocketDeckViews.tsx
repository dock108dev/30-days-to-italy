"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OfflineReadiness } from "../offline/model";
import type { TripProfile } from "../trip/model";
import {
  CORE_POCKET_DECK_CARD_BY_ID,
  CORE_POCKET_DECK_CARD_IDS,
  CORE_POCKET_DECK_CARDS,
  POCKET_DECK_CATEGORIES,
  POCKET_DECK_CATEGORY_LABELS,
  RECOVERY_POCKET_DECK_CARD_IDS,
} from "./catalog";
import {
  pocketDeckEvidenceForCard,
  recordRecentPocketDeckCard,
  togglePocketDeckPin,
  type PocketDeckCard,
  type PocketDeckCategory,
  type PocketDeckState,
} from "./model";
import { summarizePocketDeckPractice } from "./practice";
import { searchPocketDeckCards } from "./search";
import {
  acquirePocketDeckShowViewLock,
  lockPocketDeckDocumentScroll,
  releasePocketDeckShowViewLock,
} from "./scroll-lock";

type PocketDeckProps = {
  profile: TripProfile;
  state: PocketDeckState;
  offlineReadiness: OfflineReadiness;
  onStateChange: (state: PocketDeckState) => void;
  onEditTrip: () => void;
  initialCardId?: string;
  initialShowLargeText?: boolean;
  openCardId?: string | null;
  onOpenCardHandled?: () => void;
  demoMode?: boolean;
};

type PlayingAudio = {
  cardId: string;
  speed: "normal" | "careful";
};

function cardsForIds(ids: readonly string[]): PocketDeckCard[] {
  return ids.flatMap((id) => {
    const card = CORE_POCKET_DECK_CARD_BY_ID.get(id);
    return card ? [card] : [];
  });
}

function PinButton({
  card,
  pinned,
  onToggle,
}: {
  card: PocketDeckCard;
  pinned: boolean;
  onToggle: (cardId: string) => void;
}) {
  return (
    <button
      type="button"
      className={`deck-pin-button ${pinned ? "pinned" : ""}`}
      aria-label={`${pinned ? "Unpin" : "Pin"} ${card.englishIntent}`}
      aria-pressed={pinned}
      onClick={() => onToggle(card.id)}
    >
      <span aria-hidden="true">{pinned ? "★" : "☆"}</span>
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}

function PocketDeckCardTile({
  card,
  pinned,
  practiced,
  recent,
  demoMode = false,
  onOpen,
  onTogglePin,
}: {
  card: PocketDeckCard;
  pinned: boolean;
  practiced: boolean;
  recent: boolean;
  demoMode?: boolean;
  onOpen: (cardId: string) => void;
  onTogglePin: (cardId: string) => void;
}) {
  return (
    <article className="deck-card-tile">
      <div className="deck-card-meta">
        <div className="deck-card-labels">
          <span>{POCKET_DECK_CATEGORY_LABELS[card.category]}</span>
          {practiced && <strong>{demoMode ? "Demo practiced" : "Practiced"}</strong>}
          {recent && <strong>Recent</strong>}
        </div>
        <PinButton card={card} pinned={pinned} onToggle={onTogglePin} />
      </div>
      <button
        type="button"
        className="deck-card-open"
        aria-label={`Open ${card.englishIntent}`}
        onClick={() => onOpen(card.id)}
      >
        <span>{card.englishIntent}</span>
        <strong lang="it">{card.primaryItalian}</strong>
        <small>Open card <i aria-hidden="true">→</i></small>
      </button>
    </article>
  );
}

function CardGrid({
  cards,
  pinnedIds,
  practicedIds,
  recentIds = [],
  demoMode = false,
  onOpen,
  onTogglePin,
}: {
  cards: readonly PocketDeckCard[];
  pinnedIds: readonly string[];
  practicedIds: readonly string[];
  recentIds?: readonly string[];
  demoMode?: boolean;
  onOpen: (cardId: string) => void;
  onTogglePin: (cardId: string) => void;
}) {
  return (
    <div className="deck-card-grid">
      {cards.map((card) => (
        <PocketDeckCardTile
          key={card.id}
          card={card}
          pinned={pinnedIds.includes(card.id)}
          practiced={practicedIds.includes(card.id)}
          recent={recentIds.includes(card.id)}
          demoMode={demoMode}
          onOpen={onOpen}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}

export function PocketDeck({
  profile,
  state,
  offlineReadiness,
  onStateChange,
  onEditTrip,
  initialCardId,
  initialShowLargeText = false,
  openCardId,
  onOpenCardHandled,
  demoMode = false,
}: PocketDeckProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PocketDeckCategory | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(() =>
    initialCardId && CORE_POCKET_DECK_CARD_IDS.has(initialCardId) ? initialCardId : null,
  );
  const [showLargeText, setShowLargeText] = useState(
    Boolean(initialShowLargeText && initialCardId && CORE_POCKET_DECK_CARD_IDS.has(initialCardId)),
  );
  const [playing, setPlaying] = useState<PlayingAudio | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAllCards, setShowAllCards] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const showButtonRef = useRef<HTMLButtonElement>(null);
  const restoreShowButtonFocusRef = useRef(false);
  const unlockScrollRef = useRef<null | (() => void)>(null);
  const handledOpenCardIdRef = useRef<string | null>(null);

  const activeCard = activeCardId
    ? CORE_POCKET_DECK_CARD_BY_ID.get(activeCardId) ?? null
    : null;
  const results = useMemo(
    () => searchPocketDeckCards(CORE_POCKET_DECK_CARDS, query, category),
    [query, category],
  );
  const recoveryCards = cardsForIds(RECOVERY_POCKET_DECK_CARD_IDS);
  const practicedCardIds = Object.keys(state.practiceEvidenceByCardId).filter(
    (cardId) => pocketDeckEvidenceForCard(state, cardId).length > 0,
  );
  const quickAccessIds = [
    ...new Set([
      ...state.pinnedCardIds,
      ...practicedCardIds,
      ...state.recentCardIds,
    ]),
  ];
  const quickAccessCards = cardsForIds(quickAccessIds);
  const quickAccessIdSet = new Set(quickAccessIds);
  const remainingRecoveryCards = recoveryCards.filter(
    (card) => !quickAccessIdSet.has(card.id),
  );
  const activePracticeEvidence = activeCard
    ? pocketDeckEvidenceForCard(state, activeCard.id)
    : [];
  const latestPractice = activePracticeEvidence[0] ?? null;
  const latestPracticeSummary = latestPractice
    ? summarizePocketDeckPractice(latestPractice)
    : null;

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(null);
  }, []);

  useEffect(() => {
    if (!openCardId) {
      handledOpenCardIdRef.current = null;
      return;
    }
    if (
      handledOpenCardIdRef.current === openCardId ||
      !CORE_POCKET_DECK_CARD_IDS.has(openCardId)
    ) {
      onOpenCardHandled?.();
      return;
    }

    handledOpenCardIdRef.current = openCardId;
    stopAudio();
    setAudioError(null);
    setShowLargeText(false);
    setActiveCardId(openCardId);
    onStateChange(recordRecentPocketDeckCard(state, openCardId, CORE_POCKET_DECK_CARD_IDS));
    onOpenCardHandled?.();
  }, [onOpenCardHandled, onStateChange, openCardId, state, stopAudio]);

  const closeLargeText = useCallback(() => {
    stopAudio();
    restoreShowButtonFocusRef.current = true;
    setShowLargeText(false);
  }, [stopAudio]);

  useEffect(() => {
    if (!showLargeText) return;
    acquirePocketDeckShowViewLock(
      unlockScrollRef,
      () => lockPocketDeckDocumentScroll(document, window),
    );
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      releasePocketDeckShowViewLock(unlockScrollRef);
    };
  }, [showLargeText]);

  useEffect(() => {
    if (!showLargeText) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLargeText();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLargeText, closeLargeText]);

  useEffect(() => {
    if (showLargeText || !restoreShowButtonFocusRef.current) return;
    const focusFrame = window.requestAnimationFrame(() => {
      showButtonRef.current?.focus({ preventScroll: true });
      restoreShowButtonFocusRef.current = false;
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [showLargeText]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  function openCard(cardId: string) {
    if (!CORE_POCKET_DECK_CARD_IDS.has(cardId)) return;
    stopAudio();
    setAudioError(null);
    setShowLargeText(false);
    setActiveCardId(cardId);
    onStateChange(recordRecentPocketDeckCard(state, cardId, CORE_POCKET_DECK_CARD_IDS));
  }

  function closeCard() {
    stopAudio();
    setAudioError(null);
    setShowLargeText(false);
    setActiveCardId(null);
  }

  function togglePin(cardId: string) {
    onStateChange(togglePocketDeckPin(state, cardId, CORE_POCKET_DECK_CARD_IDS));
  }

  async function playCardAudio(card: PocketDeckCard, speed: "normal" | "careful") {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = speed === "normal" ? card.normalAudio : card.carefulAudio;
    audio.currentTime = 0;
    setAudioError(null);
    setPlaying({ cardId: card.id, speed });
    try {
      await audio.play();
    } catch {
      setPlaying(null);
      setAudioError("Audio could not play. The Italian text is still available below.");
    }
  }

  function openLargeText() {
    stopAudio();
    restoreShowButtonFocusRef.current = false;
    acquirePocketDeckShowViewLock(
      unlockScrollRef,
      () => lockPocketDeckDocumentScroll(document, window),
    );
    setShowLargeText(true);
  }

  if (activeCard && showLargeText) {
    return (
      <section
        ref={dialogRef}
        className="deck-show-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-show-title"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="deck-show-close"
          aria-label="Close large-text view"
          onClick={closeLargeText}
        >
          <span aria-hidden="true">×</span> Close
        </button>
        <div className="deck-show-content">
          <p id="deck-show-title" lang="it">Frase da mostrare</p>
          <strong lang="it">{activeCard.primaryItalian}</strong>
          {activeCard.shortItalian !== activeCard.primaryItalian && (
            <div>
              <span>Short version</span>
              <b lang="it">{activeCard.shortItalian}</b>
            </div>
          )}
        </div>
        <small>Italian first · tap Close or press Escape to return</small>
      </section>
    );
  }

  return (
    <section className="trip-mode-home pocket-deck-shell" aria-labelledby="trip-mode-title">
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(null)}
        onError={() => {
          setPlaying(null);
          setAudioError("Audio could not play. The Italian text is still available below.");
        }}
      />

      <div className="pocket-deck-content">
        <div className="trip-mode-heading">
          <div>
            <p>Trip Mode · Pocket Deck</p>
            <h2 id="trip-mode-title">
              {activeCard ? activeCard.englishIntent : "The words you need, within reach."}
            </h2>
            <span>{profile.regionLabel} · {profile.tripLengthDays}-day trip</span>
          </div>
          <div
            className={`offline-badge offline-badge-${offlineReadiness.state}`}
            data-offline-status={offlineReadiness.state}
            role="status"
            aria-live="polite"
            title={offlineReadiness.detail}
          >
            <i aria-hidden="true" /> {offlineReadiness.label}
          </div>
        </div>

        {demoMode && (
          <section className="demo-deck-boundary" aria-label="Demo Pocket Deck evidence boundary">
            <strong>Demo-only Pocket Deck</strong>
            <p>Core catalog cards are always available. “Demo practiced” marks evidence deliberately carried from a played demo scene; canonically advanced checkpoints add no practice evidence. Pins and Recents here disappear when Demo mode exits.</p>
          </section>
        )}

        {activeCard ? (
          <article className="deck-card-detail" aria-labelledby="deck-card-italian">
            <div className="deck-detail-toolbar">
              <button type="button" className="deck-back-button" onClick={closeCard}>
                <span aria-hidden="true">←</span> Back to deck
              </button>
              <PinButton
                card={activeCard}
                pinned={state.pinnedCardIds.includes(activeCard.id)}
                onToggle={togglePin}
              />
            </div>

            <div className="deck-primary-phrase">
              <span>{POCKET_DECK_CATEGORY_LABELS[activeCard.category]}</span>
              <strong id="deck-card-italian" lang="it">{activeCard.primaryItalian}</strong>
              {activeCard.shortItalian !== activeCard.primaryItalian && (
                <p><i>Short:</i> <b lang="it">{activeCard.shortItalian}</b></p>
              )}
            </div>

            <div className="deck-audio-controls" aria-label="Italian audio">
              <button
                type="button"
                aria-label={`Play normal Italian audio for ${activeCard.englishIntent}`}
                aria-pressed={playing?.cardId === activeCard.id && playing.speed === "normal"}
                onClick={() => playCardAudio(activeCard, "normal")}
              >
                <span aria-hidden="true">▶</span>
                <strong>Normal audio</strong>
              </button>
              <button
                type="button"
                aria-label={`Play careful Italian audio for ${activeCard.englishIntent}`}
                aria-pressed={playing?.cardId === activeCard.id && playing.speed === "careful"}
                onClick={() => playCardAudio(activeCard, "careful")}
              >
                <span aria-hidden="true">◌</span>
                <strong>Careful audio</strong>
              </button>
              <p aria-live="polite">
                {playing?.cardId === activeCard.id
                  ? `Playing ${playing.speed} Italian audio.`
                  : "Local audio · no connection used for this card."}
              </p>
            </div>
            {audioError && <p className="deck-audio-error" role="status">{audioError}</p>}

            <div className="deck-detail-actions">
              <button
                ref={showButtonRef}
                type="button"
                className="deck-show-button"
                onClick={openLargeText}
              >
                Show this <span aria-hidden="true">↗</span>
              </button>
              <small>Large Italian for showing someone nearby.</small>
            </div>

            {latestPractice && latestPracticeSummary && (
              <section className="deck-practice-evidence" aria-labelledby="deck-practice-title">
                <div>
                  <span>{demoMode ? "Demo-only carried evidence" : "From your rehearsal"}</span>
                  <h3 id="deck-practice-title">{demoMode ? "This was practiced inside the demo." : "You have handled this before."}</h3>
                  <p>{latestPracticeSummary.reminder}</p>
                </div>
                <div>
                  <strong>
                    {activePracticeEvidence.length} {latestPractice.source === "guided-beach" ? "beach " : "episode "}{activePracticeEvidence.length === 1
                      ? "rehearsal"
                      : "rehearsals"}
                  </strong>
                  <p>{latestPracticeSummary.support}</p>
                </div>
              </section>
            )}

            <div className="deck-detail-grid">
              <details open>
                <summary>Likely reply</summary>
                <strong lang="it">{activeCard.likelyResponse}</strong>
                <p>{activeCard.likelyResponseEnglish}</p>
              </details>
              <details>
                <summary>Listen for</summary>
                <ul>
                  {activeCard.listenFor.map((cue) => <li key={cue}>{cue}</li>)}
                </ul>
              </details>
              {activeCard.variation && (
                <details>
                  <summary>Useful variation</summary>
                  <strong lang="it">{activeCard.variation}</strong>
                </details>
              )}
            </div>
          </article>
        ) : (
          <>
            <div className="deck-search-panel">
              <label htmlFor="pocket-deck-search">Search in English</label>
              <div>
                <input
                  id="pocket-deck-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “pay by card” or “I don’t understand”…"
                />
                {(query || category) && (
                  <button
                    type="button"
                    aria-label="Clear Pocket Deck filters"
                    onClick={() => {
                      setQuery("");
                      setCategory(null);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <p>Search works entirely on this device.</p>
            </div>

            {query || category ? (
              <section className="deck-section" aria-live="polite">
                <div className="deck-section-heading">
                  <div>
                    <span>{category ? POCKET_DECK_CATEGORY_LABELS[category] : "English search"}</span>
                    <h3>{results.length} {results.length === 1 ? "card" : "cards"} ready</h3>
                  </div>
                </div>
                {results.length > 0 ? (
                  <CardGrid
                    cards={results}
                    pinnedIds={state.pinnedCardIds}
                    practicedIds={practicedCardIds}
                    demoMode={demoMode}
                    onOpen={openCard}
                    onTogglePin={togglePin}
                  />
                ) : (
                  <div className="deck-no-results">
                    <strong>No exact match.</strong>
                    <p>Try one of the two recovery cards below.</p>
                    <CardGrid
                      cards={recoveryCards}
                      pinnedIds={state.pinnedCardIds}
                      practicedIds={practicedCardIds}
                      demoMode={demoMode}
                      onOpen={openCard}
                      onTogglePin={togglePin}
                    />
                  </div>
                )}
              </section>
            ) : (
              <>
                <section className="deck-section deck-quick-section">
                  <div className="deck-section-heading">
                    <div>
                      <span>Quick access</span>
                      <h3>Ready when you need it</h3>
                    </div>
                    <small>{quickAccessCards.length} saved</small>
                  </div>
                  {quickAccessCards.length > 0 ? (
                    <CardGrid
                      cards={quickAccessCards}
                      pinnedIds={state.pinnedCardIds}
                      practicedIds={practicedCardIds}
                      demoMode={demoMode}
                      recentIds={state.recentCardIds}
                      onOpen={openCard}
                      onTogglePin={togglePin}
                    />
                  ) : (
                    <p className="deck-empty-note">
                      Practiced, pinned, and recent cards will collect here.
                    </p>
                  )}
                </section>

                <section className="deck-section">
                  <div className="deck-section-heading">
                    <div>
                      <span>Situation categories</span>
                      <h3>Start with where you are</h3>
                    </div>
                  </div>
                  <div className="deck-category-grid">
                    {POCKET_DECK_CATEGORIES.map(([id, label]) => {
                      const count = CORE_POCKET_DECK_CARDS.filter((card) => card.category === id).length;
                      return (
                        <button key={id} type="button" onClick={() => setCategory(id)}>
                          <strong>{label}</strong>
                          <span>{count} {count === 1 ? "card" : "cards"} <i aria-hidden="true">→</i></span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {remainingRecoveryCards.length > 0 && (
                <section className="deck-section deck-recovery-section">
                  <div className="deck-section-heading">
                    <div>
                      <span>When the words disappear</span>
                      <h3>Two ways to slow things down</h3>
                    </div>
                  </div>
                  <CardGrid
                    cards={remainingRecoveryCards}
                    pinnedIds={state.pinnedCardIds}
                    practicedIds={practicedCardIds}
                    demoMode={demoMode}
                    onOpen={openCard}
                    onTogglePin={togglePin}
                  />
                </section>
                )}

                <section className="deck-section deck-browse-section">
                  <button type="button" className="deck-browse-toggle" onClick={() => setShowAllCards((value) => !value)} aria-expanded={showAllCards}>
                    <span>{showAllCards ? "Hide full deck" : `Browse all ${CORE_POCKET_DECK_CARDS.length} cards`}</span>
                    <i aria-hidden="true">{showAllCards ? "−" : "+"}</i>
                  </button>
                  {showAllCards && (
                    <CardGrid
                      cards={CORE_POCKET_DECK_CARDS}
                      pinnedIds={state.pinnedCardIds}
                      practicedIds={practicedCardIds}
                      demoMode={demoMode}
                      recentIds={state.recentCardIds}
                      onOpen={openCard}
                      onTogglePin={togglePin}
                    />
                  )}
                </section>
              </>
            )}

            <div className="trip-mode-footer">
              <p>
                <strong>No lessons here.</strong> Open a card, listen, read, or show it. Nothing in
                Trip Mode changes your rehearsal result.
              </p>
              <button type="button" onClick={onEditTrip}>Edit trip details</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
