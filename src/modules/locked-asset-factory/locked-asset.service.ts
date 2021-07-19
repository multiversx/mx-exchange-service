import { Inject, Injectable } from '@nestjs/common';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import {
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { cacheConfig, scAddress } from '../../config';
import { ContextService } from '../../services/context/context.service';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { RedisCacheService } from '../../services/redis-cache.service';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LockedAssetService {
    private redisClient: Redis.Redis;
    constructor(
        private readonly abiService: AbiLockedAssetService,
        private readonly redisCacheService: RedisCacheService,
        private context: ContextService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        return new LockedAssetModel({ address: scAddress.lockedAssetAddress });
    }

    async getLockedTokenID(): Promise<string> {
        try {
            const cacheKey = this.getLockedAssetFactoryCacheKey(
                'lockedTokenID',
            );
            const getLockedTokenID = () => this.abiService.getLockedTokenID();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getLockedTokenID,
                cacheConfig.token,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get locked asset tokenID`,
                error,
                {
                    path: 'LockedAssetService.getLockedTokenID',
                },
            );
        }
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        try {
            const cacheKey = this.getLockedAssetFactoryCacheKey(
                'defaultUnlockPeriod',
            );
            const getDefaultUnlockPeriod = () =>
                this.abiService.getDefaultUnlockPeriod();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getDefaultUnlockPeriod,
                cacheConfig.default,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get loked asset default unlock period`,
                error,
                {
                    path: 'LockedAssetService.getDefaultUnlockPeriod',
                },
            );
        }
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
