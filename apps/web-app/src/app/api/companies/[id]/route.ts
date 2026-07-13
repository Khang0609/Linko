import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { updateCompanySchema } from "@/schemas/company.schema"
import { getCompanyById, updateCompany } from "@/services/profile.service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await getCompanyById(id)
  if (!company) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json(company)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const input = updateCompanySchema.parse(await req.json())
    const company = await updateCompany(id, input)
    return NextResponse.json(company)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "validation", issues: err.flatten() }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
