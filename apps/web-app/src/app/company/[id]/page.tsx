import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyById } from "@/services/profile.service"
import { SourcesUploader } from "./sources-uploader"
import type { StatAxis } from "@prisma/client"
import { OnboardingToggle, StatReviewRow, AttributeReviewCard } from "./review-actions"

export const metadata = {
  title: "Thông tin Doanh nghiệp | Linko",
  description: "Chi tiết hồ sơ năng lực và các chỉ số doanh nghiệp trên Linko",
}

const AXIS_LABEL: Record<StatAxis, string> = {
  GENERAL: "Chung", 
  FINANCE: "Tài chính", 
  WORKFORCE: "Nhân sự",
  PRODUCT: "Sản phẩm", 
  OPERATIONS: "Vận hành",
}

const AXIS_ICON: Record<StatAxis, React.ReactNode> = {
  GENERAL: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
    </svg>
  ),
  FINANCE: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 19.5h15M12 6.75v10.5m-3-7.5h6m-6 3h6m-3-6a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
    </svg>
  ),
  WORKFORCE: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  PRODUCT: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  OPERATIONS: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.68-.3-1.43-.49-2.24-.49a8.09 8.09 0 0 0-2.24.3l-.06.02a.75.75 0 0 1-.97-.62V8.65a.75.75 0 0 1 .97-.73l.06.02c.71.21 1.47.3 2.24.3 1.15 0 2.25-.2 3.27-.58l.1-.04a.75.75 0 0 1 .98.7V15a.75.75 0 0 1-.9.74l-.1-.02a11.96 11.96 0 0 0-3.32-.42v.54ZM10.34 15.84c.68-.3 1.43-.49 2.24-.49a8.09 8.09 0 0 1 2.24.3l.06.02a.75.75 0 0 0 .97-.62V8.65a.75.75 0 0 0-.97-.73l-.06.02c-.71.21-1.47.3-2.24.3-1.15 0-2.25-.2-3.27-.58l-.1-.04a.75.75 0 0 0-.98.7V15a.75.75 0 0 0 .9.74l.1-.02a11.96 11.96 0 0 1 3.32-.42v.54Z" />
    </svg>
  ),
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params
  const company = await getCompanyById(id)
  if (!company) notFound()

  // Group stats by axis
  const byAxis = company.statValues.reduce<Record<string, typeof company.statValues>>((acc, v) => {
    const axis = v.definition.axis
    ;(acc[axis] ??= []).push(v)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-1/4 w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <nav className="flex justify-between items-center text-sm text-slate-400">
          <Link href="/onboarding" className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Quay lại Onboarding</span>
          </Link>
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800/80 text-xs font-mono">
            ID: {company.id}
          </div>
        </nav>

        {/* Header Hero Section */}
        <header className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <OnboardingToggle companyId={company.id} status={company.status} />
          </div>

          <div className="max-w-3xl space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-900/30">
                {company.industry?.name ?? "Chưa phân ngành"}
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white pt-1">
                {company.name}
              </h1>
            </div>

            {company.description ? (
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                {company.description}
              </p>
            ) : (
              <p className="text-slate-500 italic text-sm">Chưa có thông tin mô tả giới thiệu doanh nghiệp.</p>
            )}
          </div>

          {/* Quick Specifications Bento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/55">
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/30">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Quốc gia</span>
              <span className="text-sm font-medium text-slate-200 mt-1 block">{company.country ?? "—"}</span>
            </div>
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/30">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Thành phố</span>
              <span className="text-sm font-medium text-slate-200 mt-1 block">{company.city ?? "—"}</span>
            </div>
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/30">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Năm thành lập</span>
              <span className="text-sm font-medium text-slate-200 mt-1 block">{company.foundedYear ?? "—"}</span>
            </div>
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/30">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Quy mô</span>
              <span className="text-sm font-medium text-slate-200 mt-1 block truncate" title={company.sizeCategory ?? ""}>
                {company.sizeCategory ?? "—"}
              </span>
            </div>
          </div>

          {company.website && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
              </svg>
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline font-mono">
                {company.website}
              </a>
            </div>
          )}
        </header>

        {/* Dynamic Layout: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Data Sources (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
                </svg>
                <span>Tài liệu nguồn</span>
              </h2>

              <SourcesUploader companyId={company.id} sources={company.sources} />
            </div>
          </div>

          {/* Right Column: Stats (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.375v-5.25ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-9.75ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <span>Các chỉ số theo trục năng lực</span>
            </h2>

            {Object.keys(byAxis).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(byAxis).map(([axis, values]) => (
                  <section key={axis} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-lg">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60 text-slate-200">
                      <span className="text-indigo-400">{AXIS_ICON[axis as StatAxis] ?? AXIS_ICON.GENERAL}</span>
                      <h3 className="font-bold text-sm uppercase tracking-wider">
                        {AXIS_LABEL[axis as StatAxis] ?? axis}
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {values.map((v) => (
                        <StatReviewRow key={v.id} companyId={company.id} stat={v} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Premium Empty State */
              <div className="bg-slate-900/20 backdrop-blur-md border border-dashed border-slate-800/80 rounded-3xl p-12 text-center relative overflow-hidden flex flex-col items-center shadow-xl">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-200">Chưa có chỉ số nào được trích xuất</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                  Khi bạn tải hồ sơ năng lực (file PDF/Docx/Link) ở vùng kéo thả bên cạnh, AI Analyzer của chúng tôi sẽ tự động bóc tách các chỉ số tài chính, nhân sự và vận hành rồi điền vào đây.
                </p>
                
                {/* Fake visual preview card just to look gorgeous */}
                <div className="mt-8 w-full max-w-md bg-slate-950/60 border border-slate-900 rounded-xl p-4 opacity-40 select-none text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-2">
                    <div className="w-24 h-3.5 bg-slate-800 rounded"></div>
                    <div className="w-12 h-4 bg-slate-800 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-32 h-3 bg-slate-800/80 rounded"></div>
                      <div className="w-16 h-3 bg-slate-800/80 rounded"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-24 h-3 bg-slate-800/80 rounded"></div>
                      <div className="w-20 h-3 bg-slate-800/80 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Attributes Section */}
        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-1/4 w-[25rem] h-[25rem] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.983m-8.982 3.887H3.75L13.75 3.75h6v6l-10.125 10.125L9 21l.813-5.096Z" />
            </svg>
            <span>Đặc điểm & Nhu cầu Doanh nghiệp (Attributes)</span>
          </h2>

          {company.attributes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.attributes.map((attr) => (
                <AttributeReviewCard key={attr.id} companyId={company.id} attribute={attr as any} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-dashed border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Chưa có đặc điểm (Điểm mạnh, Điểm yếu, Nhu cầu, Năng lực) nào được trích xuất hoặc khởi tạo.
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

