"use client";

import { useEffect, useState } from "react";
import styles from "./SingularityTestButton.module.css";

type QuestionMode = "recall" | "maths" | "notations";

export default function SingularityTestButton({ title, content }: { title: string; content: string }) {
  const [status, setStatus] = useState("");

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setStatus(detail.ok ? "Questions sent to side panel" : detail.error || "Side-panel extension is unavailable");
    };
    document.addEventListener("singularity:start-page-test-result", receive);
    return () => document.removeEventListener("singularity:start-page-test-result", receive);
  }, []);

  const startTest = (mode: QuestionMode) => {
    setStatus("Opening side panel…");
    document.dispatchEvent(new CustomEvent("singularity:start-page-test", {
      detail: { title, content: content.slice(0, 250000), pageUrl: window.location.href, mode },
    }));
    window.setTimeout(() => {
      setStatus((current) => current === "Opening side panel…" ? "Install or reload the Singularity bridge extension" : current);
    }, 1800);
  };

  return <div className={styles.root} aria-label="Ask questions about this wiki page">
    <span className={styles.label}>Ask page:</span>
    <button type="button" className={styles.action} onClick={() => startTest("recall")} title="Ask active-recall questions"><span aria-hidden="true">🧠</span><span>Recall</span></button>
    <button type="button" className={styles.action} onClick={() => startTest("maths")} title="Ask mathematical questions"><span className={styles.symbol} aria-hidden="true">∑</span><span>Maths</span></button>
    <button type="button" className={styles.action} onClick={() => startTest("notations")} title="Ask notation and symbol questions"><span className={styles.symbol} aria-hidden="true">𝑥</span><span>Notation</span></button>
    <button type="button" className={styles.settings} onClick={() => document.dispatchEvent(new CustomEvent("singularity:open-integration-settings"))} title="Choose side-panel extension" aria-label="Side-panel extension settings">⚙</button>
    {status ? <span className={styles.status} role="status">{status}</span> : null}
  </div>;
}
