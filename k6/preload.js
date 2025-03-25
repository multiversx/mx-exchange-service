import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
};

const BASE_URL = 'http://localhost:3005';
const PAIR_ADDRESS = 'erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2;

export default function () {
    const headers = {
        'Content-Type': 'application/json',
    };

    let lastResponse;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const swapCountResponse = http.get(`${BASE_URL}/pair/${PAIR_ADDRESS}/swapcount`, { 
            headers,
            timeout: '30s'
        });

        lastResponse = swapCountResponse;
        
        const checks = check(swapCountResponse, {
            'status is 200': (r) => r.status === 200,
            'has data': (r) => {
                try {
                    const response = JSON.parse(r.body);
                    return response && typeof response === 'number';
                } catch (e) {
                    console.log(`Failed to parse response: ${r.body}`);
                    return false;
                }
            }
        });

        if (Object.values(checks).every(check => check === true)) {
            console.log('All checks passed on attempt', attempt);
            return;
        }

        if (attempt < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY} seconds... (Attempt ${attempt}/${MAX_RETRIES})`);
            sleep(RETRY_DELAY);
        }
    }

    // If we get here, all retries failed
    console.log('All retries failed. Last response:', lastResponse.body);
} 