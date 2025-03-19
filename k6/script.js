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

const BASE_URL = 'http://localhost:3005/graphql';

const QUERIES = {
    totalValueStaked: `
        query {
            totalValueStakedUSD
        }
    `,
};

export default function () {
    const headers = {
        'Content-Type': 'application/json',
    };

    // Test total value staked endpoint
    const totalValueStakedResponse = http.post(BASE_URL, JSON.stringify({
        query: QUERIES.totalValueStaked
    }), { 
        headers,
        timeout: '30s', // Reduced timeout
        tags: { name: 'TotalValueStaked' }
    });

    const checks = {
        'status is 200': {
            type: 'status',
            check: (r) => r.status === 200
        },
        'no GraphQL errors': {
            type: 'data',
            check: (r) => !JSON.parse(r.body).errors
        },
        'has totalValueStakedUSD': {
            type: 'data',
            check: (r) => JSON.parse(r.body).data.totalValueStakedUSD !== null
        },
        'is valid number': {
            type: 'data',
            check: (r) => !isNaN(JSON.parse(r.body).data.totalValueStakedUSD)
        }
    };

    Object.entries(checks).forEach(([name, { type, check }]) => {
        const success = check(totalValueStakedResponse);
        check(totalValueStakedResponse, {
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