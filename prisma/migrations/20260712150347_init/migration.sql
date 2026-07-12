-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('bn', 'en', 'unknown');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('medical', 'fire', 'accident', 'crime', 'flood', 'utility', 'public_service', 'infrastructure', 'other');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'in_review', 'assigned', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'unknown',
    "category" "Category",
    "urgency" "Urgency",
    "summary" TEXT,
    "suggestedAction" TEXT,
    "confidence" DOUBLE PRECISION,
    "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "matchedReportId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'pending',
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_matchedReportId_fkey" FOREIGN KEY ("matchedReportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create HNSW Index for pgvector
CREATE INDEX ON "Report" USING hnsw (embedding vector_cosine_ops);

