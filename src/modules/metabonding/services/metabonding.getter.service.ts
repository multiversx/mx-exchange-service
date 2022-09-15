import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
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
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getData(
            this.getMetabondingCacheKey('lockedAssetTokenID'),
            () => this.abiService.getLockedAssetTokenID(),
            oneHour(),
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
            this.getMetabondingCacheKey('lockedAssetTokenSupply'),
            () => this.abiService.getTotalLockedAssetSupply(),
            oneMinute(),
        );
    }

    async getStakedAmountForUser(userAddress: string): Promise<string> {
        return this.getData(
            this.getMetabondingCacheKey(`${userAddress}.stakedAmount`),
            () => this.abiService.getStakedAmountForUser(userAddress),
            oneMinute(),
        );
    }

    async getUserEntry(userAddress: string): Promise<UserEntryModel> {
        return this.getData(
            this.getMetabondingCacheKey(`${userAddress}.userEntry`),
            () => this.abiService.getUserEntry(userAddress),
            oneMinute() * 10,
        );
    }

    private getMetabondingCacheKey(...args: any) {
        return generateCacheKeyFromParams('metabonding', ...args);
    }
}
