import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { FarmTokenAttributesModel } from '../../models/farmTokenAttributes.model';
import { FarmGetterService } from './farm.getter.service';

@Injectable()
export class FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmGetterService))
        protected readonly farmGetter: FarmGetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetter: PairGetterService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        return '0';
    }

    async computeFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmGetter.getFarmedTokenID(
            farmAddress,
        );
        if (scAddress.has(farmedTokenID)) {
            const tokenPriceUSD =
                await this.tokenCompute.computeTokenPriceDerivedUSD(
                    farmedTokenID,
                );
            return tokenPriceUSD;
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            farmedTokenID,
        );
    }

    async computeFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.farmGetter.getFarmingTokenID(
            farmAddress,
        );
        if (scAddress.has(farmingTokenID)) {
            return await this.tokenCompute.computeTokenPriceDerivedUSD(
                farmingTokenID,
            );
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairCompute.computeLpTokenPriceUSD(pairAddress);
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
            divisionSafetyConstant,
            farmTokenSupply,
            farmRewardPerShare,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.farmGetter.getLastRewardBlockNonce(farmAddress),
            this.farmGetter.getRewardsPerBlock(farmAddress),
            this.farmGetter.getDivisionSafetyConstant(farmAddress),
            this.farmGetter.getFarmTokenSupply(farmAddress),
            this.farmGetter.getRewardPerShare(farmAddress),
            this.farmGetter.getProduceRewardsEnabled(farmAddress),
        ]);

        const amountBig = new BigNumber(liquidity);
        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const rewardPerShareBig = new BigNumber(
            decodedAttributes.rewardPerShare,
        );

        let toBeMinted = new BigNumber(0);

        if (currentNonce > lastRewardBlockNonce && produceRewardsEnabled) {
            toBeMinted = perBlockRewardAmountBig.times(
                currentBlockBig.minus(lastRewardBlockNonceBig),
            );
        }
        const rewardIncrease = toBeMinted;
        const rewardPerShareIncrease = rewardIncrease
            .times(divisionSafetyConstantBig)
            .dividedBy(farmTokenSupplyBig);
        const futureRewardPerShare = farmRewardPerShareBig.plus(
            rewardPerShareIncrease,
        );

        if (
            futureRewardPerShare.isGreaterThan(decodedAttributes.rewardPerShare)
        ) {
            const rewardPerShareDiff =
                futureRewardPerShare.minus(rewardPerShareBig);

            return amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig);
        }
        return new BigNumber(0);
    }

    async computeAnualRewardsUSD(farmAddress: string): Promise<string> {
        const farmedToken = await this.farmGetter.getFarmedToken(farmAddress);

        const [farmedTokenPriceUSD, rewardsPerBlock] = await Promise.all([
            this.tokenCompute.computeTokenPriceDerivedUSD(
                farmedToken.identifier,
            ),
            this.farmGetter.getRewardsPerBlock(farmAddress),
        ]);

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );

        return computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD,
        ).toFixed();
    }
}
