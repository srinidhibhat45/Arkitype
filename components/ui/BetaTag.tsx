/** Small pill marking beta status — sits next to the Arkitype wordmark
 *  wherever it appears, so "this can break" is never a surprise. */
export function BetaTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-full border border-line-strong px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] text-fg-mute ${className}`}
    >
      Beta
    </span>
  );
}
