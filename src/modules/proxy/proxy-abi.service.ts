import { Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiProxyService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getAssetTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const assetTokenID = response.firstValue.valueOf().toString();
        return assetTokenID;
    }

    async getLockedAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const lockedAssetTokenID = response.firstValue.valueOf().toString();
        return lockedAssetTokenID;
    }
}
