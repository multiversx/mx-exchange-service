import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { farmsAddresses, farmVersion } from 'src/utils/farm.utils';
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
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }

        const [
            unlockedFarmingTokenReserve,
            farmingTokenReserve,
        ] = await Promise.all([
            this.computeUnlockedFarmingTokenReserve(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);
        return new BigNumber(farmingTokenReserve)
            .minus(unlockedFarmingTokenReserve)
            .toFixed();
    }

    async computeUnlockedFarmingTokenReserve(
        farmAddress: string,
    ): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }
        const [
            farmingTokenReserve,
            farmTokenSupply,
            aprMultiplier,
        ] = await Promise.all([
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
            this.farmGetterService.getFarmTokenSupply(farmAddress),
            this.farmGetterService.getLockedRewardAprMuliplier(farmAddress),
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
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }

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
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }

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

    async computeVirtualValueLockedUSD(farmAddress: string): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }
        const [
            lockedFarmingTokenReserveUSD,
            unlockedFarmingTokenReserveUSD,
            aprMultiplier,
        ] = await Promise.all([
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.computeUnlockedFarmingTokenReserveUSD(farmAddress),
            this.farmGetterService.getLockedRewardAprMuliplier(farmAddress),
        ]);

        return new BigNumber(lockedFarmingTokenReserveUSD)
            .times(aprMultiplier)
            .plus(unlockedFarmingTokenReserveUSD)
            .toFixed();
    }

    async computeAnualRewardsUSD(farmAddress: string): Promise<string> {
        const farmedToken = await this.farmGetterService.getFarmedToken(
            farmAddress,
        );

        const [farmedTokenPriceUSD, rewardsPerBlock] = await Promise.all([
            this.pairComputeService.computeTokenPriceUSD(
                farmedToken.identifier,
            ),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
            this.computeUnlockedFarmingTokenReserveUSD(farmAddress),
            this.computeVirtualValueLockedUSD(farmAddress),
        ]);

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );

        return computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD.toFixed(),
        ).toFixed();
    }

    async computeUnlockedRewardsAPR(farmAddress: string): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            unlockedFarmingTokenReserveUSD,
        ] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
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
            const pairAddress = await this.pairService.getPairAddressByLpTokenID(
                farmingTokenID,
            );
            feesAPR = new BigNumber(
                await this.pairGetterService.getFeesAPR(pairAddress),
            );
        }
        return unlockedRewardsAPR.plus(feesAPR).toFixed();
    }

    async computeLockedRewardsAPR(farmAddress: string): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.2') {
            return null;
        }
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            virtualValueLockedUSD,
            lockedFarmingTokenReserveUSD,
            aprMultiplier,
        ] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeVirtualValueLockedUSD(farmAddress),
            this.computeLockedFarmingTokenReserveUSD(farmAddress),
            this.farmGetterService.getLockedRewardAprMuliplier(farmAddress),
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
            const pairAddress = await this.pairService.getPairAddressByLpTokenID(
                farmingTokenID,
            );
            feesAPR = new BigNumber(
                await this.pairGetterService.getFeesAPR(pairAddress),
            );
        }
        return lockedRewardsAPR.plus(feesAPR).toFixed();
    }

    async computeFarmTokenSupplyUSD(farmAddress: string): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.3') {
            return null;
        }

        const [farmingToken, farmTokenSupply] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.farmGetterService.getFarmTokenSupply(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
                scAddress.get(farmingToken.identifier),
                farmingToken.identifier,
            );
            return computeValueUSD(
                farmTokenSupply,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );

        return await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmTokenSupply,
        );
    }

    async computeFarmAPR(farmAddress: string): Promise<string> {
        if (farmVersion(farmAddress) !== 'v1.3') {
            return null;
        }

        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeFarmTokenSupplyUSD(farmAddress),
        ]);

        const apr = new BigNumber(totalRewardsPerYearUSD).div(
            farmTokenSupplyUSD,
        );

        let feesAPR: BigNumber;
        if (farmedTokenID !== farmingTokenID) {
            const pairAddress = await this.pairService.getPairAddressByLpTokenID(
                farmingTokenID,
            );

            feesAPR = pairAddress
                ? new BigNumber(
                      await this.pairGetterService.getFeesAPR(pairAddress),
                  )
                : new BigNumber(0);
        }
        return feesAPR.isNaN() ? apr.toFixed() : apr.plus(feesAPR).toFixed();
    }
}
