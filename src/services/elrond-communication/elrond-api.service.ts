import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Injectable } from '@nestjs/common';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import {
    NftCollectionToken,
    NftToken,
} from '../../models/tokens/nftToken.model';

@Injectable()
export class ElrondApiService {
    private apiProvider: ApiProvider;
    constructor() {
        this.apiProvider = new ApiProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    getService(): ApiProvider {
        return this.apiProvider;
    }

    async getNftCollection(tokenID: string): Promise<NftCollectionToken> {
        return this.getService().doGetGeneric(
            `collections/${tokenID}`,
            response => response,
        );
    }

    async getTokensForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<EsdtToken[]> {
        return this.getService().doGetGeneric(
            `accounts/${address}/tokens?from=${from}&size=${size}`,
            response => response,
        );
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<NftToken[]> {
        return this.getService().doGetGeneric(
            `accounts/${address}/nfts?from=${from}&size=${size}`,
            response => response,
        );
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        return await this.getService().doGetGeneric(
            `accounts/${address}/nfts/${nftIdentifier}`,
            response => response,
        );
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        return this.getService().doGetGeneric(
            `network/status/${shardId}`,
            response => response,
        );
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        return this.getService().doGetGeneric(
            `hyperblock/by-nonce/${nonce}`,
            response => response,
        );
    }

    async getTransaction(hash: string, withResults = false): Promise<any> {
        return this.getService().doGetGeneric(
            `transaction/${hash}?withResults=${withResults}`,
            response => response,
        );
    }
}
