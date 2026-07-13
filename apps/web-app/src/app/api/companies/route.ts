import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { createCompanySchema } from "@/schemas/company.schema"
import { createCompany, listCompanies } from "@/services/profile.service"

export async function GET() {
  const companies = await listCompanies()
  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const input = createCompanySchema.parse(body)
    const company = await createCompany(input)
    return NextResponse.json(company, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "validation", issues: err.flatten() }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
