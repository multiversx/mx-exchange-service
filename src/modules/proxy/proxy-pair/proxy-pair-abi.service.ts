import { Inject, Injectable } from '@nestjs/common';
import { Address, BytesValue } from '@elrondnetwork/erdjs';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { GenericEsdtAmountPair } from '../models/proxy.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateGetLogMessage } from 'src/utils/generate-log-message';

@Injectable()
export class AbiProxyPairService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

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
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );

            const result = interaction.interpretQueryResponse(queryResponse);
            const pairs = result.firstValue.valueOf().map(pairAddress => {
                return pairAddress.valueOf().toString();
            });
            return pairs;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AbiProxyPairService.name,
                this.getIntermediatedPairsAddress.name,
                '',
                error,
            );
            this.logger.error(logMessage);
        }
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
                amount: temporaryFunds.amount.toFixed(),
            };
        });
    }
}
