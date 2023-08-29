import { DescriptionV1, GovernanceProposalModel, GovernanceProposalStatus } from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GovernanceLKMEXProposal extends GovernanceProposalModel {
    constructor() {
        super({
            description: new DescriptionV1({
                title: 'Maiar DEX to transform Into xExchange with New MEX 2.0 Economic Model',
                shortDescription:
                    'xExchange (Maiar DEX 2.0) presents a set of significant improvements and benefits, while correcting the most important limitations residing in the previous economics model.',
                strapiId: 2,
                version: 1,
            }),
            votes: new ProposalVotes({
                upVotes: '3615976209993000000000',
                downVotes: '210776056445000000000',
                downVetoVotes: '0',
                abstainVotes: '274849971635000000000',
                totalVotes: '4101602238073000000000',
                upPercentage: '88.16',
                downPercentage: '5.13',
                downVetoPercentage: '0',
                abstainPercentage: '6.70',
                quorum: '4101475400000000000000000000000',
            }),
            status: GovernanceProposalStatus.Succeeded,
            proposalId: 1,
            proposer: "erd1ss6u80ruas2phpmr82r42xnkd6rxy40g9jl69frppl4qez9w2jpsqj8x97",
            actions: [],
            rootHash: "",
            totalQuorum: "6742520471308000000000000000000",
            feePayment: new EsdtTokenPaymentModel({
                tokenIdentifier: "LKMEX-aab910",
                tokenNonce: 0,
                amount: "0",
            }),
            minimumQuorumPercentage: "0",
            votingDelayInBlocks: 0,
            votingPeriodInBlocks: 101672,
            withdrawPercentageDefeated: 8999,
            proposalStartBlock: 12247307,
        });
    }
    toJSON() {
        return {
            ...this,
        }
    }
}
