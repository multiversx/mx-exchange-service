import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { FarmService } from 'src/modules/farm/services/farm.service';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { DualYieldTokenAttributesModel } from '../models/dualYieldTokenAttributes.model';
import {
    DualYieldRewardsModel,
    StakingProxyModel,
} from '../models/staking.proxy.model';
import { StakingProxyGetterService } from './staking.proxy.getter.service';

@Injectable()
export class StakingProxyService {
    constructor(
        private readonly stakingProxyGetter: StakingProxyGetterService,
        private readonly stakingService: StakingService,
        private readonly farmService: FarmService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getStakingProxies(): StakingProxyModel[] {
        const stakingProxiesAddress: string[] = scAddress.stakingProxy;
        const stakingProxies: StakingProxyModel[] = [];
        for (const address of stakingProxiesAddress) {
            stakingProxies.push(
                new StakingProxyModel({
                    address,
                }),
            );
        }
        return stakingProxies;
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<DualYieldRewardsModel[]> {
        const promises = positions.map(async position => {
            return await this.getRewardsForPosition(position);
        });
        return await Promise.all(promises);
    }

    async getRewardsForPosition(
        position: CalculateRewardsArgs,
    ): Promise<DualYieldRewardsModel> {
        const decodedAttributes = this.decodeDualYieldTokenAttributes({
            batchAttributes: [
                {
                    attributes: position.attributes,
                    identifier: position.identifier,
                },
            ],
        });

        const [
            farmAddress,
            stakingFarmAddress,
            farmTokenID,
            stakingTokenID,
        ] = await Promise.all([
            this.stakingProxyGetter.getLpFarmAddress(position.farmAddress),
            this.stakingProxyGetter.getStakingFarmAddress(position.farmAddress),
            this.stakingProxyGetter.getLpFarmTokenID(position.farmAddress),
            this.stakingProxyGetter.getFarmTokenID(position.farmAddress),
        ]);

        const [farmToken, stakingToken] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                position.farmAddress,
                tokenIdentifier(
                    farmTokenID,
                    decodedAttributes[0].lpFarmTokenNonce,
                ),
            ),
            this.apiService.getNftByTokenIdentifier(
                position.farmAddress,
                tokenIdentifier(
                    stakingTokenID,
                    decodedAttributes[0].stakingFarmTokenNonce,
                ),
            ),
        ]);

        const [farmRewards, stakingRewards] = await Promise.all([
            this.farmService.getRewardsForPosition({
                attributes: farmToken.attributes,
                identifier: farmToken.identifier,
                farmAddress,
                liquidity: decodedAttributes[0].lpFarmTokenAmount,
                vmQuery: position.vmQuery,
            }),
            this.stakingService.getRewardsForPosition({
                attributes: stakingToken.attributes,
                identifier: stakingToken.identifier,
                farmAddress: stakingFarmAddress,
                liquidity: decodedAttributes[0].stakingFarmTokenAmount,
                vmQuery: position.vmQuery,
            }),
        ]);

        return new DualYieldRewardsModel({
            farmRewards,
            stakingRewards,
        });
    }

    decodeDualYieldTokenAttributes(
        args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            const attributesBuffer = Buffer.from(arg.attributes, 'base64');
            const codec = new BinaryCodec();
            const structType = DualYieldTokenAttributesModel.getStructure();
            const [decoded] = codec.decodeNested(attributesBuffer, structType);
            const decodedAttributes = decoded.valueOf();
            const dualYieldTokenAttributes = DualYieldTokenAttributesModel.fromDecodedAttributes(
                decodedAttributes,
            );
            dualYieldTokenAttributes.identifier = arg.identifier;
            dualYieldTokenAttributes.attributes = arg.attributes;

            return dualYieldTokenAttributes;
        });
    }
}
