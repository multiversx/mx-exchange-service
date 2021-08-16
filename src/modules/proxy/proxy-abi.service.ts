import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';

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
            const assetTokenID = response.firstValue.valueOf().toString();
            return assetTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyService.name,
                this.getAssetTokenID.name,
                error,
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
            const lockedAssetTokenID = response.firstValue.valueOf().toString();
            return lockedAssetTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyService.name,
                this.getLockedAssetTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
