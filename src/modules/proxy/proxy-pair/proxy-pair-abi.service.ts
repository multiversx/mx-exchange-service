import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../../utils/generate-log-message';

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

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const result = interaction.interpretQueryResponse(queryResponse);
            return result.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyPairService.name,
                this.getWrappedLpTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
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
            return result.firstValue.valueOf().map(pairAddress => {
                return pairAddress.valueOf().toString();
            });
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyPairService.name,
                this.getWrappedLpTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
