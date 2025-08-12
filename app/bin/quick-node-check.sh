#!/bin/bash

echo "🔍 Quick Node.js compatibility check..."
echo "Current Node.js: $(node --version)"
echo "Required: >=20.18.1"
echo ""

# Check for packages requiring >=20.18.1 or higher
echo "📦 Checking for high Node.js requirements..."
find node_modules -name "package.json" -exec grep -l ">=20\.18\|>=21\|>=22" {} \; 2>/dev/null | head -5 | while read file; do
    package_name=$(grep '"name"' "$file" | cut -d'"' -f4)
    node_req=$(grep -A1 '"engines"' "$file" | grep '"node"' | cut -d'"' -f4)
    echo "   $package_name: requires $node_req"
done

echo ""
echo "✅ If EAS builds fail with Node.js errors, run: yarn check-node-requirements"