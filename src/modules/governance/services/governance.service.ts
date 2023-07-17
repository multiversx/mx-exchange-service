import { Injectable } from '@nestjs/common';
import { EnergyContract, GovernanceType } from '../models/energy.contract.model';
import { governanceContractsAddresses, governanceType } from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/contracts.filter.args';
import { GovernanceAbiService } from './governance.abi.service';
import { GovernanceUnion } from '../models/governance.union';
import { TokenGetterService } from '../../tokens/services/token.getter.service';
import { EsdtToken } from '../../tokens/models/esdtToken.model';

@Injectable()
export class GovernanceService {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
        private readonly tokenGetter: TokenGetterService,
    ) {
    }
    async getGovernanceContracts(filters: GovernanceContractsFiltersArgs): Promise<Array<typeof GovernanceUnion>> {
        const governanceAddresses = governanceContractsAddresses();

        if (filters.contracts) {
            governanceAddresses.filter((address) => !filters.contracts.includes(address));
        }

        const governance: EnergyContract[] = [];
        for (const address of governanceAddresses) {
            const type = governanceType(address);
            if (filters.type && filters.type !== type) {
                continue;
            }
            switch (type) {
                case GovernanceType.ENERGY:
                    governance.push(
                        new EnergyContract({
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

    async feeToken(contractAddress: string): Promise<EsdtToken> {
        const feeTokenId = await this.governanceAbi.feeTokenId(contractAddress);
        return await this.tokenGetter.getTokenMetadata(feeTokenId);
    }
}
