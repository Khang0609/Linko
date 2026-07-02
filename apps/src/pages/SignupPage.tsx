import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  Building2,
  Shield,
  TrendingUp,
  Brain,
  ChevronRight,
  Link2,
  Network,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const connectionsData = [
  { v: 820 },
  { v: 980 },
  { v: 890 },
  { v: 1050 },
  { v: 1140 },
  { v: 1200 },
  { v: 1323 },
];

const revenueData = [
  { v: 0.55 },
  { v: 0.72 },
  { v: 0.81 },
  { v: 0.94 },
  { v: 1.02 },
  { v: 1.09 },
  { v: 1.14 },
];

function LinkoLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
        boxShadow: '0 0 14px rgba(37,99,235,.45)',
      }}
      className="rounded-lg flex items-center justify-center flex-shrink-0"
    >
      <Network size={size * 0.42} color="#fff" />
    </div>
  );
}

function CityscapeIllustration() {
  const leftWindows = [130, 148, 166, 184, 202, 220].flatMap((y, i) =>
    [16, 30, 48].map((x, j) => ({
      x,
      y,
      fill: (i + j) % 3 === 0 ? '#93c5fd' : '#60a5fa',
      opacity: 0.15 + ((i * 3 + j * 2) % 5) * 0.1,
    })),
  );

  const tallLeftWindows = [100, 118, 136, 154, 172, 190, 208, 226, 244].flatMap((y, i) =>
    [76, 93, 110, 122].map((x, j) => ({
      x,
      y,
      fill: (i + j) % 2 === 0 ? '#93c5fd' : '#60a5fa',
      opacity: 0.1 + ((i * 2 + j) % 6) * 0.08,
    })),
  );

  const centerWindows = [68, 86, 104, 122, 140, 158, 176, 194, 212, 230, 248].flatMap((y, i) =>
    [176, 191, 208, 221].map((x, j) => ({
      x,
      y,
      fill: i % 3 === 0 && j % 2 === 0 ? '#93c5fd' : '#3b82f6',
      opacity: 0.18 + ((i + j * 2) % 5) * 0.1,
    })),
  );

  const rightTallWindows = [100, 118, 136, 154, 172, 190, 208, 226, 244].flatMap((y, i) =>
    [250, 268, 285, 298].map((x, j) => ({
      x,
      y,
      fill: (i + j) % 2 === 0 ? '#60a5fa' : '#93c5fd',
      opacity: 0.1 + ((i * 3 + j) % 6) * 0.08,
    })),
  );

  const rightWindows = [128, 146, 164, 182, 200, 218].flatMap((y, i) =>
    [325, 341, 360].map((x, j) => ({
      x,
      y,
      fill: (i + j) % 2 === 0 ? '#60a5fa' : '#93c5fd',
      opacity: 0.1 + ((i + j * 2) % 5) * 0.09,
    })),
  );

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020810" />
            <stop offset="60%" stopColor="#050f28" />
            <stop offset="100%" stopColor="#071535" />
          </linearGradient>
          <linearGradient id="bldA2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1e45" />
            <stop offset="100%" stopColor="#040e22" />
          </linearGradient>
          <linearGradient id="bldB2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2354" />
            <stop offset="100%" stopColor="#061225" />
          </linearGradient>
          <linearGradient id="bldC2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1f48" />
            <stop offset="100%" stopColor="#040e22" />
          </linearGradient>
          <linearGradient id="groundFade2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </linearGradient>
          <filter id="glw2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sGlw2" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="centerHalo2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect width="400" height="225" fill="url(#skyGrad2)" />

        {/* Stars */}
        {[
          [28, 12],
          [78, 8],
          [140, 18],
          [195, 6],
          [245, 15],
          [310, 9],
          [365, 19],
          [52, 35],
          [112, 28],
          [172, 38],
          [230, 22],
          [288, 32],
          [348, 26],
          [18, 55],
          [95, 48],
          [160, 58],
          [220, 44],
          [275, 52],
          [340, 46],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={0.7} fill="white" opacity={0.15 + (i % 4) * 0.08} />
        ))}

        {/* Center halo glow behind central tower */}
        <ellipse cx="200" cy="100" rx="60" ry="80" fill="url(#centerHalo2)" />

        {/* --- Far background buildings --- */}
        <rect x="22" y="170" width="28" height="55" fill="url(#bldA2)" opacity="0.45" />
        <rect x="54" y="158" width="18" height="67" fill="url(#bldA2)" opacity="0.45" />
        <rect x="78" y="168" width="22" height="57" fill="url(#bldA2)" opacity="0.45" />
        <rect x="312" y="162" width="25" height="63" fill="url(#bldA2)" opacity="0.45" />
        <rect x="342" y="172" width="20" height="53" fill="url(#bldA2)" opacity="0.45" />
        <rect x="366" y="164" width="24" height="61" fill="url(#bldA2)" opacity="0.45" />

        {/* --- LEFT CLUSTER --- */}
        {/* Short left building */}
        <rect x="8" y="118" width="56" height="107" fill="url(#bldA2)" />
        <rect x="10" y="113" width="11" height="7" rx="1" fill="#1d4ed8" opacity="0.8" />
        {leftWindows.map((w, i) => (
          <rect
            key={`lw${i}`}
            x={w.x}
            y={w.y}
            width="7"
            height="5"
            rx="1"
            fill={w.fill}
            opacity={w.opacity}
          />
        ))}

        {/* Tall left building */}
        <rect x="68" y="90" width="66" height="135" fill="url(#bldB2)" />
        <rect x="71" y="85" width="13" height="7" rx="1" fill="#1d4ed8" opacity="0.9" />
        {/* Antenna */}
        <line x1="77" y1="85" x2="77" y2="68" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
        <circle cx="77" cy="66" r="3" fill="#60a5fa" filter="url(#glw2)" opacity="0.9" />
        {tallLeftWindows.map((w, i) => (
          <rect
            key={`tlw${i}`}
            x={w.x}
            y={w.y}
            width="8"
            height="6"
            rx="1"
            fill={w.fill}
            opacity={w.opacity}
          />
        ))}

        {/* --- CENTER LANDMARK TOWER --- */}
        <rect x="170" y="52" width="60" height="173" fill="url(#bldC2)" />
        {/* Penthouse cap */}
        <rect x="178" y="46" width="44" height="8" rx="2" fill="#1d4ed8" opacity="0.85" />
        {/* Spire */}
        <line x1="200" y1="46" x2="200" y2="26" stroke="#93c5fd" strokeWidth="1.5" opacity="0.8" />
        <circle cx="200" cy="24" r="3.5" fill="#60a5fa" filter="url(#sGlw2)" />
        <circle cx="200" cy="24" r="1.5" fill="white" opacity="0.9" />
        {centerWindows.map((w, i) => (
          <rect
            key={`cw${i}`}
            x={w.x}
            y={w.y}
            width="9"
            height="7"
            rx="1"
            fill={w.fill}
            opacity={w.opacity}
          />
        ))}
        {/* Center building display screen */}
        <rect
          x="177"
          y="148"
          width="46"
          height="28"
          rx="3"
          fill="#1d4ed8"
          fillOpacity="0.5"
          stroke="#3b82f6"
          strokeWidth="0.5"
          strokeOpacity="0.6"
        />
        <text
          x="200"
          y="162"
          textAnchor="middle"
          fill="#93c5fd"
          fontSize="7.5"
          fontFamily="Outfit,Inter,sans-serif"
          fontWeight="700"
          letterSpacing="1.5"
        >
          LINKO
        </text>
        <text
          x="200"
          y="171"
          textAnchor="middle"
          fill="#60a5fa"
          fontSize="5"
          fontFamily="Inter,sans-serif"
          opacity="0.7"
        >
          ENTERPRISE
        </text>

        {/* --- RIGHT CLUSTER --- */}
        {/* Tall right building */}
        <rect x="248" y="90" width="66" height="135" fill="url(#bldB2)" />
        <rect x="251" y="85" width="13" height="7" rx="1" fill="#1d4ed8" opacity="0.9" />
        <line x1="257" y1="85" x2="257" y2="68" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
        <circle cx="257" cy="66" r="3" fill="#60a5fa" filter="url(#glw2)" opacity="0.9" />
        {rightTallWindows.map((w, i) => (
          <rect
            key={`rtw${i}`}
            x={w.x}
            y={w.y}
            width="8"
            height="6"
            rx="1"
            fill={w.fill}
            opacity={w.opacity}
          />
        ))}

        {/* Short right building */}
        <rect x="322" y="118" width="56" height="107" fill="url(#bldA2)" />
        <rect x="325" y="113" width="11" height="7" rx="1" fill="#1d4ed8" opacity="0.8" />
        {rightWindows.map((w, i) => (
          <rect
            key={`rw${i}`}
            x={w.x}
            y={w.y}
            width="7"
            height="5"
            rx="1"
            fill={w.fill}
            opacity={w.opacity}
          />
        ))}

        {/* --- NETWORK LINES --- */}
        <line
          x1="77"
          y1="66"
          x2="200"
          y2="24"
          stroke="#3b82f6"
          strokeWidth="0.8"
          opacity="0.3"
          strokeDasharray="4 3"
        />
        <line
          x1="257"
          y1="66"
          x2="200"
          y2="24"
          stroke="#3b82f6"
          strokeWidth="0.8"
          opacity="0.3"
          strokeDasharray="4 3"
        />
        <line
          x1="77"
          y1="66"
          x2="257"
          y2="66"
          stroke="#1d4ed8"
          strokeWidth="0.6"
          opacity="0.2"
          strokeDasharray="3 5"
        />
        {/* Data pulses on lines */}
        <circle cx="138" cy="45" r="1.5" fill="#60a5fa" opacity="0.6" filter="url(#glw2)" />
        <circle cx="228" cy="45" r="1.5" fill="#60a5fa" opacity="0.6" filter="url(#glw2)" />
        <circle cx="167" cy="66" r="1.5" fill="#3b82f6" opacity="0.5" />

        {/* Arc data flows */}
        <path
          d="M 70 188 Q 135 158 200 188"
          stroke="#60a5fa"
          strokeWidth="1"
          fill="none"
          opacity="0.2"
          strokeDasharray="5 4"
        />
        <path
          d="M 200 188 Q 265 158 330 188"
          stroke="#60a5fa"
          strokeWidth="1"
          fill="none"
          opacity="0.2"
          strokeDasharray="5 4"
        />

        {/* Ground glow strip */}
        <rect x="0" y="200" width="400" height="25" fill="url(#groundFade2)" />

        {/* Ground base */}
        <rect x="0" y="214" width="400" height="11" fill="#020810" />

        {/* Perspective grid */}
        {[-80, -40, 0, 40, 80].map((offset, i) => (
          <line
            key={`pg${i}`}
            x1={200 + offset}
            y1="210"
            x2={200 + offset * 2.5}
            y2="224"
            stroke="#1d4ed8"
            strokeWidth="0.5"
            opacity="0.2"
          />
        ))}
        {[211, 217, 223].map((y, i) => (
          <line
            key={`ph${i}`}
            x1="20"
            y1={y}
            x2="380"
            y2={y}
            stroke="#1d4ed8"
            strokeWidth="0.4"
            opacity={0.15 - i * 0.04}
          />
        ))}

        {/* Overlay labels */}
        <rect
          x="5"
          y="76"
          width="68"
          height="17"
          rx="8.5"
          fill="#1d4ed8"
          fillOpacity="0.25"
          stroke="#3b82f6"
          strokeWidth="0.5"
          strokeOpacity="0.5"
        />
        <text
          x="39"
          y="88.5"
          textAnchor="middle"
          fill="#93c5fd"
          fontSize="7"
          fontFamily="Inter,sans-serif"
          fontWeight="500"
          letterSpacing="0.3"
        >
          AI Network
        </text>

        <rect
          x="328"
          y="76"
          width="68"
          height="17"
          rx="8.5"
          fill="#1d4ed8"
          fillOpacity="0.25"
          stroke="#3b82f6"
          strokeWidth="0.5"
          strokeOpacity="0.5"
        />
        <text
          x="362"
          y="88.5"
          textAnchor="middle"
          fill="#93c5fd"
          fontSize="7"
          fontFamily="Inter,sans-serif"
          fontWeight="500"
          letterSpacing="0.3"
        >
          Data Flow
        </text>
      </svg>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
    </svg>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  data,
  gradientId,
  strokeColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trend: string;
  data: { v: number }[];
  gradientId: string;
  strokeColor: string;
}) {
  return (
    <div
      className="p-4 rounded-2xl backdrop-blur-sm"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: iconBg }}
          >
            <span style={{ color: iconColor }}>{icon}</span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {label}
          </span>
        </div>
        <span
          className="text-xs font-semibold flex items-center gap-0.5"
          style={{ color: '#34d399' }}
        >
          <TrendingUp size={11} />
          {trend}
        </span>
      </div>
      <div
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: 'Outfit, Inter, sans-serif', color: '#ffffff' }}
      >
        {value}
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const inputClass =
    'w-full py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all';
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    paddingLeft: '2.25rem',
    paddingRight: '0.75rem',
  };
  const inputFocusStyle = {
    borderColor: 'rgba(59,130,246,0.5)',
  };

  return (
    <div
      className="min-h-screen text-[#e8f0ff] relative overflow-x-hidden"
      style={{
        background: '#040d1e',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />

      {/* Ambient glows */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '20%',
          left: '20%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: '30%',
          right: '15%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />

      {/* ═══════════════════════════════ HEADER ═══════════════════════════════ */}
      <header
        className="relative z-20 flex items-center justify-between px-8 py-3.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(4,13,30,0.7)',
        }}
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <LinkoLogo size={34} />
          <span
            className="font-semibold text-[17px] tracking-tight text-white"
            style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
          >
            Linko
          </span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <h1
            className="text-[15px] font-semibold text-center leading-snug whitespace-nowrap"
            style={{ fontFamily: 'Outfit, Inter, sans-serif', color: 'rgba(255,255,255,0.85)' }}
          >
            Manage - Connect - Grow Together -{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #60a5fa, #93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Linko
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-sm transition-colors"
            style={{ color: 'rgba(147,197,253,0.75)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(147,197,253,0.75)')}
          >
            Log In
          </button>
          <button
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, #3b82f6, #60a5fa)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, #2563eb, #3b82f6)';
            }}
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* ═══════════════════════════ MAIN 3-COLUMN ═══════════════════════════ */}
      <main
        className="relative z-10 grid gap-5 px-6 py-5 mx-auto"
        style={{
          maxWidth: '1380px',
          gridTemplateColumns: '1fr 410px 1fr',
        }}
      >
        {/* ══════════════ LEFT COLUMN ══════════════ */}
        <div className="flex flex-col gap-4">
          {/* Enterprise badge */}
          <div className="self-start">
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(29,78,216,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#93c5fd',
              }}
            >
              <Building2 size={13} style={{ color: '#60a5fa' }} />
              Enterprise Platform
            </div>
          </div>

          {/* Cityscape */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
            }}
          >
            <CityscapeIllustration />
          </div>

          {/* Pill tags */}
          <div className="flex flex-wrap gap-2">
            {['AI Assistant', 'Analytics', 'Automation', 'Intelligence'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-default"
                style={{
                  background: 'rgba(29,78,216,0.12)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#93c5fd',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* SOC 2 card */}
          <div
            className="flex items-center gap-3 p-3.5 rounded-xl backdrop-blur-sm"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.28)',
              }}
            >
              <Shield size={16} style={{ color: '#34d399' }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">SOC 2 Certified</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Enterprise-grade security
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════ CENTER COLUMN (Sign-up Form) ══════════════ */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4 self-start"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow:
              '0 0 80px rgba(59,130,246,0.1), 0 0 30px rgba(59,130,246,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Logo + title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <LinkoLogo size={42} />
            <div>
              <div
                className="text-[19px] font-bold text-white mt-1"
                style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
              >
                Create Your Account
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Build your modern business network today.
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-2.5">
            {/* Email */}
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(96,165,250,0.55)' }}
              />
              <input
                type="email"
                placeholder="Work Email Address"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Full Name */}
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(96,165,250,0.55)' }}
              />
              <input
                type="text"
                placeholder="Full Name"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(96,165,250,0.55)' }}
              />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                className={inputClass}
                style={{ ...inputStyle, paddingRight: '2.25rem' }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.28)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.28)')
                }
              >
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(96,165,250,0.55)' }}
              />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm Password"
                className={inputClass}
                style={{ ...inputStyle, paddingRight: '2.25rem' }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.28)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.28)')
                }
              >
                {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className="w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: agreed ? '#2563eb' : 'rgba(255,255,255,0.05)',
                border: agreed ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {agreed && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path
                    d="M1 3.5L3.5 6L8 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              I agree to the{' '}
              <a
                href="#"
                className="font-semibold transition-colors"
                style={{ color: '#60a5fa' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#93c5fd')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#60a5fa')
                }
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="font-semibold transition-colors"
                style={{ color: '#60a5fa' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#93c5fd')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#60a5fa')
                }
              >
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Sign Up button */}
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              boxShadow: '0 4px 24px rgba(59,130,246,0.4)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, #2563eb, #60a5fa)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 32px rgba(59,130,246,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, #1d4ed8, #3b82f6)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 24px rgba(59,130,246,0.4)';
            }}
          >
            Sign Up →
          </button>

          {/* Log in link */}
          <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
            <button
              onClick={() => navigate('/login')}
              className="transition-colors"
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#60a5fa')}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.32)')
              }
            >
              Log In instead
            </button>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>
              OR
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-2">
            <button
              className="w-full py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.65)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
                }}
              >
                <GithubIcon />
                GitHub
              </button>
              <button
                className="py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
                }}
              >
                <MicrosoftIcon />
                Microsoft
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN ══════════════ */}
        <div className="flex flex-col gap-4">
          {/* Live Preview badge */}
          <div className="self-start">
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#34d399',
                  boxShadow: '0 0 6px #34d399',
                  animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
              Live Preview
            </div>
          </div>

          {/* Active Connections card */}
          <StatCard
            icon={<Link2 size={13} />}
            iconBg="rgba(59,130,246,0.18)"
            iconColor="#60a5fa"
            label="Active Connections"
            value="1,323"
            trend="4.2%"
            data={connectionsData}
            gradientId="connGrad2"
            strokeColor="#3b82f6"
          />

          {/* Revenue card */}
          <StatCard
            icon={
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3H15" />
              </svg>
            }
            iconBg="rgba(59,130,246,0.18)"
            iconColor="#60a5fa"
            label="Revenue"
            value="+$1.14M"
            trend="18.7%"
            data={revenueData}
            gradientId="revGrad2"
            strokeColor="#60a5fa"
          />

          {/* AI Assistant notification */}
          <div
            className="p-3.5 rounded-2xl backdrop-blur-sm"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(167,139,250,0.18)' }}
                >
                  <Brain size={13} style={{ color: '#a78bfa' }} />
                </div>
                <span className="text-sm font-semibold text-white">AI Assistant</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(59,130,246,0.18)',
                  color: '#93c5fd',
                }}
              >
                Today
              </span>
            </div>
            <p className="text-xs pl-9" style={{ color: 'rgba(255,255,255,0.4)' }}>
              • Ready for today&apos;s meeting.
            </p>
          </div>

          {/* New Partner Request notification */}
          <div
            className="p-3.5 rounded-2xl backdrop-blur-sm cursor-pointer transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.055)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.22)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.18)' }}
                >
                  <Link2 size={13} style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">New Partner Request</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    TechCorp Inc. • Just now
                  </div>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════ FOOTER ═══════════════════════════════ */}
      <footer
        className="relative z-10 text-center py-5 mt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Linko Technologies Inc.
        </p>
        <div
          className="flex items-center justify-center gap-1.5 mt-1.5 text-xs"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          {['Privacy Policy', 'Terms of Service', 'Help Center'].map((link, i) => (
            <span key={link} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>}
              <a
                href="#"
                className="transition-colors"
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.18)')
                }
              >
                {link}
              </a>
            </span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
