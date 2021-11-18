import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class AbiWrapService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getWrappedEgldTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getWrapSmartContract();
        const interaction: Interaction = contract.methods.getWrappedEgldTokenId(
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
                AbiWrapService.name,
                this.getWrappedEgldTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
