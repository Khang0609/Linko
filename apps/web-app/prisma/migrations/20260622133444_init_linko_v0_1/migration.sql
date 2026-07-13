-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StatAxis" AS ENUM ('GENERAL', 'FINANCE', 'WORKFORCE', 'PRODUCT', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "StatDataType" AS ENUM ('NUMBER', 'TEXT', 'BOOLEAN', 'DATE', 'ENUM');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'MATCHING', 'PUBLIC');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'AI', 'FILE', 'LINK', 'API');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('STRENGTH', 'WEAKNESS', 'NEED', 'CAPABILITY');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('FILE', 'LINK');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "EmbeddingKind" AS ENUM ('PROFILE', 'STRENGTH', 'WEAKNESS');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'VIEWED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxId" TEXT,
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "foundedYear" INTEGER,
    "country" TEXT,
    "city" TEXT,
    "sizeCategory" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultVisibility" "Visibility" NOT NULL DEFAULT 'MATCHING',
    "industryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "fileUrl" TEXT,
    "linkUrl" TEXT,
    "mimeType" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-1.5',
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "rawResult" JSONB,
    "confidence" DOUBLE PRECISION,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "axis" "StatAxis" NOT NULL,
    "dataType" "StatDataType" NOT NULL,
    "unit" TEXT,
    "isMatchingFeature" BOOLEAN NOT NULL DEFAULT false,
    "defaultVisibility" "Visibility" NOT NULL DEFAULT 'MATCHING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStatValue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueText" TEXT,
    "valueBool" BOOLEAN,
    "valueDate" TIMESTAMP(3),
    "visibility" "Visibility" NOT NULL DEFAULT 'MATCHING',
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStatValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAttribute" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL,
    "axis" "StatAxis" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmbedding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "EmbeddingKind" NOT NULL DEFAULT 'PROFILE',
    "model" TEXT NOT NULL DEFAULT 'text-embedding-004',
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "sourceCompanyId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rationale" JSONB,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "engineVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxId_key" ON "Company"("taxId");

-- CreateIndex
CREATE INDEX "Company_industryId_idx" ON "Company"("industryId");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_code_key" ON "Industry"("code");

-- CreateIndex
CREATE INDEX "SourceDocument_companyId_idx" ON "SourceDocument"("companyId");

-- CreateIndex
CREATE INDEX "ExtractionJob_sourceDocumentId_idx" ON "ExtractionJob"("sourceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "StatDefinition_key_key" ON "StatDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "StatSnapshot_companyId_periodLabel_key" ON "StatSnapshot"("companyId", "periodLabel");

-- CreateIndex
CREATE INDEX "CompanyStatValue_definitionId_idx" ON "CompanyStatValue"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStatValue_companyId_definitionId_snapshotId_key" ON "CompanyStatValue"("companyId", "definitionId", "snapshotId");

-- CreateIndex
CREATE INDEX "CompanyAttribute_companyId_type_idx" ON "CompanyAttribute"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmbedding_companyId_kind_key" ON "CompanyEmbedding"("companyId", "kind");

-- CreateIndex
CREATE INDEX "MatchResult_sourceCompanyId_score_idx" ON "MatchResult"("sourceCompanyId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_sourceCompanyId_targetCompanyId_key" ON "MatchResult"("sourceCompanyId", "targetCompanyId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Industry" ADD CONSTRAINT "Industry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJob" ADD CONSTRAINT "ExtractionJob_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatSnapshot" ADD CONSTRAINT "StatSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStatValue" ADD CONSTRAINT "CompanyStatValue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStatValue" ADD CONSTRAINT "CompanyStatValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "StatDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStatValue" ADD CONSTRAINT "CompanyStatValue_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "StatSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAttribute" ADD CONSTRAINT "CompanyAttribute_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmbedding" ADD CONSTRAINT "CompanyEmbedding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_sourceCompanyId_fkey" FOREIGN KEY ("sourceCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create HNSW Index for vector search
CREATE INDEX IF NOT EXISTS "CompanyEmbedding_embedding_hnsw_idx" ON "CompanyEmbedding" USING hnsw (embedding vector_cosine_ops);
