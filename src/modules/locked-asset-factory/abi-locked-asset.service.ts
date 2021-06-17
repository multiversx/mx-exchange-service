import { Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { UnlockMileStoneModel } from '../../models/locked-asset.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class AbiLockedAssetService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getLockedTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getLockedAssetTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const lockedTokenID = result.firstValue.valueOf().toString();

        return lockedTokenID;
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction = contract.methods.getDefaultUnlockPeriod(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const result = interaction.interpretQueryResponse(queryResponse);

        const unlockMilestones: UnlockMileStoneModel[] = result.firstValue
            .valueOf()
            .map(unlockMilestone => {
                return {
                    epoch: unlockMilestone.unlock_epoch,
                    percent: unlockMilestone.unlock_percent,
                };
            });

        return unlockMilestones;
    }
}
