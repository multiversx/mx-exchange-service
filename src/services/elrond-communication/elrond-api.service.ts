import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Injectable } from '@nestjs/common';
import { TokenModel } from '../../models/esdtToken.model';
import { NFTTokenModel } from '../../models/nftToken.model';
import Agent, { HttpsAgent } from 'agentkeepalive';

@Injectable()
export class ElrondApiService {
    private apiProvider: ApiProvider;
    constructor() {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: elrondConfig.keepAliveTimeout,
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.apiProvider = new ApiProvider(elrondConfig.elrondApi, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        });
    }

    getService(): ApiProvider {
        return this.apiProvider;
    }

    async getTokensForUser(address: string): Promise<TokenModel[]> {
        return await this.getService().doGetGeneric(
            `accounts/${address}/tokens`,
            response => response,
        );
    }

    async getNftsForUser(address: string): Promise<NFTTokenModel[]> {
        return await this.getService().doGetGeneric(
            `accounts/${address}/nfts`,
            response => response,
        );
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NFTTokenModel> {
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
