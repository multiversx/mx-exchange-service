import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextService } from 'src/services/context/context.service';
import { Logger } from 'winston';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { FarmGetterService } from './farm.getter.service';

@Injectable()
export class FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmGetterService))
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly context: ContextService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmGetterService.getFarmedTokenID(
            farmAddress,
        );
        if (scAddress.has(farmedTokenID)) {
            const tokenPriceUSD = await this.pairService.computeTokenPriceUSD(
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
            const tokenPriceUSD = await this.pairService.computeTokenPriceUSD(
                farmingTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairService.getLpTokenPriceUSD(pairAddress);
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
            this.context.getShardCurrentBlockNonce(1),
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
}
