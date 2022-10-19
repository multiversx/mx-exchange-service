import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { SimpleLockAbiService } from './simple.lock.abi.service';

@Injectable()
export class SimpleLockGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: SimpleLockAbiService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'simpleLock';
    }

    async getLockedTokenID(simpleLockAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(simpleLockAddress, 'lockedTokenID'),
            () => this.abiService.getLockedTokenID(simpleLockAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLpProxyTokenID(simpleLockAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(simpleLockAddress, 'lpProxyTokenID'),
            () => this.abiService.getLpProxyTokenID(simpleLockAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getFarmProxyTokenID(simpleLockAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(simpleLockAddress, 'farmProxyTokenID'),
            () => this.abiService.getFarmProxyTokenID(simpleLockAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLockedToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.getLockedTokenID(simpleLockAddress);
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getLpProxyToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.getLpProxyTokenID(simpleLockAddress);
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getFarmProxyToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.getFarmProxyTokenID(simpleLockAddress);
        return await this.tokenGetter.getNftCollectionMetadata(tokenID);
    }

    async getIntermediatedPairs(simpleLockAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(simpleLockAddress, 'intermediatedPairs'),
            () => this.abiService.getKnownLiquidityPools(simpleLockAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getIntermediatedFarms(simpleLockAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey(simpleLockAddress, 'intermediatedFarms'),
            () => this.abiService.getKnownFarms(simpleLockAddress),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
