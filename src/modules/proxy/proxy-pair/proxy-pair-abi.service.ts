import { Injectable } from '@nestjs/common';
import { Address, BytesValue } from '@elrondnetwork/erdjs';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { GenericEsdtAmountPair } from '../../../models/proxy.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiProxyPairService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getWrappedLpTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getWrappedLpTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);
        const wrappedLpTokenID = result.firstValue.valueOf().toString();

        return wrappedLpTokenID;
    }

    async getIntermediatedPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methods.getIntermediatedPairs(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const result = interaction.interpretQueryResponse(queryResponse);
        const pairs = result.firstValue.valueOf().map(pairAddress => {
            return pairAddress.valueOf().toString();
        });

        return pairs;
    }

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(userAddress).hex()),
        ]);

        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        return result.firstValue.valueOf().map(value => {
            const temporaryFunds = value.valueOf();
            return {
                tokenID: temporaryFunds.token_id.toString(),
                tokenNonce: temporaryFunds.token_nonce.toString(),
                amount: temporaryFunds.amount.toString(),
            };
        });
    }
}
