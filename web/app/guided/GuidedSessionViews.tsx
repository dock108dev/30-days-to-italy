import { type GameState, type Scene } from "../game/model";
import type { PocketDeckPracticeEvidence } from "../pocket-deck/model";
import { OUTCOMES } from "../season/registry";
import type { GuidedBeachSession } from "./model";

export function GuidedSessionProgress({ status }: { status: GuidedBeachSession["status"] }) {
  const active = status === "complete" ? 3 : status === "in_progress" ? 2 : 1;
  return (
    <div className="guided-progress" aria-label="Guided rehearsal progress">
      {["Situation", "Rehearsal", "Review"].map((label, index) => (
        <div key={label} className={index + 1 <= active ? "active" : ""}>
          <span>{index + 1 < active ? "✓" : index + 1}</span>
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  );
}

const LANGUAGE = {
  request: {
    italian: "Mi servono un lettino e un ombrellone.",
    english: "I need one beach chair and one umbrella.",
  },
  quantity: { italian: "Un lettino, non due.", english: "One chair, not two." },
  price: { italian: "Quanto costa per oggi?", english: "How much is it for today?" },
  recovery: {
    italian: "Non capisco. Uno o due lettini?",
    english: "I don’t understand. One or two chairs?",
  },
  confirm: { italian: "Sì, va bene. Con la carta.", english: "Yes, that’s fine. By card." },
  decline: { italian: "No, grazie. Non mi serve.", english: "No, thank you. I don’t need it." },
} as const;

function recoverySummary(session: GuidedBeachSession): string {
  if (session.outcomeId === "E2-O4") return "You preserved a clean exit without accepting a charge.";
  if (session.quantityClarified && session.priceConfirmed) {
    return "You clarified one versus two and confirmed the quoted option before paying.";
  }
  if (session.quantityClarified) return "You clarified the quantity before the transaction moved forward.";
  if (session.priceConfirmed) return "You waited for a quoted option before confirming payment.";
  return "You completed the situation without letting support change the world outcome.";
}

export function GuidedSessionReview({
  session,
  game,
  scene,
  nextScene,
  handoff,
  handoffApplied,
  onCarryToDeck,
  onOpenInTripMode,
  tripModeAvailable = true,
  onNext,
  onReview,
  onPracticeAgain,
}: {
  session: GuidedBeachSession;
  game: GameState;
  scene: Scene;
  nextScene: Scene | null;
  handoff: PocketDeckPracticeEvidence | null;
  handoffApplied: boolean;
  onCarryToDeck: () => void;
  onOpenInTripMode: () => void;
  tripModeAvailable?: boolean;
  onNext: () => void;
  onReview: () => void;
  onPracticeAgain: () => void;
}) {
  const outcome = session.outcomeId ? OUTCOMES[session.outcomeId] : null;
  const practiced = session.practicedMoves.map((move) => LANGUAGE[move]);
  const usefulPhrase = practiced[0] ?? LANGUAGE.decline;
  const supportUsed =
    session.normalReplayCount + session.carefulReplayCount + session.transcriptRevealCount;
  const deckState = handoff ? handoffApplied ? "strengthened" : "available" : "none";

  return (
    <section id="guided-session-review" className="guided-review" aria-labelledby="guided-review-title">
      <GuidedSessionProgress status={session.status} />
      <div className="guided-review-heading">
        <div>
          <p>Rehearsal complete · attempt {session.attempt}</p>
          <h2 id="guided-review-title">You handled the beach.</h2>
        </div>
        <span>Saved locally</span>
      </div>

      <section className="review-section objective-result guided-outcome" data-review-section="objective-result">
        <span className="review-number">1</span>
        <div>
          <p>Objective and practical result</p>
          <strong>{scene.objective}</strong>
          <span>{outcome?.detail ?? "The beach situation reached a bounded result."}</span>
        </div>
      </section>

      <section className="review-section useful-phrasing guided-language" data-review-section="useful-phrasing">
        <span className="review-number">2</span>
        <div>
        <div className="guided-section-heading">
          <div><p>One useful phrasing</p><h3 lang="it">{usefulPhrase.italian}</h3></div>
        </div>
        <div className="guided-language-list">
          {practiced.slice(1, 3).map((phrase) => (
            <div key={phrase.italian}>
              <strong lang="it">{phrase.italian}</strong><p>{phrase.english}</p>
            </div>
          ))}
        </div>
        {(practiced.length > 3 || !session.practicedMoves.includes("price") || !session.practicedMoves.includes("recovery")) && (
          <details className="guided-more-language">
            <summary>More useful language</summary>
            <div>
              {practiced.slice(3).map((phrase) => (
                <p key={phrase.italian}><strong lang="it">{phrase.italian}</strong><span>{phrase.english}</span></p>
              ))}
              {!session.practicedMoves.includes("price") && (
                <p><strong lang="it">{LANGUAGE.price.italian}</strong><span>{LANGUAGE.price.english}</span></p>
              )}
              {!session.practicedMoves.includes("recovery") && (
                <p><strong lang="it">{LANGUAGE.recovery.italian}</strong><span>{LANGUAGE.recovery.english}</span></p>
              )}
            </div>
          </details>
        )}
        </div>
      </section>

      <section className="review-section pocket-deck-effect guided-deck-ready" data-review-section="pocket-deck-effect" data-pocket-deck-state={deckState}>
        <span className="review-number">3</span>
        {handoff && handoffApplied ? (
          <>
            <div>
              <span>Carried forward</span>
              <h3>Carried to your Pocket Deck.</h3>
            </div>
            <div className="guided-deck-action-copy">
              <p>This attempt now strengthens the existing beach card on this device.</p>
              {tripModeAvailable ? (
                <button type="button" onClick={onOpenInTripMode}>
                  Open in Trip Mode <span aria-hidden="true">→</span>
                </button>
              ) : (
                <small>Demo Trip Mode unlocks only after valid Day 30 completion.</small>
              )}
            </div>
          </>
        ) : handoff ? (
          <>
            <div>
              <span>Ready to carry forward</span>
              <h3>Keep this beach request within reach.</h3>
            </div>
            <div className="guided-deck-action-copy">
              <p>This will strengthen the existing beach card with facts from this attempt.</p>
              <button type="button" onClick={onCarryToDeck}>
                Carry this into my Pocket Deck <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div><span>Nothing invented</span><h3>This situation is ready for another pass.</h3></div>
            <div className="guided-deck-action-copy">
              <p>Practice the beach request before anything is carried into your deck.</p>
            </div>
          </>
        )}
      </section>

      <details className="review-details">
        <summary>Review your response and the recorded result</summary>
        <section className="review-section understood-intent guided-recovery" data-review-section="understood-intent">
          <div>
            <p>Your response</p>
            {game.lastResponse && <span className="recorded-response">You wrote “{game.lastResponse}”</span>}
            <strong>{recoverySummary(session)}</strong>
          </div>
        </section>

        <section className="review-section world-consequence" data-review-section="world-consequence">
          <div>
            <p>Recorded result</p>
            <strong>{outcome?.consequence ?? "No consequence was recorded."}</strong>
            <span>This is the exact result recorded by the beach episode.</span>
          </div>
        </section>
      </details>

      <section className="review-section next-action" data-review-section="next-action">
        <span className="review-number">4</span>
        <div>
          <p>Next action</p>
          {nextScene ? (
            <>
              <strong>{nextScene.title} is next.</strong>
              <button type="button" className="primary-action" data-primary-action="true" onClick={onNext}>
                Continue to {nextScene.day} <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <>
              <strong>The next rehearsal is scheduled closer to departure.</strong>
              <button type="button" className="primary-action" data-primary-action="true" onClick={onReview}>
                Return to season overview <span aria-hidden="true">→</span>
              </button>
            </>
          )}
          <button type="button" className="guided-practice-again" onClick={onPracticeAgain}>
            Practice this situation again <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <details className="guided-evidence">
        <summary>How you handled it</summary>
        <div>
          <p>
            {session.refresherApplied
              ? `You reached for English, practiced Mi servono, and returned to the same conversation ${
                  session.refresherMethod === "rebuilt"
                    ? "by rebuilding the phrase yourself."
                    : "using the suggested reply."
                }`
              : session.refresherOpened
                ? "You opened the Mi servono refresher and chose when to use it."
                : session.practicedMoves.includes("request")
                  ? "You formed the request without opening the refresher."
                  : "This attempt did not practice the Mi servono request."}
          </p>
          <dl>
            <div><dt>Replay</dt><dd>{session.normalReplayCount}</dd></div>
            <div><dt>Slower</dt><dd>{session.carefulReplayCount}</dd></div>
            <div><dt>Transcript</dt><dd>{session.transcriptRevealCount}</dd></div>
          </dl>
          {supportUsed === 0 && <small>No listening support was needed.</small>}
        </div>
      </details>

    </section>
  );
}
