"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf7ea", color: "#10291a", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 32 }}>Something went wrong</h1>
          <p>Please refresh the page or try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 999, border: 0, background: "#173a24", color: "#fffdf6", fontWeight: 600 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
