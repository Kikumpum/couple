-- CreateTable
CREATE TABLE "DashboardState" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "savingsGoals" JSONB NOT NULL,
    "jajanExpenses" JSONB NOT NULL,
    "periodSettings" JSONB,
    "journalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardState_key_key" ON "DashboardState"("key");
