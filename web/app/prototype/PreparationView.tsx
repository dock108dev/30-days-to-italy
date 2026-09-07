import { useEffect, useRef, useState } from "react";
import type { GameState } from "../game/model";
import { TURNS } from "../season/registry";
import { preparationFor } from "./preparation";
import { TeachingFeedbackResult } from "./PrototypeViews";

type Action = { page: "situation" | "listen" } | { audio: "normal" | "careful" } | { initialize: true };

export function PreparationView({ game, onAction, onOverview }: {
  game: GameState;
  onAction: (action: Action) => void;
  onOverview: () => void;
}) {
  const preparation = preparationFor(game)!;
  const { content, segment, activity } = preparation;
  const situation = activity.page === "situation";
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
      <h2 id="preparation-heading" ref={heading} tabIndex={-1}>{situation ? content.situation.heading : segment.heading}</h2>
      {situation ? <>
        <p>{content.situation.copy}</p>
        <p className="preparation-note">{content.situation.context}</p>
      </> : <>
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
      <nav className="preparation-navigation" aria-label="Preparation pages">
        {situation ? <button type="button" onClick={() => onAction({ page: "listen" })}>{content.situation.action}</button> : <>
          {/* T2 boundary: T3 implements pattern/example traversal and the live handoff.
              Never bypass those stages or record a segment as traversed here. */}
          <button type="button" disabled>{activity.page === "turn-brief" ? "Continue conversation" : "Build a response"}</button>
          {activity.page === "listen" && <button type="button" onClick={() => onAction({ page: "situation" })}>Back</button>}
        </>}
        <button type="button" onClick={onOverview}>Return to season overview</button>
      </nav>
    </section>
  );
}
