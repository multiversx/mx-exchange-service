import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, 'edge.env'), override: true });
