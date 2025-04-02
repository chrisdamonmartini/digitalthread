/**
 * Performance testing script using Lighthouse CI
 * Compares old and new implementations to measure performance improvements
 */

const { exec } = require('child_process');
const fs = require('fs');

// Test both implementations and compare
async function runPerformanceTests() {
  // Run tests on old implementation
  console.log('Testing old implementation...');
  await runLighthouse('./old-implementation-url.json');
  
  // Run tests on new implementation
  console.log('Testing new implementation...');
  await runLighthouse('./new-implementation-url.json');
  
  // Compare results
  compareResults();
}

function runLighthouse(configFile) {
  return new Promise((resolve, reject) => {
    exec(`lighthouse-ci --config=${configFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

function compareResults() {
  // Load results
  const oldResults = JSON.parse(fs.readFileSync('./old-implementation-results.json'));
  const newResults = JSON.parse(fs.readFileSync('./new-implementation-results.json'));
  
  // Compare metrics
  const performanceScore = {
    old: oldResults.categories.performance.score * 100,
    new: newResults.categories.performance.score * 100
  };
  
  const fcp = {
    old: oldResults.audits['first-contentful-paint'].numericValue,
    new: newResults.audits['first-contentful-paint'].numericValue
  };
  
  const lcp = {
    old: oldResults.audits['largest-contentful-paint'].numericValue,
    new: newResults.audits['largest-contentful-paint'].numericValue
  };
  
  const networkRequests = {
    old: oldResults.audits['network-requests'].numericValue,
    new: newResults.audits['network-requests'].numericValue
  };
  
  // Calculate improvements
  const performanceImprovement = (performanceScore.new - performanceScore.old);
  const fcpImprovement = ((fcp.old - fcp.new) / fcp.old) * 100;
  const lcpImprovement = ((lcp.old - lcp.new) / lcp.old) * 100;
  const networkImprovement = ((networkRequests.old - networkRequests.new) / networkRequests.old) * 100;
  
  // Log results
  console.log('\n=== PERFORMANCE COMPARISON ===');
  console.log(`Performance Score: ${performanceImprovement.toFixed(2)}% improvement`);
  console.log(`First Contentful Paint: ${fcpImprovement.toFixed(2)}% faster`);
  console.log(`Largest Contentful Paint: ${lcpImprovement.toFixed(2)}% faster`);
  console.log(`Network Requests: ${networkImprovement.toFixed(2)}% reduction`);
  
  // Determine if passing performance criteria
  const passingCriteria = {
    networkReduction: networkImprovement >= 40,
    renderingSpeed: fcpImprovement >= 30 && lcpImprovement >= 30
  };
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`TC-PERF-01 (Data Transfer): ${passingCriteria.networkReduction ? 'PASS' : 'FAIL'}`);
  console.log(`TC-PERF-02 (Rendering Performance): ${passingCriteria.renderingSpeed ? 'PASS' : 'FAIL'}`);
}

runPerformanceTests().catch(console.error); 