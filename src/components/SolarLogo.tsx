export function SolarLogo() {
  const rays = [0, 60, 120, 180, 240, 300].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x1: 39 + 5 * Math.sin(rad),
      y1: 7 - 5 * Math.cos(rad),
      x2: 39 + 8 * Math.sin(rad),
      y2: 7 - 8 * Math.cos(rad),
    };
  });

  return (
    <svg width="48" height="48" viewBox="0 -2 48 48" fill="none" aria-hidden="true">
      <circle cx="39" cy="7" r="4" fill="#f59e0b" />
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.x1} y1={r.y1}
          x2={r.x2} y2={r.y2}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <rect x="20" y="32" width="7" height="13" rx="1" fill="#374151" />
      <g transform="rotate(-15, 23.5, 24)">
        <rect x="6" y="18" width="35" height="12" rx="1" fill="#3b82f6" />
        <line x1="14.75" y1="18" x2="14.75" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="23.5" y1="18" x2="23.5" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="32.25" y1="18" x2="32.25" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="6" y1="22" x2="41" y2="22" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="6" y1="26" x2="41" y2="26" stroke="#1d4ed8" strokeWidth="0.75" />
      </g>
    </svg>
  );
}
