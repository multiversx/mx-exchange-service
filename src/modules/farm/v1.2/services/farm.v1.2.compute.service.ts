import { Inject, Injectable, forwardRef } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmAbiServiceV1_2 } from './farm.v1.2.abi.service';
import { FarmServiceV1_2 } from './farm.v1.2.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IFarmComputeServiceV1_2 } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmComputeServiceV1_2
    extends FarmComputeService
    implements IFarmComputeServiceV1_2
{
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_2,
        @Inject(forwardRef(() => FarmServiceV1_2))
        protected readonly farmService: FarmServiceV1_2,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly cacheService: CacheService,
    ) {
        super(
            farmAbi,
            farmService,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
            cacheService,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmingTokenReserve] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.farmAbi.farmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
                farmingToken.identifier,
            );
            return computeValueUSD(
                farmingTokenReserve,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );
        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmingTokenReserve,
        );
        return lockedValuesUSD;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async lockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.computeLockedFarmingTokenReserve(farmAddress);
    }

    async computeLockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [unlockedFarmingTokenReserve, farmingTokenReserve] =
            await Promise.all([
                this.computeUnlockedFarmingTokenReserve(farmAddress),
                this.farmAbi.farmingTokenReserve(farmAddress),
            ]);
        return new BigNumber(farmingTokenReserve)
            .minus(unlockedFarmingTokenReserve)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async unlockedFarmingTokenReserve(farmAddress: string): Promise<string> {
        return this.computeUnlockedFarmingTokenReserve(farmAddress);
    }

    async computeUnlockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [farmingTokenReserve, farmTokenSupply, aprMultiplier] =
            await Promise.all([
                this.farmAbi.farmingTokenReserve(farmAddress),
                this.farmAbi.farmTokenSupply(farmAddress),
                this.farmAbi.lockedRewardAprMuliplier(farmAddress),
            ]);

        return new BigNumber(farmingTokenReserve)
            .times(aprMultiplier)
            .minus(farmTokenSupply)
            .div(aprMultiplier - 1)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async lockedFarmingTokenReserveUSD(farmAddress: string): Promise<string> {
        return this.computeLockedFarmingTokenReserveUSD(farmAddress);
    }

    async computeLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        const [farmingToken, lockedFarmingTokenReserve] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.computeLockedFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
                farmingToken.identifier,
            );
            return computeValueUSD(
                lockedFarmingTokenReserve,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );
        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            lockedFarmingTokenReserve,
        );
        return lockedValuesUSD;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async unlockedFarmingTokenReserveUSD(farmAddress: string): Promise<string> {
        return this.computeUnlockedFarmingTokenReserveUSD(farmAddress);
    }

    async computeUnlockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        const [farmingToken, unlockedFarmingTokenReserve] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.computeUnlockedFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
                farmingToken.identifier,
            );
            return computeValueUSD(
                unlockedFarmingTokenReserve,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );
        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            unlockedFarmingTokenReserve,
        );
        return lockedValuesUSD;
    }

    async computeVirtualValueLockedUSD(farmAddress: string): Promise<string> {
        const [
            lockedFarmingTokenReserveUSD,
            unlockedFarmingTokenReserveUSD,
            aprMultiplier,
        ] = await Promise.all([
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.computeUnlockedFarmingTokenReserveUSD(farmAddress),
            this.farmAbi.lockedRewardAprMuliplier(farmAddress),
        ]);

        return new BigNumber(lockedFarmingTokenReserveUSD)
            .times(aprMultiplier)
            .plus(unlockedFarmingTokenReserveUSD)
            .toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async unlockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.computeUnlockedRewardsAPR(farmAddress);
    }

    async computeUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            unlockedFarmingTokenReserveUSD,
        ] = await Promise.all([
            this.farmAbi.farmedTokenID(farmAddress),
            this.farmAbi.farmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeVirtualValueLockedUSD(farmAddress),
            this.computeUnlockedFarmingTokenReserveUSD(farmAddress),
        ]);

        const unlockedFarmingTokenReservePercent = new BigNumber(
            unlockedFarmingTokenReserveUSD,
        ).div(virtualValueLockedUSD);
        const distributedRewardsUSD = new BigNumber(
            totalRewardsPerYearUSD,
        ).times(unlockedFarmingTokenReservePercent);

        const unlockedRewardsAPR = distributedRewardsUSD.div(
            unlockedFarmingTokenReserveUSD,
        );

        let feesAPR = new BigNumber(0);
        if (farmedTokenID !== farmingTokenID) {
            const pairAddress =
                await this.pairService.getPairAddressByLpTokenID(
                    farmingTokenID,
                );
            feesAPR = new BigNumber(
                await this.pairCompute.feesAPR(pairAddress),
            );
        }
        return feesAPR.isNaN()
            ? unlockedRewardsAPR.toFixed()
            : unlockedRewardsAPR.plus(feesAPR).toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async lockedRewardsAPR(farmAddress: string): Promise<string> {
        return this.computeLockedRewardsAPR(farmAddress);
    }

    async computeLockedRewardsAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            lockedFarmingTokenReserveUSD,
            aprMultiplier,
        ] = await Promise.all([
            this.farmAbi.farmedTokenID(farmAddress),
            this.farmAbi.farmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeVirtualValueLockedUSD(farmAddress),
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.farmAbi.lockedRewardAprMuliplier(farmAddress),
        ]);

        const lockedFarmingTokenReservePercent = new BigNumber(
            lockedFarmingTokenReserveUSD,
        )
            .times(aprMultiplier)
            .div(virtualValueLockedUSD);
        const distributedRewardsUSD = new BigNumber(
            totalRewardsPerYearUSD,
        ).times(lockedFarmingTokenReservePercent);

        const lockedRewardsAPR = distributedRewardsUSD.div(
            lockedFarmingTokenReserveUSD,
        );

        let feesAPR = new BigNumber(0);
        if (farmedTokenID !== farmingTokenID) {
            const pairAddress =
                await this.pairService.getPairAddressByLpTokenID(
                    farmingTokenID,
                );
            feesAPR = new BigNumber(
                await this.pairCompute.feesAPR(pairAddress),
            );
        }
        return feesAPR.isNaN()
            ? lockedRewardsAPR.toFixed()
            : lockedRewardsAPR.plus(feesAPR).toFixed();
    }
}
