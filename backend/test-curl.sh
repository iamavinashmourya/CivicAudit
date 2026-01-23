#!/bin/bash

# CivicAudit Backend API Test Script (using curl)
# Make sure backend server is running: npm run dev

BASE_URL="http://localhost:5002"
PHONE_NUMBER="+919876543210"

echo "=========================================="
echo "CivicAudit Backend API Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Send OTP
echo -e "${YELLOW}Step 1: Sending OTP...${NC}"
OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE_NUMBER\"}")

echo "$OTP_RESPONSE" | grep -q "success" && echo -e "${GREEN}✓ OTP sent successfully${NC}" || echo -e "${RED}✗ Failed to send OTP${NC}"
echo "Response: $OTP_RESPONSE"
echo ""
echo -e "${YELLOW}⚠️  Check backend console for OTP code${NC}"
echo ""
read -p "Enter the OTP code: " OTP_CODE

# Step 2: Verify OTP
echo -e "${YELLOW}Step 2: Verifying OTP...${NC}"
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE_NUMBER\", \"otp\": \"$OTP_CODE\"}")

TOKEN=$(echo "$VERIFY_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to verify OTP${NC}"
  echo "Response: $VERIFY_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ OTP verified successfully${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 3: Create Report (requires an image file)
echo -e "${YELLOW}Step 3: Creating Report...${NC}"
echo -e "${YELLOW}Note: This requires a test image file. Create one or skip this step.${NC}"
read -p "Path to test image file (or press Enter to skip): " IMAGE_PATH

if [ -n "$IMAGE_PATH" ] && [ -f "$IMAGE_PATH" ]; then
  CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/reports" \
    -H "Authorization: Bearer $TOKEN" \
    -F "title=Pothole on Main Road" \
    -F "category=Road" \
    -F "lat=22.3072" \
    -F "lng=73.1812" \
    -F "image=@$IMAGE_PATH")
  
  echo "$CREATE_RESPONSE" | grep -q "success" && echo -e "${GREEN}✓ Report created successfully${NC}" || echo -e "${RED}✗ Failed to create report${NC}"
  echo "Response: $CREATE_RESPONSE"
else
  echo -e "${YELLOW}⚠️  Skipping report creation (no image file)${NC}"
fi

echo ""

# Step 4: Get Nearby Reports
echo -e "${YELLOW}Step 4: Getting Nearby Reports...${NC}"
NEARBY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/reports/nearby?lat=22.3072&lng=73.1812" \
  -H "Authorization: Bearer $TOKEN")

echo "$NEARBY_RESPONSE" | grep -q "success" && echo -e "${GREEN}✓ Nearby reports fetched successfully${NC}" || echo -e "${RED}✗ Failed to fetch nearby reports${NC}"
echo "Response: $NEARBY_RESPONSE"
echo ""

echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="
