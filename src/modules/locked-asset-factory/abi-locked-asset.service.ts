import { Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { UnlockMileStoneModel } from './models/locked-asset.model';

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
                return new UnlockMileStoneModel({
                    epoch: unlockMilestone.unlock_epoch,
                    percent: unlockMilestone.unlock_percent,
                });
            });

        return unlockMilestones;
    }
}
