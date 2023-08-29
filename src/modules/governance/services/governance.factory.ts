import { Injectable } from '@nestjs/common';
import { GovernanceType, governanceType } from '../../../utils/governance';
import { GovernanceEnergyService, GovernanceTokenSnapshotService } from './governance.service';


@Injectable()
export class GovernanceServiceFactory {
    constructor(
        private readonly governanceTokenSnapshot: GovernanceTokenSnapshotService,
        private readonly governanceEnergy: GovernanceEnergyService,
    ) {
    }

    userService(contractAddress: string) {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
            case GovernanceType.OLD_ENERGY:
                return this.governanceEnergy;
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.governanceTokenSnapshot;
        }
    }
}
