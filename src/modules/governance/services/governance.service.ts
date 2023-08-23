import { Injectable } from '@nestjs/common';
import { governanceContractsAddresses, GovernanceType, governanceType } from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceUnion } from '../models/governance.union';
import { TokenGetterService } from '../../tokens/services/token.getter.service';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import {
    GovernanceEnergyContract,
    GovernanceOldEnergyContract,
    GovernanceTokenSnapshotContract,
} from '../models/governance.contract.model';
import { GovernanceTokenSnapshotAbiService } from './governance.abi.service';
import { VoteType } from '../models/governance.proposal.model';
import { GovernanceComputeService } from './governance.compute.service';
import { createLkmexProposal } from '../entities/lkmex.proposal';

@Injectable()
export class GovernanceService {
    constructor(
        private readonly governanceAbi: GovernanceTokenSnapshotAbiService,
        private readonly governanceCompute: GovernanceComputeService,
        private readonly tokenGetter: TokenGetterService,
    ) {
    }
    async getGovernanceContracts(filters: GovernanceContractsFiltersArgs): Promise<Array<typeof GovernanceUnion>> {
        let governanceAddresses = governanceContractsAddresses();

        if (filters.contracts) {
            governanceAddresses = governanceAddresses.filter((address) => filters.contracts.includes(address));
        }

        const governance: Array<typeof GovernanceUnion> = [];
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
                case GovernanceType.TOKEN_SNAPSHOT:
                    governance.push(
                        new GovernanceTokenSnapshotContract({
                            address,
                        }),
                    );
                   break;
                case GovernanceType.OLD_ENERGY:
                    governance.push(
                        new GovernanceOldEnergyContract(createLkmexProposal(address)),
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

    async userVote(contractAddress: string, proposalId: number, userAddress?: string): Promise<VoteType> {
        if (!userAddress) {
            return VoteType.NotVoted
        }
        return this.governanceCompute.userVotedProposalsWithVoteType(
            contractAddress, userAddress, proposalId
        );
    }

    async feeToken(contractAddress: string): Promise<EsdtToken> {
        const feeTokenId = await this.governanceAbi.feeTokenId(contractAddress);
        return await this.tokenGetter.getTokenMetadata(feeTokenId);
    }
}
