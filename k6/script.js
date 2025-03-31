import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const options = {
    scenarios: {
        // Constant load scenario for trading activity
        constant_trading_load: {
            executor: 'constant-vus',
            vus: 45,           // Increased from 30 to 45 concurrent users
            duration: '2m',    // Keep 2 minutes duration
        },
        // Ramping scenario for trading activity scalability
        ramp_trading_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },  // Ramp up to 50 VUs over 30s
                { duration: '1m', target: 50 },   // Stay at 50 VUs for 1m
                { duration: '30s', target: 75 },  // Ramp up to 75 VUs over 30s
                { duration: '1m', target: 75 },   // Stay at 75 VUs for 1m
                { duration: '30s', target: 0 },   // Ramp down to 0
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<1500'],  // Stricter response time thresholds
        http_req_failed: ['rate<0.01'],     // Keep the 1% failure rate
        checks: ['rate>=0.99'],             // Keep 99% check pass rate
        http_reqs: ['rate>150'],            // Increased request rate requirement
    },
    timeout: '10s',
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'count'],
    summaryTimeUnit: 'ms',
};

const BASE_URL = 'http://localhost:3005';
const REQUEST_TIMEOUT = '5s';

// Reuse the pair address across VUs to avoid unnecessary lookups
let CACHED_PAIR_ADDRESS = null;

export function setup() {
    // Get a pair address once during setup
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const GET_PAIRS_QUERY = `
    query {
        pairs {
            address
            firstToken {
                identifier
            }
            secondToken {
                identifier
            }
        }
    }`;

    const pairsResponse = http.post(
        `${BASE_URL}/graphql`,
        JSON.stringify({ query: GET_PAIRS_QUERY }),
        { 
            headers,
            timeout: '30s',  // Longer timeout for setup
            tags: { name: 'Setup_GetPairs' }
        }
    );

    const pairsData = JSON.parse(pairsResponse.body);
    if (pairsData.data?.pairs?.length > 0) {
        CACHED_PAIR_ADDRESS = pairsData.data.pairs[0].address;
        console.log('Using pair address:', CACHED_PAIR_ADDRESS);
        return { pairAddress: CACHED_PAIR_ADDRESS };
    }
    
    throw new Error('Failed to get pair address during setup');
}

export default function (data) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const TRADING_ACTIVITY_QUERY = `
    query {
        tradingActivity(series: "${data.pairAddress}") {
            hash
            timestamp
            action
            inputToken {
                identifier
                name
                decimals
                balance
            }
            outputToken {
                identifier
                name
                decimals
                balance
            }
        }
    }`;

    const tradingActivityResponse = http.post(
        `${BASE_URL}/graphql`,
        JSON.stringify({ query: TRADING_ACTIVITY_QUERY }),
        { 
            headers,
            timeout: REQUEST_TIMEOUT,
            tags: { name: 'TradingActivity' }
        }
    );

    check(tradingActivityResponse, {
        'trading activity status is 200': (r) => r.status === 200,
        'has trading activity data': (r) => {
            const response = JSON.parse(r.body);
            return response.data?.tradingActivity != null;
        },
        'response time is acceptable': (r) => r.timings.duration < 1000,
        'response is valid JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                console.error('Parse error:', e);
                return false;
            }
        }
    });

    // Reduce sleep time to increase request rate
    sleep(Math.random() * 0.5); // Reduced from 1s to 0.5s max sleep
}

export function handleSummary(data) {
    return {
        'summary.json': JSON.stringify(data),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
} 
