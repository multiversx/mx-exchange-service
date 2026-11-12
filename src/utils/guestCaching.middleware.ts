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
import { ApiConfigService } from 'src/helpers/api.config.service';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { LabelLimiter, operationLabelFromQuery } from './metric.labels';


@Injectable()
export class GuestCachingMiddleware implements NestMiddleware {
    private cacheHitsCounter = {};
    private readonly maxBodySize: number;
    private readonly batchSize: number;
    private readonly operationLabels: LabelLimiter;

    constructor(
        private cacheService: CacheService,
        apiConfig: ApiConfigService,
        private schemaHost: GraphQLSchemaHost,
    ) {
        // Read once, so that invalid limits fail at startup.
        this.maxBodySize = apiConfig.getGuestCacheMaxBodySize();
        this.batchSize = apiConfig.getGuestCacheRedisBatchSize();
        this.operationLabels = new LabelLimiter(
            apiConfig.getMetricsMaxGuestOperationLabels(),
            () => MetricsCollector.incrementLabelOverflow('guest_queries'),
        );
    }

    async use(req: Request, res: any, next: NextFunction) {
        if (req.headers['authorization'] || req.headers['no-cache'] === 'true') {
            // If user is logged in or no-cache header present -> skip cache
            return next();
        }

        // Only small GraphQL requests are worth warming.
        const body = JSON.stringify(req.body ?? {});
        if (
            typeof req.body?.['query'] !== 'string' ||
            Buffer.byteLength(body) > this.maxBodySize
        ) {
            return next();
        }

        const prefix = 'guestCache';
        const dateFormat = 'YYYY-MM-DD_HH:mm';

        const currentMinute = moment().format(dateFormat);
        const previousMinute = moment().subtract(1, 'minute').format(dateFormat);
        const gqlQueryHash = crypto.createHash('sha256').update(body).digest('hex');

        const redisQueryKey = `${prefix}.${gqlQueryHash}.body`;
        const redisQueryResponse = `${prefix}.${gqlQueryHash}.response`;
        const batchSize = this.batchSize;

        let isFirstEntryForThisKey = false;

        if (!this.cacheHitsCounter[currentMinute]) {
            isFirstEntryForThisKey = true;
            this.cacheHitsCounter[currentMinute] = {};
        }

        const cacheHitsCurrentMinute = this.cacheHitsCounter[currentMinute];

        if (!cacheHitsCurrentMinute[gqlQueryHash]) {
            cacheHitsCurrentMinute[gqlQueryHash] = 0;
        }

        if (cacheHitsCurrentMinute[gqlQueryHash] < batchSize) {
            cacheHitsCurrentMinute[gqlQueryHash]++;
        } else {
            cacheHitsCurrentMinute[gqlQueryHash] = 1;
        }

        const redisCounterKey = `${prefix}.${currentMinute}`;
        if (cacheHitsCurrentMinute[gqlQueryHash] >= batchSize) {
            await this.cacheService.getOrSetRemote(redisQueryKey, () => Promise.resolve(req.body), cacheConfig.default);
            await this.cacheService.zIncrementRemote(redisCounterKey, cacheHitsCurrentMinute[gqlQueryHash], gqlQueryHash);

            const [operation] = this.operationLabels.limit([
                operationLabelFromQuery(req.body['query'], req.body['operationName'], this.schemaHost.schema),
            ]);
            MetricsCollector.incrementGuestQueries(operation, cacheHitsCurrentMinute[gqlQueryHash]);
        }

        if (isFirstEntryForThisKey) {
            // If it is first entry for this key, set expire
            await this.cacheService.zIncrementRemote(redisCounterKey, 0, gqlQueryHash);
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
