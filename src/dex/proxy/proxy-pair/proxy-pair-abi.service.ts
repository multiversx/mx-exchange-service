import { Injectable } from '@nestjs/common';
import { ProxyProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { getContract } from '../utils';

@Injectable()
export class AbiProxyPairService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.gateway,
            elrondConfig.proxyTimeout,
        );
    }

    async getWrappedLpTokenID(): Promise<string> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.getWrappedLpTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedLpTokenID = result.firstValue.valueOf().toString();

        return wrappedLpTokenID;
    }

    async getIntermediatedPairsAddress(): Promise<string[]> {
        const contract = await getContract();

        const interaction: Interaction = contract.methods.getIntermediatedPairs(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const pairs = result.values.map(pairAddress => {
            return pairAddress.valueOf().toString();
        });

        return pairs;
    }
}
