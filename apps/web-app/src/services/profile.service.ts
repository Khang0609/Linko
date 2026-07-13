import { prisma } from "@/lib/prisma"
import { uniqueSlug } from "@/lib/slug"
import type { CreateCompanyInput, UpdateCompanyInput } from "@/schemas/company.schema"

// TODO[auth]: thay bằng session Better Auth khi ráp linko-auth-multitenant
async function getCurrentUser() {
  return prisma.user.upsert({
    where: { email: "dev@linko.local" },
    update: {},
    create: { email: "dev@linko.local", name: "Dev User" },
  })
}

export async function createCompany(input: CreateCompanyInput) {
  const user = await getCurrentUser()
  return prisma.company.create({
    data: {
      name: input.name,
      slug: uniqueSlug(input.name),
      description: input.description || null,
      website: input.website || null,
      foundedYear: input.foundedYear ?? null,
      country: input.country || null,
      city: input.city || null,
      sizeCategory: input.sizeCategory || null,
      industryId: input.industryId || null,
      status: "DRAFT",
      members: { create: { userId: user.id, role: "owner" } },
    },
    include: { industry: true },
  })
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      industry: true,
      attributes: { orderBy: { createdAt: "asc" } },
      sources: { orderBy: { createdAt: "desc" } },
      statValues: {
        include: { definition: true },
        orderBy: { definition: { axis: "asc" } },
      },
    },
  })
}

export async function listCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { industry: true },
  })
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  return prisma.company.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      website: input.website === "" ? null : (input.website || undefined),
      foundedYear: input.foundedYear,
      country: input.country,
      city: input.city,
      sizeCategory: input.sizeCategory,
      industryId: input.industryId,
      status: input.status,
    },
    include: { industry: true },
  })
}
