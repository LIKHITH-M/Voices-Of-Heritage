export default function VoHLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Voices of Heritage logo" style={{ flexShrink: 0 }}>
      {/* Outer glow ring */}
      <circle cx="24" cy="24" r="22" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.4"/>
      {/* Inner mandala ring */}
      <circle cx="24" cy="24" r="16" stroke="url(#logoGrad)" strokeWidth="0.8" opacity="0.6"/>
      {/* Temple gopuram silhouette */}
      {/* Base platform */}
      <rect x="10" y="36" width="28" height="3" rx="1" fill="url(#logoGrad)" opacity="0.9"/>
      {/* Tier 3 (bottom) */}
      <rect x="13" y="31" width="22" height="5" rx="1" fill="url(#logoGrad)" opacity="0.85"/>
      {/* Tier 2 */}
      <rect x="16" y="26" width="16" height="5" rx="1" fill="url(#logoGrad)" opacity="0.9"/>
      {/* Tier 1 */}
      <rect x="19" y="21" width="10" height="5" rx="1" fill="url(#logoGrad)"/>
      {/* Spire */}
      <path d="M22 21 L24 12 L26 21Z" fill="url(#logoGrad)"/>
      {/* Finial dot */}
      <circle cx="24" cy="11" r="1.8" fill="#f59e0b"/>
      {/* Door arch */}
      <path d="M21 39 Q24 35 27 39" fill="none" stroke="rgba(15,15,30,0.8)" strokeWidth="1.2"/>
      <rect x="21.5" y="37" width="5" height="2" rx="0.5" fill="rgba(15,15,30,0.7)"/>
      {/* Lotus petals at base of spire */}
      <ellipse cx="24" cy="21" rx="2.5" ry="1" fill="rgba(245,158,11,0.3)"/>
      {/* Side flag poles */}
      <line x1="13" y1="31" x2="13" y2="27" stroke="rgba(245,158,11,0.5)" strokeWidth="0.8"/>
      <line x1="35" y1="31" x2="35" y2="27" stroke="rgba(245,158,11,0.5)" strokeWidth="0.8"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b"/>
          <stop offset="60%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
