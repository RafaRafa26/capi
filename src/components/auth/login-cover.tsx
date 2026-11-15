// Cover art for the login screen: the cash-flow curve from the dashboard,
// solid up to today and dotted for what is still to come.
export function LoginCover() {
  const past = "M0 520 H150 C200 520 210 400 260 400 H360 C410 400 420 300 470 300 H560"

  return (
    <div aria-hidden className="absolute inset-0 bg-capi-purple-dark">
      <svg
        viewBox="0 0 880 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="login-cover-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-capi-lilac)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-capi-lilac)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[180, 280, 380, 480, 580].map((y) => (
          <line key={y} x1="0" x2="880" y1={y} y2={y} stroke="#fff" strokeOpacity="0.07" />
        ))}
        <path d={`${past} V900 H0 Z`} fill="url(#login-cover-area)" />
        <path
          d={past}
          fill="none"
          stroke="var(--color-capi-cream)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M560 300 H620 C670 300 680 360 730 360 H780 C830 360 840 230 880 230"
          fill="none"
          stroke="var(--color-capi-cream)"
          strokeOpacity="0.55"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="2 14"
        />
        <line
          x1="560"
          x2="560"
          y1="156"
          y2="900"
          stroke="var(--color-capi-green)"
          strokeOpacity="0.35"
          strokeDasharray="4 8"
        />
        <circle cx="560" cy="300" r="22" fill="var(--color-capi-green)" fillOpacity="0.2" />
        <circle cx="560" cy="300" r="9" fill="var(--color-capi-green)" />
        <rect x="532" y="126" width="56" height="28" rx="14" fill="var(--color-capi-green)" />
        <text
          x="560"
          y="145"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="var(--color-capi-black)"
        >
          hoje
        </text>
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-capi-purple-dark from-20% via-capi-purple-dark/60 via-45% to-transparent to-65%" />
    </div>
  )
}
