import { Injectable } from '@nestjs/common';
import { Address, BytesValue, ProxyProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { getContract } from '../utils';
import { GenericEsdtAmountPair } from 'src/dex/models/proxy.model';

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

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        const contract = await getContract();

        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(userAddress).hex()),
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
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
