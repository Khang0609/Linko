import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { prisma } from "@/lib/prisma"
import type { StatDataType } from "@prisma/client"

const verifyBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stat"),
    targetId: z.string(),
    action: z.enum(["verify", "override", "delete"]),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  }),
  z.object({
    type: z.literal("attribute"),
    targetId: z.string(),
    action: z.enum(["verify", "override", "delete"]),
    value: z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
    }).optional(),
  }),
])

interface RouteParams {
  params: Promise<{ id: string }>
}

function getCoercedFields(dataType: StatDataType, raw: any) {
  switch (dataType) {
    case "NUMBER": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.\-]/g, ""))
      return {
        valueNumber: Number.isFinite(n) ? n : null,
        valueText: null,
        valueBool: null,
        valueDate: null,
      }
    }
    case "BOOLEAN": {
      const b = typeof raw === "boolean" ? raw : /^(true|1|có|yes)$/i.test(String(raw))
      return {
        valueNumber: null,
        valueText: null,
        valueBool: b,
        valueDate: null,
      }
    }
    case "DATE": {
      const d = new Date(String(raw))
      return {
        valueNumber: null,
        valueText: null,
        valueBool: null,
        valueDate: isNaN(d.getTime()) ? null : d,
      }
    }
    default: // TEXT
      return {
        valueNumber: null,
        valueText: String(raw),
        valueBool: null,
        valueDate: null,
      }
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id: companyId } = await params
    const body = verifyBodySchema.parse(await req.json())

    if (body.type === "stat") {
      const statVal = await prisma.companyStatValue.findUnique({
        where: { id: body.targetId },
        include: { definition: true },
      })

      if (!statVal || statVal.companyId !== companyId) {
        return NextResponse.json({ error: "stat_not_found" }, { status: 404 })
      }

      if (body.action === "verify") {
        const updated = await prisma.companyStatValue.update({
          where: { id: body.targetId },
          data: { verified: true },
        })
        return NextResponse.json(updated)
      }

      if (body.action === "override") {
        if (body.value === undefined) {
          return NextResponse.json({ error: "value_required_for_override" }, { status: 400 })
        }
        const coerced = getCoercedFields(statVal.definition.dataType, body.value)
        const updated = await prisma.companyStatValue.update({
          where: { id: body.targetId },
          data: {
            ...coerced,
            source: "MANUAL",
            verified: true,
          },
        })
        return NextResponse.json(updated)
      }

      if (body.action === "delete") {
        await prisma.companyStatValue.delete({
          where: { id: body.targetId },
        })
        return NextResponse.json({ success: true })
      }
    }

    if (body.type === "attribute") {
      const attr = await prisma.companyAttribute.findUnique({
        where: { id: body.targetId },
      })

      if (!attr || attr.companyId !== companyId) {
        return NextResponse.json({ error: "attribute_not_found" }, { status: 404 })
      }

      if (body.action === "verify") {
        const updated = await prisma.companyAttribute.update({
          where: { id: body.targetId },
          data: { verified: true },
        })
        return NextResponse.json(updated)
      }

      if (body.action === "override") {
        if (!body.value) {
          return NextResponse.json({ error: "value_required_for_override" }, { status: 400 })
        }
        const updated = await prisma.companyAttribute.update({
          where: { id: body.targetId },
          data: {
            title: body.value.title,
            description: body.value.description,
            source: "MANUAL",
            verified: true,
          },
        })
        return NextResponse.json(updated)
      }

      if (body.action === "delete") {
        await prisma.companyAttribute.delete({
          where: { id: body.targetId },
        })
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: "invalid_type" }, { status: 400 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "validation", issues: err.flatten() }, { status: 400 })
    }
    console.error("Error in verify endpoint:", err)
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}
