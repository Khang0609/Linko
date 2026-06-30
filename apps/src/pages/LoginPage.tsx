import { useState, useEffect, useRef } from 'react';
import {
  Network,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Bot,
  BarChart3,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Users,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/* ── chart data ── */
const REV = [38, 52, 44, 68, 60, 82, 76, 98, 90, 114].map((v) => ({ v }));
const CONN = [780, 860, 840, 960, 930, 1060, 1040, 1140, 1120, 1248].map((v) => ({ v }));

/* ── floating particles ── */
function useParticles(n: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const fit = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    const pts = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.4 + 0.08,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.a})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [n]);
  return ref;
}

/* ════════════════════════════════════════
   ROOT — locked to 100dvh, no scroll
════════════════════════════════════════ */
export default function LoginPage() {
  const canvas = useParticles(50);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [rem, setRem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ef, setEf] = useState(false);
  const [pf, setPf] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => setBusy(false), 2000);
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden select-none"
      style={{
        fontFamily: "'Inter',sans-serif",
        background: '#070B17',
        color: '#f9fafb',
        width: '100vw',
        height: '100dvh',
      }}
    >
      {/* particles */}
      <canvas
        ref={canvas}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,.028) 1px, transparent 1px)`,
          backgroundSize: '52px 52px',
          zIndex: 0,
        }}
      />

      {/* central radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 54%, rgba(37,99,235,.13) 0%, transparent 70%)',
        }}
      />

      {/* ── NAV ── */}
      <TopNav />

      {/* ── HERO + CARD (fills remaining height) ── */}
      <main
        className="relative z-10 flex flex-col flex-1 items-center justify-center px-4 gap-4"
        style={{ minHeight: 0 }}
      >
        {/* compact headline */}
        <div className="text-center" style={{ lineHeight: 1 }}>
          <h1
            className="font-black text-white tracking-tight"
            style={{ fontSize: 'clamp(22px,2.6vw,34px)', letterSpacing: '-0.03em' }}
          >
            Manage.&nbsp;Connect.&nbsp;Grow Together.&nbsp;
            <span
              style={{
                background: 'linear-gradient(90deg,#3b82f6,#93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(59,130,246,.55))',
              }}
            >
              Linko
            </span>
          </h1>
          <p className="text-gray-500 mt-1.5 text-[13px] font-medium"></p>
        </div>

        {/* ── three-column card ── */}
        <div
          className="grid w-full"
          style={{
            maxWidth: 1080,
            gridTemplateColumns: '1fr 1.1fr 1fr',
            borderRadius: 22,
            background: 'rgba(8,12,24,.78)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(59,130,246,.2)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,.04), 0 0 70px rgba(37,99,235,.16), 0 32px 64px rgba(0,0,0,.55)',
          }}
        >
          <LeftCol />
          <CenterCol
            {...{
              email,
              setEmail,
              pass,
              setPass,
              show,
              setShow,
              rem,
              setRem,
              busy,
              submit,
              ef,
              setEf,
              pf,
              setPf,
            }}
          />
          <RightCol />
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 pb-3 text-center flex items-center justify-center gap-5 flex-shrink-0">
        {['Privacy Policy', 'Terms of Service', 'Help Center'].map((l) => (
          <a
            key={l}
            href="#"
            className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {l}
          </a>
        ))}
      </footer>

      <style>{`
        @keyframes flt { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes fltB{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes pdot{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        *{scrollbar-width:none} *::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════
   TOP NAV
════════════════════════════════════════ */
function TopNav() {
  return (
    <header
      className="relative z-20 flex-shrink-0 flex items-center justify-between px-8"
      style={{ height: 56 }}
    >
      {/* logo */}
      <a href="#" className="flex items-center gap-2 select-none">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
            boxShadow: '0 0 14px rgba(37,99,235,.45)',
          }}
        >
          <Network size={14} color="#fff" />
        </div>
        <span className="font-bold text-[15px] text-white tracking-tight">Linko</span>
      </a>

      {/* center */}
      <nav className="hidden md:flex items-center gap-0.5">
        {[''].map((item) => (
          <a
            key={item}
            href="#"
            className="px-3.5 py-1.5 text-[13px] font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            {item}
          </a>
        ))}
      </nav>

      {/* right */}
      <div className="flex items-center gap-2.5">
        <a
          href="#"
          className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors px-2.5 py-1.5"
        >
          Log In
        </a>
        <a
          href="#"
          className="text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
            boxShadow: '0 0 18px rgba(37,99,235,.38)',
          }}
        >
          Get Started
        </a>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════
   LEFT COLUMN — illustration
════════════════════════════════════════ */
function LeftCol() {
  return (
    <div
      className="relative flex flex-col items-center justify-between p-6 overflow-hidden"
      style={{
        borderRight: '1px solid rgba(59,130,246,.1)',
        background: 'linear-gradient(155deg,rgba(37,99,235,.08) 0%,transparent 55%)',
      }}
    >
      {/* corner glow */}
      <div
        className="absolute -top-12 -left-12 pointer-events-none rounded-full"
        style={{
          width: 220,
          height: 220,
          background: 'radial-gradient(circle,rgba(37,99,235,.2) 0%,transparent 70%)',
          filter: 'blur(36px)',
        }}
      />

      {/* badge */}
      <div className="relative z-10 self-start">
        <Chip icon={<Network size={10} />} label="Enterprise Platform" />
      </div>

      {/* illustration */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <CityIllustration />
      </div>

      {/* floating tags */}
      <div className="relative z-10 flex flex-wrap gap-1.5 w-full">
        {[
          { icon: <Bot size={10} />, label: 'AI Assistant', d: '0s' },
          { icon: <BarChart3 size={10} />, label: 'Analytics', d: '.7s' },
          { icon: <Zap size={10} />, label: 'Automation', d: '1.4s' },
          { icon: <Globe size={10} />, label: 'Intelligence', d: '2.1s' },
        ].map((t) => (
          <span
            key={t.label}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
            style={{
              background: 'rgba(37,99,235,.13)',
              border: '1px solid rgba(59,130,246,.22)',
              color: '#93c5fd',
              animation: `flt 4.5s ease-in-out infinite ${t.d}`,
            }}
          >
            {t.icon}
            {t.label}
          </span>
        ))}
      </div>

      {/* security row */}
      <div
        className="relative z-10 flex items-center gap-2.5 mt-3 p-3 rounded-xl w-full"
        style={{ background: 'rgba(37,99,235,.09)', border: '1px solid rgba(59,130,246,.15)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,99,235,.3)' }}
        >
          <Shield size={13} color="#60a5fa" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-white leading-none">SOC 2 Certified</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}

/* compact isometric city */
function CityIllustration() {
  const windows = (rows: number[], xs: number[], w: number, h: number, opacities: number[]) =>
    rows.flatMap((y) =>
      xs.map((x, xi) => (
        <rect
          key={`${y}-${xi}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="1"
          fill={`rgba(147,197,253,${opacities[xi] ?? 0.3})`}
        />
      )),
    );

  return (
    <div className="w-full" style={{ height: 220 }}>
      <svg viewBox="0 0 280 220" className="w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lb1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".6" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity=".22" />
          </linearGradient>
          <linearGradient id="lb2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity=".5" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity=".16" />
          </linearGradient>
          <filter id="lgw">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ground */}
        <ellipse cx="140" cy="212" rx="118" ry="11" fill="rgba(37,99,235,.08)" />

        {/* far-left */}
        <rect x="8" y="148" width="24" height="60" rx="2" fill="url(#lb2)" />
        {windows([156, 170, 184, 198], [11, 22], 8, 5, [0.28, 0.18])}

        {/* left tower */}
        <rect x="38" y="78" width="44" height="130" rx="3" fill="url(#lb1)" />
        <rect x="40" y="72" width="40" height="8" rx="2" fill="rgba(59,130,246,.45)" />
        <rect
          x="56"
          y="62"
          width="7"
          height="13"
          rx="1"
          fill="rgba(96,165,250,.65)"
          filter="url(#lgw)"
        />
        {windows([86, 100, 114, 128, 142, 156, 170, 184], [42, 54, 65], 8, 6, [0.3, 0.45, 0.22])}

        {/* center tower */}
        <rect x="96" y="38" width="64" height="170" rx="4" fill="url(#lb1)" />
        <rect x="98" y="31" width="60" height="10" rx="3" fill="rgba(59,130,246,.5)" />
        <rect
          x="122"
          y="18"
          width="9"
          height="16"
          rx="2"
          fill="rgba(96,165,250,.7)"
          filter="url(#lgw)"
        />
        {windows(
          [46, 62, 78, 94, 110, 126, 142, 158, 174],
          [100, 114, 128, 142],
          10,
          7,
          [0.3, 0.5, 0.36, 0.22],
        )}

        {/* right tower */}
        <rect x="174" y="66" width="48" height="132" rx="3" fill="url(#lb2)" />
        <rect x="176" y="59" width="44" height="9" rx="2" fill="rgba(96,165,250,.4)" />
        <rect
          x="193"
          y="49"
          width="8"
          height="13"
          rx="2"
          fill="rgba(96,165,250,.6)"
          filter="url(#lgw)"
        />
        {windows([74, 90, 106, 122, 138, 154, 170, 186], [178, 191, 203], 9, 6, [0.26, 0.4, 0.2])}

        {/* far-right */}
        <rect x="232" y="154" width="28" height="54" rx="2" fill="url(#lb2)" />
        {windows([162, 176, 190, 204], [235, 246], 7, 4, [0.2, 0.14])}

        {/* network lines */}
        {(
          [
            [59, 74, 128, 34],
            [128, 34, 198, 62],
            [59, 74, 140, 212],
            [128, 34, 140, 212],
            [198, 62, 140, 212],
          ] as [number, number, number, number][]
        ).map(([x1, y1, x2, y2], i) => (
          <line
            key={`l${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(59,130,246,.16)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}

        {/* nodes */}
        {(
          [
            [59, 74],
            [128, 34],
            [198, 62],
            [140, 212],
          ] as [number, number][]
        ).map(([cx, cy], i) => (
          <g key={`n${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r="5.5"
              fill="rgba(37,99,235,.35)"
              stroke="rgba(96,165,250,.7)"
              strokeWidth="1.4"
              filter="url(#lgw)"
            />
            <circle cx={cx} cy={cy} r="2" fill="#60a5fa" />
          </g>
        ))}

        {/* floating labels */}
        <g style={{ animation: 'flt 5s ease-in-out infinite' }}>
          <rect
            x="2"
            y="38"
            width="54"
            height="18"
            rx="5"
            fill="rgba(37,99,235,.28)"
            stroke="rgba(59,130,246,.38)"
            strokeWidth="1"
          />
          <text x="29" y="51" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="700">
            AI Network
          </text>
        </g>
        <g style={{ animation: 'fltB 6s ease-in-out infinite .8s' }}>
          <rect
            x="214"
            y="28"
            width="60"
            height="18"
            rx="5"
            fill="rgba(37,99,235,.28)"
            stroke="rgba(59,130,246,.38)"
            strokeWidth="1"
          />
          <text x="244" y="41" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="700">
            Data Flow
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════
   CENTER COLUMN — login form
════════════════════════════════════════ */
interface CP {
  email: string;
  setEmail: (v: string) => void;
  pass: string;
  setPass: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  rem: boolean;
  setRem: (v: boolean) => void;
  busy: boolean;
  submit: (e: React.FormEvent) => void;
  ef: boolean;
  setEf: (v: boolean) => void;
  pf: boolean;
  setPf: (v: boolean) => void;
}

function CenterCol(p: CP) {
  const {
    email,
    setEmail,
    pass,
    setPass,
    show,
    setShow,
    rem,
    setRem,
    busy,
    submit,
    ef,
    setEf,
    pf,
    setPf,
  } = p;

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    height: 46,
    background: focused ? 'rgba(37,99,235,.07)' : 'rgba(255,255,255,.04)',
    border: `1px solid ${focused ? 'rgba(59,130,246,.55)' : 'rgba(255,255,255,.09)'}`,
    borderRadius: 12,
    color: '#f9fafb',
    fontSize: 13,
    fontFamily: 'Inter,sans-serif',
    outline: 'none',
    paddingLeft: 40,
    paddingRight: 14,
    boxShadow: focused ? '0 0 0 3px rgba(37,99,235,.14)' : 'none',
    transition: 'all .18s',
  });

  return (
    <div
      className="flex flex-col justify-center px-8 py-6"
      style={{ borderRight: '1px solid rgba(59,130,246,.1)' }}
    >
      {/* brand */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
            boxShadow: '0 0 14px rgba(37,99,235,.45)',
          }}
        >
          <Network size={14} color="#fff" />
        </div>
        <span className="font-bold text-[15px] text-white tracking-tight">Linko</span>
      </div>

      <h2 className="text-[22px] font-black text-white mb-0.5" style={{ letterSpacing: '-.025em' }}>
        Welcome Back
      </h2>
      <p className="text-[13px] text-gray-400 mb-5">Log in to your Linko workspace.</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {/* email */}
        <div>
          <label className="block text-[12px] font-medium text-gray-400 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={14}
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: 13, color: ef ? '#60a5fa' : '#4b5563', transition: 'color .18s' }}
            />
            <input
              type="email"
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEf(true)}
              onBlur={() => setEf(false)}
              style={inputStyle(ef)}
            />
          </div>
        </div>

        {/* password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-gray-400">Password</label>
            <a
              href="#"
              className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock
              size={14}
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: 13, color: pf ? '#60a5fa' : '#4b5563', transition: 'color .18s' }}
            />
            <input
              type={show ? 'text' : 'password'}
              placeholder="Enter your password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onFocus={() => setPf(true)}
              onBlur={() => setPf(false)}
              style={{ ...inputStyle(pf), paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              style={{ right: 13 }}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* remember */}
        <div className="flex items-center gap-2.5 mt-0.5">
          <Checkbox checked={rem} onChange={setRem} label="Remember me" />
        </div>

        {/* primary */}
        <button
          type="submit"
          disabled={busy}
          className="relative flex items-center justify-center gap-2 w-full font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[.98] disabled:opacity-60 disabled:scale-100"
          style={{
            height: 46,
            borderRadius: 12,
            fontSize: 14,
            background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
            boxShadow: '0 0 28px rgba(37,99,235,.42), 0 4px 14px rgba(0,0,0,.3)',
          }}
          onMouseEnter={(e) => {
            if (!busy)
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 46px rgba(37,99,235,.62), 0 6px 18px rgba(0,0,0,.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 28px rgba(37,99,235,.42), 0 4px 14px rgba(0,0,0,.3)';
          }}
        >
          {busy ? (
            <Spinner />
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>

        {/* secondary */}
        <button
          type="button"
          className="flex items-center justify-center w-full text-[13px] font-semibold text-gray-300 hover:text-white transition-all"
          style={{
            height: 42,
            borderRadius: 12,
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.09)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.09)';
          }}
        >
          Create an Account
        </button>
      </form>

      {/* divider */}
      <div className="flex items-center gap-2.5 my-4">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.07)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.07)' }} />
      </div>

      {/* social */}
      <div className="flex flex-col gap-2">
        <SocialBtn icon={<GoogleIcon />} label="Continue with Google" />
        <div className="grid grid-cols-2 gap-2">
          <SocialBtn icon={<GitHubIcon />} label="GitHub" small />
          <SocialBtn icon={<MsIcon />} label="Microsoft" small />
        </div>
      </div>

      <p className="text-center text-[12px] text-gray-600 mt-4">© 2026 Linko Technologies Inc.</p>
    </div>
  );
}

function SocialBtn({
  icon,
  label,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  small?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      className={`flex items-center justify-center gap-2 w-full font-medium transition-all duration-200 text-gray-300 ${hov ? 'text-white' : ''}`}
      style={{
        height: 40,
        borderRadius: 11,
        fontSize: small ? 12 : 13,
        background: hov ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.04)',
        border: `1px solid ${hov ? 'rgba(59,130,246,.28)' : 'rgba(255,255,255,.08)'}`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon}
      {label}
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group select-none">
      <div
        className="relative w-[16px] h-[16px] rounded-[4px] flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: checked ? 'rgba(37,99,235,.85)' : 'rgba(255,255,255,.05)',
          border: `1px solid ${checked ? '#3b82f6' : 'rgba(255,255,255,.15)'}`,
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path
              d="M1 3.5L3.5 6L8 1"
              stroke="white"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-[12px] text-gray-400 group-hover:text-gray-300 transition-colors">
        {label}
      </span>
    </label>
  );
}

/* ════════════════════════════════════════
   RIGHT COLUMN — dashboard widgets
════════════════════════════════════════ */
function RightCol() {
  const [conn, setConn] = useState(1248);
  useEffect(() => {
    const t = setInterval(() => setConn((c) => c + Math.floor(Math.random() * 3)), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative flex flex-col justify-between p-6 gap-3 overflow-hidden"
      style={{ background: 'linear-gradient(155deg,rgba(8,13,26,.5) 0%,rgba(37,99,235,.05) 100%)' }}
    >
      {/* glow */}
      <div
        className="absolute -bottom-12 -right-12 pointer-events-none rounded-full"
        style={{
          width: 220,
          height: 220,
          background: 'radial-gradient(circle,rgba(37,99,235,.16) 0%,transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 self-start">
        <Chip
          icon={
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
              style={{ animation: 'pdot 2s ease-in-out infinite' }}
            />
          }
          label="Live Preview"
          color="emerald"
        />
      </div>

      {/* widget 1 — connections */}
      <DashCard style={{ animation: 'flt 7s ease-in-out infinite' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Users size={12} color="#60a5fa" />
            <span className="text-[11px] font-semibold text-gray-400">Active Connections</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400">↑ 4.2%</span>
        </div>
        <p className="text-[26px] font-black text-white mb-2" style={{ letterSpacing: '-.025em' }}>
          {conn.toLocaleString()}
        </p>
        <MiniChart data={CONN} color="#3b82f6" height={38} />
      </DashCard>

      {/* widget 2 — revenue */}
      <DashCard style={{ animation: 'fltB 8s ease-in-out infinite .6s' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} color="#60a5fa" />
            <span className="text-[11px] font-semibold text-gray-400">Revenue</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400">↑ 18.7%</span>
        </div>
        <p className="text-[22px] font-black text-white mb-2" style={{ letterSpacing: '-.02em' }}>
          +$1.14M
        </p>
        <MiniChart data={REV} color="#60a5fa" height={34} />
      </DashCard>

      {/* widget 3 — AI assistant */}
      <DashCard style={{ animation: 'flt 9s ease-in-out infinite 1.2s' }}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,.3)' }}
          >
            <Bot size={12} color="#60a5fa" />
          </div>
          <span className="text-[11px] font-semibold text-gray-300">AI Assistant</span>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(37,99,235,.2)', color: '#93c5fd' }}
          >
            Today
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(59,130,246,.2)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"
            style={{ animation: 'pdot 2s ease-in-out infinite' }}
          />
          <span className="text-[12px] text-blue-200 font-medium">
            Ready for today&apos;s meeting.
          </span>
        </div>
      </DashCard>

      {/* notification */}
      <DashCard
        style={{
          animation: 'fltB 6.5s ease-in-out infinite 1.8s',
          background: 'linear-gradient(135deg,rgba(37,99,235,.14),rgba(37,99,235,.05))',
          borderColor: 'rgba(59,130,246,.26)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
              boxShadow: '0 0 14px rgba(37,99,235,.38)',
            }}
          >
            <Bell size={13} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white leading-none">New Partner Request</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">TechCorp Inc. • Just now</p>
          </div>
          <ChevronRight size={13} className="text-gray-500 flex-shrink-0" />
        </div>
      </DashCard>
    </div>
  );
}

function DashCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(59,130,246,.12)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MiniChart({
  data,
  color,
  height = 40,
}: {
  data: { v: number }[];
  color: string;
  height?: number;
}) {
  const id = `g${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── shared chip ── */
function Chip({
  icon,
  label,
  color = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: 'rgba(37,99,235,.12)',
        border: '1px solid rgba(59,130,246,.22)',
        color: color === 'emerald' ? '#34d399' : '#93c5fd',
      }}
    >
      {icon}
      {label}
    </div>
  );
}

/* ── spinner ── */
function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── brand icons ── */
function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
function MsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
      <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
