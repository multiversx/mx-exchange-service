import { Injectable } from '@nestjs/common';
import { GovernanceType, governanceType } from '../../../utils/governance';
import { GovernanceTokenSnapshotMerkleService } from './governance.token.snapshot.merkle.service';
import { EnergyAbiService } from '../../energy/services/energy.abi.service';

@Injectable()
export class GovernanceQuorumService {
    constructor(
        private readonly merkleService: GovernanceTokenSnapshotMerkleService,
        private readonly energyAbi: EnergyAbiService,
    ) {
    }

    async userQuorum(contractAddress: string, userAddress: string, roothash: string): Promise<string> {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
                return this.energyAbi.energyAmountForUser(userAddress);
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.merkleService.getAddressBalance(roothash, userAddress);
        }
    }
}
