import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { Logger } from 'winston';
import { StakingModel, StakingRewardsModel } from '../models/staking.model';
import {
    StakingTokenAttributesModel,
    UnboundTokenAttributesModel,
} from '../models/stakingTokenAttributes.model';
import { AbiStakingService } from './staking.abi.service';
import { StakingComputeService } from './staking.compute.service';

@Injectable()
export class StakingService {
    constructor(
        private readonly abiService: AbiStakingService,
        private readonly stakingComputeService: StakingComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getFarmsStaking(): StakingModel[] {
        const farmsStakingAddresses = scAddress.staking;
        const farmsStaking: StakingModel[] = [];
        for (const address of farmsStakingAddresses) {
            farmsStaking.push(
                new StakingModel({
                    address,
                }),
            );
        }

        return farmsStaking;
    }

    decodeStakingTokenAttributes(
        identifier: string,
        attributes: string,
    ): StakingTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = StakingTokenAttributesModel.getStructure();
        const [decoded] = codec.decodeNested(attributesBuffer, structType);
        const decodedAttributes = decoded.valueOf();
        const stakingTokenAttributes = StakingTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes,
        );

        stakingTokenAttributes.identifier = identifier;
        stakingTokenAttributes.attributes = attributes;

        return stakingTokenAttributes;
    }

    decodeUnboundTokenAttributes(
        identifier: string,
        attributes: string,
    ): UnboundTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = UnboundTokenAttributesModel.getStructure();
        const [decoded] = codec.decodeNested(attributesBuffer, structType);
        const decodedAttributes = decoded.valueOf();
        const unboundFarmTokenAttributes = UnboundTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes,
        );

        unboundFarmTokenAttributes.identifier = identifier;
        unboundFarmTokenAttributes.attributes = attributes;

        return unboundFarmTokenAttributes;
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<StakingRewardsModel[]> {
        const promises = positions.map(async position => {
            return await this.getRewardsForPosition(position);
        });
        return await Promise.all(promises);
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<StakingRewardsModel> {
        const stakeTokenAttributes = this.decodeStakingTokenAttributes(
            positon.identifier,
            positon.attributes,
        );
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.abiService.calculateRewardsForGivenPosition(
                positon.farmAddress,
                positon.liquidity,
                positon.attributes,
            );
        } else {
            rewards = await this.stakingComputeService.computeStakeRewardsForPosition(
                positon.farmAddress,
                positon.liquidity,
                stakeTokenAttributes,
            );
        }

        return new StakingRewardsModel({
            decodedAttributes: stakeTokenAttributes,
            rewards: rewards.integerValue().toFixed(),
        });
    }
}
