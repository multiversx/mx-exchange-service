import {
    Injectable,
    NestMiddleware,
} from '@nestjs/common';
import moment from 'moment';
import * as crypto from 'crypto';
import { CacheService } from 'src/services/caching/cache.service';
import { NextFunction } from 'express';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { MetricsCollector } from '../utils/metrics.collector';
import { cacheConfig } from 'src/config';


@Injectable()
export class GuestCachingMiddleware implements NestMiddleware {
    private cacheHitsCounter = {};

    constructor(private cacheService: CacheService) { }

    async use(req: Request, res: any, next: NextFunction) {
        if (req.headers['authorization'] || req.headers['no-cache'] === 'true') {
            // If user is logged in or no-cache header present -> skip cache
            return next();
        }

        const prefix = 'guestCache';
        const dateFormat = 'YYYY-MM-DD_HH:mm';

        const currentMinute = moment().format(dateFormat);
        const previousMinute = moment().subtract(1, 'minute').format(dateFormat);
        const gqlQueryMd5 = crypto.createHash('md5').update(JSON.stringify(req.body)).digest('hex');

        const redisQueryKey = `${prefix}.${gqlQueryMd5}.body`;
        const redisQueryResponse = `${prefix}.${gqlQueryMd5}.response`;
        const batchSize = Number(process.env.GUEST_CACHE_REDIS_BATCH_SIZE) || 3;

        let isFirstEntryForThisKey = false;

        if (!this.cacheHitsCounter[currentMinute]) {
            isFirstEntryForThisKey = true;
            this.cacheHitsCounter[currentMinute] = {};
        }

        const cacheHitsCurrentMinute = this.cacheHitsCounter[currentMinute];

        if (!cacheHitsCurrentMinute[gqlQueryMd5]) {
            cacheHitsCurrentMinute[gqlQueryMd5] = 0;
        }

        if (cacheHitsCurrentMinute[gqlQueryMd5] < batchSize) {
            cacheHitsCurrentMinute[gqlQueryMd5]++;
        } else {
            cacheHitsCurrentMinute[gqlQueryMd5] = 1;
        }

        const redisCounterKey = `${prefix}.${currentMinute}`;
        if (cacheHitsCurrentMinute[gqlQueryMd5] >= batchSize) {
            await this.cacheService.getOrSet(redisQueryKey, () => Promise.resolve(req.body), cacheConfig.default);
            await this.cacheService.zIncrementRemote(redisCounterKey, cacheHitsCurrentMinute[gqlQueryMd5], gqlQueryMd5);

            const operation = req.body['operationName'];
            MetricsCollector.incrementGuestQueries(operation, cacheHitsCurrentMinute[gqlQueryMd5]);
        }

        if (isFirstEntryForThisKey) {
            // If it is first entry for this key, set expire
            await this.cacheService.zIncrementRemote(redisCounterKey, 0, gqlQueryMd5);
            await this.cacheService.setTtlRemote(redisCounterKey, 2 * Constants.oneMinute());
        }

        // If the value for this is already computed
        const cacheResponse: any = await this.cacheService.get(redisQueryResponse);

        res.setHeader('X-Guest-Cache-Hit', !!cacheResponse);

        // Delete data for previous minute
        if (this.cacheHitsCounter[previousMinute]) {
            delete this.cacheHitsCounter[previousMinute];
        }

        if (cacheResponse) {
            MetricsCollector.incrementGuestHits();
            return res.json(cacheResponse);
        } else {
            MetricsCollector.incrementGuestNoCacheHits();
        }

        return next();
    }
}
