import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from 'src/utils/generate-log-message';
import { SmartContractProfiler } from 'src/helpers/smartcontract.profiler';
import { BytesValue, QueryResponseBundle } from '@elrondnetwork/erdjs/out';

@Injectable()
export class AbiLockedAssetService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getGenericData(
        contract: SmartContractProfiler,
        interaction: Interaction,
    ): Promise<QueryResponseBundle> {
        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            return interaction.interpretQueryResponse(queryResponse);
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiLockedAssetService.name,
                interaction.getEndpoint().name,
                error.message,
            );
            this.logger.error(logMessage);

            throw error;
        }
    }

    async getAssetTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getAssetTokenId([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toString();
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getDefaultUnlockPeriod(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue
            .valueOf()
            .unlock_milestones.map(unlockMilestone => {
                return new UnlockMileStoneModel({
                    epochs: unlockMilestone.unlock_epoch.toNumber(),
                    percent: unlockMilestone.unlock_percent.toNumber(),
                });
            });
    }

    async getInitEpoch(): Promise<number> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getInitEpoch([]);
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getExtendedAttributesActivationNonce(
            [],
        );
        const response = await this.getGenericData(contract, interaction);
        return response.firstValue.valueOf().toNumber();
    }
}
