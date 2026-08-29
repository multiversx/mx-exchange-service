import http from 'k6/http';
import { check, sleep, textSummary } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
    // Much longer duration for preload
    maxDuration: '5m',
    // Add output configuration
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'count'],
    summaryTimeUnit: 'ms',
};

const BASE_URL = 'http://localhost:3005';
const MAX_RETRIES = 5;
const RETRY_DELAY = 10;              // Increased to 10 seconds between retries
const SERVER_CHECK_RETRIES = 12;     // 2 minutes total with 10-second delay
const REQUEST_TIMEOUT = '120s';      // 2 minutes timeout for initial data load

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

function waitForServer() {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const introspectionQuery = JSON.stringify({
        query: `
            query {
                __schema {
                    types {
                        name
                    }
                }
            }
        `
    });

    for (let i = 0; i < SERVER_CHECK_RETRIES; i++) {
        try {
            const response = http.post(
                `${BASE_URL}/graphql`, 
                introspectionQuery, 
                { 
                    headers,
                    timeout: REQUEST_TIMEOUT,
                    tags: { name: 'ServerCheck' }
                }
            );
            
            if (response.status === 200) {
                try {
                    const body = JSON.parse(response.body);
                    if (body.data && body.data.__schema) {
                        console.log('GraphQL server is ready');
                        sleep(5);  // Increased to 5 seconds to ensure server is fully ready
                        return true;
                    }
                } catch (e) {
                    console.log('Invalid response from server:', e.message);
                }
            }
            console.log(`Server not ready, status: ${response.status}, attempt ${i + 1}/${SERVER_CHECK_RETRIES}`);
        } catch (e) {
            console.log(`Server not ready, attempt ${i + 1}/${SERVER_CHECK_RETRIES}:`, e.message);
        }
        sleep(RETRY_DELAY);
    }
    console.log('Server failed to become ready');
    return false;
}

export default function () {
    if (!waitForServer()) {
        console.log('Aborting tests as server is not ready');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    let lastResponse;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Attempting to get pairs (Attempt ${attempt}/${MAX_RETRIES})`);
            const pairsResponse = http.post(
                `${BASE_URL}/graphql`,
                JSON.stringify({ query: GET_PAIRS_QUERY }),
                { 
                    headers,
                    timeout: REQUEST_TIMEOUT,
                    tags: { name: 'GetPairs' }
                }
            );

            console.log(`Pairs Response (Attempt ${attempt}/${MAX_RETRIES}):`, {
                status: pairsResponse.status,
                body: pairsResponse.body?.substring(0, 100) + '...'
            });

            let pairAddress;
            try {
                const pairsData = JSON.parse(pairsResponse.body);
                if (pairsData.data && pairsData.data.pairs && pairsData.data.pairs.length > 0) {
                    pairAddress = pairsData.data.pairs[0].address;
                    console.log('Using pair address:', pairAddress);
                } else {
                    throw new Error('No pairs found in response');
                }
            } catch (e) {
                console.log('Failed to parse pairs response:', e.message);
                if (attempt < MAX_RETRIES) {
                    console.log(`Retrying in ${RETRY_DELAY} seconds... (Attempt ${attempt}/${MAX_RETRIES})`);
                    sleep(RETRY_DELAY);
                    continue;
                }
                throw e;
            }

            sleep(5); // Increased to 5 seconds between requests

            console.log(`Attempting to get trading activity (Attempt ${attempt}/${MAX_RETRIES})`);
            const TRADING_ACTIVITY_QUERY = `
            query {
                tradingActivity(series: "${pairAddress}") {
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

            console.log(`Trading Activity Response (Attempt ${attempt}/${MAX_RETRIES}):`, {
                status: tradingActivityResponse.status,
                body: tradingActivityResponse.body?.substring(0, 100) + '...'
            });

            const tradingActivityChecks = check(tradingActivityResponse, {
                'TradingActivity status is 200': (r) => r.status === 200,
                'TradingActivity has data': (r) => {
                    try {
                        const response = JSON.parse(r.body);
                        console.log('Trading Activity data:', response);
                        return response.data?.tradingActivity != null;
                    } catch (e) {
                        console.log('Failed to parse Trading Activity response:', e.message);
                        return false;
                    }
                }
            });

            if (Object.values(tradingActivityChecks).every(check => check === true)) {
                console.log('All checks passed on attempt', attempt);
                return;
            }

            lastResponse = tradingActivityResponse;

        } catch (e) {
            console.log(`Request failed on attempt ${attempt}:`, e.message);
        }

        if (attempt < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY} seconds... (Attempt ${attempt}/${MAX_RETRIES})`);
            sleep(RETRY_DELAY);
        }
    }

    console.log('All retries failed. Last response:', lastResponse?.body);
}

export function handleSummary(data) {
    return {
        'summary.json': JSON.stringify(data),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
} 