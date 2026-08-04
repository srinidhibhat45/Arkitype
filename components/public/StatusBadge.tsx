import type { ComponentStatus } from "@/store/useDesignSystem";

const TONE: Record<ComponentStatus, string> = {
  ready: "border-line text-fg-mute",
  beta: "border-amber-500/40 text-amber-500",
  deprecated: "border-rose-500/40 text-rose-400",
};

export function StatusBadge({ status }: { status: ComponentStatus }) {
  if (status === "ready") return null;
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${TONE[status]}`}
    >
      {status}
    </span>
  );
}
