import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  BarChart3,
  Network,
  TrendingUp,
  Workflow,
  Shield,
  Users,
  Bell,
  Calendar,
  CheckSquare,
  ChevronRight,
  Star,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
  Zap,
  Building2,
  Globe,
  Lock,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const salesData = [
  { v: 40 },
  { v: 55 },
  { v: 45 },
  { v: 70 },
  { v: 65 },
  { v: 80 },
  { v: 75 },
  { v: 90 },
  { v: 85 },
  { v: 110 },
  { v: 100 },
  { v: 125 },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif", background: '#050816', color: '#f9fafb' }}
    >
      {/* ── Nav ── */}
      <nav
        className="fixed top-4 left-1/2 z-50 flex items-center justify-between px-6 py-3 transition-all duration-500"
        style={{
          transform: 'translateX(-50%)',
          width: 'min(1200px, calc(100vw - 32px))',
          borderRadius: 16,
          background: scrolled ? 'rgba(5,8,22,0.85)' : 'rgba(11,18,32,0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(59,130,246,0.18)',
          boxShadow: scrolled ? '0 8px 40px rgba(37,99,235,0.12)' : 'none',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 select-none">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'linear-gradient(135deg,#2563eb,#60a5fa)' }}
          >
            <Network size={16} color="#fff" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Linko</span>
        </div>

        {/* Center links */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            'Platform',
            'Solutions',
            'Features',
            'AI Assistant',
            'Enterprise',
            'Pricing',
            'Resources',
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
              boxShadow: '0 0 20px rgba(37,99,235,0.4)',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-gray-400 hover:text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <div className="w-5 h-0.5 bg-current mb-1 transition-all" />
          <div className="w-5 h-0.5 bg-current mb-1" />
          <div className="w-5 h-0.5 bg-current" />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-x-4 top-20 z-40 rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(11,18,32,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(59,130,246,0.18)',
          }}
        >
          {[
            'Platform',
            'Solutions',
            'Features',
            'AI Assistant',
            'Enterprise',
            'Pricing',
            'Resources',
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="text-gray-300 font-medium hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => navigate('/login')}
              className="text-center text-gray-300 font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-center text-white font-semibold py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-24">
        {/* Background glow orbs */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 900,
            height: 900,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-60%)',
            background:
              'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.05) 50%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 400,
            height: 400,
            top: '20%',
            left: '10%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float1 8s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 300,
            height: 300,
            bottom: '10%',
            right: '8%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(50px)',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />

        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="flex flex-col items-start">
              {/* Badge */}
              <div
                className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: 'rgba(37,99,235,0.12)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  color: '#93c5fd',
                }}
              >
                <Zap size={13} className="text-blue-400" />
                Powered by enterprise AI
                <ChevronRight size={13} />
              </div>

              <h1
                className="font-black tracking-tight leading-none mb-6"
                style={{ fontSize: 'clamp(52px,6vw,88px)', letterSpacing: '-0.03em' }}
              >
                <span className="text-white">Manage.</span>{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg,#60a5fa,#93c5fd)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Connect.
                </span>{' '}
                <span className="text-white">Grow.</span>
                <br />
                <span
                  className="block mt-2"
                  style={{
                    fontSize: 'clamp(28px,3.2vw,48px)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg,#d1d5db,#9ca3af)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  The AI Operating System
                  <br />
                  for Modern Businesses.
                </span>
              </h1>

              <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-xl">
                Manage your company, automate daily operations, and build meaningful business
                connections—all in one intelligent platform.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
                    boxShadow: '0 0 30px rgba(37,99,235,0.45), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  Sign Up
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-gray-300 hover:text-white transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Sign In
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 mt-10">
                <div className="flex -space-x-3">
                  {['2hYHWAam8Is', 'IF9TZafQzSQ', 'ZHvM3XIOHoE', 'mEZ3PoFGs_k'].map((id, i) => (
                    <img
                      key={i}
                      src={`https://images.unsplash.com/photo-${id}?w=40&h=40&fit=crop&auto=format`}
                      alt="user"
                      className="w-9 h-9 rounded-full border-2 object-cover"
                      style={{ borderColor: '#050816' }}
                    />
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-400">
                    Trusted by <span className="text-white font-semibold">5,000+</span> businesses
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Trust logos ── */}
      <TrustSection />

      {/* ── Features ── */}
      <FeaturesSection />

      {/* ── How it works ── */}
      <HowItWorks />

      {/* ── Why Linko ── */}
      <WhyLinko />

      {/* ── Testimonials ── */}
      <Testimonials />

      {/* ── CTA ── */}
      <CTASection />

      {/* ── Footer ── */}
      <Footer />

      <style>{`
        @keyframes float1 {
          0%,100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes float2 {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes floatCard {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%,100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes draw-line {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Dashboard Mockup                          */
/* ────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative hidden lg:block" style={{ height: 600 }}>
      {/* Main dashboard window */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,18,32,0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(37,99,235,0.15)',
          transform: 'perspective(1200px) rotateY(-6deg) rotateX(3deg)',
        }}
      >
        {/* Window chrome */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(59,130,246,0.15)', background: 'rgba(5,8,22,0.5)' }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <div
            className="ml-3 flex-1 h-5 rounded-md text-xs text-gray-500 flex items-center px-2"
            style={{ background: 'rgba(255,255,255,0.05)', maxWidth: 200 }}
          >
            app.linko.ai/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4 grid grid-cols-3 gap-3 h-full pb-8">
          {/* AI Assistant panel */}
          <div
            className="col-span-1 rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.3)' }}
              >
                <Bot size={12} color="#60a5fa" />
              </div>
              <span className="text-xs font-semibold text-blue-300">AI Assistant</span>
            </div>
            {['Summarize Q3 report', 'Schedule team sync', 'Analyze sales data'].map((msg, i) => (
              <div
                key={i}
                className="rounded-lg px-2.5 py-1.5 text-xs"
                style={{
                  background: i === 0 ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)',
                  color: i === 0 ? '#93c5fd' : '#9ca3af',
                  border: '1px solid rgba(59,130,246,0.1)',
                }}
              >
                {msg}
              </div>
            ))}
            <div
              className="mt-auto rounded-lg px-2.5 py-2 text-xs text-blue-300"
              style={{
                background: 'rgba(37,99,235,0.2)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              ✦ Ready to assist you...
            </div>
          </div>

          {/* Right two columns */}
          <div className="col-span-2 flex flex-col gap-3">
            {/* Analytics row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Revenue', value: '$2.4M', up: true },
                { label: 'Employees', value: '348', up: true },
                { label: 'Deals', value: '127', up: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(59,130,246,0.1)',
                  }}
                >
                  <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                  <div className="text-sm font-bold text-white">{stat.value}</div>
                  <div
                    className={`text-xs mt-0.5 ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {stat.up ? '↑ 12.4%' : '↓ 3.1%'}
                  </div>
                </div>
              ))}
            </div>

            {/* Sales chart */}
            <div
              className="rounded-xl p-3 flex-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(59,130,246,0.1)',
              }}
            >
              <div className="text-xs font-semibold text-gray-400 mb-2">Sales Performance</div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#sg)"
                    dot={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0b1220',
                      border: '1px solid #3b82f6',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    itemStyle={{ color: '#93c5fd' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CRM pipeline */}
            <div
              className="rounded-xl p-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(59,130,246,0.1)',
              }}
            >
              <div className="text-xs font-semibold text-gray-400 mb-2">CRM Pipeline</div>
              <div className="flex gap-1.5">
                {[
                  { stage: 'Lead', count: 24, w: '40%', color: '#3b82f6' },
                  { stage: 'Qualified', count: 18, w: '30%', color: '#60a5fa' },
                  { stage: 'Proposal', count: 11, w: '20%', color: '#93c5fd' },
                  { stage: 'Won', count: 6, w: '10%', color: '#22d3ee' },
                ].map((s) => (
                  <div
                    key={s.stage}
                    className="flex flex-col items-center gap-1"
                    style={{ width: s.w }}
                  >
                    <div
                      className="w-full h-1.5 rounded-full"
                      style={{ background: s.color, opacity: 0.8 }}
                    />
                    <div className="text-xs font-bold" style={{ color: s.color }}>
                      {s.count}
                    </div>
                    <div className="text-xs text-gray-600 truncate w-full text-center">
                      {s.stage}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks row */}
          <div
            className="col-span-2 rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={12} color="#60a5fa" />
              <span className="text-xs font-semibold text-gray-400">Tasks</span>
            </div>
            {['Q3 financial review', 'Onboard 3 new hires', 'Partner pitch deck'].map((task, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div
                  className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: i === 0 ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(59,130,246,0.3)',
                  }}
                >
                  {i === 0 && <div className="w-1.5 h-1.5 rounded-sm bg-blue-400" />}
                </div>
                <span className="text-xs text-gray-400 truncate">{task}</span>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div
            className="col-span-1 rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} color="#60a5fa" />
              <span className="text-xs font-semibold text-gray-400">Today</span>
            </div>
            {['9:00 Board meeting', '14:00 Investor call'].map((ev, i) => (
              <div
                key={i}
                className="text-xs py-1 px-2 rounded-lg mb-1"
                style={{
                  background: 'rgba(37,99,235,0.15)',
                  color: '#93c5fd',
                  borderLeft: '2px solid #3b82f6',
                }}
              >
                {ev}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification card */}
      <div
        className="absolute -right-8 top-16 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(11,18,32,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59,130,246,0.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'floatCard 6s ease-in-out infinite',
          minWidth: 200,
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,99,235,0.25)' }}
        >
          <Bell size={14} color="#60a5fa" />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">New partner request</div>
          <div className="text-xs text-gray-500">TechCorp Inc. — just now</div>
        </div>
      </div>

      {/* Floating network card */}
      <div
        className="absolute -left-10 bottom-20 rounded-2xl px-4 py-3"
        style={{
          background: 'rgba(11,18,32,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59,130,246,0.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'floatCard 8s ease-in-out infinite 1s',
          minWidth: 160,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Network size={12} color="#60a5fa" />
          <span className="text-xs font-semibold text-blue-300">Network</span>
        </div>
        <div className="text-lg font-bold text-white">1,247</div>
        <div className="text-xs text-gray-500">Active connections</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Trust Section                             */
/* ────────────────────────────────────────── */
function TrustSection() {
  const logos = [
    { name: 'Microsoft', icon: <Building2 size={22} /> },
    { name: 'Google', icon: <Globe size={22} /> },
    { name: 'Amazon', icon: <Zap size={22} /> },
    { name: 'Deloitte', icon: <BarChart3 size={22} /> },
    { name: 'Shopify', icon: <TrendingUp size={22} /> },
    { name: 'Stripe', icon: <Lock size={22} /> },
  ];

  return (
    <section className="py-20 relative">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)',
        }}
      />
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-12">
          Trusted by growing businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2.5 text-gray-500 hover:text-gray-300 transition-colors duration-300 cursor-default"
            >
              {logo.icon}
              <span className="text-lg font-semibold tracking-tight">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), transparent)',
        }}
      />
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  Features Section                          */
/* ────────────────────────────────────────── */
function FeaturesSection() {
  const { ref, visible } = useInView();
  const features = [
    {
      icon: <Bot size={22} />,
      title: 'AI Business Assistant',
      desc: 'Automate repetitive work using intelligent AI that learns your business workflows.',
    },
    {
      icon: <Building2 size={22} />,
      title: 'Enterprise Management',
      desc: 'Manage employees, finance, inventory and operations from a unified command center.',
    },
    {
      icon: <Network size={22} />,
      title: 'Business Networking',
      desc: 'Discover partners, suppliers and clients through our intelligent enterprise graph.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Smart Analytics',
      desc: 'Real-time reports and AI-generated insights that drive better business decisions.',
    },
    {
      icon: <Workflow size={22} />,
      title: 'Workflow Automation',
      desc: 'Build automated approval processes and trigger complex multi-step workflows visually.',
    },
    {
      icon: <Shield size={22} />,
      title: 'Secure Cloud Platform',
      desc: 'Enterprise-grade security, SOC 2 compliance, and infinite scalability built in.',
    },
  ];

  return (
    <section className="py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#93c5fd',
            }}
          >
            <Zap size={13} /> Core Platform
          </div>
          <h2
            className="font-black text-white mb-5"
            style={{ fontSize: 'clamp(36px,4vw,56px)', letterSpacing: '-0.02em' }}
          >
            Everything your business needs.
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            One unified platform that replaces a dozen fragmented tools.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl p-7 cursor-default transition-all duration-500"
              style={{
                background: 'rgba(11,18,32,0.6)',
                border: '1px solid rgba(59,130,246,0.12)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms, box-shadow 0.3s ease, border-color 0.3s ease`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 0 40px rgba(37,99,235,0.2), 0 20px 40px rgba(0,0,0,0.3)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.12)';
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
                style={{
                  background: 'rgba(37,99,235,0.15)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: '#60a5fa',
                }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1.5 mt-5 text-sm font-medium text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  How it Works                              */
/* ────────────────────────────────────────── */
function HowItWorks() {
  const { ref, visible } = useInView();
  const steps = [
    {
      num: '01',
      title: 'Create your company',
      desc: 'Set up your organization profile, structure, and business details in minutes.',
    },
    {
      num: '02',
      title: 'Invite your team',
      desc: 'Add employees, assign roles, and configure permissions with enterprise-grade access control.',
    },
    {
      num: '03',
      title: 'Grow your network',
      desc: 'Connect with partners, suppliers, and clients through our AI-powered enterprise network.',
    },
  ];

  return (
    <section className="py-32 relative" ref={ref}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.07) 0%, transparent 70%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#93c5fd',
            }}
          >
            <CheckSquare size={13} /> Get started in minutes
          </div>
          <h2
            className="font-black text-white"
            style={{ fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-0.02em' }}
          >
            Three steps to launch.
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div
            className="hidden lg:block absolute top-16 left-0 right-0 h-px"
            style={{ top: '4rem' }}
          >
            <svg className="w-full" height="2" style={{ overflow: 'visible' }}>
              <line
                x1="20%"
                y1="0"
                x2="80%"
                y2="0"
                stroke="rgba(59,130,246,0.3)"
                strokeWidth="1"
                strokeDasharray="6 4"
                style={{
                  animation: visible ? 'draw-line 1.5s ease forwards' : 'none',
                  strokeDashoffset: 200,
                }}
              />
            </svg>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 150}ms, transform 0.6s ease ${i * 150}ms`,
                }}
              >
                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6 font-black text-xl"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))',
                    border: '1px solid rgba(59,130,246,0.3)',
                    color: '#60a5fa',
                    boxShadow: '0 0 30px rgba(37,99,235,0.2)',
                  }}
                >
                  {step.num}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        'radial-gradient(circle at center, rgba(59,130,246,0.15), transparent 70%)',
                      animation: 'pulse-glow 3s ease-in-out infinite',
                    }}
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  Why Linko                                 */
/* ────────────────────────────────────────── */
function WhyLinko() {
  const { ref, visible } = useInView();
  const benefits = [
    {
      icon: <Zap size={18} />,
      title: 'One platform',
      desc: 'Replace dozens of disconnected SaaS tools with one integrated OS for your business.',
    },
    {
      icon: <Bot size={18} />,
      title: 'AI-powered productivity',
      desc: 'Intelligent automation that learns from your team and eliminates repetitive tasks.',
    },
    {
      icon: <Users size={18} />,
      title: 'Business collaboration',
      desc: 'Real-time collaboration across departments, teams, and your external network.',
    },
    {
      icon: <TrendingUp size={18} />,
      title: 'Enterprise scalability',
      desc: 'Built for 10 users or 10,000 — scales with your growth without friction.',
    },
  ];

  return (
    <section className="py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: illustration */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              height: 480,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-32px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&auto=format"
              alt="Business analytics dashboard"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(5,8,22,0.3) 0%, rgba(37,99,235,0.15) 100%)',
              }}
            />
            {/* Overlay stats */}
            <div
              className="absolute bottom-6 left-6 right-6 rounded-2xl p-5"
              style={{
                background: 'rgba(5,8,22,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              <div className="flex justify-between">
                {[
                  { label: 'Productivity', value: '+47%' },
                  { label: 'Time Saved', value: '14h/wk' },
                  { label: 'ROI', value: '3.2x' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-xl font-black text-white">{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: benefits */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(32px)',
              transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
            }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{
                background: 'rgba(37,99,235,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                color: '#93c5fd',
              }}
            >
              <Star size={13} fill="#93c5fd" /> Why teams choose Linko
            </div>
            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: 'clamp(32px,3.5vw,48px)', letterSpacing: '-0.02em' }}
            >
              Built for ambitious businesses.
            </h2>
            <p className="text-gray-400 mb-10 leading-relaxed">
              Linko isn't another tool—it's the operating system your business has been waiting for.
              AI-native from day one, and designed to scale with you.
            </p>

            <div className="flex flex-col gap-4">
              {benefits.map((b, i) => (
                <div
                  key={b.title}
                  className="flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 cursor-default"
                  style={{
                    background: 'rgba(11,18,32,0.6)',
                    border: '1px solid rgba(59,130,246,0.12)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(16px)',
                    transition: `opacity 0.5s ease ${0.3 + i * 0.1}s, transform 0.5s ease ${0.3 + i * 0.1}s`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.3)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.12)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(11,18,32,0.6)';
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa' }}
                  >
                    {b.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm mb-1">{b.title}</div>
                    <div className="text-sm text-gray-400 leading-relaxed">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  Testimonials                              */
/* ────────────────────────────────────────── */
function Testimonials() {
  const { ref, visible } = useInView();
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CEO, NexaScale',
      avatar: '2hYHWAam8Is',
      quote:
        "Linko replaced six different tools we were using. Our team's productivity jumped 40% in the first month. The AI assistant alone is worth the investment.",
      stars: 5,
    },
    {
      name: 'Marcus Williams',
      role: 'COO, Vertex Industries',
      avatar: 'IF9TZafQzSQ',
      quote:
        "The enterprise network graph is unlike anything we've seen. We found three major suppliers and two strategic partners in our first week.",
      stars: 5,
    },
    {
      name: 'Amara Osei',
      role: 'Founder, Luminary Tech',
      avatar: 'ZHvM3XIOHoE',
      quote:
        'We scaled from 12 to 200 employees without adding any new management tools. Linko handles everything with zero friction. Truly remarkable.',
      stars: 5,
    },
  ];

  return (
    <section className="py-32 relative" ref={ref}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.06) 0%, transparent 65%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#93c5fd',
            }}
          >
            <Star size={13} fill="#93c5fd" /> Customer stories
          </div>
          <h2
            className="font-black text-white"
            style={{ fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-0.02em' }}
          >
            Loved by leaders worldwide.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: 'rgba(11,18,32,0.7)',
                border: '1px solid rgba(59,130,246,0.15)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
              }}
            >
              <div className="flex gap-0.5 mb-5">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
              <div
                className="flex items-center gap-3 pt-5"
                style={{ borderTop: '1px solid rgba(59,130,246,0.1)' }}
              >
                <img
                  src={`https://images.unsplash.com/photo-${t.avatar}?w=48&h=48&fit=crop&auto=format`}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover"
                  style={{ border: '2px solid rgba(59,130,246,0.3)' }}
                />
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  CTA Section                               */
/* ────────────────────────────────────────── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div
          className="relative rounded-3xl p-16 text-center overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(11,18,32,0.8) 50%, rgba(59,130,246,0.1) 100%)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.25) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
              style={{
                background: 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#93c5fd',
              }}
            >
              <Zap size={13} /> Start for free today
            </div>
            <h2
              className="font-black text-white mb-5 max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(36px,4.5vw,60px)', letterSpacing: '-0.025em' }}
            >
              Start Building Smarter Businesses Today
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
              Join thousands of businesses that trust Linko to manage, connect, and grow. No credit
              card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
                  boxShadow: '0 0 40px rgba(37,99,235,0.5), 0 8px 24px rgba(0,0,0,0.3)',
                  fontSize: 15,
                }}
              >
                Sign Up
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#"
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-gray-300 hover:text-white transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: 15,
                }}
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────── */
/*  Footer                                    */
/* ────────────────────────────────────────── */
function Footer() {
  const cols = [
    {
      title: 'Product',
      links: ['Platform Overview', 'AI Assistant', 'Analytics', 'Automation', 'Changelog'],
    },
    {
      title: 'Solutions',
      links: ['Enterprise', 'Startups', 'Finance', 'HR Management', 'CRM'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API Reference', 'Blog', 'Community', 'Status'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Partners', 'Press Kit', 'Contact'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Security', 'GDPR', 'Cookies'],
    },
  ];

  return (
    <footer
      className="relative pt-20 pb-10"
      style={{ borderTop: '1px solid rgba(59,130,246,0.1)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#2563eb,#60a5fa)' }}
              >
                <Network size={16} color="#fff" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Linko</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs">
              The AI operating system for modern businesses.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Twitter size={15} />, label: 'Twitter' },
                { icon: <Linkedin size={15} />, label: 'LinkedIn' },
                { icon: <Github size={15} />, label: 'GitHub' },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 hover:text-gray-200 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid rgba(59,130,246,0.08)' }}
        >
          <p className="text-sm text-gray-600">
            © 2026 Linko Technologies Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-600">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
