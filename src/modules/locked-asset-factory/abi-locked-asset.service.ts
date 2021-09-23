import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { UnlockMileStoneModel } from './models/locked-asset.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateRunQueryLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class AbiLockedAssetService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getLockedTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );
            const result = interaction.interpretQueryResponse(queryResponse);

            const lockedTokenID = result.firstValue.valueOf().toString();

            return lockedTokenID;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiLockedAssetService.name,
                this.getLockedTokenID.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getDefaultUnlockPeriod(
            [],
        );

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );

            const result = interaction.interpretQueryResponse(queryResponse);

            const unlockMilestones: UnlockMileStoneModel[] = result.firstValue
                .valueOf()
                .map(unlockMilestone => {
                    return new UnlockMileStoneModel({
                        epochs: unlockMilestone.unlock_epoch.toNumber(),
                        percent: unlockMilestone.unlock_percent.toNumber(),
                    });
                });

            return unlockMilestones;
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiLockedAssetService.name,
                this.getDefaultUnlockPeriod.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getInitEpoch(): Promise<number> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getInitEpoch([]);

        try {
            const queryResponse = await contract.runQuery(
                this.elrondProxy.getService(),
                interaction.buildQuery(),
            );

            const result = interaction.interpretQueryResponse(queryResponse);

            const initEpoch = result.firstValue.valueOf();

            return initEpoch.toNumber();
        } catch (error) {
            const logMessage = generateRunQueryLogMessage(
                AbiLockedAssetService.name,
                this.getDefaultUnlockPeriod.name,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
