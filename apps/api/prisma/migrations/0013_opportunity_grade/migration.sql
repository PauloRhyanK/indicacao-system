-- CreateEnum
CREATE TYPE "OpportunityGrade" AS ENUM ('BAIXO', 'MEDIO', 'ALTO', 'EXTREMO');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "opportunity_grade" "OpportunityGrade";
