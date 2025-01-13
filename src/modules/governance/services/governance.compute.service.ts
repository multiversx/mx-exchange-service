import { Injectable } from '@nestjs/common';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { VoteType } from '../models/governance.proposal.model';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { GovernanceSetterService } from './governance.setter.service';
import { Address } from '@multiversx/sdk-core/out';
import { decimalToHex } from '../../../utils/token.converters';
import { toVoteType } from '../../../utils/governance';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';

@Injectable()
export class GovernanceComputeService {
    constructor(
        private readonly elasticEventsService: ElasticSearchEventsService,
        private readonly governanceSetter: GovernanceSetterService,
    ) {}

    async userVotedProposalsWithVoteType(
        scAddress: string,
        userAddress: string,
        proposalId: number,
    ): Promise<VoteType> {
        const currentCachedProposalVoteTypes =
            await this.userVoteTypesForContract(scAddress, userAddress);
        const cachedVoteType = currentCachedProposalVoteTypes.find(
            (proposal) => proposal.proposalId === proposalId,
        );
        if (cachedVoteType) {
            return cachedVoteType.vote;
        }

        const voteEvents = await this.elasticEventsService.getGovernanceVotes(
            scAddress,
            Address.fromString(userAddress).hex(),
            decimalToHex(proposalId),
        );

        let voteType = VoteType.NotVoted;
        if (voteEvents.length > 0) {
            const voteEvent = voteEvents.find(
                (event) => event.identifier === 'vote',
            );
            voteType = toVoteType(
                Buffer.from(voteEvent.topics[0], 'hex').toString(),
            );
        }

        const proposalVoteType = {
            proposalId,
            vote: voteType,
        };
        currentCachedProposalVoteTypes.push(proposalVoteType);
        await this.governanceSetter.userVoteTypesForContract(
            scAddress,
            userAddress,
            currentCachedProposalVoteTypes,
        );
        return proposalVoteType.vote;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVoteTypesForContract(
        scAddress: string,
        userAddress: string,
    ): Promise<{ proposalId: number; vote: VoteType }[]> {
        return [];
    }
}
