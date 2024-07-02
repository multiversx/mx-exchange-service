import { Injectable } from '@nestjs/common';
import {
    governanceContractsAddresses,
    GovernanceSmoothingFunction,
    governanceSmoothingFunction,
    GovernanceType,
    governanceType,
} from '../../../utils/governance';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceUnion } from '../models/governance.union';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import {
    GovernanceEnergyContract,
    GovernanceTokenSnapshotContract,
} from '../models/governance.contract.model';
import { VoteType } from '../models/governance.proposal.model';
import { GovernanceComputeService } from './governance.compute.service';
import { GovernanceQuorumService } from './governance.quorum.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import BigNumber from 'bignumber.js';
import { EnergyService } from '../../energy/services/energy.service';
import { GovernanceAbiFactory } from './governance.abi.factory';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class GovernanceTokenSnapshotService {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceCompute: GovernanceComputeService,
        protected readonly governanceQuorum: GovernanceQuorumService,
        protected readonly tokenService: TokenService,
    ) {}
    async getGovernanceContracts(
        filters: GovernanceContractsFiltersArgs,
    ): Promise<Array<typeof GovernanceUnion>> {
        let governanceAddresses = governanceContractsAddresses();

        if (filters.contracts) {
            governanceAddresses = governanceAddresses.filter((address) =>
                filters.contracts.includes(address),
            );
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
                        new GovernanceEnergyContract({
                            address,
                        }),
                    );
                    break;
            }
        }

        return governance;
    }

    async hasUserVoted(
        contractAddress: string,
        proposalId: number,
        userAddress?: string,
    ): Promise<boolean> {
        if (!userAddress) {
            return false;
        }

        const userVotedProposals = await this.governanceAbiFactory
            .useAbi(contractAddress)
            .userVotedProposals(contractAddress, userAddress);
        return userVotedProposals.includes(proposalId);
    }

    async userVote(
        contractAddress: string,
        proposalId: number,
        userAddress?: string,
    ): Promise<VoteType> {
        if (!userAddress) {
            return VoteType.NotVoted;
        }
        return this.governanceCompute.userVotedProposalsWithVoteType(
            contractAddress,
            userAddress,
            proposalId,
        );
    }

    async feeToken(contractAddress: string): Promise<EsdtToken> {
        const feeTokenId = await this.governanceAbiFactory
            .useAbi(contractAddress)
            .feeTokenId(contractAddress);
        return await this.tokenService.tokenMetadata(feeTokenId);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPowerDecimals(scAddress: string): Promise<number> {
        const feeToken = await this.feeToken(scAddress);
        const oneUnit = new BigNumber(10).pow(feeToken.decimals);
        const smoothedOneUnit = this.smoothingFunction(
            scAddress,
            oneUnit.toFixed(),
        );
        return smoothedOneUnit.length - 1;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotingPower(
        contractAddress: string,
        proposalId: number,
        userAddress: string,
    ): Promise<string> {
        const rootHash = await this.governanceAbiFactory
            .useAbi(contractAddress)
            .proposalRootHash(contractAddress, proposalId);
        const userQuorum = await this.governanceQuorum.userQuorum(
            contractAddress,
            userAddress,
            rootHash,
        );
        return this.smoothingFunction(contractAddress, userQuorum);
    }

    smoothingFunction(scAddress: string, quorum: string): string {
        switch (governanceSmoothingFunction(scAddress)) {
            case GovernanceSmoothingFunction.CVADRATIC:
                return new BigNumber(quorum).sqrt().integerValue().toFixed();
            case GovernanceSmoothingFunction.LINEAR:
                return new BigNumber(quorum).integerValue().toFixed();
        }
    }
}

@Injectable()
export class GovernanceEnergyService extends GovernanceTokenSnapshotService {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceCompute: GovernanceComputeService,
        protected readonly governanceQuorum: GovernanceQuorumService,
        protected readonly tokenService: TokenService,
        private readonly energyService: EnergyService,
    ) {
        super(
            governanceAbiFactory,
            governanceCompute,
            governanceQuorum,
            tokenService,
        );
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotingPower(
        contractAddress: string,
        proposalId: number,
        userAddress: string,
    ) {
        //TODO: retrieve energy from event in case the user already voted
        const userEnergy = await this.energyService.getUserEnergy(userAddress);
        return this.smoothingFunction(contractAddress, userEnergy.amount);
    }
}
