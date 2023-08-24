import { Injectable } from '@nestjs/common';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from './governance.abi.service';
import { GovernanceType, governanceType } from '../../../utils/governance';


@Injectable()
export class GovernanceAbiFactory {
    constructor(
        private readonly governanceEnergyAbi: GovernanceEnergyAbiService,
        private readonly governanceTokenSnapshotAbi: GovernanceTokenSnapshotAbiService,
    ) {
    }

    useAbi(contractAddress: string) {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
                return this.governanceEnergyAbi;
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.governanceTokenSnapshotAbi;
        }
    }
}
