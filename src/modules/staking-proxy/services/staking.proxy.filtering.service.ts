import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { StakingProxiesFilter } from '../models/staking.proxy.args.model';
import { StakingProxyAbiService } from './staking.proxy.abi.service';
import { StakingProxyService } from './staking.proxy.service';

@Injectable()
export class StakingProxyFilteringService {
    constructor(
        private readonly stakingProxyAbi: StakingProxyAbiService,
        @Inject(forwardRef(() => StakingProxyService))
        private readonly stakingProxyService: StakingProxyService,
    ) {}

    async stakingProxiesByAddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (filter.address) {
            stakingProxyAddresses = stakingProxyAddresses.filter(
                (address) => filter.address === address,
            );
        }
        return await Promise.resolve(stakingProxyAddresses);
    }

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

    async stakingProxiesByStakingFarmAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.stakingFarmAddress) {
            return stakingProxyAddresses;
        }

        const stakingFarmAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.stakingFarmAddress(address),
            ),
        );

        return stakingProxyAddresses.filter(
            (_, index) =>
                stakingFarmAddresses[index] === filter.stakingFarmAddress,
        );
    }

    async stakingProxiesByLpFarmAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.lpFarmAddress) {
            return stakingProxyAddresses;
        }

        const lpFarmAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.lpFarmAddress(address),
            ),
        );

        return stakingProxyAddresses.filter(
            (_, index) => lpFarmAddresses[index] === filter.lpFarmAddress,
        );
    }

    async stakingProxiesByToken(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.searchToken || filter.searchToken.trim().length < 3) {
            return stakingProxyAddresses;
        }

        const searchTerm = filter.searchToken.toUpperCase().trim();

        const stakingTokens = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyService.getStakingToken(address),
            ),
        );

        const filteredAddresses: string[] = [];
        for (const [index, address] of stakingProxyAddresses.entries()) {
            const stakingToken = stakingTokens[index];

            if (
                stakingToken.name.toUpperCase().includes(searchTerm) ||
                stakingToken.identifier.toUpperCase().includes(searchTerm) ||
                stakingToken.ticker.toUpperCase().includes(searchTerm)
            ) {
                filteredAddresses.push(address);
            }
        }

        return filteredAddresses;
    }
}
