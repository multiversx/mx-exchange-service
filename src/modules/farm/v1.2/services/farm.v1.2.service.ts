import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { RewardsModelV1_2 } from '../../models/farm.model';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { FarmAbiServiceV1_2 } from './farm.v1.2.abi.service';
import { FarmGetterServiceV1_2 } from './farm.v1.2.getter.service';
import { FarmComputeServiceV1_2 } from './farm.v1.2.compute.service';
import { FarmTokenAttributesV1_2 } from '@elrondnetwork/erdjs-dex';
import { FarmTokenAttributesModelV1_2 } from '../../models/farmTokenAttributes.model';
import { FarmService } from '../../base-module/services/farm.service';

@Injectable()
export class FarmServiceV1_2 extends FarmService {
    constructor(
        protected readonly abiService: FarmAbiServiceV1_2,
        @Inject(forwardRef(() => FarmGetterServiceV1_2))
        protected readonly farmGetter: FarmGetterServiceV1_2,
        protected readonly farmCompute: FarmComputeServiceV1_2,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            abiService,
            farmGetter,
            farmCompute,
            contextGetter,
            cachingService,
            logger,
        );
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModelV1_2> {
        const farmTokenAttributes = FarmTokenAttributesV1_2.fromAttributes(
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

        return new RewardsModelV1_2({
            decodedAttributes: farmTokenAttributes,
            remainingFarmingEpochs: await this.getRemainingFarmingEpochs(
                positon.farmAddress,
                farmTokenAttributes.enteringEpoch,
            ),
            rewards: rewards.integerValue().toFixed(),
        });
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_2 {
        return new FarmTokenAttributesModelV1_2({
            ...FarmTokenAttributesV1_2.fromAttributes(attributes).toJSON(),
            attributes: attributes,
            identifier: identifier,
        });
    }
}
