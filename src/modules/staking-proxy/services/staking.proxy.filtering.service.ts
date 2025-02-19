import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { StakingProxiesFilter } from '../models/staking.proxy.args.model';
import { StakingProxyAbiService } from './staking.proxy.abi.service';
import { StakingProxyService } from './staking.proxy.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@Injectable()
export class StakingProxyFilteringService {
    constructor(
        private readonly stakingProxyAbi: StakingProxyAbiService,
        @Inject(forwardRef(() => StakingProxyService))
        private readonly stakingProxyService: StakingProxyService,
    ) {}

    stakingProxiesByAddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): string[] {
        if (filter.addresses) {
            stakingProxyAddresses = stakingProxyAddresses.filter((address) =>
                filter.addresses.includes(address),
            );
        }
        return stakingProxyAddresses;
    }

    async stakingProxiesByPairAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.pairAddresses) {
            return stakingProxyAddresses;
        }

        const pairAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.pairAddress(address),
            ),
        );

        return stakingProxyAddresses.filter((_, index) =>
            filter.pairAddresses.includes(pairAddresses[index]),
        );
    }

    async stakingProxiesByStakingFarmAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.stakingFarmAddresses) {
            return stakingProxyAddresses;
        }

        const stakingFarmAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.stakingFarmAddress(address),
            ),
        );

        return stakingProxyAddresses.filter((_, index) =>
            filter.stakingFarmAddresses.includes(stakingFarmAddresses[index]),
        );
    }

    async stakingProxiesByLpFarmAdddress(
        filter: StakingProxiesFilter,
        stakingProxyAddresses: string[],
    ): Promise<string[]> {
        if (!filter.lpFarmAddresses) {
            return stakingProxyAddresses;
        }

        const lpFarmAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbi.lpFarmAddress(address),
            ),
        );

        return stakingProxyAddresses.filter((_, index) =>
            filter.lpFarmAddresses.includes(lpFarmAddresses[index]),
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

        const farmTokens = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyService.getFarmToken(address),
            ),
        );

        const dualYieldTokens = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyService.getDualYieldToken(address),
            ),
        );

        const lpFarmTokens = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyService.getLpFarmToken(address),
            ),
        );

        const filteredAddresses: string[] = [];
        for (const [index, address] of stakingProxyAddresses.entries()) {
            const stakingToken = stakingTokens[index];
            const farmToken = farmTokens[index];
            const dualYieldToken = dualYieldTokens[index];
            const lpFarmToken = lpFarmTokens[index];

            if (
                this.tokenIncludesTerm(stakingToken, searchTerm) ||
                this.tokenIncludesTerm(farmToken, searchTerm) ||
                this.tokenIncludesTerm(dualYieldToken, searchTerm) ||
                this.tokenIncludesTerm(lpFarmToken, searchTerm)
            ) {
                filteredAddresses.push(address);
            }
        }

        return filteredAddresses;
    }

    private tokenIncludesTerm(
        token: EsdtToken | NftCollection,
        term: string,
    ): boolean {
        const identifier =
            'identifier' in token ? token.identifier : token.collection;

        return (
            token.name.toUpperCase().includes(term) ||
            identifier.toUpperCase().includes(term) ||
            token.ticker.toUpperCase().includes(term)
        );
    }
}
