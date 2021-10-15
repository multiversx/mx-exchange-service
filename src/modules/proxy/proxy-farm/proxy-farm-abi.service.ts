import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../../utils/generate-log-message';

@Injectable()
export class AbiProxyFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getWrappedFarmTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methods.getWrappedFarmTokenId(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const result = interaction.interpretQueryResponse(queryResponse);
            const wrappedFarmTokenID = result.firstValue.valueOf().toString();

            return wrappedFarmTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyFarmService.name,
                this.getWrappedFarmTokenID.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getIntermediatedFarmsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methods.getIntermediatedFarms(
            [],
        );
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );

            const result = interaction.interpretQueryResponse(queryResponse);
            const farms = result.firstValue.valueOf().map(farmAddress => {
                return farmAddress.valueOf().toString();
            });

            return farms;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiProxyFarmService.name,
                this.getIntermediatedFarmsAddress.name,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
