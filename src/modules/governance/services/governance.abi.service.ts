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
    Address,
    AddressValue,
    BytesValue,
    SmartContractQueryResponse,
    U64Value,
} from '@multiversx/sdk-core';
import { GovernanceTokenSnapshotMerkleService } from './governance.token.snapshot.merkle.service';
import { GovernanceDescriptionService } from './governance.description.service';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { decimalToHex } from '../../../utils/token.converters';
import { TransactionOptions } from 'src/modules/common/transaction.options';

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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getMinFeeForPropose',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getQuorum',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getVotingDelayInBlocks',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getVotingPeriodInBlocks',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getFeeTokenId',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getWithdrawPercentageDefeated',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const rawResponse = await this.runQuery(scAddress, 'getProposals');
        const filteredResponse = new SmartContractQueryResponse({
            function: rawResponse.function,
            returnCode: rawResponse.returnCode,
            returnMessage: rawResponse.returnMessage,
            returnDataParts: rawResponse.returnDataParts.filter(
                (part) => part.length > 0,
            ),
        });
        const response = this.parseQueryResponse(
            filteredResponse,
            abi.getEndpoint('getProposals'),
        );

        return response.firstValue.valueOf().map((proposal: any) => {
            const actions = proposal.actions?.map((action: any) => {
                return new GovernanceAction({
                    arguments: action.arguments.toString().split(','),
                    destAddress: action.dest_address.toBech32(),
                    functionName: action.function_name.toString(),
                    gasLimit: action.gas_limit.toNumber(),
                });
            });
            return new GovernanceProposalModel({
                contractAddress: scAddress,
                proposalId: proposal.proposal_id.toNumber(),
                proposer: proposal.proposer.toBech32(),
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getUserVotedProposals',
            [new AddressValue(Address.newFromBech32(userAddress))],
        );

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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getProposalVotes',
            [new U64Value(new BigNumber(proposalId))],
        );

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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getProposalStatus',
            [new U64Value(new BigNumber(proposalId))],
        );

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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getProposalRootHash',
            [new U64Value(new BigNumber(proposalId))],
        );

        const stringsArray = response.firstValue.valueOf().map((bn) => {
            return decimalToHex(bn);
        });
        return stringsArray.join('');
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel> {
        const rootHash = await this.proposalRootHash(
            args.contractAddress,
            args.proposalId,
        );
        const governanceMerkle = await this.governanceMerkle.getMerkleTree(
            rootHash,
        );

        const addressLeaf = governanceMerkle.getUserLeaf(sender);

        return this.mxProxy.getGovernanceSmartContractTransaction(
            args.contractAddress,
            this.type,
            new TransactionOptions({
                sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.governance.vote,
                function: 'vote',
                arguments: [
                    new U64Value(new BigNumber(args.proposalId)),
                    new U64Value(new BigNumber(args.vote)),
                    new U64Value(new BigNumber(addressLeaf.balance)),
                    new BytesValue(governanceMerkle.getProofBuffer(addressLeaf)),
                ],
            }),
        );
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel> {
        return this.mxProxy.getGovernanceSmartContractTransaction(
            args.contractAddress,
            this.type,
            new TransactionOptions({
                sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.governance.vote,
                function: 'vote',
                arguments: [
                    new U64Value(new BigNumber(args.proposalId)),
                    new U64Value(new BigNumber(args.vote)),
                ],
            }),
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getMinEnergyForPropose',
        );
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getFeesCollectorAddress',
        );
        return response.firstValue.valueOf().toBech32();
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
        const abi = await this.mxProxy.getGovernanceAbi(this.type);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getEnergyFactoryAddress',
        );
        return response.firstValue.valueOf().toBech32();
    }
}
