export function LightningDivider({ label }: { label?: string }) {
  return (
    <div className="relative flex items-center justify-center py-10">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-electric/40 to-transparent" />
      <svg
        width="46"
        height="64"
        viewBox="0 0 46 64"
        fill="none"
        className="absolute drop-shadow-[0_0_18px_rgba(179,85,255,0.65)]"
        aria-hidden="true"
      >
        <path
          d="M28 0L4 34H20L14 64L42 26H24L28 0Z"
          fill="#B355FF"
          stroke="#F3EEF9"
          strokeWidth="1"
        />
      </svg>
      {label && (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-ivory/40">
          {label}
        </span>
      )}
    </div>
  )
}
