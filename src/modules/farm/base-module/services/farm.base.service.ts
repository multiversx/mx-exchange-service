import { constantsConfig } from '../../../../config';
import { ExitFarmTokensModel, RewardsModel } from '../../models/farm.model';
import { FarmAbiService } from './farm.abi.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import BigNumber from 'bignumber.js';
import { ruleOfThree } from '../../../../helpers/helpers';
import { FarmComputeService } from './farm.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import {
    FarmTokenAttributesModel,
    FarmTokenAttributesModelV1_3,
    FarmTokenAttributesModelV2,
} from '../../models/farmTokenAttributes.model';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { Inject, forwardRef } from '@nestjs/common';
import { TokenService } from 'src/modules/tokens/services/token.service';

export abstract class FarmServiceBase {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        @Inject(forwardRef(() => FarmComputeService))
        protected readonly farmCompute: FarmComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CacheService,
        protected readonly tokenService: TokenService,
    ) {}

    async getFarmedToken(farmAddress: string): Promise<EsdtToken> {
        const farmedTokenID = await this.farmAbi.farmedTokenID(farmAddress);
        return this.tokenService.tokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.farmAbi.farmTokenID(farmAddress);
        return this.tokenService.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.farmAbi.farmingTokenID(farmAddress);
        return this.tokenService.tokenMetadata(farmingTokenID);
    }

    protected async getRemainingFarmingEpochs(
        farmAddress: string,
        enteringEpoch: number,
    ): Promise<number> {
        const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.farmAbi.minimumFarmingEpochs(farmAddress),
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

        const farmingAmount =
            farmTokenAttributes instanceof FarmTokenAttributesModelV2
                ? farmTokenAttributes.currentFarmAmount
                : (<FarmTokenAttributesModelV1_3>farmTokenAttributes)
                      .initialFarmingAmount;
        let initialFarmingAmount = ruleOfThree(
            new BigNumber(args.liquidity),
            new BigNumber(
                (<FarmTokenAttributesModelV1_3>(
                    farmTokenAttributes
                )).currentFarmAmount,
            ),
            new BigNumber(farmingAmount),
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
            const penaltyPercent = await this.farmAbi.penaltyPercent(
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
    ): FarmTokenAttributesModel;

    async requireOwner(farmAddress: string, sender: string) {
        const owner = await this.farmAbi.ownerAddress(farmAddress);
        if (owner !== sender) throw new Error('You are not the owner.');
    }
}
