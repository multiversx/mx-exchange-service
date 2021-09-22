import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BinaryCodec } from '@elrondnetwork/erdjs';
import { constantsConfig, farmsConfig } from '../../../config';
import {
    ExitFarmTokensModel,
    FarmModel,
    RewardsModel,
} from '../models/farm.model';
import { AbiFarmService } from './abi-farm.service';
import { CalculateRewardsArgs } from '../models/farm.args';
import { ContextService } from '../../../services/context/context.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ruleOfThree } from '../../../helpers/helpers';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { FarmGetterService } from './farm.getter.service';
import { FarmComputeService } from './farm.compute.service';

@Injectable()
export class FarmService {
    constructor(
        private readonly abiService: AbiFarmService,
        @Inject(forwardRef(() => FarmGetterService))
        private readonly farmGetterService: FarmGetterService,
        private readonly farmComputeService: FarmComputeService,
        private readonly context: ContextService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getFarms(): FarmModel[] {
        const farms: Array<FarmModel> = [];
        for (const farmAddress of farmsConfig) {
            farms.push(new FarmModel({ address: farmAddress }));
        }

        return farms;
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.farmGetterService.getFarmTokenID(
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
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.farmGetterService.getFarmTokenID(
                farmAddress,
            );
            if (farmTokenID === tokenID) {
                return farmAddress;
            }
        }
        return undefined;
    }

    async getRewardsForPosition(
        args: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        const farmTokenAttributes = this.decodeFarmTokenAttributes(
            args.identifier,
            args.attributes,
        );
        let rewards: BigNumber;
        if (args.vmQuery) {
            rewards = await this.abiService.calculateRewardsForGivenPosition(
                args,
            );
        } else {
            rewards = await this.farmComputeService.computeFarmRewardsForPosition(
                args.farmAddress,
                args.liquidity,
                farmTokenAttributes,
            );
        }

        const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
            this.context.getCurrentEpoch(),
            this.farmGetterService.getMinimumFarmingEpochs(args.farmAddress),
        ]);

        const remainingFarmingEpochs = Math.max(
            0,
            minimumFarmingEpochs -
                (currentEpoch - farmTokenAttributes.enteringEpoch),
        );
        return new RewardsModel({
            decodedAttributes: farmTokenAttributes,
            remainingFarmingEpochs: remainingFarmingEpochs,
            rewards: rewards.toFixed(),
        });
    }

    async getTokensForExitFarm(
        args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        const decodedAttributes = this.decodeFarmTokenAttributes(
            args.identifier,
            args.attributes,
        );
        let initialFarmingAmount = ruleOfThree(
            new BigNumber(args.liquidity),
            new BigNumber(decodedAttributes.currentFarmAmount),
            new BigNumber(decodedAttributes.initialFarmingAmount),
        );
        const rewardsForPosition = await this.getRewardsForPosition(args);
        let rewards = new BigNumber(rewardsForPosition.rewards);
        rewards = rewards.plus(
            ruleOfThree(
                new BigNumber(args.liquidity),
                new BigNumber(decodedAttributes.currentFarmAmount),
                new BigNumber(decodedAttributes.compoundedReward),
            ),
        );

        if (rewardsForPosition.remainingFarmingEpochs > 0) {
            const penaltyPercent = await this.farmGetterService.getPenaltyPercent(
                args.farmAddress,
            );
            initialFarmingAmount = initialFarmingAmount.minus(
                initialFarmingAmount
                    .multipliedBy(penaltyPercent)
                    .dividedBy(constantsConfig.MAX_PENALTY_PERCENT)
                    .integerValue(),
            );
            rewards = rewards.minus(
                rewards
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
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();

        const structType = FarmTokenAttributesModel.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        const decodedAttributes = decoded.valueOf();
        const farmTokenAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes,
        );
        farmTokenAttributes.attributes = attributes;
        farmTokenAttributes.identifier = identifier;
        return farmTokenAttributes;
    }
}
