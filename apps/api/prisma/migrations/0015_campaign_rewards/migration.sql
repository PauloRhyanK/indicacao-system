-- CreateEnum
CREATE TYPE "CampaignRewardType" AS ENUM ('RESPONSAVEL', 'CO_VENDEDOR', 'FIRST_CONTACT', 'REFERRAL', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientRewardChoice" AS ENUM ('CASHBACK', 'TRAVEL_VOUCHER');

-- CreateEnum
CREATE TYPE "CampaignRewardStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "campaign_rewards" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "type" "CampaignRewardType" NOT NULL,
    "referral_level" INTEGER NOT NULL DEFAULT 0,
    "recipient_type" "ReferrerType",
    "recipient_id" UUID,
    "recipient_name" TEXT NOT NULL,
    "amount" DECIMAL(15,2),
    "client_choice" "ClientRewardChoice",
    "status" "CampaignRewardStatus" NOT NULL DEFAULT 'PENDING',
    "amount_stale" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "paid_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_rewards_purchase_id_idx" ON "campaign_rewards"("purchase_id");

-- CreateIndex
CREATE INDEX "campaign_rewards_status_idx" ON "campaign_rewards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_rewards_purchase_id_type_referral_level_key" ON "campaign_rewards"("purchase_id", "type", "referral_level");

-- AddForeignKey
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
