import * as dotenv from 'dotenv';

const nodeEnv: string = process.env.NODE_ENV
    ? process.env.NODE_ENV.trim()
    : 'production';

export const envload = () => {
    switch (nodeEnv) {
        case 'test':
            dotenv.config({ path: `.env.example` });
            break;
        default:
            dotenv.config({ path: `.env` });
            break;
    }
};
