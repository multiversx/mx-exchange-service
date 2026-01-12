import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { PairsStateService } from './pairs.state.service';
import { TokensStateService } from './tokens.state.service';

@Injectable({ scope: Scope.REQUEST })
export class StateDataLoader {
    constructor(
        protected readonly cacheService: CacheService,
        protected readonly pairState: PairsStateService,
        protected readonly tokenState: TokensStateService,
        protected readonly apiService: MXApiService,
    ) {}

    private readonly pairLoader = new DataLoader<string, PairModel>(
        async (addresses: string[]) => {
            return this.pairState.getPairs(addresses);
        },
    );

    private readonly tokenLoader = new DataLoader<string, EsdtToken>(
        async (tokenIDs: string[]) => {
            return this.tokenState.getTokens(tokenIDs);
        },
    );

    private readonly nftLoader = new DataLoader<string, NftCollection>(
        async (collections: string[]) => {
            return getAllKeys<NftCollection>(
                this.cacheService,
                collections,
                'token.getNftCollectionMetadata',
                this.apiService.getNftCollection.bind(this.apiService),
                CacheTtlInfo.Token,
            );
        },
    );

    async loadToken(tokenID: string): Promise<EsdtToken> {
        return this.tokenLoader.load(tokenID);
    }

    async loadNft(collection: string): Promise<NftCollection> {
        return this.nftLoader.load(collection);
    }

    async loadPair(address: string): Promise<PairModel> {
        return this.pairLoader.load(address);
    }
}
