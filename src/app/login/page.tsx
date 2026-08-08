"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import styles from "./login.module.css";

function LoginInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("next") || "/";
  const error = searchParams.get("error");
  const [busy, setBusy] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.kicker}>AppLimit</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Continue to the translator, wiki, flashcards, and insights. You stay on this page until you
          choose Google sign-in below.
        </p>
        <button
          type="button"
          className={styles.googleBtn}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void signIn("google", { callbackUrl });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.523 0 4.817.923 6.602 2.443l6.016-6.016C33.522 9.045 28.977 7 24 7 13.507 7 5 15.507 5 26s8.507 19 19 19 19-8.507 19-19c0-1.274-.128-2.52-.389-3.717z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.523 0 4.817.923 6.602 2.443l6.016-6.016C33.522 9.045 28.977 7 24 7c-7.682 0-14.344 4.337-17.694 10.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 45c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 45 24 45z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
            />
          </svg>
          {busy ? "Redirecting to Google…" : "Continue with Google"}
        </button>
        {error ? (
          <p className={styles.err}>
            Sign-in failed ({error}). Check your Google OAuth settings and try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p className={styles.subtitle}>Loading…</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
