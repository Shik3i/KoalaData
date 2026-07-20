#!/bin/bash
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Pre-Release Quality Checks ===${NC}"

# 1. TypeScript & Svelte compiler checks
echo -e "\n${BLUE}1. Running compiler diagnostics (svelte-check)...${NC}"
npm run check

# 2. Unit tests
echo -e "\n${BLUE}2. Running unit tests (Vitest)...${NC}"
npm run test:unit -- --run

# 3. E2E Integration tests
echo -e "\n${BLUE}3. Running E2E integration tests (Playwright)...${NC}"
# Playwright will automatically build the project and spin up the webServer on port 4173
npx playwright test

echo -e "\n${GREEN}✓ All checks passed successfully! It is safe to tag and push.${NC}"
