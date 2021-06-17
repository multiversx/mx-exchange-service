import { Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiWrapService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getWrappedEgldTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getWrapSmartContract();
        const interaction: Interaction = contract.methods.getWrappedEgldTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedEgldTokenID = result.firstValue.valueOf().toString();

        return wrappedEgldTokenID;
    }
}
