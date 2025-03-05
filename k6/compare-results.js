const fs = require('fs');

function readResults(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
        http_req_duration: {
            avg: data.metrics.http_req_duration.values.avg,
            p95: data.metrics.http_req_duration.values['p(95)'],
        },
        http_reqs: data.metrics.http_reqs.values.count,
        http_req_failed: data.metrics.http_req_failed.values.rate,
        checks_passed: data.metrics.checks.values.passes,
        checks_failed: data.metrics.checks.values.fails,
    };
}

function calculateDiff(base, head) {
    return {
        http_req_duration: {
            avg: ((head.http_req_duration.avg - base.http_req_duration.avg) / base.http_req_duration.avg * 100).toFixed(2),
            p95: ((head.http_req_duration.p95 - base.http_req_duration.p95) / base.http_req_duration.p95 * 100).toFixed(2),
        },
        http_reqs: ((head.http_reqs - base.http_reqs) / base.http_reqs * 100).toFixed(2),
        http_req_failed: (head.http_req_failed - base.http_req_failed).toFixed(4),
        checks_passed: ((head.checks_passed - base.checks_passed) / base.checks_passed * 100).toFixed(2),
        checks_failed: head.checks_failed - base.checks_failed,
    };
}

function generateReport(baseSha, baseResults, headSha, headResults, diff) {
    return `# k6 load testing comparison

## Base Branch (${baseSha})
- Average Response Time: ${baseResults.http_req_duration.avg.toFixed(2)}ms
- P95 Response Time: ${baseResults.http_req_duration.p95.toFixed(2)}ms
- Total Requests: ${baseResults.http_reqs}
- Failed Requests Rate: ${(baseResults.http_req_failed * 100).toFixed(2)}%
- Checks Passed: ${baseResults.checks_passed}
- Checks Failed: ${baseResults.checks_failed}

## Head Branch (${headSha})
- Average Response Time: ${headResults.http_req_duration.avg.toFixed(2)}ms
- P95 Response Time: ${headResults.http_req_duration.p95.toFixed(2)}ms
- Total Requests: ${headResults.http_reqs}
- Failed Requests Rate: ${(headResults.http_req_failed * 100).toFixed(2)}%
- Checks Passed: ${headResults.checks_passed}
- Checks Failed: ${headResults.checks_failed}

## Changes
- Average Response Time: ${diff.http_req_duration.avg}% ${diff.http_req_duration.avg > 0 ? '⚠️' : '✅'}
- P95 Response Time: ${diff.http_req_duration.p95}% ${diff.http_req_duration.p95 > 0 ? '⚠️' : '✅'}
- Total Requests: ${diff.http_reqs}% ${diff.http_reqs < 0 ? '⚠️' : '✅'}
- Failed Requests Rate Change: ${diff.http_req_failed}% ${diff.http_req_failed > 0 ? '⚠️' : '✅'}
- Checks Passed: ${diff.checks_passed}% ${diff.checks_passed < 0 ? '⚠️' : '✅'}
- Checks Failed Change: ${diff.checks_failed} ${diff.checks_failed > 0 ? '⚠️' : '✅'}

${
    diff.http_req_duration.avg > 10 || 
    diff.http_req_duration.p95 > 10 || 
    diff.http_reqs < -10 || 
    diff.http_req_failed > 0.01 || 
    diff.checks_passed < -5 || 
    diff.checks_failed > 0
        ? '⚠️ **Performance regression detected!** Please review the changes.'
        : '✅ **No significant performance regression detected.**'
}`;
}

// Main execution
const [baseSha, baseFile, headSha, headFile, outputFile] = process.argv.slice(2);

const baseResults = readResults(baseFile);
const headResults = readResults(headFile);
const diff = calculateDiff(baseResults, headResults);

const report = generateReport(baseSha, baseResults, headSha, headResults, diff);
fs.writeFileSync(outputFile, report); 