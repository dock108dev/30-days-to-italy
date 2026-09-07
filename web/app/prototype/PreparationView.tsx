import { useEffect, useRef, useState } from "react";
import type { GameState } from "../game/model";
import { TURNS } from "../season/registry";
import { preparationFor, type PreparationAction } from "./preparation";
import { TeachingFeedbackResult } from "./PrototypeViews";

type Action = PreparationAction;

export function PreparationView({ game, onAction, onOverview, onReturn }: {
  game: GameState;
  onAction: (action: Action) => void;
  onOverview: () => void;
  onReturn: () => void;
}) {
  const preparation = preparationFor(game)!;
  const { content, segment, activity } = preparation;
  const situation = activity.page === "situation";
  const listening = activity.page === "listen" || activity.page === "turn-brief";
  const pattern = activity.page === "pattern" || activity.page === "turn-brief";
  const audio = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState("Audio is optional. Read or listen at your own pace.");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    onAction({ initialize: true });
  }, [onAction]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
    return () => {
      generation.current += 1;
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  function stop() {
    generation.current += 1;
    audio.current?.pause();
    audio.current = null;
    setPlaying(false);
    setStatus("Audio stopped.");
  }

  async function play(speed: "normal" | "careful") {
    stop();
    const token = generation.current;
    onAction({ audio: speed });
    const clip = new Audio(TURNS[segment.turnId][speed]);
    audio.current = clip;
    const current = () => generation.current === token && audio.current === clip;
    const failed = () => {
      if (!current()) return;
      setPlaying(false);
      setStatus("Audio could not play. You can read the Italian and continue.");
    };
    clip.onended = () => {
      if (!current()) return;
      setPlaying(false);
      setStatus("Audio finished.");
    };
    clip.onerror = failed;
    setPlaying(true);
    setStatus(`Playing ${speed} audio.`);
    try { await clip.play(); } catch { failed(); }
  }

  return (
    <section className="preparation" aria-labelledby="preparation-heading">
      {activity.page === "turn-brief" && game.teachingFeedback && (
        <TeachingFeedbackResult feedback={game.teachingFeedback} />
      )}
      <p className="preparation-context">{activity.page === "turn-brief" ? "Before your next reply" : "Before the conversation"}</p>
      <h2 id="preparation-heading" ref={heading} tabIndex={-1}>{situation ? content.situation.heading : activity.page === "pattern" ? segment.patternHeading : activity.page === "handoff" ? "Now the conversation" : segment.heading}</h2>
      {situation ? <>
        <p>{content.situation.copy}</p>
        <p className="preparation-note">{content.situation.context}</p>
      </> : null}
      {listening && <>
        <p>{segment.purpose}</p>
        <p className="preparation-transcript" lang="it">{TURNS[segment.turnId].text}</p>
        <dl className="preparation-chunks">
          {segment.chunks.map((chunk) => <div key={chunk.italian}>
            <dt lang="it">{chunk.italian}</dt><dd>{chunk.meaning}</dd>
          </div>)}
        </dl>
        <p className="preparation-note">{segment.cue}</p>
        <div className="preparation-audio">
          <button type="button" onClick={() => void play("normal")}>Play normal</button>
          <button type="button" onClick={() => void play("careful")}>Play careful</button>
          <button type="button" onClick={stop} disabled={!playing}>Stop audio</button>
        </div>
        <p role="status">{status}</p>
      </>}
      {pattern && <section aria-label="Response pattern">
        {activity.page === "turn-brief" && segment.patternHeading !== segment.heading && <h3>{segment.patternHeading}</h3>}
        <p className="preparation-transcript" lang="it">{segment.pattern}</p>
        <p>{segment.parts}</p>
        <h3>Written example</h3>
        <p className="preparation-note" lang="it">{segment.example}</p>
        <p>{segment.exampleExplanation}</p>
        {segment.reflection && <p>{segment.reflection}</p>}
        {segment.optionalPurpose && <dl className="preparation-chunks">{segment.optionalPurpose.map((part) => <div key={part.italian}><dt lang="it">{part.italian}</dt><dd>{part.meaning}</dd></div>)}</dl>}
      </section>}
      {(activity.page === "handoff" || activity.page === "turn-brief") && <>
        <p>{segment.transition}</p>
        <p className="preparation-note">This is now the conversation. The example has not been sent.</p>
      </>}
      <nav className="preparation-navigation" aria-label="Preparation pages">
        {situation && <button type="button" onClick={() => onAction({ page: "listen" })}>{content.situation.action}</button>}
        {activity.page === "listen" && <button type="button" onClick={() => onAction({ page: "pattern" })}>Build a response</button>}
        {activity.page === "pattern" && <button type="button" onClick={() => onAction({ continue: true })}>{game.episodeId === "day-00" ? "Continue to check-in" : "Continue to the handoff"}</button>}
        {(activity.page === "handoff" || activity.page === "turn-brief") && <button type="button" onClick={() => activity.mode === "reviewing" ? onReturn() : onAction({ continue: true })}>{activity.mode === "reviewing" ? game.status === "active" ? "Continue conversation" : "Return to review" : activity.page === "handoff" ? "Start conversation" : "Continue conversation"}</button>}
        {activity.page !== "situation" && activity.page !== "turn-brief" && <button type="button" onClick={() => onAction({ page: activity.page === "listen" ? "situation" : activity.page === "pattern" ? "listen" : "pattern" })}>Back</button>}
        {activity.mode === "reviewing" && !(game.status !== "active" && activity.page === "handoff") && <button type="button" onClick={onReturn}>{game.status === "active" ? "Return to my response" : "Return to review"}</button>}
        <button type="button" onClick={onOverview}>Return to season overview</button>
      </nav>
    </section>
  );
}
