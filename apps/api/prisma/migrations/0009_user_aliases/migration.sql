-- CreateTable
CREATE TABLE "user_aliases" (
    "id" UUID NOT NULL,
    "alias_normalized" TEXT NOT NULL,
    "alias_raw" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_aliases_alias_normalized_key" ON "user_aliases"("alias_normalized");

-- CreateIndex
CREATE INDEX "user_aliases_user_id_idx" ON "user_aliases"("user_id");

-- AddForeignKey
ALTER TABLE "user_aliases" ADD CONSTRAINT "user_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
