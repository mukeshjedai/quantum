"use client";

import { useEffect, useState } from "react";

export default function SingularityTestButton({ title, content }: { title: string; content: string }) {
  const [status, setStatus] = useState("");

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setStatus(detail.ok ? "Test sent to Singularity" : detail.error || "Singularity extension is unavailable");
    };
    document.addEventListener("singularity:start-page-test-result", receive);
    return () => document.removeEventListener("singularity:start-page-test-result", receive);
  }, []);

  const startTest = () => {
    setStatus("Opening Singularity…");
    document.dispatchEvent(new CustomEvent("singularity:start-page-test", {
      detail: { title, content: content.slice(0, 250000), pageUrl: window.location.href },
    }));
    window.setTimeout(() => {
      setStatus((current) => current === "Opening Singularity…" ? "Install or reload the Singularity extension" : current);
    }, 1800);
  };

  return <div style={{ alignItems: "center", display: "flex", gap: ".55rem", margin: ".55rem 0" }}>
    <button type="button" onClick={startTest} style={{ margin: 0 }}>Start test in Singularity</button>
    {status ? <span className="muted" role="status">{status}</span> : null}
  </div>;
}
