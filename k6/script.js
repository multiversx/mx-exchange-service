import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // Ramp up to 20 users
        { duration: '1m', target: 20 },  // Stay at 20 users
        { duration: '30s', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
        'checks{type:status}': ['rate>0.95'],
        'checks{type:data}': ['rate>0.95'],
    },
};

const BASE_URL = 'http://localhost:3005';
const PAIR_ADDRESS = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';

export default function () {
    const headers = {
        'Content-Type': 'application/json',
    };

    // Test swap count endpoint
    const swapCountResponse = http.get(`${BASE_URL}/pair/${PAIR_ADDRESS}/swapcount`, { 
        headers,
        timeout: '30s',
        tags: { name: 'SwapCount' }
    });

    const checks = {
        'status is 200': {
            type: 'status',
            check: (r) => r.status === 200
        },
        'has valid data': {
            type: 'data',
            check: (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return typeof data === 'number';
                } catch (e) {
                    console.error('Failed to parse response:', r.body);
                    return false;
                }
            }
        }
    };

    Object.entries(checks).forEach(([name, { type, check }]) => {
        const success = check(swapCountResponse);
        check(swapCountResponse, {
            [name]: () => success
        }, { type });
        
        if (!success) {
            console.error(`Check failed: ${name}`);
        }
    });

    sleep(1);
}

export function handleSummary(data) {
    const outputDir = './k6/output';
    return {
        [`${outputDir}/summary.json`]: JSON.stringify(data),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
} 