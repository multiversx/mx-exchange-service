import { Injectable } from '@nestjs/common';
import { GovernanceEnergyContract, GovernanceType } from '../models/energy.contract.model';
import { governanceContractsAddresses, governanceType } from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/contracts.filter.args';
import { GovernanceAbiService } from './governance.abi.service';
import { GovernanceUnion } from '../models/governance.union';

@Injectable()
export class GovernanceService {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }
    async getGovernanceContracts(filters: GovernanceContractsFiltersArgs): Promise<Array<typeof GovernanceUnion>> {
        const governanceAddresses = governanceContractsAddresses();

        if (filters.contracts) {
            governanceAddresses.filter((address) => !filters.contracts.includes(address));
        }

        const governance: GovernanceEnergyContract[] = [];
        for (const address of governanceAddresses) {
            const type = governanceType(address);
            if (filters.type && filters.type !== type) {
                continue;
            }
            switch (type) {
                case GovernanceType.ENERGY:
                    governance.push(
                        new GovernanceEnergyContract({
                            address,
                        }),
                    );
                    break;
            }

        }

        return governance;
    }

    async hasUserVoted(contractAddress: string, proposalId: number, userAddress?: string): Promise<boolean> {
        if (!userAddress) {
            return false;
        }

        const userVotedProposals = await this.governanceAbi.userVotedProposals(contractAddress, userAddress);
        return userVotedProposals.includes(proposalId);
    }
}
