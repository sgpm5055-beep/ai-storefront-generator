'use client';

/** The last line of defence: a creator must never see a stack trace. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pt-14">
      <h1 className="text-2xl font-semibold">Something went wrong on our side.</h1>
      <p className="mt-2 text-muted">
        Your work isn&rsquo;t lost. Try again, and if it keeps happening, start
        a fresh draft.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-secondary">Start over</a>
      </div>
    </main>
  );
}
