#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const semver = require('semver');

// Current Node.js version
const currentNodeVersion = process.version;
console.log(`🔍 Checking Node.js requirements against current version: ${currentNodeVersion}\n`);

// Function to parse engine requirements
function parseEngineRequirement(engineReq) {
  if (!engineReq) return null;
  // Handle ranges like ">=18.0.0", "^16.10.0 || >=18.0.0", etc.
  return engineReq;
}

// Function to check if current version satisfies requirement
function checkVersionCompatibility(requirement, currentVersion) {
  try {
    return semver.satisfies(currentVersion, requirement);
  } catch (error) {
    return null; // Invalid semver range
  }
}

// Recursively find all package.json files in node_modules
function findPackageJsonFiles(dir, maxDepth = 3, currentDepth = 0) {
  const results = [];
  
  if (currentDepth >= maxDepth) return results;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip .bin and other non-package directories
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        // Check for package.json in this directory
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          results.push(packageJsonPath);
        }
        
        // Recursively search subdirectories (for scoped packages)
        if (item.startsWith('@')) {
          results.push(...findPackageJsonFiles(fullPath, maxDepth, currentDepth + 1));
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return results;
}

// Main analysis
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const packageJsonFiles = findPackageJsonFiles(nodeModulesPath);

const issues = [];
const highRequirements = [];
const incompatible = [];

console.log(`📦 Found ${packageJsonFiles.length} packages to analyze...\n`);

for (const packageJsonPath of packageJsonFiles) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const { name, engines } = packageJson;
    
    if (engines && engines.node) {
      const nodeRequirement = engines.node;
      const isCompatible = checkVersionCompatibility(nodeRequirement, currentNodeVersion);
      
      // Check for high requirements (>=20.18.1 or higher)
      const hasHighRequirement = nodeRequirement.includes('20.18') || 
                                 nodeRequirement.includes('21.') || 
                                 nodeRequirement.includes('22.') ||
                                 nodeRequirement.includes('>=21') ||
                                 nodeRequirement.includes('>=22');
      
      const packageInfo = {
        name,
        requirement: nodeRequirement,
        compatible: isCompatible,
        path: packageJsonPath.replace(process.cwd(), '.')
      };
      
      if (isCompatible === false) {
        incompatible.push(packageInfo);
      } else if (hasHighRequirement) {
        highRequirements.push(packageInfo);
      }
    }
  } catch (error) {
    // Skip invalid package.json files
  }
}

// Report results
console.log('📊 ANALYSIS RESULTS:\n');

if (incompatible.length > 0) {
  console.log('❌ INCOMPATIBLE PACKAGES:');
  incompatible.forEach(pkg => {
    console.log(`   ${pkg.name}: requires ${pkg.requirement}`);
  });
  console.log('');
}

if (highRequirements.length > 0) {
  console.log('⚠️  HIGH NODE.JS REQUIREMENTS (>=20.18.1+):');
  highRequirements.forEach(pkg => {
    console.log(`   ${pkg.name}: requires ${pkg.requirement}`);
  });
  console.log('');
}

// Summary
if (incompatible.length === 0) {
  console.log('✅ All packages are compatible with your current Node.js version!');
} else {
  console.log(`🚨 Found ${incompatible.length} incompatible packages`);
}

if (highRequirements.length > 0) {
  console.log(`📈 Found ${highRequirements.length} packages with Node.js >=20.18.1+ requirements`);
  console.log('   Make sure your EAS build environment uses Node.js 20.18.1 or higher');
}

console.log('\n💡 TIP: Run this script after any major dependency updates to catch Node.js compatibility issues early!');