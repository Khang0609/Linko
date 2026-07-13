"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type SourceDocument = {
  id: string
  type: "FILE" | "LINK"
  fileUrl: string | null
  linkUrl: string | null
  mimeType: string | null
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED"
  createdAt: Date | string
}

interface SourcesUploaderProps {
  companyId: string
  sources: SourceDocument[]
}

export function SourcesUploader({ companyId, sources }: SourcesUploaderProps) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [link, setLink] = useState("")
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [busy, setBusy] = useState(false)
  const [extractingMap, setExtractingMap] = useState<Record<string, boolean>>({})

  async function uploadFile(file: File) {
    setBusy(true)
    setMsg(null)
    const fd = new FormData()
    fd.append("companyId", companyId)
    fd.append("file", file)

    try {
      const res = await fetch("/api/sources", { method: "POST", body: fd })
      setBusy(false)
      
      if (res.ok) {
        setMsg({ text: `Tải lên thành công: ${file.name}`, type: "success" })
        router.refresh()
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === "file_too_large") {
          setMsg({ text: "Tải file thất bại: File vượt quá giới hạn 10MB.", type: "error" })
        } else if (errData.error === "unsupported_type") {
          setMsg({ text: "Tải file thất bại: Định dạng file không được hỗ trợ.", type: "error" })
        } else {
          setMsg({ text: "Tải file thất bại. Vui lòng thử lại.", type: "error" })
        }
      }
    } catch (err) {
      console.error(err)
      setBusy(false)
      setMsg({ text: "Lỗi kết nối khi tải file.", type: "error" })
    }
  }

  async function submitLink() {
    if (!link) return
    setBusy(true)
    setMsg(null)

    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, linkUrl: link }),
      })
      setBusy(false)

      if (res.ok) {
        setMsg({ text: "Lưu liên kết thành công!", type: "success" })
        setLink("")
        router.refresh()
      } else {
        const errData = await res.json().catch(() => ({}))
        setMsg({ 
          text: errData.error === "validation" ? "Liên kết không đúng định dạng URL hợp lệ." : "Lưu liên kết thất bại.", 
          type: "error" 
        })
      }
    } catch (err) {
      console.error(err)
      setBusy(false)
      setMsg({ text: "Lỗi kết nối khi lưu liên kết.", type: "error" })
    }
  }

  async function triggerExtraction(sourceId: string) {
    setExtractingMap((prev) => ({ ...prev, [sourceId]: true }))
    setMsg(null)

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDocumentId: sourceId }),
      })

      setExtractingMap((prev) => ({ ...prev, [sourceId]: false }))
      
      if (res.ok) {
        setMsg({ text: "Đã trích xuất thành công dữ liệu từ tài liệu!", type: "success" })
        router.refresh()
      } else {
        const errData = await res.json().catch(() => ({}))
        setMsg({ text: `Trích xuất thất bại: ${errData.error || "Lỗi hệ thống"}`, type: "error" })
      }
    } catch (err) {
      console.error(err)
      setExtractingMap((prev) => ({ ...prev, [sourceId]: false }))
      setMsg({ text: "Lỗi kết nối khi chạy tác vụ bóc tách bằng AI.", type: "error" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) uploadFile(f)
        }}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 group cursor-pointer ${
          dragOver
            ? "border-indigo-400 bg-indigo-950/20"
            : "border-slate-800 bg-slate-900/10 hover:border-slate-700 hover:bg-slate-900/20"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f)
          }}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer block space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-350">
              Kéo thả tệp tin giới thiệu doanh nghiệp vào đây
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Hỗ trợ tệp tin PDF, DOCX, PNG, JPG, TXT dung lượng tối đa 10MB
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-indigo-400 bg-indigo-950/20 border border-indigo-900/20 rounded-lg px-3 py-1.5 hover:bg-indigo-950/40 transition-colors">
            Chọn tệp tin từ máy
          </span>
        </label>
      </div>

      {/* OR Separator */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-900"></div>
        <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase tracking-wider">Hoặc</span>
        <div className="flex-grow border-t border-slate-900"></div>
      </div>

      {/* Link Submission */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Dán link website hoặc hồ sơ công ty trực tuyến..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 transition-all duration-200 outline-hidden text-sm"
          />
        </div>
        <button
          onClick={submitLink}
          disabled={busy || !link}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm rounded-xl px-5 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Lưu link
        </button>
      </div>

      {/* Status Notifications & Spinner */}
      {busy && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
          <svg className="animate-spin h-4.5 w-4.5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Đang xử lý tải dữ liệu...</span>
        </div>
      )}

      {msg && (
        <div
          className={`flex items-start gap-2.5 p-3.5 border rounded-xl text-sm animate-fade-in ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {msg.type === "success" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* List of Documents */}
      {sources && sources.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Danh sách tài liệu đã nhận</h3>
          <div className="space-y-2.5">
            {sources.map((src) => {
              const isExtracting = extractingMap[src.id]
              const showExtractButton = src.status === "PENDING" || src.status === "FAILED"

              return (
                <div key={src.id} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    {src.type === "FILE" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-indigo-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-teal-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                    )}
                    <span className="truncate text-slate-300 font-mono text-[11px]" title={src.fileUrl || src.linkUrl || ""}>
                      {src.type === "FILE" 
                        ? (src.fileUrl?.split("/").pop()?.split("-").slice(1).join("-") || "Tài liệu") 
                        : src.linkUrl}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-semibold border ${
                      src.status === "PENDING" ? "bg-slate-800/40 text-slate-400 border-slate-700/30" :
                      src.status === "PROCESSING" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse" :
                      src.status === "DONE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {src.status}
                    </span>

                    {showExtractButton && (
                      <button
                        onClick={() => triggerExtraction(src.id)}
                        disabled={isExtracting || busy}
                        className="bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {isExtracting ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang trích xuất…</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.983m-8.982 3.887H3.75L13.75 3.75h6v6l-10.125 10.125L9 21l.813-5.096Z" />
                            </svg>
                            <span>Bóc tách bằng AI</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
