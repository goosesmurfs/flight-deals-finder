-- CreateTable
CREATE TABLE "FlightPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "departureDate" TEXT NOT NULL,
    "returnDate" TEXT,
    "price" INTEGER NOT NULL,
    "deepLink" TEXT,
    "airline" TEXT,
    "stops" INTEGER,
    "departureTime" TEXT,
    "returnTime" TEXT,
    "searchType" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FlightPrice_originCode_destinationCode_departureDate_idx" ON "FlightPrice"("originCode", "destinationCode", "departureDate");

-- CreateIndex
CREATE INDEX "FlightPrice_recordedAt_idx" ON "FlightPrice"("recordedAt");

-- CreateIndex
CREATE INDEX "FlightPrice_price_idx" ON "FlightPrice"("price");
