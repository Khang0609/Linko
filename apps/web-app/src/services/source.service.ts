import { prisma } from "@/lib/prisma"

export function createFileSource(p: { companyId: string; objectPath: string; mimeType: string }) {
  return prisma.sourceDocument.create({
    data: {
      companyId: p.companyId,
      type: "FILE",
      fileUrl: p.objectPath,   // lưu objectPath trong bucket
      mimeType: p.mimeType,
      status: "PENDING",
    },
  })
}

export function createLinkSource(p: { companyId: string; linkUrl: string }) {
  return prisma.sourceDocument.create({
    data: {
      companyId: p.companyId,
      type: "LINK",
      linkUrl: p.linkUrl,
      status: "PENDING",
    },
  })
}

export function listSourcesByCompany(companyId: string) {
  return prisma.sourceDocument.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  })
}
