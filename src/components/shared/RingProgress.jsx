export default function RingProgress({ pct, T }) {
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="36" cy="36" r={r} fill="none"
        stroke={T.border} strokeWidth="5" />
      <circle cx="36" cy="36" r={r} fill="none"
        stroke={T.accent} strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}