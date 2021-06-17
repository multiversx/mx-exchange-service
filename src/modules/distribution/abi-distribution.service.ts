import { Injectable } from '@nestjs/common';
import { Address } from '@elrondnetwork/erdjs';
import {
    BytesValue,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiDistributionService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getCommunityDistribution(): Promise<TypedValue[]> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionAmountAndEpoch(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);

        return result.values;
    }

    async getDistributedLockedAssets(userAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.calculateLockedAssets(
            [BytesValue.fromHex(new Address(userAddress).hex())],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);

        return result.firstValue.valueOf().toString();
    }
}
