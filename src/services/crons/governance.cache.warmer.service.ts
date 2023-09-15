import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { governanceContractsAddresses, GovernanceType } from '../../utils/governance';
import { GovernanceAbiFactory } from '../../modules/governance/services/governance.abi.factory';
import { GovernanceSetterService } from '../../modules/governance/services/governance.setter.service';

@Injectable()
export class GovernanceCacheWarmerService {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
        private readonly governanceSetter: GovernanceSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron('*/12 * * * * *')
    async cacheGovernanceStatuses(): Promise<void> {
        const addresses = governanceContractsAddresses([
            GovernanceType.ENERGY,
            GovernanceType.TOKEN_SNAPSHOT,
        ]);
        for (const address of addresses) {
            const proposals = await this.governanceAbiFactory.useAbi(address).proposalsRaw(address);
            const promises = [];
            for (const proposal of proposals) {
                const status = await this.governanceAbiFactory.useAbi(address).proposalStatusRaw(address, proposal.proposalId);
                promises.push(this.governanceSetter.proposalStatus(address, proposal.proposalId, status));
            }

            const cachedKeys = await Promise.all([
                ...promises,
                this.governanceSetter.proposals(address, proposals),
            ]);

            await this.deleteCacheKeys(cachedKeys);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
