#!/bin/bash
echo ""
echo "--------------------------------------------------"
echo "          building iOS and Android app"
echo "--------------------------------------------------"

echo ""
echo "⚠️  REMEMBER: TestFlight will reject builds with the same version number!"
echo ""
read -p "Have you bumped the version number? (y/n): " answer
if [ "$answer" != "y" ]; then
  exit 1
else
  echo ""
  echo "running commands:"
  echo "    shared: npx shadow-cljs compile expo"
  echo "    app:    eas build --platform all --profile production"
  echo ""

  cd vendor/shared
  npx shadow-cljs compile expo
  git add npm-package/dist
  git commit -m "build from cljs prod artifacts"
  git push origin main
  cd ../../

  eas build --platform all --profile production
fi