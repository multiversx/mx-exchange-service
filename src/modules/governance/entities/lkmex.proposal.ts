import {
    DescriptionV1,
    GovernanceLKMEXProposalModel,
    GovernanceProposalStatus,
} from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';

export function createLkmexProposal(address) {
    return {
        address,
        proposals: [
            new GovernanceLKMEXProposalModel({
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
    };
}
