import { useState, useRef, useEffect } from 'react';
import {
  Network,
  LayoutDashboard,
  Building2,
  PackageOpen,
  Target,
  Users,
  Compass,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Bot,
  Zap,
  Edit2,
  Trash2,
  Globe,
  Calendar,
  Tag,
  ArrowUpRight,
  Sparkles,
  Lock,
  BarChart2,
  Layers,
  X,
  CheckCircle2,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

/* ─── mock data ─── */
const BIZ = {
  name: 'Acme Technologies',
  taxId: 'MST-0312456789',
  legalType: 'Joint Stock Company',
  stage: 'Growth',
  industryL1: 'Technology',
  industryL2: 'Software & SaaS',
  province: 'Ho Chi Minh City',
  city: 'District 1',
  verified: false,
  dataSource: 'Manual Entry',
  description:
    'Acme Technologies delivers AI-powered enterprise software for mid-to-large businesses across Southeast Asia, specializing in ERP integration and business networking.',
  completion: 92,
  healthSections: [
    { label: 'Company', done: true },
    { label: 'Industry', done: true },
    { label: 'Location', done: true },
    { label: 'Description', done: true },
    { label: 'Offers', done: true },
    { label: 'Needs', done: true },
    { label: 'Contacts', done: false },
  ],
};

const OFFERS = [
  {
    id: 1,
    title: 'Enterprise SaaS Integration',
    intent: 'Sell',
    industry: 'Technology',
    area: 'Southeast Asia',
    date: '2026-06-14',
    status: 'Active',
  },
  {
    id: 2,
    title: 'AI Consulting Services',
    intent: 'Sell',
    industry: 'Technology',
    area: 'Vietnam',
    date: '2026-06-20',
    status: 'Active',
  },
  {
    id: 3,
    title: 'Custom ERP Development',
    intent: 'Sell',
    industry: 'Technology',
    area: 'Global',
    date: '2026-07-01',
    status: 'Draft',
  },
];

const NEEDS = [
  {
    id: 1,
    title: 'Cloud Infrastructure Partner',
    intent: 'Buy',
    industry: 'Cloud / Infra',
    region: 'Vietnam',
    date: '2026-06-18',
    status: 'Active',
  },
  {
    id: 2,
    title: 'Senior React Developer',
    intent: 'Hire',
    industry: 'Engineering',
    region: 'Remote',
    date: '2026-06-25',
    status: 'Active',
  },
  {
    id: 3,
    title: 'Series A Investment',
    intent: 'Seek',
    industry: 'Finance',
    region: 'Southeast Asia',
    date: '2026-07-02',
    status: 'Draft',
  },
];

const CONTACTS = [
  {
    id: 1,
    name: 'Nguyen Van An',
    role: 'CEO',
    title: 'Chief Executive Officer',
    email: 'an@acme.vn',
    phone: '+84 91 234 5678',
    primary: true,
  },
  {
    id: 2,
    name: 'Le Thi Bich',
    role: 'CTO',
    title: 'Chief Technology Officer',
    email: 'bich@acme.vn',
    phone: '+84 90 876 5432',
    primary: false,
  },
  {
    id: 3,
    name: 'Tran Minh Khoa',
    role: 'BizDev',
    title: 'Business Development Mgr',
    email: 'khoa@acme.vn',
    phone: '+84 93 555 1212',
    primary: false,
  },
];

//const REV_CHART = [28,36,30,52,44,68,60,82,74,96].map((v)=>({v}));

/* ════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════ */
export default function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Inter',sans-serif", background: '#050816', color: '#f9fafb' }}
    >
      {/* grid bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,.025) 1px,transparent 1px),
          linear-gradient(90deg,rgba(59,130,246,.025) 1px,transparent 1px)`,
          backgroundSize: '52px 52px',
          zIndex: 0,
        }}
      />

      {/* radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse 60% 55% at 55% 45%, rgba(37,99,235,.1) 0%, transparent 70%)',
        }}
      />

      <Sidebar active={activeNav} setActive={setActiveNav} />

      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        <TopNav newOpen={newOpen} setNewOpen={setNewOpen} />

        <div className="flex flex-1 overflow-hidden">
          {/* main scroll area */}
          <main
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            style={{ scrollbarWidth: 'none' }}
          >
            <KPIRow />
            <SecondRow />
            <ThirdRow />
            <FourthRow />
            <div className="h-4" />
          </main>

          <AIPanel />
        </div>
      </div>

      <style>{`
        *{scrollbar-width:none} *::-webkit-scrollbar{display:none}
        @keyframes pulse-ring{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════════ */
const NAV_MAIN = [
  { icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { icon: <Building2 size={16} />, label: 'Business Profile' },
  { icon: <PackageOpen size={16} />, label: 'Offers' },
  { icon: <Target size={16} />, label: 'Needs' },
  { icon: <Users size={16} />, label: 'Contacts' },
];
const NAV_PARTNER = [
  { icon: <Compass size={16} />, label: 'Partner Discovery', disabled: false },
  { icon: <Network size={16} />, label: 'Partner Requests', disabled: true },
  { icon: <MessageSquare size={16} />, label: 'Messages', disabled: true },
];
const NAV_BOTTOM = [
  { icon: <Bell size={16} />, label: 'Notifications' },
  { icon: <Settings size={16} />, label: 'Settings' },
];

function Sidebar({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  return (
    <aside
      className="relative z-10 flex flex-col flex-shrink-0"
      style={{
        width: 232,
        background: 'rgba(8,12,24,.85)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(59,130,246,.12)',
      }}
    >
      {/* logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(59,130,246,.1)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
            boxShadow: '0 0 14px rgba(37,99,235,.45)',
          }}
        >
          <Network size={14} color="#fff" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white leading-none tracking-tight">Linko</p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate leading-none">{BIZ.name}</p>
        </div>
      </div>

      {/* main nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV_MAIN.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={active === item.label}
            onClick={() => setActive(item.label)}
          />
        ))}

        <div className="my-3 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }} />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">
          Discovery
        </p>

        {NAV_PARTNER.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={active === item.label}
            disabled={item.disabled}
            onClick={() => !item.disabled && setActive(item.label)}
          />
        ))}

        <div className="my-3 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }} />

        {NAV_BOTTOM.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={active === item.label}
            onClick={() => setActive(item.label)}
          />
        ))}
      </nav>

      {/* user */}
      <div className="px-3 pb-3 border-t pt-3" style={{ borderColor: 'rgba(59,130,246,.1)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}
          >
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-none">{BIZ.name}</p>
            <div className="flex items-center gap-1 mt-1">
              {BIZ.verified ? (
                <>
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Verified</span>
                </>
              ) : (
                <>
                  <X size={10} className="text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-medium">Unverified</span>
                </>
              )}
            </div>
          </div>
          <LogOut
            size={13}
            className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
          />
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 text-left"
      style={{
        background: active ? 'rgba(37,99,235,.18)' : 'transparent',
        color: disabled ? '#374151' : active ? '#93c5fd' : '#9ca3af',
        border: active ? '1px solid rgba(59,130,246,.25)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span style={{ color: active ? '#60a5fa' : disabled ? '#374151' : '#6b7280' }}>{icon}</span>
      {label}
      {disabled && <Lock size={10} className="ml-auto text-gray-700" />}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   TOP NAV
════════════════════════════════════════════════════════ */
function TopNav({ newOpen, setNewOpen }: { newOpen: boolean; setNewOpen: (v: boolean) => void }) {
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setNewOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [setNewOpen]);

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        height: 64,
        borderBottom: '1px solid rgba(59,130,246,.1)',
        background: 'rgba(5,8,22,.7)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div>
        <p className="text-[11px] text-gray-500 font-medium">Good Morning,</p>
        <h1
          className="text-[16px] font-black text-white leading-tight"
          style={{ letterSpacing: '-.02em' }}
        >
          {BIZ.name}
          <span className="text-[13px] font-medium text-gray-500 ml-2">
            — Here's your business overview today.
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* search */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
            width: 200,
          }}
        >
          <Search size={13} className="text-gray-500" />
          <span className="text-[13px] text-gray-600">Search…</span>
        </div>

        {/* notification */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,.08)' }}
        >
          <Bell size={15} className="text-gray-400" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500"
            style={{ animation: 'pulse-ring 2s ease-in-out infinite' }}
          />
        </button>

        {/* avatar */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}
        >
          A
        </div>

        {/* + New */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setNewOpen(!newOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
              boxShadow: '0 0 20px rgba(37,99,235,.38)',
            }}
          >
            <Plus size={15} /> New{' '}
            <ChevronDown
              size={13}
              className={`transition-transform ${newOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {newOpen && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden z-50"
              style={{
                background: 'rgba(10,15,28,.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(59,130,246,.2)',
                boxShadow: '0 20px 40px rgba(0,0,0,.5)',
                animation: 'fadeUp .15s ease',
              }}
            >
              {[
                ['PackageOpen', 'New Offer'],
                ['Target', 'New Need'],
                ['Users', 'New Contact'],
              ].map(([, l]) => (
                <button
                  key={l}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════
   KPI ROW
════════════════════════════════════════════════════════ */
function KPIRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* profile */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardIcon bg="rgba(37,99,235,.2)" color="#60a5fa">
            <Building2 size={15} />
          </CardIcon>
          <StatusBadge label="Profile" color="blue" />
        </div>
        <p className="text-[11px] text-gray-500 font-medium">Profile Completion</p>
        <p className="text-3xl font-black text-white" style={{ letterSpacing: '-.03em' }}>
          92%
        </p>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,.07)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: '92%', background: 'linear-gradient(90deg,#2563eb,#60a5fa)' }}
          />
        </div>
        <button className="mt-1 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 self-start">
          Continue Editing <ArrowUpRight size={12} />
        </button>
      </GlassCard>

      {/* offers */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardIcon bg="rgba(99,102,241,.2)" color="#818cf8">
            <PackageOpen size={15} />
          </CardIcon>
          <span className="text-[11px] font-semibold text-emerald-400">↑ 2 this week</span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">Total Active Offers</p>
        <p className="text-3xl font-black text-white" style={{ letterSpacing: '-.03em' }}>
          8
        </p>
        <MiniSparkline data={[2, 4, 3, 6, 5, 7, 6, 8]} color="#818cf8" />
      </GlassCard>

      {/* needs */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardIcon bg="rgba(59,130,246,.2)" color="#60a5fa">
            <Target size={15} />
          </CardIcon>
          <span className="text-[11px] font-semibold text-blue-400">→ Stable</span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">Active Needs</p>
        <p className="text-3xl font-black text-white" style={{ letterSpacing: '-.03em' }}>
          5
        </p>
        <MiniSparkline data={[3, 4, 3, 5, 4, 5, 5, 5]} color="#3b82f6" />
      </GlassCard>

      {/* contacts */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardIcon bg="rgba(20,184,166,.15)" color="#2dd4bf">
            <Users size={15} />
          </CardIcon>
          <span className="text-[11px] font-semibold text-teal-400">↑ 1 new</span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">Business Contacts</p>
        <p className="text-3xl font-black text-white" style={{ letterSpacing: '-.03em' }}>
          3
        </p>
        <MiniSparkline data={[1, 1, 2, 2, 2, 3, 3, 3]} color="#14b8a6" />
      </GlassCard>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SECOND ROW — Business Overview + Health Card
════════════════════════════════════════════════════════ */
function SecondRow() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* overview — span 2 */}
      <GlassCard className="col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Building2 size={14} />} title="Business Overview" />
          <div className="flex gap-2">
            <ActionBtn icon={<Edit2 size={12} />} label="Edit Profile" />
            <ActionBtn icon={<ArrowUpRight size={12} />} label="View Profile" primary />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {[
            ['Business Name', BIZ.name],
            ['Tax ID', BIZ.taxId],
            ['Legal Type', BIZ.legalType],
            ['Business Stage', BIZ.stage],
            ['Industry Level 1', BIZ.industryL1],
            ['Industry Level 2', BIZ.industryL2],
            ['Province', BIZ.province],
            ['City', BIZ.city],
            ['Verification', BIZ.verified ? 'Verified ✓' : 'Unverified'],
            ['Data Source', BIZ.dataSource],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-0.5">
                {label}
              </p>
              <p
                className={`text-[13px] font-medium ${label === 'Verification' && !BIZ.verified ? 'text-yellow-400' : 'text-gray-200'}`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1">
            Description
          </p>
          <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2">
            {BIZ.description}
          </p>
        </div>
      </GlassCard>

      {/* health card */}
      <GlassCard className="flex flex-col gap-4">
        <SectionTitle icon={<Zap size={14} />} title="Business Health" />

        {/* circular progress */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ v: BIZ.completion, fill: 'url(#radGrad)' }]}
                startAngle={90}
                endAngle={90 - 360 * (BIZ.completion / 100)}
              >
                <defs>
                  <linearGradient id="radGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <RadialBar dataKey="v" background={{ fill: 'rgba(255,255,255,.06)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white" style={{ letterSpacing: '-.03em' }}>
                {BIZ.completion}%
              </span>
              <span className="text-[10px] text-gray-500">Complete</span>
            </div>
          </div>
        </div>

        {/* section checklist */}
        <div className="flex flex-col gap-1.5">
          {BIZ.healthSections.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              {s.done ? (
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <div className="w-[13px] h-[13px] rounded-full border-2 border-gray-700 flex-shrink-0" />
              )}
              <span
                className={`text-[12px] font-medium ${s.done ? 'text-gray-300' : 'text-gray-600'}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {!BIZ.verified && (
          <div
            className="rounded-xl p-3 text-[11px] text-blue-300 leading-relaxed"
            style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(59,130,246,.18)' }}
          >
            Complete your profile to unlock AI partner recommendations.
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   THIRD ROW — Offers + Needs
════════════════════════════════════════════════════════ */
function ThirdRow() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <OfferNeedList
        title="Recent Offers"
        icon={<PackageOpen size={14} />}
        items={OFFERS}
        addLabel="Add New Offer"
        emptyLabel="No offers yet."
        emptyCta="Create Your First Offer"
        colorKey="offers"
      />
      <OfferNeedList
        title="Recent Needs"
        icon={<Target size={14} />}
        items={NEEDS}
        addLabel="Add New Need"
        emptyLabel="No needs yet."
        emptyCta="Create Your First Need"
        colorKey="needs"
      />
    </div>
  );
}

type Item = {
  id: number;
  title: string;
  intent: string;
  industry: string;
  date: string;
  status: string;
  area?: string;
  region?: string;
};

function OfferNeedList({
  title,
  icon,
  items,
  addLabel,
  emptyLabel,
  emptyCta,
  colorKey,
}: {
  title: string;
  icon: React.ReactNode;
  items: Item[];
  addLabel: string;
  emptyLabel: string;
  emptyCta: string;
  colorKey: string;
}) {
  const accent = colorKey === 'offers' ? '#818cf8' : '#60a5fa';
  const accentBg = colorKey === 'offers' ? 'rgba(99,102,241,.15)' : 'rgba(37,99,235,.15)';

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={icon} title={title} />
        <ActionBtn icon={<Plus size={12} />} label={addLabel} primary />
      </div>

      {items.length === 0 ? (
        <EmptyState label={emptyLabel} cta={emptyCta} />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col gap-1.5 p-3 rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,.2)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.06)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)';
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-white leading-tight">{item.title}</p>
                <StatusBadge
                  label={item.status}
                  color={item.status === 'Active' ? 'green' : 'gray'}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <InlineTag
                  icon={<Tag size={9} />}
                  label={item.intent}
                  color={accent}
                  bg={accentBg}
                />
                <InlineTag icon={<Layers size={9} />} label={item.industry} />
                <InlineTag icon={<Globe size={9} />} label={item.area ?? item.region ?? ''} />
                <InlineTag icon={<Calendar size={9} />} label={item.date} />
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <Edit2 size={10} /> Edit
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ════════════════════════════════════════════════════════
   FOURTH ROW — Contacts Table
════════════════════════════════════════════════════════ */
function FourthRow() {
  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Users size={14} />} title="Business Contacts" />
        <ActionBtn icon={<Plus size={12} />} label="Add Contact" primary />
      </div>

      {CONTACTS.length === 0 ? (
        <EmptyState label="No contacts added." cta="Add Contact" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['Contact', 'Role', 'Job Title', 'Email', 'Phone', '', ''].map((h, i) => (
                  <th
                    key={i}
                    className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-600 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTACTS.map((c) => (
                <tr
                  key={c.id}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'rgba(37,99,235,.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white leading-none">
                          {c.name}
                        </p>
                        {c.primary && (
                          <span className="text-[10px] text-blue-400 font-medium">Primary</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge label={c.role} color="blue" />
                  </td>
                  <td className="py-2.5 pr-4 text-[12px] text-gray-400">{c.title}</td>
                  <td className="py-2.5 pr-4 text-[12px] text-gray-400">{c.email}</td>
                  <td className="py-2.5 pr-4 text-[12px] text-gray-400">{c.phone}</td>
                  <td className="py-2.5 pr-2">
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <Edit2 size={10} /> Edit
                    </button>
                  </td>
                  <td className="py-2.5">
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={10} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

/* ════════════════════════════════════════════════════════
   AI ASSISTANT PANEL
════════════════════════════════════════════════════════ */
const SUGGESTIONS = [
  'Improve your company description.',
  'Add more Offers to attract partners.',
  'Complete contact information.',
  'Verify your Tax ID for trust signals.',
];
const COMING_SOON = [
  { icon: <Network size={14} />, label: 'Partner Matching' },
  { icon: <Sparkles size={14} />, label: 'AI Recommendations' },
  { icon: <BarChart2 size={14} />, label: 'Business Analytics' },
  { icon: <Globe size={14} />, label: 'Market Insights' },
];

function AIPanel() {
  return (
    <aside
      className="flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        width: 272,
        background: 'rgba(8,12,24,.8)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(59,130,246,.12)',
      }}
    >
      {/* header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(59,130,246,.12)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="relative w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,rgba(37,99,235,.4),rgba(96,165,250,.3))',
              border: '1px solid rgba(59,130,246,.35)',
            }}
          >
            <Bot size={15} color="#93c5fd" />
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400"
              style={{ animation: 'pulse-ring 2s ease-in-out infinite' }}
            />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white leading-none">AI Business Assistant</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
        {/* welcome message */}
        <div
          className="rounded-2xl p-3.5"
          style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(59,130,246,.2)' }}
        >
          <p className="text-[13px] font-semibold text-white mb-1.5">Welcome back.</p>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            Your business profile is ready. AI can now recommend suitable business partners based on
            your Offers and Needs.
          </p>
        </div>

        {/* completion */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-gray-400">Business Completion</p>
            <p className="text-[11px] font-bold text-blue-400">{BIZ.completion}%</p>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,.07)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${BIZ.completion}%`,
                background: 'linear-gradient(90deg,#2563eb,#60a5fa)',
              }}
            />
          </div>
        </div>

        {/* suggestions */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Suggestions
          </p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,.25)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.06)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)';
                }}
              >
                <ChevronRight size={11} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-[12px] text-gray-300 leading-snug">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* recommended partners placeholder */}
        <div
          className="rounded-2xl p-3.5"
          style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(59,130,246,.2)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Network size={13} className="text-blue-400" />
            <span className="text-[12px] font-semibold text-gray-300">Recommended Partners</span>
            <span
              className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold text-gray-600"
              style={{
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.08)',
              }}
            >
              Coming Soon
            </span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Partner matching will be available once the AI recommendation engine launches.
          </p>
        </div>

        {/* upcoming features */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Upcoming Features
          </p>
          <div className="flex flex-col gap-2">
            {COMING_SOON.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,.02)',
                  border: '1px solid rgba(255,255,255,.06)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,.05)' }}
                >
                  <span className="text-gray-600">{f.icon}</span>
                </div>
                <span className="text-[12px] text-gray-600 font-medium flex-1">{f.label}</span>
                <span
                  className="text-[9px] font-semibold text-gray-700 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,.05)' }}
                >
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* footer prompt */}
      <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: 'rgba(59,130,246,.1)' }}>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(59,130,246,.2)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,.18)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,.1)';
          }}
        >
          <Sparkles size={12} className="text-blue-400 flex-shrink-0" />
          <span className="text-[12px] text-gray-400">Ask AI anything…</span>
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════
   SHARED PRIMITIVES
════════════════════════════════════════════════════════ */
function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'rgba(10,15,28,.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59,130,246,.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,.25)',
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-blue-400">{icon}</span>
      <h2 className="text-[14px] font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

function CardIcon({
  children,
  bg,
  color,
}: {
  children: React.ReactNode;
  bg: string;
  color: string;
}) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: bg, color }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    green: { bg: 'rgba(34,197,94,.12)', text: '#4ade80' },
    blue: { bg: 'rgba(59,130,246,.15)', text: '#93c5fd' },
    gray: { bg: 'rgba(255,255,255,.06)', text: '#6b7280' },
  };
  const c = map[color] ?? map.gray;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}

function InlineTag({
  icon,
  label,
  color = '#6b7280',
  bg = 'rgba(255,255,255,.05)',
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
      style={{ background: bg, color, border: `1px solid ${color}22` }}
    >
      {icon}
      {label}
    </span>
  );
}

function ActionBtn({
  icon,
  label,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all hover:scale-105"
      style={
        primary
          ? {
              background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(37,99,235,.3)',
            }
          : {
              background: 'rgba(255,255,255,.05)',
              color: '#9ca3af',
              border: '1px solid rgba(255,255,255,.09)',
            }
      }
    >
      {icon}
      {label}
    </button>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={d}>
        <defs>
          <linearGradient id={`sg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#sg${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ label, cta }: { label: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(37,99,235,.1)', border: '1px solid rgba(59,130,246,.15)' }}
      >
        <Layers size={20} className="text-blue-500/50" />
      </div>
      <p className="text-[13px] text-gray-600">{label}</p>
      <ActionBtn icon={<Plus size={12} />} label={cta} primary />
    </div>
  );
}
