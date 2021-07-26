import { FactoryModel } from './models/factory.model';
import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { cacheConfig, elrondConfig, scAddress } from '../../config';
import { RedisCacheService } from '../../services/redis-cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { AbiRouterService } from './abi.router.service';
import { PairMetadata } from './models/pair.metadata.model';
import { PairModel } from '../pair/models/pair.model';
import {
    generateComputeLogMessage,
    generateGetLogMessage,
} from '../../utils/generate-log-message';

@Injectable()
export class RouterService {
    private readonly elasticClient: Client;
    private redisClient: Redis.Redis;

    constructor(
        private readonly abiService: AbiRouterService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.elasticClient = new Client({
            node: process.env.ELASTICSEARCH_URL + '/transactions',
        });
        this.redisClient = this.redisCacheService.getClient();
    }

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    async getAllPairsAddress(): Promise<string[]> {
        const cacheKey = this.getRouterCacheKey('pairsAddress');
        try {
            const getPairsAddress = () => this.abiService.getAllPairsAddress();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getPairsAddress,
                cacheConfig.pairsMetadata,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterService.name,
                this.getAllPairsAddress.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const cacheKey = this.getRouterCacheKey('pairsMetadata');
        try {
            const getPairsMetadata = () => this.abiService.getPairsMetadata();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getPairsMetadata,
                cacheConfig.pairsMetadata,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterService.name,
                this.getPairsMetadata.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getAllPairs(offset: number, limit: number): Promise<PairModel[]> {
        const pairsAddress = await this.getAllPairsAddress();
        const pairs = pairsAddress.map(pairAddress => {
            const pair = new PairModel();
            pair.address = pairAddress;
            return pair;
        });

        return pairs.slice(offset, limit);
    }

    async getPairCount(): Promise<number> {
        const cacheKey = this.getRouterCacheKey('pairCount');
        try {
            const getPairCount = () => this.computePairCount();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getPairCount,
                cacheConfig.pairs,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterService.name,
                this.getPairCount.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getTotalTxCount(): Promise<number> {
        const cacheKey = this.getRouterCacheKey('totalTxCount');
        try {
            const getTotalTxCount = () => this.computeTotalTxCount();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getTotalTxCount,
                cacheConfig.txTotalCount,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RouterService.name,
                this.getTotalTxCount.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    private async computePairCount(): Promise<number> {
        const pairs = await this.getAllPairsAddress();
        return pairs.length;
    }

    private async computeTotalTxCount(): Promise<number> {
        let totalTxCount = 0;
        const pairs = await this.getPairsMetadata();

        for (const pair of pairs) {
            const body = {
                size: 0,
                query: {
                    bool: {
                        must: [
                            {
                                match: {
                                    receiver: pair.address,
                                },
                            },
                        ],
                    },
                },
            };

            try {
                const response = await this.elasticClient.search({
                    body,
                });
                totalTxCount += response.body.hits.total.value;
            } catch (error) {
                const logMessage = generateComputeLogMessage(
                    RouterService.name,
                    this.getTotalTxCount.name,
                    'total tx count',
                    error,
                );
                this.logger.error(logMessage);
            }
        }

        return totalTxCount;
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }
}
