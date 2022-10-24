import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { constantsConfig } from '../../../../config';
import { ExitFarmTokensModel, RewardsModel } from '../../models/farm.model';
import { AbiFarmService } from './farm.abi.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ruleOfThree } from '../../../../helpers/helpers';
import { FarmGetterService } from './farm.getter.service';
import { FarmComputeService } from './farm.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { FarmTokenAttributesModelV1_3 } from '../../models/farmTokenAttributes.model';
import { CachingService } from 'src/services/caching/cache.service';

@Injectable()
export abstract class FarmServiceBase {
    constructor(
        protected readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmGetterService))
        protected readonly farmGetter: FarmGetterService,
        protected readonly farmCompute: FarmComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    protected async getRemainingFarmingEpochs(
        farmAddress: string,
        enteringEpoch: number,
    ): Promise<number> {
        const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.farmGetter.getMinimumFarmingEpochs(farmAddress),
        ]);

        return Math.max(
            0,
            minimumFarmingEpochs - (currentEpoch - enteringEpoch),
        );
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<RewardsModel[]> {
        const promises = positions.map(async (position) => {
            return await this.getRewardsForPosition(position);
        });
        return await Promise.all(promises);
    }

    abstract getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModel>;

    async getTokensForExitFarm(
        args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        const farmTokenAttributes = this.decodeFarmTokenAttributes(
            args.identifier,
            args.attributes,
        );
        let initialFarmingAmount = ruleOfThree(
            new BigNumber(args.liquidity),
            new BigNumber(farmTokenAttributes.currentFarmAmount),
            new BigNumber(farmTokenAttributes.initialFarmingAmount),
        );
        const rewardsForPosition = await this.getRewardsForPosition(args);
        let rewards = new BigNumber(rewardsForPosition.rewards);
        rewards = rewards.plus(
            ruleOfThree(
                new BigNumber(args.liquidity),
                new BigNumber(farmTokenAttributes.currentFarmAmount),
                new BigNumber(farmTokenAttributes.compoundedReward),
            ),
        );

        if (rewardsForPosition.remainingFarmingEpochs > 0) {
            const penaltyPercent = await this.farmGetter.getPenaltyPercent(
                args.farmAddress,
            );
            initialFarmingAmount = initialFarmingAmount.minus(
                initialFarmingAmount
                    .multipliedBy(penaltyPercent)
                    .dividedBy(constantsConfig.MAX_PENALTY_PERCENT)
                    .integerValue(),
            );
        }

        return new ExitFarmTokensModel({
            farmingTokens: initialFarmingAmount.toFixed(),
            rewards: rewards.toFixed(),
        });
    }

    abstract decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_3;

    async requireOwner(farmAddress: string, sender: string) {
        const owner = await this.farmGetter.getOwnerAddress(farmAddress);
        if (owner !== sender) throw new Error('You are not the owner.');
    }
}
