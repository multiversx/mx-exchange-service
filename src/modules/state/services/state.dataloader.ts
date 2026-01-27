import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { FeesCollectorStateService } from './fees.collector.state.service';
import { TokensStateService } from './tokens.state.service';

@Injectable({ scope: Scope.REQUEST })
export class StateDataLoader {
    constructor(
        protected readonly tokenState: TokensStateService,
        protected readonly tokenService: TokenService,
        protected readonly feesCollectorState: FeesCollectorStateService,
    ) {}

    private readonly tokenLoader = new DataLoader<string, EsdtToken>(
        async (tokenIDs: string[]) => {
            return this.tokenState.getTokens(tokenIDs);
        },
    );

    private readonly nftLoader = new DataLoader<string, NftCollection>(
        async (collections: string[]) => {
            return this.tokenService.getAllNftsCollectionMetadata(collections);
        },
    );

    private readonly feesCollectorLoader = new DataLoader<
        string,
        FeesCollectorModel
    >(async (addresses: string[]) => {
        const feescollector = await this.feesCollectorState.getFeesCollector();

        return addresses.map(() => feescollector);
    });

    async loadToken(tokenID: string): Promise<EsdtToken> {
        return this.tokenLoader.load(tokenID);
    }

    async loadNft(collection: string): Promise<NftCollection> {
        return this.nftLoader.load(collection);
    }

    async loadFeesCollector(address: string): Promise<FeesCollectorModel> {
        return this.feesCollectorLoader.load(address);
    }
}
