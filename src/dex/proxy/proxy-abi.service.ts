import { Injectable } from '@nestjs/common';
import { ProxyProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { getContract } from './utils';

@Injectable()
export class AbiProxyService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.gateway,
            elrondConfig.proxyTimeout,
        );
    }

    async getDistributedTokenID(): Promise<string> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.getDistributedTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const distributedTokenID = response.firstValue.valueOf().toString();
        return distributedTokenID;
    }

    async getLockedAssetTokenID(): Promise<string> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const lockedAssetTokenID = response.firstValue.valueOf().toString();
        return lockedAssetTokenID;
    }
}
