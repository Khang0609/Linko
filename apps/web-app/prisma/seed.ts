import { PrismaClient, StatAxis, StatDataType } from "@prisma/client";

const prisma = new PrismaClient();

const STAT_DEFS = [
  {
    key: "annual_revenue",
    label: "Doanh thu năm",
    axis: StatAxis.FINANCE,
    dataType: StatDataType.NUMBER,
    unit: "VND",
    isMatchingFeature: true,
  },
  {
    key: "profit_margin",
    label: "Biên lợi nhuận",
    axis: StatAxis.FINANCE,
    dataType: StatDataType.NUMBER,
    unit: "%",
    isMatchingFeature: true,
  },
  {
    key: "employee_count",
    label: "Số nhân sự",
    axis: StatAxis.WORKFORCE,
    dataType: StatDataType.NUMBER,
    unit: "người",
    isMatchingFeature: true,
  },
  {
    key: "main_products",
    label: "Sản phẩm chính",
    axis: StatAxis.PRODUCT,
    dataType: StatDataType.TEXT,
    isMatchingFeature: true,
  },
  {
    key: "production_capacity",
    label: "Công suất sản xuất",
    axis: StatAxis.OPERATIONS,
    dataType: StatDataType.NUMBER,
    unit: "đơn vị/tháng",
    isMatchingFeature: true,
  },
  {
    key: "certifications",
    label: "Chứng nhận",
    axis: StatAxis.OPERATIONS,
    dataType: StatDataType.TEXT,
    isMatchingFeature: false,
  },
];

const INDUSTRIES = [
  { code: "MANUFACTURING", name: "Sản xuất" },
  { code: "AGRICULTURE", name: "Nông nghiệp" },
  { code: "RETAIL", name: "Bán lẻ" },
  { code: "LOGISTICS", name: "Logistics" },
  { code: "TECH", name: "Công nghệ" },
];

async function main() {
  for (const def of STAT_DEFS) {
    await prisma.statDefinition.upsert({
      where: { key: def.key },
      update: def,
      create: def,
    });
  }
  for (const ind of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { code: ind.code },
      update: ind,
      create: ind,
    });
  }
  console.log(
    `Seeded ${STAT_DEFS.length} stats, ${INDUSTRIES.length} industries`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
