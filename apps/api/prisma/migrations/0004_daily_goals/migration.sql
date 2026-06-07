-- CreateTable
CREATE TABLE "meta_daily_defaults" (
    "id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_daily_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_daily_overrides" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2),
    "preset_slug" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_daily_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_daily_defaults_weekday_key" ON "meta_daily_defaults"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "meta_daily_overrides_date_key" ON "meta_daily_overrides"("date");
