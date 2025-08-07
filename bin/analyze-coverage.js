#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Analyzes Jest coverage data to identify uncovered code paths
 * Usage: node analyze-coverage.js <component-file-path> [test-file-path]
 */

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node analyze-coverage.js <component-file-path> [test-file-path]');
    console.error('Example: node analyze-coverage.js src/components/Button.tsx src/components/Button.test.tsx');
    process.exit(1);
  }

  const componentFilePath = args[0];
  const testFilePath = args[1] || componentFilePath.replace(/\.(tsx?|jsx?)$/, '.test.$1');
  
  // Read coverage data
  const coverageFile = 'coverage/coverage-final.json';
  if (!fs.existsSync(coverageFile)) {
    console.error('Coverage file not found. Run tests with coverage first:');
    console.error('npm test -- --coverage');
    process.exit(1);
  }

  const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  
  // Find coverage data for the component file
  const absolutePath = path.resolve(componentFilePath);
  const coverage = findCoverageForFile(coverageData, absolutePath, componentFilePath);
  
  if (!coverage) {
    console.error(`No coverage data found for ${componentFilePath}`);
    console.error('Available files:');
    Object.keys(coverageData).forEach(file => {
      console.error(`  - ${file}`);
    });
    process.exit(1);
  }

  // Read the source file
  if (!fs.existsSync(componentFilePath)) {
    console.error(`Source file not found: ${componentFilePath}`);
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(componentFilePath, 'utf8');
  const sourceLines = sourceContent.split('\n');

  console.log(`\nAnalyzing coverage for: ${componentFilePath}`);
  console.log('='.repeat(60));

  // Analyze coverage gaps
  const analysis = analyzeCoverageGaps(coverage);
  
  // Generate coverage gap analysis with source code
  const gapAnalysis = generateCoverageGapAnalysis(analysis, sourceLines);
  
  // Display results
  console.log(gapAnalysis);
}

function findCoverageForFile(coverageData, absolutePath, relativePath) {
  // Try exact match first
  if (coverageData[absolutePath]) {
    return coverageData[absolutePath];
  }
  
  // Try to find by relative path or filename
  for (const [filePath, coverage] of Object.entries(coverageData)) {
    if (filePath.endsWith(relativePath) || 
        filePath.includes(relativePath) ||
        path.basename(filePath) === path.basename(relativePath)) {
      return coverage;
    }
  }
  
  return null;
}

function analyzeCoverageGaps(coverage) {
  const analysis = {
    uncoveredStatements: [],
    uncoveredBranches: [],
    uncoveredFunctions: [],
    coverageStats: {
      statements: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 }
    }
  };

  // Analyze statements
  for (const [stmtId, hitCount] of Object.entries(coverage.s)) {
    const stmtMap = coverage.statementMap[stmtId];
    analysis.coverageStats.statements.total++;
    
    if (hitCount === 0) {
      analysis.uncoveredStatements.push({
        id: stmtId,
        line: stmtMap.start.line,
        column: stmtMap.start.column,
        endLine: stmtMap.end.line,
        endColumn: stmtMap.end.column
      });
    } else {
      analysis.coverageStats.statements.covered++;
    }
  }

  // Analyze branches
  for (const [branchId, branchHits] of Object.entries(coverage.b)) {
    const branchMap = coverage.branchMap[branchId];
    const totalBranches = branchHits.length;
    const coveredBranches = branchHits.filter(hit => hit > 0).length;
    
    analysis.coverageStats.branches.total += totalBranches;
    analysis.coverageStats.branches.covered += coveredBranches;
    
    if (coveredBranches < totalBranches) {
      const uncoveredIndexes = branchHits
        .map((hit, index) => hit === 0 ? index : null)
        .filter(index => index !== null);
      
      analysis.uncoveredBranches.push({
        id: branchId,
        line: branchMap.line,
        type: branchMap.type,
        uncoveredIndexes,
        totalBranches,
        coveredBranches
      });
    }
  }

  // Analyze functions
  for (const [funcId, hitCount] of Object.entries(coverage.f)) {
    const funcMap = coverage.fnMap[funcId];
    analysis.coverageStats.functions.total++;
    
    if (hitCount === 0) {
      analysis.uncoveredFunctions.push({
        id: funcId,
        name: funcMap.name,
        line: funcMap.decl.start.line,
        column: funcMap.decl.start.column
      });
    } else {
      analysis.coverageStats.functions.covered++;
    }
  }

  // Calculate percentages
  const stats = analysis.coverageStats;
  stats.statements.percentage = stats.statements.total > 0 
    ? (stats.statements.covered / stats.statements.total * 100).toFixed(1)
    : 100;
  stats.branches.percentage = stats.branches.total > 0 
    ? (stats.branches.covered / stats.branches.total * 100).toFixed(1) 
    : 100;
  stats.functions.percentage = stats.functions.total > 0 
    ? (stats.functions.covered / stats.functions.total * 100).toFixed(1)
    : 100;

  return analysis;
}

function generateCoverageGapAnalysis(analysis, sourceLines) {
  const { uncoveredStatements, uncoveredBranches, uncoveredFunctions, coverageStats } = analysis;
  
  let output = '\n/*\nCOVERAGE GAP ANALYSIS:\n\n';
  
  // Coverage summary
  output += 'COVERAGE SUMMARY:\n';
  output += `- Statements: ${coverageStats.statements.percentage}% (${coverageStats.statements.covered}/${coverageStats.statements.total})\n`;
  output += `- Branches: ${coverageStats.branches.percentage}% (${coverageStats.branches.covered}/${coverageStats.branches.total})\n`;
  output += `- Functions: ${coverageStats.functions.percentage}% (${coverageStats.functions.covered}/${coverageStats.functions.total})\n\n`;
  
  // Uncovered statements
  if (uncoveredStatements.length > 0) {
    output += 'UNCOVERED STATEMENTS:\n';
    uncoveredStatements.forEach(stmt => {
      const lineRange = stmt.line === stmt.endLine 
        ? `Line ${stmt.line}` 
        : `Lines ${stmt.line}-${stmt.endLine}`;
      output += `${lineRange}: [coverage-statement-${stmt.id}] Statement never executed\n`;
      
      // Add the actual code
      const codeSnippet = extractCodeSnippet(sourceLines, stmt.line, stmt.endLine);
      output += codeSnippet + '\n\n';
    });
    output += '\n';
  }

  // Uncovered branches
  if (uncoveredBranches.length > 0) {
    output += 'UNCOVERED BRANCHES:\n';
    uncoveredBranches.forEach(branch => {
      const branchTypeDesc = getBranchTypeDescription(branch.type);
      const uncoveredDesc = branch.uncoveredIndexes.length === branch.totalBranches 
        ? 'No branches taken'
        : `${branch.uncoveredIndexes.length}/${branch.totalBranches} branches not taken`;
      output += `Line ${branch.line}: [coverage-branch-${branch.id}] ${branchTypeDesc} - ${uncoveredDesc}\n`;
      
      // Add the actual code (show context around the branch)
      const codeSnippet = extractCodeSnippet(sourceLines, Math.max(1, branch.line - 1), Math.min(sourceLines.length, branch.line + 1));
      output += codeSnippet + '\n\n';
    });
    output += '\n';
  }

  // Uncovered functions
  if (uncoveredFunctions.length > 0) {
    output += 'UNCOVERED FUNCTIONS:\n';
    uncoveredFunctions.forEach(func => {
      const funcName = func.name === '(anonymous_*)' || func.name.startsWith('(anonymous_')
        ? 'Anonymous function'
        : `Function "${func.name}"`;
      output += `Line ${func.line}: [coverage-function-${func.id}] ${funcName} never called\n`;
      
      // Add the actual code (show a few lines of the function)
      const codeSnippet = extractCodeSnippet(sourceLines, func.line, Math.min(sourceLines.length, func.line + 3));
      output += codeSnippet + '\n\n';
    });
    output += '\n';
  }

  if (uncoveredStatements.length === 0 && uncoveredBranches.length === 0 && uncoveredFunctions.length === 0) {
    output += 'EXCELLENT! 🎉 All code paths are covered by tests.\n\n';
  }

  output += 'NEXT STEPS:\n';
  output += '1. Review each uncovered item above\n';
  output += '2. Add test cases to exercise uncovered code paths\n';
  output += '3. Consider if uncovered code represents dead code that can be removed\n';
  output += '4. Re-run coverage analysis to verify improvements\n';
  output += '*/\n';

  return output;
}

function getBranchTypeDescription(type) {
  switch (type) {
    case 'if': return 'If statement';
    case 'cond-expr': return 'Ternary operator';
    case 'binary-expr': return 'Logical operator (&&, ||)';
    case 'switch': return 'Switch statement';
    case 'default-arg': return 'Default parameter';
    default: return `${type} branch`;
  }
}

function extractCodeSnippet(sourceLines, startLine, endLine) {
  // Convert to 0-based indexing
  const start = Math.max(0, startLine - 1);
  const end = Math.min(sourceLines.length - 1, endLine - 1);
  
  let snippet = '';
  for (let i = start; i <= end; i++) {
    const line = sourceLines[i];
    // Add indentation to make it clear this is code
    snippet += `  ${line}\n`;
  }
  
  return snippet.trimEnd(); // Remove trailing newline
}

// Handle CLI execution
if (require.main === module) {
  main();
}

module.exports = {
  analyzeCoverageGaps,
  generateCoverageGapAnalysis,
  findCoverageForFile,
  extractCodeSnippet
};