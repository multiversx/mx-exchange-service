import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { ProposalVotes } from '../models/proposal.votes.model';
import {
    Description,
    GovernanceProposal,
    GovernanceProposalStatus,
    VoteArgs,
} from '../models/governance.proposal.model';
import { GovernanceAction } from '../models/governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { toGovernanceProposalStatus } from '../../../utils/governance';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { TransactionModel } from '../../../models/transaction.model';
import { gasConfig, mxConfig } from '../../../config';
import BigNumber from 'bignumber.js';
import { U64Value } from '@multiversx/sdk-core/out/smartcontracts/typesystem';

@Injectable()
export class GovernanceAbiService
    extends GenericAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minEnergyForPropose(scAddress: string): Promise<string> {
        return await this.minEnergyForProposeRaw(scAddress);
    }

    async minEnergyForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getMinEnergyForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }
    
    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minFeeForPropose(scAddress: string): Promise<string> {
        return await this.minFeeForProposeRaw(scAddress);
    }

    async minFeeForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getMinFeeForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async quorum(scAddress: string): Promise<string> {
        return await this.quorumRaw(scAddress);
    }

    async quorumRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getQuorum();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingDelayInBlocks(scAddress: string): Promise<number> {
        return await this.votingDelayInBlocksRaw(scAddress);
    }

    async votingDelayInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getVotingDelayInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPeriodInBlocks(scAddress: string): Promise<number> {
        return await this.votingPeriodInBlocksRaw(scAddress);
    }

    async votingPeriodInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getVotingPeriodInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeTokenId(scAddress: string): Promise<string> {
        return await this.feeTokenIdRaw(scAddress);
    }

    async feeTokenIdRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getFeeTokenId();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async withdrawPercentageDefeated(scAddress: string): Promise<number> {
        return await this.withdrawPercentageDefeatedRaw(scAddress);
    }

    async withdrawPercentageDefeatedRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getWithdrawPercentageDefeated();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposals(scAddress: string): Promise<GovernanceProposal[]> {
        return await this.proposalsRaw(scAddress);
    }

    async proposalsRaw(scAddress: string): Promise<GovernanceProposal[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methodsExplicit.getProposals();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map((proposal: any) => {
            const actions = proposal.actions?.map((action: any) => {
                return new GovernanceAction({
                    arguments: action.arguments.toString().split(','),
                    destAddress: action.dest_address.bech32(),
                    functionName: action.function_name.toString(),
                    gasLimit: action.gas_limit.toNumber(),
                });
            });
            return new GovernanceProposal({
                contractAddress: scAddress,
                proposalId: proposal.proposal_id.toNumber(),
                proposer: proposal.proposer.bech32(),
                actions,
                description: new Description(JSON.parse(proposal.description.toString())),
                feePayment:  new EsdtTokenPaymentModel(
                    EsdtTokenPayment.fromDecodedAttributes(proposal.fee_payment)
                ),
                proposalStartBlock: proposal.proposal_start_block.toNumber(),
                minimumQuorum: proposal.minimum_quorum.toNumber(),
                totalEnergy: proposal.total_energy.toFixed(),
                votingDelayInBlocks: proposal.voting_delay_in_blocks.toNumber(),
                votingPeriodInBlocks: proposal.voting_period_in_blocks.toNumber(),
                withdrawPercentageDefeated: proposal.withdraw_percentage_defeated.toNumber(),
            });
        });
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotedProposals(scAddress: string, userAddress: string): Promise<number[]> {
        return await this.userVotedProposalsRaw(scAddress, userAddress);
    }

    async userVotedProposalsRaw(scAddress: string, userAddress: string): Promise<number[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getUserVotedProposals([userAddress]);
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map((proposalId: any) => proposalId.toNumber());
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalVotes(scAddress: string, proposalId: number): Promise<ProposalVotes> {
        return await this.proposalVotesRaw(scAddress, proposalId);
    }

    async proposalVotesRaw(scAddress: string, proposalId: number): Promise<ProposalVotes> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getProposalVotes([proposalId]);
        const response = await this.getGenericData(interaction);

        if (!response.firstValue) {
            return ProposalVotes.default();
        }
        const votes = response.firstValue.valueOf();
        const totalVotesBigNumber = votes.up_votes
            .plus(votes.down_votes)
            .plus(votes.abstain_votes)
            .plus(votes.down_veto_votes)

        const proposalVotes = {
            upVotes: votes.up_votes.toFixed(),
            downVotes: votes.down_votes.toFixed(),
            downVetoVotes: votes.down_veto_votes.toFixed(),
            abstainVotes: votes.abstain_votes.toFixed(),
            totalVotes: totalVotesBigNumber.toFixed(),
            quorum: votes.quorum.toFixed()
        };

        if (!totalVotesBigNumber.isZero()) {
            return new ProposalVotes({
                ...proposalVotes,
                upPercentage: votes.up_votes.div(totalVotesBigNumber).multipliedBy(100).toFixed(2),
                downPercentage: votes.down_votes.div(totalVotesBigNumber).multipliedBy(100).toFixed(2),
                downVetoPercentage: votes.down_veto_votes.div(totalVotesBigNumber).multipliedBy(100).toFixed(2),
                abstainPercentage: votes.abstain_votes.div(totalVotesBigNumber).multipliedBy(100).toFixed(2),
            });
        }

        return new ProposalVotes(proposalVotes);
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalStatus(scAddress: string, proposalId: number): Promise<GovernanceProposalStatus> {
        return await this.proposalStatusRaw(scAddress, proposalId);
    }

    async proposalStatusRaw(scAddress: string, proposalId: number): Promise<GovernanceProposalStatus> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getProposalStatus([proposalId]);
        const response = await this.getGenericData(interaction);

        return toGovernanceProposalStatus(response.firstValue.valueOf().name);
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorAddress(scAddress: string): Promise<string> {
        return await this.feesCollectorAddressRaw(scAddress);
    }

    async feesCollectorAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getFeesCollectorAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({className: GovernanceAbiService.name})
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(scAddress: string): Promise<string> {
        return await this.energyFactoryAddressRaw(scAddress);
    }

    async energyFactoryAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(scAddress);
        const interaction = contract.methods.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        className: GovernanceAbiService.name,
        logArgs: true,
    })
    async vote(
        sender: string,
        args: VoteArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            args.contractAddress,
        );

        return contract.methodsExplicit
            .vote([
                new U64Value(new BigNumber(args.proposalId)),
                new U64Value(new BigNumber(args.vote)),
            ])
            .withGasLimit(gasConfig.governance.vote)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
