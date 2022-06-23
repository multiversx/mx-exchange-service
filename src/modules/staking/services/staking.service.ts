import {
    StakingFarmTokenAttributes,
    UnbondFarmTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { StakingModel, StakingRewardsModel } from '../models/staking.model';
import {
    StakingTokenAttributesModel,
    UnbondTokenAttributesModel,
} from '../models/stakingTokenAttributes.model';
import { AbiStakingService } from './staking.abi.service';
import { StakingComputeService } from './staking.compute.service';
import { StakingGetterService } from './staking.getter.service';

@Injectable()
export class StakingService {
    constructor(
        private readonly abiService: AbiStakingService,
        private readonly stakingGetterService: StakingGetterService,
        private readonly stakingComputeService: StakingComputeService,
        private readonly contextGetter: ContextGetterService,
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
        args: DecodeAttributesArgs,
    ): StakingTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return new StakingTokenAttributesModel({
                ...StakingFarmTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
                attributes: arg.attributes,
                identifier: arg.identifier,
            });
        });
    }

    async decodeUnboundTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<UnbondTokenAttributesModel[]> {
        const decodedAttributesBatch = [];
        for (const arg of args.batchAttributes) {
            const unboundFarmTokenAttributes = UnbondFarmTokenAttributes.fromAttributes(
                arg.attributes,
            );
            const remainingEpochs = await this.getUnbondigRemaingEpochs(
                unboundFarmTokenAttributes.remainingEpochs,
            );
            decodedAttributesBatch.push(
                new UnbondTokenAttributesModel({
                    ...unboundFarmTokenAttributes.toJSON(),
                    remainingEpochs,
                    attributes: arg.attributes,
                    identifier: arg.identifier,
                }),
            );
        }

        return decodedAttributesBatch;
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
        const stakeTokenAttributes = this.decodeStakingTokenAttributes({
            batchAttributes: [
                {
                    attributes: positon.attributes,
                    identifier: positon.identifier,
                },
            ],
        });
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
                stakeTokenAttributes[0],
            );
        }

        return new StakingRewardsModel({
            decodedAttributes: stakeTokenAttributes[0],
            rewards: rewards.integerValue().toFixed(),
        });
    }

    private async getUnbondigRemaingEpochs(
        unlockEpoch: number,
    ): Promise<number> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        return unlockEpoch - currentEpoch > 0 ? unlockEpoch - currentEpoch : 0;
    }

    async getStakeFarmAddressByStakeFarmTokenID(
        tokenID: string,
    ): Promise<string> {
        const stakeFarmAddresses: string[] = scAddress.staking;

        for (const address of stakeFarmAddresses) {
            const stakeFarmTokenID = await this.stakingGetterService.getFarmTokenID(
                address,
            );
            if (tokenID === stakeFarmTokenID) {
                return address;
            }
        }

        return undefined;
    }
}
