#!/bin/bash
# Clean build artifacts and reinstall dependencies

echo "🧹 Cleaning build cache..."
rm -rf node_modules package-lock.json
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build

echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Clean and rebuild complete!"
echo "Now run: eas build -p android --profile preview"
