import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import {
    GovernanceProposalModel,
    GovernanceProposalStatus,
    VoteArgs,
} from '../models/governance.proposal.model';
import { GovernanceAction } from '../models/governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import {
    GovernanceType,
    toGovernanceProposalStatus,
} from '../../../utils/governance';
import { TransactionModel } from '../../../models/transaction.model';
import { gasConfig, mxConfig } from '../../../config';
import BigNumber from 'bignumber.js';
import {
    BytesValue,
    U64Value,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { GovernanceTokenSnapshotMerkleService } from './governance.token.snapshot.merkle.service';
import { GovernanceDescriptionService } from './governance.description.service';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { decimalToHex } from '../../../utils/token.converters';

@Injectable()
export class GovernanceTokenSnapshotAbiService extends GenericAbiService {
    protected type = GovernanceType.TOKEN_SNAPSHOT;
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly governanceMerkle: GovernanceTokenSnapshotMerkleService,
        protected readonly governanceDescription: GovernanceDescriptionService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getAddressShardID(scAddress: string): Promise<number> {
        return await this.mxProxy.getAddressShardID(scAddress);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minFeeForPropose(scAddress: string): Promise<string> {
        return await this.minFeeForProposeRaw(scAddress);
    }

    async minFeeForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getMinFeeForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async quorum(scAddress: string): Promise<string> {
        return await this.quorumRaw(scAddress);
    }

    async quorumRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getQuorum();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingDelayInBlocks(scAddress: string): Promise<number> {
        return await this.votingDelayInBlocksRaw(scAddress);
    }

    async votingDelayInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getVotingDelayInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPeriodInBlocks(scAddress: string): Promise<number> {
        return await this.votingPeriodInBlocksRaw(scAddress);
    }

    async votingPeriodInBlocksRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getVotingPeriodInBlocks();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeTokenId(scAddress: string): Promise<string> {
        return await this.feeTokenIdRaw(scAddress);
    }

    async feeTokenIdRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getFeeTokenId();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async withdrawPercentageDefeated(scAddress: string): Promise<number> {
        return await this.withdrawPercentageDefeatedRaw(scAddress);
    }

    async withdrawPercentageDefeatedRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getWithdrawPercentageDefeated();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposals(scAddress: string): Promise<GovernanceProposalModel[]> {
        return await this.proposalsRaw(scAddress);
    }

    async proposalsRaw(scAddress: string): Promise<GovernanceProposalModel[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
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
            return new GovernanceProposalModel({
                contractAddress: scAddress,
                proposalId: proposal.proposal_id.toNumber(),
                proposer: proposal.proposer.bech32(),
                actions,
                description:
                    this.governanceDescription.getGovernanceDescription(
                        proposal.description.toString(),
                    ),
                feePayment: new EsdtTokenPaymentModel(
                    EsdtTokenPayment.fromDecodedAttributes(
                        proposal.fee_payment,
                    ),
                ),
                proposalStartBlock: proposal.proposal_start_block.toNumber(),
                minimumQuorumPercentage: proposal.minimum_quorum
                    .div(100)
                    .toFixed(2),
                totalQuorum: proposal.total_quorum.toFixed(),
                votingDelayInBlocks: proposal.voting_delay_in_blocks.toNumber(),
                votingPeriodInBlocks:
                    proposal.voting_period_in_blocks.toNumber(),
                withdrawPercentageDefeated:
                    proposal.withdraw_percentage_defeated.toNumber(),
            });
        });
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotedProposals(
        scAddress: string,
        userAddress: string,
    ): Promise<number[]> {
        return await this.userVotedProposalsRaw(scAddress, userAddress);
    }

    async userVotedProposalsRaw(
        scAddress: string,
        userAddress: string,
    ): Promise<number[]> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getUserVotedProposals([
            userAddress,
        ]);
        const response = await this.getGenericData(interaction);

        return response.firstValue
            .valueOf()
            .map((proposalId: any) => proposalId.toNumber());
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalVotes(
        scAddress: string,
        proposalId: number,
    ): Promise<ProposalVotes> {
        return await this.proposalVotesRaw(scAddress, proposalId);
    }

    async proposalVotesRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<ProposalVotes> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getProposalVotes([proposalId]);
        const response = await this.getGenericData(interaction);

        if (!response.firstValue) {
            return ProposalVotes.default();
        }
        const votes = response.firstValue.valueOf();
        const totalVotesBigNumber = votes.up_votes
            .plus(votes.down_votes)
            .plus(votes.abstain_votes)
            .plus(votes.down_veto_votes);

        return new ProposalVotes({
            upVotes: votes.up_votes.toFixed(),
            downVotes: votes.down_votes.toFixed(),
            downVetoVotes: votes.down_veto_votes.toFixed(),
            abstainVotes: votes.abstain_votes.toFixed(),
            totalVotes: totalVotesBigNumber.toFixed(),
            upPercentage:
                totalVotesBigNumber > 0
                    ? votes.up_votes
                          .div(totalVotesBigNumber)
                          .multipliedBy(100)
                          .toFixed(2)
                    : '0',
            downPercentage:
                totalVotesBigNumber > 0
                    ? votes.down_votes
                          .div(totalVotesBigNumber)
                          .multipliedBy(100)
                          .toFixed(2)
                    : '0',
            abstainPercentage:
                totalVotesBigNumber > 0
                    ? votes.abstain_votes
                          .div(totalVotesBigNumber)
                          .multipliedBy(100)
                          .toFixed(2)
                    : '0',
            downVetoPercentage:
                totalVotesBigNumber > 0
                    ? votes.down_veto_votes
                          .div(totalVotesBigNumber)
                          .multipliedBy(100)
                          .toFixed(2)
                    : '0',
            quorum: votes.quorum.toFixed(),
        });
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalStatus(
        scAddress: string,
        proposalId: number,
    ): Promise<GovernanceProposalStatus> {
        return await this.proposalStatusRaw(scAddress, proposalId);
    }

    async proposalStatusRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<GovernanceProposalStatus> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getProposalStatus([proposalId]);
        const response = await this.getGenericData(interaction);

        return toGovernanceProposalStatus(response.firstValue.valueOf().name);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalRootHash(
        scAddress: string,
        proposalId: number,
    ): Promise<string> {
        return await this.proposalRootHashRaw(scAddress, proposalId);
    }

    async proposalRootHashRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getProposalRootHash([proposalId]);
        const response = await this.getGenericData(interaction);

        const stringsArray = response.firstValue.valueOf().map((bn) => {
            return decimalToHex(bn);
        });
        return stringsArray.join('');
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            args.contractAddress,
            this.type,
        );

        const rootHash = await this.proposalRootHash(
            args.contractAddress,
            args.proposalId,
        );
        const governanceMerkle = await this.governanceMerkle.getMerkleTree(
            rootHash,
        );

        const addressLeaf = governanceMerkle.getUserLeaf(sender);
        return contract.methodsExplicit
            .vote([
                new U64Value(new BigNumber(args.proposalId)),
                new U64Value(new BigNumber(args.vote)),
                new U64Value(new BigNumber(addressLeaf.balance)),
                new BytesValue(governanceMerkle.getProofBuffer(addressLeaf)),
            ])
            .withGasLimit(gasConfig.governance.vote)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}

@Injectable()
export class GovernanceEnergyAbiService extends GovernanceTokenSnapshotAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly governanceMerkle: GovernanceTokenSnapshotMerkleService,
        protected readonly governanceDescription: GovernanceDescriptionService,
    ) {
        super(mxProxy, governanceMerkle, governanceDescription);
        this.type = GovernanceType.ENERGY;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minEnergyForPropose(scAddress: string): Promise<string> {
        return await this.minEnergyForProposeRaw(scAddress);
    }

    async minEnergyForProposeRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getMinEnergyForPropose();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesCollectorAddress(scAddress: string): Promise<string> {
        return await this.feesCollectorAddressRaw(scAddress);
    }

    async feesCollectorAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getFeesCollectorAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async energyFactoryAddress(scAddress: string): Promise<string> {
        return await this.energyFactoryAddressRaw(scAddress);
    }

    async energyFactoryAddressRaw(scAddress: string): Promise<string> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            args.contractAddress,
            this.type,
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
