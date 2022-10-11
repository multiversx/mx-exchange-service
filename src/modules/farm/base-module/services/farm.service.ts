import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { constantsConfig } from '../../../../config';
import {
    ExitFarmTokensModel,
    RewardsModel,
    FarmVersion,
} from '../../models/farm.model';
import { AbiFarmService } from './farm.abi.service';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { oneHour, ruleOfThree } from '../../../../helpers/helpers';
import { FarmGetterService } from './farm.getter.service';
import { FarmComputeService } from './farm.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';
import { FarmTokenAttributes } from '@elrondnetwork/erdjs-dex';
import { FarmTokenAttributesModel } from '../../models/farmTokenAttributes.model';
import { CachingService } from 'src/services/caching/cache.service';
import { FarmModelV1_2 } from '../../models/farm.v1.2.model';
import { FarmModelV1_3 } from '../../models/farm.v1.3.model';
import { FarmCustomModel } from '../../models/farm.custom.model';
import { FarmsUnion } from '../../models/farm.union';
import { FarmModelV2 } from '../../models/farm.v2.model';

@Injectable()
export class FarmService {
    constructor(
        protected readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmGetterService))
        protected readonly farmGetter: FarmGetterService,
        protected readonly farmCompute: FarmComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    getFarms(): Array<typeof FarmsUnion> {
        const farms: Array<typeof FarmsUnion> = [];
        for (const address of farmsAddresses()) {
            const version = farmVersion(address);
            switch (version) {
                case FarmVersion.V1_2:
                    farms.push(
                        new FarmModelV1_2({
                            address,
                            version,
                        }),
                    );
                    break;
                case FarmVersion.V1_3:
                    farms.push(
                        new FarmModelV1_3({
                            address,
                            version,
                            rewardType: farmType(address),
                        }),
                    );
                    break;
                case FarmVersion.V2:
                    farms.push(
                        new FarmModelV2({
                            address,
                            version,
                        }),
                    );
                default:
                    farms.push(
                        new FarmCustomModel({
                            address,
                        }),
                    );
                    break;
            }
        }

        return farms;
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.farmGetter.getFarmTokenID(
                farmAddress,
            );
            if (tokenID === farmTokenID) {
                return true;
            }
        }
        return false;
    }

    async getFarmAddressByFarmTokenID(
        tokenID: string,
    ): Promise<string | undefined> {
        const cachedValue: string = await this.cachingService.getCache(
            `${tokenID}.farmAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.farmGetter.getFarmTokenID(
                farmAddress,
            );
            if (farmTokenID === tokenID) {
                await this.cachingService.setCache(
                    `${tokenID}.farmAddress`,
                    farmAddress,
                    oneHour(),
                );
                return farmAddress;
            }
        }
        return undefined;
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<RewardsModel[]> {
        const promises = positions.map(async (position) => {
            return await this.getRewardsForPosition(position);
        });
        return await Promise.all(promises);
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        const farmTokenAttributes: FarmTokenAttributes =
            FarmTokenAttributes.fromAttributes(
                farmVersion(positon.farmAddress),
                positon.attributes,
            );
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.abiService.calculateRewardsForGivenPosition(
                positon,
            );
        } else {
            rewards = await this.farmCompute.computeFarmRewardsForPosition(
                positon.farmAddress,
                positon.liquidity,
                farmTokenAttributes,
            );
        }

        const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.farmGetter.getMinimumFarmingEpochs(positon.farmAddress),
        ]);

        const remainingFarmingEpochs = Math.max(
            0,
            minimumFarmingEpochs -
                (currentEpoch - farmTokenAttributes.enteringEpoch),
        );

        return new RewardsModel({
            decodedAttributes: new FarmTokenAttributesModel({
                ...farmTokenAttributes.toJSON(),
                attributes: positon.attributes,
                identifier: positon.identifier,
            }),
            remainingFarmingEpochs: remainingFarmingEpochs,
            rewards: rewards.integerValue().toFixed(),
        });
    }

    async getTokensForExitFarm(
        args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        const farmTokenAttributes = FarmTokenAttributes.fromAttributes(
            farmVersion(args.farmAddress),
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

    decodeFarmTokenAttributes(
        farmAddress: string,
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        const farmTokenAttributes = FarmTokenAttributes.fromAttributes(
            farmVersion(farmAddress),
            attributes,
        );
        return new FarmTokenAttributesModel({
            ...farmTokenAttributes.toJSON(),
            attributes: attributes,
            identifier: identifier,
        });
    }

    async requireOwner(farmAddress: string, sender: string) {
        if ((await this.farmGetter.getOwnerAddress(farmAddress)) !== sender)
            throw new Error('You are not the owner.');
    }
}
