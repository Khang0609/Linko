"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import type { CompanyStatus, DataSource, StatDataType, StatAxis, AttributeType } from "@prisma/client"

// ==========================================
// 1. Onboarding Toggle (DRAFT -> ACTIVE)
// ==========================================
interface OnboardingToggleProps {
  companyId: string
  status: CompanyStatus
}

export function OnboardingToggle({ companyId, status }: OnboardingToggleProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleComplete() {
    if (status !== "DRAFT") return
    setBusy(true)
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        alert("Lỗi khi cập nhật trạng thái hoạt động.")
      }
    } catch (err) {
      console.error(err)
      alert("Lỗi kết nối mạng.")
    } finally {
      setBusy(false)
    }
  }

  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
        <span>Hoạt động (ACTIVE)</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
        DRAFT
      </span>
      <button
        onClick={handleComplete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/15 cursor-pointer disabled:cursor-not-allowed"
      >
        {busy ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Đang kích hoạt...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>Hoàn tất Onboarding</span>
          </>
        )}
      </button>
    </div>
  )
}

// ==========================================
// Helper: Render Confidence Badge
// ==========================================
function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  const percent = Math.round(confidence * 100)
  let colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20"
  if (percent >= 85) {
    colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  } else if (percent >= 50) {
    colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20"
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClass}`} title="Độ tin cậy của AI">
      {percent}%
    </span>
  )
}

// ==========================================
// 2. Stat Review Row (Inline actions)
// ==========================================
interface StatReviewRowProps {
  companyId: string
  stat: {
    id: string
    valueNumber: number | null
    valueText: string | null
    valueBool: boolean | null
    valueDate: Date | string | null
    source: DataSource
    confidence: number | null
    verified: boolean
    definition: {
      id: string
      key: string
      label: string
      dataType: StatDataType
      unit: string | null
    }
  }
}

export function StatReviewRow({ companyId, stat }: StatReviewRowProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [val, setVal] = useState(() => {
    if (stat.valueNumber !== null) return String(stat.valueNumber)
    if (stat.valueBool !== null) return String(stat.valueBool)
    if (stat.valueDate !== null) return String(stat.valueDate).split("T")[0]
    return stat.valueText || ""
  })

  async function handleAction(action: "verify" | "delete" | "override", overrideValue?: any) {
    setBusy(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stat",
          targetId: stat.id,
          action,
          value: overrideValue,
        }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      } else {
        alert("Thực hiện tác vụ thất bại.")
      }
    } catch (err) {
      console.error(err)
      alert("Lỗi kết nối.")
    } finally {
      setBusy(false)
    }
  }

  const displayValue = () => {
    if (stat.valueNumber !== null) return `${stat.valueNumber.toLocaleString()}${stat.definition.unit ? ` ${stat.definition.unit}` : ""}`
    if (stat.valueBool !== null) return stat.valueBool ? "Có / Đúng" : "Không / Sai"
    if (stat.valueDate !== null) return new Date(stat.valueDate).toLocaleDateString("vi-VN")
    return stat.valueText || "—"
  }

  if (editing) {
    return (
      <div className="py-2.5 flex items-center justify-between gap-4 w-full">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400">{stat.definition.label}</span>
          <div className="flex items-center gap-2">
            {stat.definition.dataType === "BOOLEAN" ? (
              <select
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-hidden"
              >
                <option value="true">Có / Đúng (True)</option>
                <option value="false">Không / Sai (False)</option>
              </select>
            ) : (
              <input
                type={stat.definition.dataType === "NUMBER" ? "number" : stat.definition.dataType === "DATE" ? "date" : "text"}
                step="any"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-hidden flex-1"
                placeholder="Nhập giá trị..."
              />
            )}
            {stat.definition.unit && <span className="text-xs text-slate-500">{stat.definition.unit}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-4">
          <button
            onClick={() => handleAction("override", stat.definition.dataType === "NUMBER" ? parseFloat(val) : stat.definition.dataType === "BOOLEAN" ? val === "true" : val)}
            disabled={busy}
            className="p-1.5 bg-indigo-650 hover:bg-indigo-600 rounded-md text-white cursor-pointer disabled:bg-slate-800"
            title="Lưu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-md text-slate-400 cursor-pointer"
            title="Hủy"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group/row flex items-center justify-between py-2.5 border-b border-slate-850/60 last:border-0 hover:bg-slate-900/10 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-400 truncate">{stat.definition.label}</span>
          
          {/* Source & Verified badges */}
          {stat.source === "AI" ? (
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 text-[9px] font-semibold tracking-wider font-mono">AI</span>
              <ConfidenceBadge confidence={stat.confidence} />
              {stat.verified ? (
                <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold">✓ ĐÃ XÁC MINH</span>
              ) : (
                <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold">CHƯA XÁC MINH</span>
              )}
            </div>
          ) : (
            <span className="px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-semibold font-mono">THỦ CÔNG</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs font-semibold text-white bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/40">
          {displayValue()}
        </span>

        {/* Action Controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          {stat.source === "AI" && !stat.verified && (
            <button
              onClick={() => handleAction("verify")}
              disabled={busy}
              className="p-1 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded text-emerald-400 cursor-pointer disabled:opacity-50"
              title="Xác minh chính xác"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="p-1 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 rounded text-indigo-400 cursor-pointer"
            title="Chỉnh sửa / Ghi đè"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 1 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v11.5A2.75 2.75 0 0 0 4.75 20h11.5A2.75 2.75 0 0 0 19 17.25V12a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25V5.75Z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm(`Bạn có chắc chắn muốn xóa/bỏ giá trị chỉ số "${stat.definition.label}"?`)) {
                handleAction("delete")
              }
            }}
            disabled={busy}
            className="p-1 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded text-rose-400 cursor-pointer"
            title="Xóa giá trị"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.006.307l-1.5 2.5a.75.75 0 1 0 1.293.762l1.5-2.5a.75.75 0 0 0-.287-1.07ZM12.42 7.72a.75.75 0 0 0-.287 1.07l1.5 2.5a.75.75 0 1 0 1.293-.762l-1.5-2.5a.75.75 0 0 0-1.006-.308Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. Attribute Review Card (Strength/Weakness/Need)
// ==========================================
interface AttributeReviewCardProps {
  companyId: string
  attribute: {
    id: string
    type: AttributeType
    axis: StatAxis
    title: string
    description: string | null
    source: DataSource
    confidence: number | null
    verified: boolean
  }
}

export function AttributeReviewCard({ companyId, attribute }: AttributeReviewCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(attribute.title)
  const [desc, setDesc] = useState(attribute.description || "")

  async function handleAction(action: "verify" | "delete" | "override", overrideValue?: any) {
    setBusy(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "attribute",
          targetId: attribute.id,
          action,
          value: overrideValue,
        }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      } else {
        alert("Thực hiện tác vụ thất bại.")
      }
    } catch (err) {
      console.error(err)
      alert("Lỗi kết nối.")
    } finally {
      setBusy(false)
    }
  }

  const AXIS_LABEL: Record<string, string> = {
    GENERAL: "Chung",
    FINANCE: "Tài chính",
    WORKFORCE: "Nhân sự",
    PRODUCT: "Sản phẩm",
    OPERATIONS: "Vận hành",
  }

  const borderClass = {
    STRENGTH: "border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-950/5",
    WEAKNESS: "border-rose-500/30 hover:border-rose-500/50 bg-rose-950/5",
    NEED: "border-amber-500/30 hover:border-amber-500/50 bg-amber-950/5",
    CAPABILITY: "border-indigo-500/30 hover:border-indigo-500/50 bg-indigo-950/5",
  }[attribute.type]

  const titleTextClass = {
    STRENGTH: "text-emerald-400",
    WEAKNESS: "text-rose-400",
    NEED: "text-amber-400",
    CAPABILITY: "text-indigo-400",
  }[attribute.type]

  if (editing) {
    return (
      <div className={`border rounded-2xl p-4 space-y-3 bg-slate-900/60 ${borderClass}`}>
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white rounded-lg px-3 py-2 outline-hidden font-semibold"
            placeholder="Tiêu đề thuộc tính..."
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-300 rounded-lg px-3 py-2 outline-hidden h-20 resize-none"
            placeholder="Mô tả chi tiết (không bắt buộc)..."
          />
        </div>
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            className="px-2.5 py-1 text-[10px] bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={() => handleAction("override", { title, description: desc || null })}
            disabled={busy || !title}
            className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group/card border rounded-2xl p-4 space-y-2 transition-all relative overflow-hidden ${borderClass}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className={`text-xs font-bold font-mono tracking-wide ${titleTextClass}`}>{attribute.title}</h4>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-950/40 border border-slate-850 px-1.5 py-0.5 rounded">
              {AXIS_LABEL[attribute.axis] || attribute.axis}
            </span>
            {attribute.source === "AI" ? (
              <>
                <span className="px-1 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 text-[9px] font-semibold font-mono">AI</span>
                <ConfidenceBadge confidence={attribute.confidence} />
                {attribute.verified ? (
                  <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold">✓ ĐÃ XÁC MINH</span>
                ) : (
                  <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold">CHƯA XÁC MINH</span>
                )}
              </>
            ) : (
              <span className="px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-semibold font-mono">THỦ CÔNG</span>
            )}
          </div>
          {attribute.description && (
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{attribute.description}</p>
          )}
        </div>

        {/* Verification Controls */}
        <div className="flex gap-1.5 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {attribute.source === "AI" && !attribute.verified && (
            <button
              onClick={() => handleAction("verify")}
              disabled={busy}
              className="p-1 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded text-emerald-400 cursor-pointer"
              title="Xác minh chính xác"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="p-1 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 rounded text-indigo-400 cursor-pointer"
            title="Chỉnh sửa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 1 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm(`Bạn có chắc chắn muốn xóa bỏ thuộc tính "${attribute.title}"?`)) {
                handleAction("delete")
              }
            }}
            disabled={busy}
            className="p-1 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded text-rose-400 cursor-pointer"
            title="Xóa thuộc tính"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.006.307l-1.5 2.5a.75.75 0 1 0 1.293.762l1.5-2.5a.75.75 0 0 0-.287-1.07ZM12.42 7.72a.75.75 0 0 0-.287 1.07l1.5 2.5a.75.75 0 1 0 1.293-.762l-1.5-2.5a.75.75 0 0 0-1.006-.308Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
