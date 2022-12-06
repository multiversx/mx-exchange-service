import {
    Injectable,
    NestMiddleware,
} from '@nestjs/common';
import moment from 'moment';
import * as crypto from 'crypto';
import { CachingService } from 'src/services/caching/cache.service';
import { NextFunction } from 'express';
import { oneMinute } from 'src/helpers/helpers';
import { MetricsCollector } from '../utils/metrics.collector';

@Injectable()
export class GuestCachingMiddleware implements NestMiddleware {
    constructor(private cacheService: CachingService) { }

    async use(req: Request, res: any, next: NextFunction) {

        if (req.headers['authorization'] || req.headers['no-cache'] === 'true') {
            // If user is logged in or no-cache header present -> skip cache
            return next();
        }

        MetricsCollector.incrementGuestHits();

        const prefix = 'guestCache';

        const gqlQueryMd5 = crypto.createHash('md5').update(req.body['query']).digest('hex');
        const redisQueryKey = `${prefix}.${gqlQueryMd5}.body`;
        const redisQueryResponse = `${prefix}.${gqlQueryMd5}.response`;

        // If the value for this is already computed
        const cacheResponse: any = await this.cacheService.getCache(redisQueryResponse);

        const currentDate = moment().format('YYYY-MM-DD_HH:mm');
        const redisCounterKey = `${prefix}.${currentDate}`;
        const incrValue = Number(await this.cacheService.executeRemoteRaw('zincrby', redisCounterKey, 1, gqlQueryMd5));

        if (incrValue === 1) {
            await this.cacheService.executeRemoteRaw('expire', redisCounterKey, oneMinute());
        }

        if (cacheResponse) {
            return res.json(cacheResponse);
        } else {
            MetricsCollector.incrementGuestNoCacheHits();
        }

        await this.cacheService.getOrSet(redisQueryKey, () => Promise.resolve(req.body));
        return next();
    }
}
