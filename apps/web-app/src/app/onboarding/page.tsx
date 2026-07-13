import { prisma } from "@/lib/prisma"
import { OnboardingForm } from "./onboarding-form"

export const metadata = {
  title: "Thiết lập Hồ sơ Doanh nghiệp | Linko",
  description: "Bắt đầu hành trình kết nối đối tác thông minh cùng AI của Linko",
}

export default async function OnboardingPage() {
  const industries = await prisma.industry.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-slate-900 via-slate-950 to-indigo-950 text-slate-100 overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[32rem] h-[32rem] bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-xl">
        {/* Brand identity header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 shadow-xl">
            <span className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">L</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Thiết lập hồ sơ doanh nghiệp
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Điền các thông tin cơ bản hoặc chuẩn bị tài liệu giới thiệu để AI của Linko tự động bóc tách thông tin.
          </p>
        </div>

        {/* Form container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <OnboardingForm industries={industries} />
        </div>
      </div>
    </div>
  )
}
