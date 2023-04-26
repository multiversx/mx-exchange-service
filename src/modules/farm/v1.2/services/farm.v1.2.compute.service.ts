import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmGetterServiceV1_2 } from './farm.v1.2.getter.service';

@Injectable()
export class FarmComputeServiceV1_2 extends FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmGetterServiceV1_2))
        protected readonly farmGetter: FarmGetterServiceV1_2,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            farmGetter,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
            logger,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmingTokenReserve] = await Promise.all([
            this.farmGetter.getFarmingToken(farmAddress),
            this.farmGetter.getFarmingTokenReserve(farmAddress),
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

    async computeLockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [unlockedFarmingTokenReserve, farmingTokenReserve] =
            await Promise.all([
                this.computeUnlockedFarmingTokenReserve(farmAddress),
                this.farmGetter.getFarmingTokenReserve(farmAddress),
            ]);
        return new BigNumber(farmingTokenReserve)
            .minus(unlockedFarmingTokenReserve)
            .toFixed();
    }

    async computeUnlockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [farmingTokenReserve, farmTokenSupply, aprMultiplier] =
            await Promise.all([
                this.farmGetter.getFarmingTokenReserve(farmAddress),
                this.farmGetter.getFarmTokenSupply(farmAddress),
                this.farmGetter.getLockedRewardAprMuliplier(farmAddress),
            ]);

        return new BigNumber(farmingTokenReserve)
            .times(aprMultiplier)
            .minus(farmTokenSupply)
            .div(aprMultiplier - 1)
            .toFixed();
    }

    async computeLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        const [farmingToken, lockedFarmingTokenReserve] = await Promise.all([
            this.farmGetter.getFarmingToken(farmAddress),
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

    async computeUnlockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        const [farmingToken, unlockedFarmingTokenReserve] = await Promise.all([
            this.farmGetter.getFarmingToken(farmAddress),
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
            this.farmGetter.getLockedRewardAprMuliplier(farmAddress),
        ]);

        return new BigNumber(lockedFarmingTokenReserveUSD)
            .times(aprMultiplier)
            .plus(unlockedFarmingTokenReserveUSD)
            .toFixed();
    }

    async computeUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            unlockedFarmingTokenReserveUSD,
        ] = await Promise.all([
            this.farmGetter.getFarmedTokenID(farmAddress),
            this.farmGetter.getFarmingTokenID(farmAddress),
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

    async computeLockedRewardsAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            lockedFarmingTokenReserveUSD,
            aprMultiplier,
        ] = await Promise.all([
            this.farmGetter.getFarmedTokenID(farmAddress),
            this.farmGetter.getFarmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeVirtualValueLockedUSD(farmAddress),
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.farmGetter.getLockedRewardAprMuliplier(farmAddress),
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
