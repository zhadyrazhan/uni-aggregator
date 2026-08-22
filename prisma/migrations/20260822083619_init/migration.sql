-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "foundedYear" INTEGER,
    "tuitionUsd" INTEGER,
    "rankingScore" INTEGER,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AdmissionRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universityId" TEXT NOT NULL,
    "requiredExams" TEXT NOT NULL,
    "minExamScore" TEXT NOT NULL,
    "minGpa" REAL,
    "notes" TEXT,
    CONSTRAINT "AdmissionRequirement_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "summary" TEXT
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolCallId" TEXT,
    "toolCallsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_UniversityMajors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_UniversityMajors_A_fkey" FOREIGN KEY ("A") REFERENCES "Major" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_UniversityMajors_B_fkey" FOREIGN KEY ("B") REFERENCES "University" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "University_country_idx" ON "University"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Major_name_key" ON "Major"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRequirement_universityId_key" ON "AdmissionRequirement"("universityId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "_UniversityMajors_AB_unique" ON "_UniversityMajors"("A", "B");

-- CreateIndex
CREATE INDEX "_UniversityMajors_B_index" ON "_UniversityMajors"("B");
