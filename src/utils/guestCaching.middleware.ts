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

const cacheHitsCounter = {};

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
        const dateFormat = 'YYYY-MM-DD_HH:mm';

        const currentMinute = moment().format(dateFormat);
        const previousMinute = moment().subtract(1, 'minute').format(dateFormat);
        const gqlQueryMd5 = crypto.createHash('md5').update(JSON.stringify(req.body)).digest('hex');

        const redisQueryKey = `${prefix}.${gqlQueryMd5}.body`;
        const redisQueryResponse = `${prefix}.${gqlQueryMd5}.response`;
        const batchSize = Number(process.env.GUEST_CACHE_REDIS_BATCH_SIZE) || 3;


        let isFirstEntryForThisKey = false;
        // Check if you already have an entry for this minute
        if (!cacheHitsCounter[currentMinute] || !cacheHitsCounter[currentMinute][gqlQueryMd5]) {
            // If not, create the object
            if (!cacheHitsCounter[currentMinute]) cacheHitsCounter[currentMinute] = {};
            if (!cacheHitsCounter[currentMinute][gqlQueryMd5]) cacheHitsCounter[currentMinute][gqlQueryMd5] = 1;
            isFirstEntryForThisKey = true;
        } else {
            // If the entry already exists, increment hits
            if (cacheHitsCounter[currentMinute][gqlQueryMd5] < batchSize)
                cacheHitsCounter[currentMinute][gqlQueryMd5]++;
            else
                cacheHitsCounter[currentMinute][gqlQueryMd5] = 1;
        }

        const redisCounterKey = `${prefix}.${currentMinute}`;
        if (cacheHitsCounter[currentMinute][gqlQueryMd5] >= batchSize) {
            await this.cacheService.getOrSet(redisQueryKey, () => Promise.resolve(req.body));
            await this.cacheService.executeRemoteRaw('zincrby', redisCounterKey, cacheHitsCounter[currentMinute][gqlQueryMd5], gqlQueryMd5);
        }

        if (isFirstEntryForThisKey) {
            // If it is first entry for this key, set expire
            await this.cacheService.executeRemoteRaw('zincrby', redisCounterKey, 0, gqlQueryMd5);
            await this.cacheService.executeRemoteRaw('expire', redisCounterKey, 2 * oneMinute());
        }


        // If the value for this is already computed
        const cacheResponse: any = await this.cacheService.getCache(redisQueryResponse);

        res.setHeader('X-Guest-Cache-Hit', !!cacheResponse);

        // Delete data for previous minute
        if (cacheHitsCounter[previousMinute])
            delete cacheHitsCounter[previousMinute];

        if (cacheResponse) {
            return res.json(cacheResponse);
        } else {
            MetricsCollector.incrementGuestNoCacheHits();
        }

        return next();
    }
}
