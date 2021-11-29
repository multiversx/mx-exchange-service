import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { FarmGetterService } from './farm.getter.service';

@Injectable()
export class FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmGetterService))
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmGetterService.getFarmedTokenID(
            farmAddress,
        );
        if (scAddress.has(farmedTokenID)) {
            const tokenPriceUSD = await this.pairComputeService.computeTokenPriceUSD(
                farmedTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(
            farmedTokenID,
        );
        return tokenPriceUSD.toFixed();
    }

    async computeFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.farmGetterService.getFarmingTokenID(
            farmAddress,
        );
        if (scAddress.has(farmingTokenID)) {
            const tokenPriceUSD = await this.pairComputeService.computeTokenPriceUSD(
                farmingTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairComputeService.computeLpTokenPriceUSD(pairAddress);
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmingTokenReserve] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
                scAddress.get(farmingToken.identifier),
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

    async computeFarmRewardsForPosition(
        farmAddress: string,
        liquidity: string,
        decodedAttributes: FarmTokenAttributesModel,
    ): Promise<BigNumber> {
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            undistributedFees,
            currentBlockFee,
            divisionSafetyConstant,
            farmTokenSupply,
            farmRewardPerShare,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.farmGetterService.getLastRewardBlockNonce(farmAddress),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
            this.farmGetterService.getUndistributedFees(farmAddress),
            this.farmGetterService.getCurrentBlockFee(farmAddress),
            this.farmGetterService.getDivisionSafetyConstant(farmAddress),
            this.farmGetterService.getFarmTokenSupply(farmAddress),
            this.farmGetterService.getRewardPerShare(farmAddress),
        ]);

        const amountBig = new BigNumber(liquidity);
        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);
        const undistributedFeesBig = new BigNumber(undistributedFees);
        const currentBlockFeeBig = new BigNumber(currentBlockFee);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const rewardPerShareBig = new BigNumber(
            decodedAttributes.rewardPerShare,
        );

        let toBeMinted = new BigNumber(0);
        const feesBig = undistributedFeesBig.plus(currentBlockFeeBig);

        if (currentNonce > lastRewardBlockNonce) {
            toBeMinted = perBlockRewardAmountBig.times(
                currentBlockBig.minus(lastRewardBlockNonceBig),
            );
        }
        const rewardIncrease = toBeMinted.plus(feesBig);
        const rewardPerShareIncrease = rewardIncrease
            .times(divisionSafetyConstantBig)
            .dividedBy(farmTokenSupplyBig);
        const futureRewardPerShare = farmRewardPerShareBig.plus(
            rewardPerShareIncrease,
        );
        if (
            futureRewardPerShare.isGreaterThan(decodedAttributes.rewardPerShare)
        ) {
            const rewardPerShareDiff = futureRewardPerShare.minus(
                rewardPerShareBig,
            );

            return amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig);
        }
        return new BigNumber(0);
    }

    async computeLockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [farmTokenSupply, farmingTokenReserve] = await Promise.all([
            this.farmGetterService.getFarmTokenSupply(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);
        return new BigNumber(farmTokenSupply)
            .minus(farmingTokenReserve)
            .toFixed();
    }

    async computeUnlockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        const [farmingTokenReserve, lockedFarmingReserve] = await Promise.all([
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
            this.computeLockedFarmingTokenReserve(farmAddress),
        ]);

        return new BigNumber(farmingTokenReserve)
            .minus(lockedFarmingReserve)
            .toFixed();
    }

    async computeLockedFarmingTokenReserveUSD(
        farmAddress: string,
    ): Promise<string> {
        const [farmingToken, lockedFarmingTokenReserve] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.computeLockedFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
                scAddress.get(farmingToken.identifier),
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
            this.farmGetterService.getFarmingToken(farmAddress),
            this.computeUnlockedFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
                scAddress.get(farmingToken.identifier),
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

    async computeUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        const farmedToken = await this.farmGetterService.getFarmedToken(
            farmAddress,
        );

        const [
            farmedTokenPriceUSD,
            rewardsPerBlock,
            lockedFarmingTokenReserveUSD,
            unlockedFarmingTokenReserveUSD,
        ] = await Promise.all([
            this.pairComputeService.computeTokenPriceUSD(
                farmedToken.identifier,
            ),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.computeUnlockedFarmingTokenReserveUSD(farmAddress),
        ]);

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );
        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD.toFixed(),
        );

        return new BigNumber(totalRewardsPerYearUSD)
            .div(
                new BigNumber(lockedFarmingTokenReserveUSD)
                    .times(2)
                    .plus(unlockedFarmingTokenReserveUSD),
            )
            .toFixed();
    }

    async computeLockedRewardsAPR(farmAddress: string): Promise<string> {
        const unlockedRewardsAPR = await this.computeUnlockedRewardsAPR(
            farmAddress,
        );
        return new BigNumber(unlockedRewardsAPR).times(2).toFixed();
    }

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const farmedToken = await this.farmGetterService.getFarmedToken(
            farmAddress,
        );

        const [farmedTokenPriceUSD, rewardsPerBlock] = await Promise.all([
            this.pairComputeService.computeTokenPriceUSD(
                farmedToken.identifier,
            ),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
        ]);

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );

        const totalFarmingTokenValueUSD = await this.computeFarmLockedValueUSD(
            farmAddress,
        );

        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD.toFixed(),
        );

        const apr = totalRewardsPerYearUSD.div(totalFarmingTokenValueUSD);

        return apr.toFixed();
    }
}
