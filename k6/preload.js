import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
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

    // Make a single query to get total value staked
    const totalValueStakedResponse = http.post(BASE_URL, JSON.stringify({
        query: QUERIES.totalValueStaked
    }), { 
        headers,
        timeout: '5m'
    });

    check(totalValueStakedResponse, {
        'totalValueStaked status is 200': (r) => r.status === 200,
        'totalValueStaked has no errors': (r) => !JSON.parse(r.body).errors,
        'totalValueStaked has data': (r) => JSON.parse(r.body).data.totalValueStakedUSD !== null,
        'totalValueStaked is a valid number': (r) => !isNaN(JSON.parse(r.body).data.totalValueStakedUSD)
    });
} 