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

    async getAcceptedLockedTokensID(): Promise<string[]> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.getAcceptedLockedAssetsTokenIds(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const acceptedLockedTokens = response.values.map(token =>
            token.valueOf().toString(),
        );
        return acceptedLockedTokens;
    }
}
