import { Injectable } from '@nestjs/common';
import { StakingProxiesFilter } from '../models/staking.proxy.args.model';
import { StakingProxyAbiService } from './staking.proxy.abi.service';

@Injectable()
export class StakingProxyFilteringService {
    constructor(private readonly stakingProxyAbi: StakingProxyAbiService) {}

    async stakingProxiesByPairAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.pairAddress) {
            return stakingProxyAddresses;
        }

        const pairAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.pairAddress(address),
            ),
        );

        return stakingProxyAddresses.filter(
            (_, index) => pairAddresses[index] === filter.pairAddress,
        );
    }
}
