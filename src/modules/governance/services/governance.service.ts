import { Injectable } from '@nestjs/common';
import { GovernanceContract } from '../models/governance.contract.model';
import { governanceContractsAddresses } from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/contracts.filter.args';

@Injectable()
export class GovernanceService {
    async getGovernanceContracts(filters: GovernanceContractsFiltersArgs): Promise<GovernanceContract[]> {
        const governanceAddresses = governanceContractsAddresses();

        const governance: GovernanceContract[] = [];
        for (const address of governanceAddresses) {
            governance.push(
                new GovernanceContract({
                    address,
                }),
            );
        }

        return governance;
    }
}
