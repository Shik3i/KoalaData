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

# 2. Dependency audit
echo -e "\n${BLUE}2. Running dependency audit (npm audit)...${NC}"
npm audit --audit-level=low

# 3. Unit tests
echo -e "\n${BLUE}3. Running unit tests (Vitest)...${NC}"
npm run test:unit -- --run

# 4. Production build
echo -e "\n${BLUE}4. Building production bundle...${NC}"
npm run build

# 5. E2E Integration tests
echo -e "\n${BLUE}5. Running E2E integration tests (Playwright)...${NC}"
# Playwright spins up the production bundle on port 4173.
npx playwright test

# 6. Docker release image
echo -e "\n${BLUE}6. Building Docker release image...${NC}"
docker build --tag koaladata:pre-release .
docker image inspect koaladata:pre-release >/dev/null

echo -e "\n${GREEN}✓ All checks passed successfully! It is safe to tag and push.${NC}"
