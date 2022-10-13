import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { UserEntryModel } from '../models/metabonding.model';
import { MetabondingAbiService } from './metabonding.abi.service';

@Injectable()
export class MetabondingGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: MetabondingAbiService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'metabonding';
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedAssetTokenID'),
            () => this.abiService.getLockedAssetTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(
            lockedAssetTokenID,
        );
    }

    async getTotalLockedAssetSupply(): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedAssetTokenSupply'),
            () => this.abiService.getTotalLockedAssetSupply(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getStakedAmountForUser(userAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey(`${userAddress}.stakedAmount`),
            () => this.abiService.getStakedAmountForUser(userAddress),
            oneMinute(),
        );
    }

    async getUserEntry(userAddress: string): Promise<UserEntryModel> {
        return this.getData(
            this.getCacheKey(`${userAddress}.userEntry`),
            () => this.abiService.getUserEntry(userAddress),
            oneMinute() * 10,
        );
    }
}
