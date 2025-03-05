import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
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

    // Make a single query for filtered tokens with empty search string
    const filteredTokensResponse = http.post(BASE_URL, JSON.stringify({
        query: QUERIES.filteredTokens,
        variables: {
            filters: {
                searchToken: "HTM",
                enabledSwaps: false
            },
            pagination: {
                first: 10
            }
        }
    }), { 
        headers,
        timeout: '5m'
    });

    check(filteredTokensResponse, {
        'filteredTokens status is 200': (r) => r.status === 200,
        'filteredTokens has no errors': (r) => !JSON.parse(r.body).errors,
        'filteredTokens has data': (r) => JSON.parse(r.body).data.filteredTokens.edges.length > 0,
    });
} 