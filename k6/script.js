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
    },
};

const BASE_URL = 'http://localhost:3005/graphql';

const QUERIES = {
    filteredTokens: `
        query filteredTokens($filters: TokensFilter, $pagination: ConnectionArgs, $sorting: TokenSortingArgs) {
            filteredTokens(filters: $filters, pagination: $pagination, sorting: $sorting) {
                edges {
                    node {
                        identifier
                        name
                        ticker
                        decimals
                        price
                        volumeUSD24h
                        liquidityUSD
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                }
                pageData {
                    count
                    limit
                    offset
                }
            }
        }
    `,
};

export default function () {
    const headers = {
        'Content-Type': 'application/json',
    };

    // Test filtered tokens endpoint with search string
    const filteredTokensResponse = http.post(BASE_URL, JSON.stringify({
        query: QUERIES.filteredTokens,
        variables: {
            filters: {
                searchToken: "",
                enabledSwaps: true
            },
            pagination: {
                first: 10
            }
        }
    }), { 
        headers,
        timeout: '5m',
        tags: { name: 'FilteredTokens' }
    });

    check(filteredTokensResponse, {
        'filteredTokens status is 200': (r) => r.status === 200,
        'filteredTokens has no errors': (r) => !JSON.parse(r.body).errors,
        'filteredTokens has data': (r) => JSON.parse(r.body).data.filteredTokens.edges.length > 0,
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