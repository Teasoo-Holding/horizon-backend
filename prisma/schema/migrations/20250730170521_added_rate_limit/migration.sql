-- CreateTable
CREATE TABLE "rate_limit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);
