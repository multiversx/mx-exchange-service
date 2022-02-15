import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { StakingTokenAttributesModel } from '../models/stakingTokenAttributes.model';
import { StakingGetterService } from './staking.getter.service';

@Injectable()
export class StakingComputeService {
    constructor(
        private readonly stakingGetterService: StakingGetterService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeStakeRewardsForPosition(
        stakeAddress: string,
        liquidity: string,
        decodedAttributes: StakingTokenAttributesModel,
    ): Promise<BigNumber> {
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            divisionSafetyConstant,
            farmTokenSupply,
            farmRewardPerShare,
            maximumAPR,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.stakingGetterService.getLastRewardBlockNonce(stakeAddress),
            this.stakingGetterService.getPerBlockRewardAmount(stakeAddress),
            this.stakingGetterService.getDivisionSafetyConstant(stakeAddress),
            this.stakingGetterService.getFarmTokenSupply(stakeAddress),
            this.stakingGetterService.getRewardPerShare(stakeAddress),
            this.stakingGetterService.getAnnualPercentageRewards(stakeAddress),
            this.stakingGetterService.getProduceRewardsEnabled(stakeAddress),
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
        let rewardsBig: BigNumber = new BigNumber(0);
        if (
            futureRewardPerShare.isGreaterThan(decodedAttributes.rewardPerShare)
        ) {
            const rewardPerShareDiff = futureRewardPerShare.minus(
                rewardPerShareBig,
            );

            rewardsBig = amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig);
        }

        const blockDiff = currentBlockBig.minus(
            decodedAttributes.lastClaimBlock,
        );
        const maxRewardsForUserPerBlock = new BigNumber(liquidity)
            .multipliedBy(maximumAPR)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .dividedBy(constantsConfig.BLOCKS_IN_YEAR);
        const maxRewardsForUser = maxRewardsForUserPerBlock.multipliedBy(
            blockDiff,
        );

        return maxRewardsForUser.isLessThan(rewardsBig)
            ? maxRewardsForUser
            : rewardsBig;
    }
}
