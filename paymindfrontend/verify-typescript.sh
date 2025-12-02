#!/bin/bash
echo "=== TypeScript Configuration Verification ==="
echo ""
echo "1. Checking TypeScript version:"
npx tsc --version
echo ""
echo "2. Checking React types installation:"
npm list @types/react @types/react-dom 2>/dev/null | grep "@types/react"
echo ""
echo "3. Running TypeScript compiler check:"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
echo ""
echo "4. TypeScript compilation result:"
ERROR_COUNT=$(npx tsc --noEmit --project tsconfig.json 2>&1 | grep -c "error TS" || echo "0")
if [ "$ERROR_COUNT" -eq "0" ]; then
    echo "✅ TypeScript compilation successful (0 errors)"
else
    echo "❌ TypeScript compilation found $ERROR_COUNT errors"
fi
echo ""
echo "=== Verification Complete ==="
