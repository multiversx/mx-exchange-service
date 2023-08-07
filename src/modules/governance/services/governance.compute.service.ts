import { Injectable } from '@nestjs/common';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { VoteType } from '../models/governance.proposal.model';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';

@Injectable()
export class GovernanceComputeService {
    constructor(
        private readonly mxAPI: MXApiService,
    ) {
    }

    @ErrorLoggerAsync({ className: GovernanceComputeService.name })
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVotedProposalsWithVoteType(scAddress: string, userAddress: string): Promise<{ proposalId: number, vote: VoteType }[]> {
        return await this.userVotedProposalsWithVoteTypeRaw(scAddress, userAddress);
    }

    async userVotedProposalsWithVoteTypeRaw(scAddress: string, userAddress: string): Promise<{ proposalId: number, vote: VoteType }[]> {
        const txs = await this.mxAPI.getTransactionsWithOptions({
            sender: userAddress,
            receiver: scAddress,
            functionName: 'vote',
            status: 'success',
        })
        const proposalWithVoteType = []
        for (const tx of txs) {
            //decode base64 to string
            const data = Buffer.from(tx.data, 'base64').toString('utf-8').split('@');
            proposalWithVoteType.push({
                proposalId: parseInt(data[1]),
                vote: data[2] === "" ? VoteType.UpVote : parseInt(data[2]),
            });
        }
        return proposalWithVoteType;
    }
}
