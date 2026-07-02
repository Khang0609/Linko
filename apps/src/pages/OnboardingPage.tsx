import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  Network,
  Building2,
  Factory,
  MapPin,
  FileText,
  Package,
  Target,
  Users,
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  X,
  Pencil,
  Send,
} from 'lucide-react';

/* ============================ DESIGN TOKENS ============================ */
const STEPS = [
  {
    id: 1,
    label: 'Business',
    icon: Building2,
    progress: 12,
    hint: 'Complete your company information.',
  },
  {
    id: 2,
    label: 'Industry',
    icon: Factory,
    progress: 25,
    hint: 'Choose your business industries.',
  },
  { id: 3, label: 'Location', icon: MapPin, progress: 40, hint: 'Select operating locations.' },
  {
    id: 4,
    label: 'Description',
    icon: FileText,
    progress: 55,
    hint: 'Write a detailed company description.',
  },
  { id: 5, label: 'Offers', icon: Package, progress: 70, hint: 'Add products or services.' },
  { id: 6, label: 'Needs', icon: Target, progress: 82, hint: 'Describe your business needs.' },
  { id: 7, label: 'Contact', icon: Users, progress: 95, hint: 'Add contact information.' },
  {
    id: 8,
    label: 'Review',
    icon: ClipboardCheck,
    progress: 100,
    hint: 'Review and submit your profile.',
  },
];

const LEGAL_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'LLC',
  'Corporation',
  'Joint Stock Company',
  'Cooperative',
];
const STAGES = ['Idea / Pre-seed', 'Startup', 'Growth', 'Established', 'Enterprise'];
const INDUSTRY_L1 = [
  'Manufacturing',
  'Information Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Logistics',
  'Energy',
];
const INDUSTRY_L2 = [
  'Software',
  'Hardware',
  'Artificial Intelligence',
  'Cyber Security',
  'Cloud Computing',
  'Data Analytics',
  'Fintech',
  'Robotics',
];
const COUNTRIES = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Binh Duong',
  'Dong Nai',
  'Hai Phong',
  'Can Tho',
];
const PROVINCES = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Binh Duong',
  'Dong Nai',
  'Hai Phong',
  'Can Tho',
];
const CITIES = [
  'District 1',
  'District 3',
  'Thu Duc',
  'Tan Binh',
  'Binh Thanh',
  'Go Vap',
  'Phu Nhuan',
];
const AREAS = ['Domestic', 'Southeast Asia', 'East Asia', 'Europe', 'North America', 'Global'];
const INTENTS = ['Sell', 'Partner', 'Distribute', 'License', 'Invest'];
const CATEGORIES = [
  'Software',
  'Consulting',
  'Hardware',
  'Logistics',
  'Marketing',
  'Manufacturing',
  'Support Services',
];
const ROLES = [
  'Owner',
  'CEO',
  'CTO',
  'Head of Partnerships',
  'Sales Director',
  'Operations Manager',
];

/* ============================ PRIMITIVES ============================ */
const cardBase =
  'rounded-[24px] border border-white/10 bg-white/[0.035] backdrop-blur-xl shadow-[0_24px_60px_-30px_rgba(2,8,40,0.9)]';

interface FieldProps {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}
function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[13px] font-medium text-slate-300">{label}</label>}
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-[#0a1230]/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20';

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputCls + ' resize-none leading-relaxed'} />;
}

/* Searchable / plain select */
interface SelectFieldProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
}
function SelectField({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = false,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={inputCls + ' flex items-center justify-between text-left'}
      >
        <span className={value ? 'text-slate-100' : 'text-slate-500'}>{value || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a1230] shadow-2xl"
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                <Search className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500">No results</div>
              )}
              {filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-blue-500/15 ${value === o ? 'text-blue-300' : 'text-slate-200'}`}
                >
                  {o}
                  {value === o && <Check className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================ STEPPER ============================ */
interface StepperProps {
  current: number;
  onJump: (id: number) => void;
}
function Stepper({ current, onJump }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-1">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => onJump(s.id)}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition
                                ${
                                  active
                                    ? 'border-blue-400/50 bg-gradient-to-br from-blue-500 to-blue-400 text-white shadow-[0_0_22px_4px_rgba(59,130,246,0.5)]'
                                    : done
                                      ? 'border-blue-400/40 bg-blue-500/15 text-blue-300'
                                      : 'border-white/10 bg-white/[0.04] text-slate-500'
                                }`}
              >
                {done ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  <Icon className="h-5 w-5" strokeWidth={2} />
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-[10px] font-semibold uppercase tracking-wider ${active || done ? 'text-slate-300' : 'text-slate-600'}`}
                >
                  Step {s.id}
                </div>
                <div
                  className={`text-[12px] font-medium ${active ? 'text-white' : done ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {s.label}
                </div>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className="mt-[-26px] h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                  style={{ width: s.id < current ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ============================ DYNAMIC CARD (offers/needs) ============================ */
interface Item {
  intent: string;
  category: string;
  title: string;
  description: string;
}
interface ItemCardProps {
  index: number;
  item: Item;
  onChange: (v: Item) => void;
  onRemove: () => void;
  kind: string;
}
function ItemCard({ index, item, onChange, onRemove, kind }: ItemCardProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-200"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-[11px] text-blue-300">
            {index + 1}
          </span>
          {item.title || `${kind} ${index + 1}`}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 p-4">
              <Field label="Intent">
                <SelectField
                  value={item.intent}
                  onChange={(v) => onChange({ ...item, intent: v })}
                  options={INTENTS}
                />
              </Field>
              <Field label="Category">
                <SelectField
                  searchable
                  value={item.category}
                  onChange={(v) => onChange({ ...item, category: v })}
                  options={CATEGORIES}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Title">
                  <TextInput
                    value={item.title}
                    onChange={(e) => onChange({ ...item, title: e.target.value })}
                    placeholder={`${kind} title`}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Description">
                  <TextArea
                    rows={3}
                    value={item.description}
                    onChange={(e) => onChange({ ...item, description: e.target.value })}
                    placeholder={`Describe this ${kind.toLowerCase()}...`}
                  />
                </Field>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================ MAIN ============================ */
const emptyItem = () => ({ intent: '', category: '', title: '', description: '' });
const emptyContact = () => ({ name: '', phone: '', email: '', zalo: '', jobTitle: '', role: '' });

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleFinish = () => {
    navigate('/', { replace: true });
  };
  const [form, setForm] = useState({
    businessName: '',
    taxId: '',
    legalType: '',
    stage: '',
    year: '',
    industry1: '',
    industry2: '',
    country: '',
    province: '',
    city: '',
    areas: [] as string[],
    description: '',
    offers: [emptyItem()],
    needs: [emptyItem()],
    contacts: [emptyContact()],
  });
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const meta = STEPS[step - 1];

  const goNext = () => setStep((s) => Math.min(8, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const toggleArea = (a: string) =>
    set({ areas: form.areas.includes(a) ? form.areas.filter((x) => x !== a) : [...form.areas, a] });

  const charCount = form.description.length;
  const charOk = charCount >= 300 && charCount <= 500;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      {/* blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      {/* radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-[-12%] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px]" />

      {/* top nav */}
      <header className="relative z-10 mx-auto flex max-w-[1320px] items-center justify-between px-8 py-5">
        <button type="button" onClick={handleFinish} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 shadow-[0_0_18px_2px_rgba(59,130,246,0.5)]">
            <Network className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold tracking-tight">Linko</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">Mara Lindqvist</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-400 text-sm font-semibold text-white">
            ML
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1320px] px-8 pb-16">
        {/* title */}
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-[34px]">
            Let's build your business profile
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Complete your company information to unlock AI-powered networking, business matching,
            and enterprise management.
          </p>
        </div>

        {/* stepper */}
        <div className={`${cardBase} mb-8 px-8 py-6`}>
          <Stepper current={step} onJump={setStep} />
        </div>

        {/* content + sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className={`${cardBase} p-8`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <StepContent
                  step={step}
                  form={form}
                  set={set}
                  toggleArea={toggleArea}
                  charCount={charCount}
                  charOk={charOk}
                  emptyItem={emptyItem}
                  emptyContact={emptyContact}
                  onEdit={setStep}
                />
              </motion.div>
            </AnimatePresence>

            {/* nav buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 1}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              {step < 8 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_2px_rgba(59,130,246,0.45)] transition hover:brightness-110 active:scale-[0.98]"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_2px_rgba(59,130,246,0.45)] transition hover:brightness-110 active:scale-[0.98]"
                >
                  Submit Business Profile <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* sidebar */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className={`${cardBase} p-6`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                  <Network className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <div className="text-[11px] text-slate-500">Guiding your setup</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-400">Profile completion</span>
                  <span className="font-semibold text-blue-300">{meta.progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                    animate={{ width: `${meta.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-400/15 bg-blue-500/[0.07] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                  Suggestion
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{meta.hint}</p>
              </div>

              <div className="mt-5 space-y-2.5">
                {STEPS.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 text-[12px]">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px]
                                            ${s.id < step ? 'bg-blue-500/20 text-blue-300' : s.id === step ? 'bg-gradient-to-br from-blue-500 to-blue-400 text-white' : 'bg-white/5 text-slate-600'}`}
                    >
                      {s.id < step ? <Check className="h-3 w-3" strokeWidth={3} /> : s.id}
                    </div>
                    <span
                      className={
                        s.id === step
                          ? 'text-slate-200'
                          : s.id < step
                            ? 'text-slate-400'
                            : 'text-slate-600'
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================ STEP CONTENT ============================ */
interface Contact {
  name: string;
  phone: string;
  email: string;
  zalo: string;
  jobTitle: string;
  role: string;
}

interface FormState {
  businessName: string;
  taxId: string;
  legalType: string;
  stage: string;
  year: string;
  industry1: string;
  industry2: string;
  country: string;
  province: string;
  city: string;
  areas: string[];
  description: string;
  offers: Item[];
  needs: Item[];
  contacts: Contact[];
}

interface StepHeaderProps {
  title: string;
  desc: string;
  action?: React.ReactNode;
}
function StepHeader({ title, desc, action }: StepHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{desc}</p>
      </div>
      {action}
    </div>
  );
}

interface StepContentProps {
  step: number;
  form: FormState;
  set: (patch: Partial<FormState>) => void;
  toggleArea: (a: string) => void;
  charCount: number;
  charOk: boolean;
  emptyItem: () => Item;
  emptyContact: () => Contact;
  onEdit: (step: number) => void;
}
function StepContent({
  step,
  form,
  set,
  toggleArea,
  charCount,
  charOk,
  emptyItem,
  emptyContact,
  onEdit,
}: StepContentProps) {
  const addBtn = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-[13px] font-semibold text-blue-300 transition hover:bg-blue-500/20"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );

  if (step === 1)
    return (
      <>
        <StepHeader title="Business Information" desc="Tell us about your company." />
        <div className="grid grid-cols-2 gap-5">
          <Field label="Business Name">
            <TextInput
              value={form.businessName}
              onChange={(e) => set({ businessName: e.target.value })}
              placeholder="Acme Robotics Inc."
            />
          </Field>
          <Field label="Tax ID" hint="Format: XXXX-XXX-XXX">
            <TextInput
              value={form.taxId}
              onChange={(e) => set({ taxId: e.target.value })}
              placeholder="0312-456-789"
            />
          </Field>
          <Field label="Legal Type">
            <SelectField
              value={form.legalType}
              onChange={(v) => set({ legalType: v })}
              options={LEGAL_TYPES}
            />
          </Field>
          <Field label="Business Stage">
            <SelectField value={form.stage} onChange={(v) => set({ stage: v })} options={STAGES} />
          </Field>
          <Field label="Year Established">
            <TextInput
              type="number"
              value={form.year}
              onChange={(e) => set({ year: e.target.value })}
              placeholder="2018"
            />
          </Field>
        </div>
      </>
    );

  if (step === 2)
    return (
      <>
        <StepHeader
          title="Industry"
          desc="Choose the industries that best describe your business."
        />
        <div className="grid grid-cols-1 gap-5">
          <Field label="Industry Level 1">
            <SelectField
              searchable
              value={form.industry1}
              onChange={(v) => set({ industry1: v })}
              options={INDUSTRY_L1}
              placeholder="Search industries..."
            />
          </Field>
          <Field label="Industry Level 2">
            <SelectField
              searchable
              value={form.industry2}
              onChange={(v) => set({ industry2: v })}
              options={INDUSTRY_L2}
              placeholder="Search sub-industries..."
            />
          </Field>
        </div>
      </>
    );

  if (step === 3)
    return (
      <>
        <StepHeader title="Business Location" desc="Tell us where your business operates." />
        <div className="grid grid-cols-2 gap-5">
          <Field label="Province">
            <SelectField
              searchable
              value={form.province}
              onChange={(v) => set({ province: v })}
              options={PROVINCES}
            />
          </Field>
          <Field label="Country">
            <SelectField
              searchable
              value={form.country}
              onChange={(v) => set({ country: v })}
              options={COUNTRIES}
            />
          </Field>
          <Field label="City">
            <SelectField
              searchable
              value={form.city}
              onChange={(v) => set({ city: v })}
              options={CITIES}
            />
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Operating Area">
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => {
                const on = form.areas.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleArea(a)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition
                                        ${on ? 'border-blue-400/40 bg-gradient-to-r from-blue-500/30 to-blue-400/30 text-blue-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/5'}`}
                  >
                    {a}
                    {on && <X className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </>
    );

  if (step === 4)
    return (
      <>
        <StepHeader title="Describe your company" desc="Help partners understand your business." />
        <Field label="Company Description">
          <TextArea
            rows={8}
            value={form.description}
            onChange={(e) => set({ description: e.target.value.slice(0, 500) })}
            placeholder="Describe your company, products, services and strengths..."
          />
        </Field>
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="text-slate-500">Recommended 300–500 characters</span>
          <span className={charOk ? 'font-semibold text-blue-300' : 'text-slate-400'}>
            {charCount} / 500
          </span>
        </div>
      </>
    );

  if (step === 5)
    return (
      <>
        <StepHeader
          title="What can your business offer?"
          desc="List products or services your business provides."
          action={addBtn('Add Offer', () => set({ offers: [...form.offers, emptyItem()] }))}
        />
        <div className="space-y-4">
          {form.offers.map((it, i) => (
            <ItemCard
              key={i}
              index={i}
              item={it}
              kind="Offer"
              onChange={(v) => set({ offers: form.offers.map((x, j) => (j === i ? v : x)) })}
              onRemove={() => set({ offers: form.offers.filter((_, j) => j !== i) })}
            />
          ))}
          {form.offers.length === 0 && (
            <EmptyState label="No offers yet. Add your first product or service." />
          )}
        </div>
      </>
    );

  if (step === 6)
    return (
      <>
        <StepHeader
          title="What are you looking for?"
          desc="Tell us what your business needs."
          action={addBtn('Add Need', () => set({ needs: [...form.needs, emptyItem()] }))}
        />
        <div className="space-y-4">
          {form.needs.map((it, i) => (
            <ItemCard
              key={i}
              index={i}
              item={it}
              kind="Need"
              onChange={(v) => set({ needs: form.needs.map((x, j) => (j === i ? v : x)) })}
              onRemove={() => set({ needs: form.needs.filter((_, j) => j !== i) })}
            />
          ))}
          {form.needs.length === 0 && (
            <EmptyState label="No needs yet. Add what your business is looking for." />
          )}
        </div>
      </>
    );

  if (step === 7)
    return (
      <>
        <StepHeader
          title="Primary Contact"
          desc="Add the people representing your business."
          action={addBtn('Add Contact', () =>
            set({ contacts: [...form.contacts, emptyContact()] }),
          )}
        />
        <div className="space-y-4">
          {form.contacts.map((c, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${i === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}
                >
                  {i === 0 ? 'Primary Contact' : `Contact ${i + 1}`}
                </span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => set({ contacts: form.contacts.filter((_, j) => j !== i) })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    ['Full Name', 'name', 'Mara Lindqvist'],
                    ['Phone', 'phone', '+1 (512) 555-0142'],
                    ['Business Email', 'email', 'mara@acmerobotics.com'],
                    ['Zalo ID', 'zalo', '@mara.linko'],
                    ['Job Title', 'jobTitle', 'Head of Partnerships'],
                  ] as [string, keyof Contact, string][]
                ).map(([lbl, key, ph]) => (
                  <Field key={key} label={lbl}>
                    <TextInput
                      value={c[key]}
                      onChange={(e) =>
                        set({
                          contacts: form.contacts.map((x, j) =>
                            j === i ? { ...x, [key]: e.target.value } : x,
                          ),
                        })
                      }
                      placeholder={ph}
                    />
                  </Field>
                ))}
                <Field label="Role">
                  <SelectField
                    value={c.role}
                    onChange={(v) =>
                      set({
                        contacts: form.contacts.map((x, j) => (j === i ? { ...x, role: v } : x)),
                      })
                    }
                    options={ROLES}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </>
    );

  /* step 8 review */
  const sections = [
    {
      title: 'Business',
      edit: 1,
      rows: [
        ['Name', form.businessName || '—'],
        ['Tax ID', form.taxId || '—'],
        ['Legal Type', form.legalType || '—'],
        ['Stage', form.stage || '—'],
        ['Year', form.year || '—'],
      ],
    },
    {
      title: 'Industry',
      edit: 2,
      rows: [
        ['Level 1', form.industry1 || '—'],
        ['Level 2', form.industry2 || '—'],
      ],
    },
    {
      title: 'Location',
      edit: 3,
      rows: [
        ['Country', form.country || '—'],
        ['Province', form.province || '—'],
        ['City', form.city || '—'],
        ['Operating Area', form.areas.join(', ') || '—'],
      ],
    },
    { title: 'Description', edit: 4, rows: [['Summary', form.description || '—']] },
    {
      title: 'Offers',
      edit: 5,
      rows: form.offers.map((o, i) => [`Offer ${i + 1}`, o.title || '—']),
    },
    { title: 'Needs', edit: 6, rows: form.needs.map((o, i) => [`Need ${i + 1}`, o.title || '—']) },
    {
      title: 'Contacts',
      edit: 7,
      rows: form.contacts.map((c, i) => [`Contact ${i + 1}`, c.name || '—']),
    },
  ];
  return (
    <>
      <StepHeader
        title="Review Your Business Profile"
        desc="Please review all information before submitting."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">{s.title}</h3>
              <button
                type="button"
                onClick={() => onEdit(s.edit)}
                className="flex items-center gap-1 text-[12px] font-medium text-blue-300 hover:text-blue-200"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
            <dl className="space-y-1.5">
              {s.rows.map(([k, v], i) => (
                <div key={i} className="flex gap-3 text-[13px]">
                  <dt className="w-28 shrink-0 text-slate-500">{k}</dt>
                  <dd className="flex-1 truncate text-slate-300">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}
