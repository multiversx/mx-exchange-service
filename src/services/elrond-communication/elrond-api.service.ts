import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Injectable } from '@nestjs/common';
import { TokenModel } from 'src/dex/models/esdtToken.model';
import { NFTTokenModel } from 'src/dex/models/nftToken.model';

@Injectable()
export class ElrondApiService {
    private apiProvider: ApiProvider;
    constructor() {
        this.apiProvider = new ApiProvider(elrondConfig.elrondApi, 20000);
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
}
