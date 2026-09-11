"use client";

import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { lessons, steps, sample, workedExample } from "./lessons";
import styles from "./Reasoning.module.css";

type Notes = Record<string,string>;

export default function ReasoningPage() {
  const { user } = useAuth();
  const [mode,setMode] = useState<"learn"|"practice">("learn");
  const [lesson,setLesson] = useState(0);
  const [choices,setChoices] = useState<Record<number,number>>({});
  const [checked,setChecked] = useState<Record<number,boolean>>({});
  const [paragraph,setParagraph] = useState("");
  const [notes,setNotes] = useState<Notes>({});
  const [step,setStep] = useState(0);
  const [review,setReview] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const current = lessons[lesson];
  const storageKey = user ? `openwiki-reasoning:${user.email}` : null;
  const completed = steps.filter(s => notes[s.key]?.trim()).length;

  function replaceParagraph(text:string) {
    if ((paragraph.trim() || Object.values(notes).some(Boolean)) && !window.confirm("Replace this paragraph and clear its reasoning notes? Save or download your work first if needed.")) return;
    setParagraph(text);setNotes({});setStep(0);setReview(false);setMessage("");setError("");
  }
  function saveDraft() {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey,JSON.stringify({paragraph,notes,step}));setMessage("Draft saved in this browser for your account.");setError(""); }
    catch { setError("This browser could not save the draft. Download your analysis instead."); }
  }
  function loadDraft() {
    if (!storageKey) return;
    try {
      const raw=localStorage.getItem(storageKey);
      if (!raw) {setMessage("No saved draft in this browser.");return;}
      const saved=JSON.parse(raw);
      if (typeof saved.paragraph!=="string" || saved.paragraph.length>30000 || !saved.notes || typeof saved.notes!=="object" || steps.some(s=> saved.notes[s.key] !== undefined && (typeof saved.notes[s.key]!=="string" || saved.notes[s.key].length>10000))) throw new Error();
      if ((paragraph.trim() || completed) && !window.confirm("Replace the current work with your saved draft?")) return;
      setParagraph(saved.paragraph);setNotes(saved.notes);setStep(Number.isInteger(saved.step)?Math.max(0,Math.min(5,saved.step)):0);setReview(false);setMessage("Draft loaded.");setError("");
    } catch {setError("Could not load this draft. Your current work has not been changed.");}
  }
  function download() {
    const text=`# Reasoning practice\n\n## Paragraph\n${paragraph}\n\n`+steps.map(s=>`## ${s.title}\n${notes[s.key] || '(Not answered)'}`).join("\n\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/markdown;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="openwiki-reasoning.md";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <main className={styles.page}>
    <h1>Reasoning lab</h1><p className={styles.intro}>Learn to examine an argument, connect evidence to a conclusion, and notice what is missing. Then practise on a paragraph of your own.</p>
    <div className={styles.tabs} role="group" aria-label="Reasoning mode"><button aria-pressed={mode==="learn"} onClick={()=>setMode("learn")}>Learn reasoning skills</button><button aria-pressed={mode==="practice"} onClick={()=>setMode("practice")}>Practise on a paragraph</button></div>
    {mode==="learn" ? <div className={styles.layout}>
      <nav className={styles.menu} aria-label="Reasoning lessons">{lessons.map((item,i)=><button key={item.title} aria-current={lesson===i?"step":undefined} onClick={()=>setLesson(i)}>{i+1}. {item.title}{checked[i] && choices[i]===item.correct ? " ✓":""}</button>)}</nav>
      <section className={styles.card}><h2>{current.title}</h2><p>{current.explanation}</p><div className={styles.example}>{current.example}</div>
        <fieldset className={styles.options}><legend><strong>Try it: {current.question}</strong></legend>{current.options.map((option,i)=><label key={`${lesson}-${i}`}><input type="radio" name="lesson-answer" checked={choices[lesson]===i} onChange={()=>{setChoices({...choices,[lesson]:i});setChecked({...checked,[lesson]:false});}} />{option}</label>)}</fieldset>
        <button disabled={choices[lesson]===undefined} onClick={()=>setChecked({...checked,[lesson]:true})}>Check my reasoning</button>
        {checked[lesson] && <div className={styles.result} role="status"><strong>{choices[lesson]===current.correct?"Correct. ":"Reconsider the inference. "}</strong>{current.feedback}</div>}
        <div className={styles.actions}>{lesson<lessons.length-1?<button onClick={()=>setLesson(lesson+1)}>Next skill →</button>:<button onClick={()=>setMode("practice")}>Practise with a paragraph →</button>}</div>
      </section>
    </div> : <>
      <section className={styles.card}><h2>Your paragraph</h2><p className={styles.hint}>Paste an argument, study note, explanation, or code discussion. This is guided self-practice, not automated AI grading.</p>
        <label className={styles.field}>Paragraph<textarea aria-label="Paragraph" rows={7} maxLength={30000} value={paragraph} onChange={e=>{setParagraph(e.target.value);setReview(false);setMessage("");}} placeholder="Paste the paragraph you want to reason about…" /></label>
        {completed>0 && <p className={styles.hint}>If you change the paragraph, review your existing notes so they still apply.</p>}
        <div className={styles.actions}><button onClick={()=>replaceParagraph(sample)}>Use a worked example</button><button onClick={()=>replaceParagraph("")}>Start a new paragraph</button><button disabled={!storageKey || !paragraph.trim()} onClick={saveDraft}>Save draft</button><button disabled={!storageKey} onClick={loadDraft}>Load draft</button></div>
        <p className={styles.hint}>Drafts stay in this browser, under your account. They do not sync across devices. Save explicitly before leaving; download a copy to keep it elsewhere.</p>
        {message && <p role="status">{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      </section>
      {paragraph.trim() && <div className={styles.layout}>
        <nav className={styles.menu} aria-label="Analysis steps">{steps.map((s,i)=><button key={s.key} aria-current={!review && step===i?"step":undefined} onClick={()=>{setStep(i);setReview(false);}}>{i+1}. {s.title}{notes[s.key]?.trim()?" ✓":""}</button>)}<button onClick={()=>setReview(true)}>Review my analysis ({completed}/6)</button></nav>
        <section className={styles.card}>{!review ? <><h2>{steps[step].title}</h2><p>{steps[step].hint}</p><label className={styles.field}>Your reasoning<textarea aria-label="Your reasoning" rows={8} maxLength={10000} value={notes[steps[step].key] || ""} onChange={e=>{setNotes({...notes,[steps[step].key]:e.target.value});setMessage("");}} /></label>
          <div className={styles.actions}><button disabled={step===0} onClick={()=>setStep(step-1)}>← Previous</button><button onClick={()=>step<5?setStep(step+1):setReview(true)}>{step<5?"Next step →":"Review my analysis"}</button></div>
          {paragraph===sample && <details><summary>Compare with the worked example</summary><p>{workedExample[step]}</p></details>}
        </> : <><h2>Your reasoning map</h2><p>{completed} of 6 steps answered. Completion measures participation, not correctness.</p>{steps.map(s=><section key={s.key}><h3>{s.title}</h3><p className={styles.summary}>{notes[s.key] || "Not answered yet."}</p></section>)}
          <h3>Challenge your conclusion</h3><ul><li>Did I distinguish what is stated from what I inferred?</li><li>Does each reason support the specific claim?</li><li>Did I consider a plausible alternative or counterexample?</li><li>Did I explain what remains uncertain and what would change my mind?</li></ul>
          <div className={styles.actions}><button onClick={()=>{setStep(0);setReview(false);}}>Revise my reasoning</button><button disabled={!storageKey} onClick={saveDraft}>Save draft</button><button onClick={download}>Download analysis</button></div>
        </>}</section>
      </div>}
    </>}
  </main>;
}
