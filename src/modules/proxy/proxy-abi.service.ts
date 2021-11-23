import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';
import { BytesValue } from '@elrondnetwork/erdjs/out';

@Injectable()
export class AbiProxyService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getAssetTokenId([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyService.name,
                this.getAssetTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLockedAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().toString();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyService.name,
                this.getLockedAssetTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getBurnedTokenAmount(tokenID: string): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getBurnedTokenAmount([
            BytesValue.fromUTF8(tokenID),
        ]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const response = interaction.interpretQueryResponse(queryResponse);
            return response.firstValue.valueOf().toFixed();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyService.name,
                this.getBurnedTokenAmount.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
