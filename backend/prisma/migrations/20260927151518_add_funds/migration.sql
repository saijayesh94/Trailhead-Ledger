-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget" DECIMAL(15,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundDeposit" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundExpense" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fundCategoryId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fund_userId_idx" ON "Fund"("userId");

-- CreateIndex
CREATE INDEX "FundCategory_userId_idx" ON "FundCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FundCategory_userId_name_key" ON "FundCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "FundDeposit_fundId_idx" ON "FundDeposit"("fundId");

-- CreateIndex
CREATE INDEX "FundDeposit_userId_idx" ON "FundDeposit"("userId");

-- CreateIndex
CREATE INDEX "FundExpense_fundId_idx" ON "FundExpense"("fundId");

-- CreateIndex
CREATE INDEX "FundExpense_userId_idx" ON "FundExpense"("userId");

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundCategory" ADD CONSTRAINT "FundCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDeposit" ADD CONSTRAINT "FundDeposit_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundDeposit" ADD CONSTRAINT "FundDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundExpense" ADD CONSTRAINT "FundExpense_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundExpense" ADD CONSTRAINT "FundExpense_fundCategoryId_fkey" FOREIGN KEY ("fundCategoryId") REFERENCES "FundCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundExpense" ADD CONSTRAINT "FundExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

