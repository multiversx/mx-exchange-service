import { Injectable } from '@nestjs/common';
import { Address } from '@elrondnetwork/erdjs';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';
import { CommunityDistributionModel } from './models/distribution.model';

@Injectable()
export class AbiDistributionService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getCommunityDistribution(): Promise<CommunityDistributionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.getLastCommunityDistributionAmountAndEpoch(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);

        return new CommunityDistributionModel({
            amount: result.values[0].valueOf(),
            epoch: result.values[1].valueOf(),
        });
    }

    async getDistributedLockedAssets(userAddress: string): Promise<BigNumber> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.calculateLockedAssets(
            [BytesValue.fromHex(new Address(userAddress).hex())],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);

        return result.firstValue.valueOf();
    }
}
