import { Injectable } from '@nestjs/common';
import { ProxyProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { getContract } from '../utils';

@Injectable()
export class AbiProxyFarmService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    async getWrappedFarmTokenID(): Promise<string> {
        const contract = await getContract();
        const interaction: Interaction = contract.methods.getWrappedFarmTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedFarmTokenID = result.firstValue.valueOf().toString();

        return wrappedFarmTokenID;
    }

    async getIntermediatedFarmsAddress(): Promise<string[]> {
        const contract = await getContract();

        const interaction: Interaction = contract.methods.getIntermediatedFarms(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const farms = result.values.map(farmAddress => {
            return farmAddress.valueOf().toString();
        });

        return farms;
    }
}
