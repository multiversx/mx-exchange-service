import { Injectable } from '@nestjs/common';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { VoteType } from '../models/governance.proposal.model';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { ElasticQuery } from '../../../helpers/entities/elastic/elastic.query';
import { QueryType } from '../../../helpers/entities/elastic/query.type';
import { ElasticSortOrder } from '../../../helpers/entities/elastic/elastic.sort.order';
import { ElasticService } from '../../../helpers/elastic.service';
import { GovernanceSetterService } from './governance.setter.service';
import { Address } from '@multiversx/sdk-core/out';
import { decimalToHex } from '../../../utils/token.converters';
import { toVoteType } from '../../../utils/governance';

@Injectable()
export class GovernanceComputeService {
    constructor(
        private readonly elasticService: ElasticService,
        private readonly governanceSetter: GovernanceSetterService,
    ) {
    }

    async userVotedProposalsWithVoteType(scAddress: string, userAddress: string, proposalId: number): Promise<VoteType> {
        const currentCachedProposalVoteTypes = await this.userVoteTypesForContract(scAddress, userAddress);
        const cachedVoteType = currentCachedProposalVoteTypes.find((proposal) => proposal.proposalId === proposalId);
        if (cachedVoteType) {
            return cachedVoteType.vote;
        }

        const log = await this.getVoteLog('vote', scAddress, userAddress, proposalId);
        let voteType = VoteType.NotVoted;
        if (log.length > 0) {
            const voteEvent = log[0]._source.events.find((event) => event.identifier === 'vote');
            voteType = toVoteType(atob(voteEvent.topics[0]));
        }
        const proposalVoteType = {
            proposalId,
            vote: voteType,
        }
        currentCachedProposalVoteTypes.push(proposalVoteType);
        await this.governanceSetter.userVoteTypesForContract(scAddress, userAddress, currentCachedProposalVoteTypes);
        return proposalVoteType.vote;
    }

    @ErrorLoggerAsync({ className: GovernanceComputeService.name })
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVoteTypesForContract(scAddress: string, userAddress: string): Promise<{ proposalId: number, vote: VoteType }[]> {
        return [];
    }

    private async getVoteLog(
        eventName: string,
        scAddress: string,
        callerAddress: string,
        proposalId: number,
    ): Promise<any[]> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        const encodedProposalId = Buffer.from(decimalToHex(proposalId), 'hex').toString('base64');
        const encodedCallerAddress = Buffer.from(Address.fromString(callerAddress).hex(), 'hex').toString('base64');
        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', scAddress),
            QueryType.Nested('events', [
                QueryType.Match('events.address', scAddress),
                QueryType.Match('events.identifier', eventName),
            ]),
            QueryType.Nested('events', [
                QueryType.Match('events.topics', encodedProposalId),
            ]),
            QueryType.Nested('events', [
                QueryType.Match('events.topics', encodedCallerAddress),
            ]),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];


        const list = await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );
        return list;
    }
}
