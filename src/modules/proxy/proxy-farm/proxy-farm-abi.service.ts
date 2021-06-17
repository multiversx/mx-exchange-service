import { Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiProxyFarmService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getWrappedFarmTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getWrappedFarmTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedFarmTokenID = result.firstValue.valueOf().toString();

        return wrappedFarmTokenID;
    }

    async getIntermediatedFarmsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methods.getIntermediatedFarms(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const farms = result.firstValue.valueOf().map(farmAddress => {
            return farmAddress.valueOf().toString();
        });

        return farms;
    }
}
