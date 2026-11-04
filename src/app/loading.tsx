export default function Loading() {
  return (
    <main className="app-shell app-loading" aria-busy="true" aria-live="polite">
      <div className="loading-bar" />
      <p>Opening your CV workspace…</p>
    </main>
  );
}
