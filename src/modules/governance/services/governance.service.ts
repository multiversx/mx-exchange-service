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
import {
    DescriptionV1,
    GovernanceMexV2ProposalModel,
    GovernanceProposalStatus,
    VoteType,
} from '../models/governance.proposal.model';
import { GovernanceComputeService } from './governance.compute.service';
import { ProposalVotes } from '../models/governance.proposal.votes.model';

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
                        new GovernanceOldEnergyContract({
                            address,
                            proposals: [
                                new GovernanceMexV2ProposalModel({
                                    contractAddress: address,
                                    proposalId: 1,
                                    description: new DescriptionV1({
                                        title: 'Maiar DEX to transform Into xExchange with New MEX 2.0 Economic Model',
                                        shortDescription: 'xExchange (Maiar DEX 2.0) presents a set of significant improvements and benefits, while correcting the most important limitations residing in the previous economics model.',
                                        strapiId: 0,
                                        version: 1,
                                    }),
                                    votes: new ProposalVotes({
                                        upVotes:"3615976209993",
                                        downVotes:"210776056445",
                                        downVetoVotes:"0",
                                        abstainVotes:"274849971635",
                                        totalVotes:"4101602200000",
                                        upPercentage:"0.88",
                                        downPercentage:"0.05",
                                        downVetoPercentage:"0",
                                        abstainPercentage:"0.06",
                                        quorum:"0",
                                    }),
                                    status: GovernanceProposalStatus.Succeeded,
                                    turnoutPercentage: "60.83",
                                })
                            ]
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
