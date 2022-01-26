import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { AbiLockedAssetService } from './abi-locked-asset.service';

@Injectable()
export class LockedAssetGetterService {
    constructor(
        private readonly abiService: AbiLockedAssetService,
        private readonly cachingService: CachingService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                LockedAssetGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLockedTokenID(): Promise<string> {
        const cacheKey = this.getLockedAssetFactoryCacheKey('lockedTokenID');
        return await this.getData(
            cacheKey,
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.contextGetter.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(
            'defaultUnlockPeriod',
        );
        return await this.getData(
            cacheKey,
            () => this.abiService.getDefaultUnlockPeriod(),
            oneHour(),
        );
    }

    async getInitEpoch(): Promise<number> {
        const cacheKey = this.getLockedAssetFactoryCacheKey('initEpoch');
        return await this.getData(
            cacheKey,
            () => this.abiService.getInitEpoch(),
            oneHour(),
        );
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(
            'extendedAttributesActivationNonce',
        );
        return await this.getData(
            cacheKey,
            () => this.abiService.getExtendedAttributesActivationNonce(),
            oneHour(),
        );
    }

    async getBurnedTokenAmount(tokenID: string): Promise<number> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(
            `${tokenID}.burnedTokenAmount`,
        );
        return await this.getData(
            cacheKey,
            () => this.abiService.getBurnedTokenAmount(tokenID),
            oneMinute(),
        );
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
