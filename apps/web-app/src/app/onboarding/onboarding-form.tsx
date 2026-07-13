"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Industry = { id: string; name: string }

export function OnboardingForm({ industries }: { industries: Industry[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    
    // Prepare the payload based on createCompanySchema
    const payload = {
      name: fd.get("name")?.toString(),
      industryId: fd.get("industryId")?.toString() || undefined,
      description: fd.get("description")?.toString() || undefined,
      website: fd.get("website")?.toString() || undefined,
      foundedYear: fd.get("foundedYear") ? Number(fd.get("foundedYear")) : undefined,
      country: fd.get("country")?.toString() || undefined,
      city: fd.get("city")?.toString() || undefined,
      sizeCategory: fd.get("sizeCategory")?.toString() || undefined,
    }

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === "validation" && errData.issues) {
          const firstError = Object.values(errData.issues.fieldErrors)[0] as string[]
          setError(firstError?.[0] || "Dữ liệu nhập không hợp lệ.")
        } else {
          setError("Tạo hồ sơ thất bại, vui lòng kiểm tra lại thông tin.")
        }
        setLoading(false)
        return
      }

      const company = await res.json()
      router.push(`/company/${company.id}`)
    } catch (err) {
      console.error(err)
      setError("Lỗi kết nối hệ thống. Vui lòng thử lại.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Name Input */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Tên doanh nghiệp <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          type="text"
          placeholder="Công ty Cổ phần Công nghệ Linko"
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden"
        />
      </div>

      {/* Industry Select */}
      <div className="space-y-1.5">
        <label htmlFor="industryId" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Lĩnh vực kinh doanh
        </label>
        <div className="relative">
          <select
            id="industryId"
            name="industryId"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden appearance-none cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-400">— Chọn ngành —</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id} className="bg-slate-900 text-slate-100">
                {i.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Description Textarea */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Mô tả ngắn doanh nghiệp
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Giới thiệu nhanh về thế mạnh, sản phẩm hoặc năng lực cốt lõi của công ty bạn..."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden resize-none"
        />
      </div>

      {/* Advanced Toggle Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors duration-200 focus:outline-hidden"
        >
          <span>{showAdvanced ? "Ẩn bớt thông tin" : "Thêm thông tin chi tiết (không bắt buộc)"}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Advanced Fields Section */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-slate-800/60 animate-slide-down">
          {/* Website & Founded Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="website" className="block text-xs font-semibold text-slate-400">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                placeholder="https://example.com"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="foundedYear" className="block text-xs font-semibold text-slate-400">Năm thành lập</label>
              <input
                id="foundedYear"
                name="foundedYear"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                placeholder="2024"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
              />
            </div>
          </div>

          {/* Location Fields (Country & City) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="city" className="block text-xs font-semibold text-slate-400">Thành phố / Tỉnh</label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="Hồ Chí Minh"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="country" className="block text-xs font-semibold text-slate-400">Quốc gia</label>
              <input
                id="country"
                name="country"
                type="text"
                defaultValue="Việt Nam"
                placeholder="Việt Nam"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
              />
            </div>
          </div>

          {/* Size Category */}
          <div className="space-y-1.5">
            <label htmlFor="sizeCategory" className="block text-xs font-semibold text-slate-400">Quy mô nhân sự</label>
            <input
              id="sizeCategory"
              name="sizeCategory"
              type="text"
              placeholder="Ví dụ: 50-100 nhân viên, Dưới 50 người,..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        disabled={loading}
        className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold rounded-xl px-4 py-3.5 shadow-lg shadow-indigo-600/20 disabled:shadow-none hover:shadow-indigo-600/30 transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Đang tạo hồ sơ…</span>
          </>
        ) : (
          <span>Tạo hồ sơ doanh nghiệp</span>
        )}
      </button>
    </form>
  )
}
