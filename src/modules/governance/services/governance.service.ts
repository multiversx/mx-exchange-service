import { Injectable } from '@nestjs/common';
import { GovernanceContract } from '../models/governance.contract.model';
import { governanceContractsAddresses } from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/contracts.filter.args';
import { GovernanceAbiService } from './governance.abi.service';

@Injectable()
export class GovernanceService {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }
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

    async hasUserVoted(contractAddress: string, proposalId: number, userAddress?: string): Promise<boolean> {
        if (!userAddress) {
            return false;
        }

        const userVotedProposals = await this.governanceAbi.userVotedProposals(contractAddress, userAddress);
        return userVotedProposals.includes(proposalId);
    }
}
