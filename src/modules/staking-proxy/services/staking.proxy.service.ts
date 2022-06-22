import { DualYieldTokenAttributes } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { ruleOfThree } from 'src/helpers/helpers';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { FarmService } from 'src/modules/farm/services/farm.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { DualYieldTokenAttributesModel } from '../models/dualYieldTokenAttributes.model';
import {
    DualYieldRewardsModel,
    StakingProxyModel,
    UnstakeFarmTokensReceiveModel,
} from '../models/staking.proxy.model';
import { StakingProxyGetterService } from './staking.proxy.getter.service';

@Injectable()
export class StakingProxyService {
    constructor(
        private readonly stakingProxyGetter: StakingProxyGetterService,
        private readonly stakingService: StakingService,
        private readonly farmService: FarmService,
        private readonly pairService: PairService,
        private readonly apiService: ElrondApiService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getStakingProxies(): Promise<StakingProxyModel[]> {
        const stakingProxiesAddress: string[] = await this.remoteConfigGetterService.getStakingProxyAddresses();

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

    async getUnstakeTokensReceived(
        position: CalculateRewardsArgs,
    ): Promise<UnstakeFarmTokensReceiveModel> {
        const decodedAttributes = this.decodeDualYieldTokenAttributes({
            batchAttributes: [
                {
                    attributes: position.attributes,
                    identifier: position.identifier,
                },
            ],
        });

        const lpFarmTokenAmount = ruleOfThree(
            new BigNumber(position.liquidity),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const pairAddress = await this.stakingProxyGetter.getPairAddress(
            position.farmAddress,
        );

        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            lpFarmTokenAmount.toFixed(),
        );

        const dualYieldRewards = await this.getRewardsForPosition(position);

        return new UnstakeFarmTokensReceiveModel({
            liquidityPosition,
            farmRewards: dualYieldRewards.farmRewards.rewards,
            stakingRewards: dualYieldRewards.stakingRewards.rewards,
        });
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

        const lpFarmTokenAmount = ruleOfThree(
            new BigNumber(position.liquidity),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const [farmRewards, stakingRewards] = await Promise.all([
            this.farmService.getRewardsForPosition({
                attributes: farmToken.attributes,
                identifier: farmToken.identifier,
                farmAddress,
                liquidity: lpFarmTokenAmount.toFixed(),
                vmQuery: position.vmQuery,
            }),
            this.stakingService.getRewardsForPosition({
                attributes: stakingToken.attributes,
                identifier: stakingToken.identifier,
                farmAddress: stakingFarmAddress,
                liquidity: position.liquidity,
                vmQuery: position.vmQuery,
            }),
        ]);

        return new DualYieldRewardsModel({
            attributes: position.attributes,
            identifier: position.identifier,
            farmRewards,
            stakingRewards,
        });
    }

    decodeDualYieldTokenAttributes(
        args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return new DualYieldTokenAttributesModel({
                ...DualYieldTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
                attributes: arg.attributes,
                identifier: arg.identifier,
            });
        });
    }

    async getStakingProxyAddressByDualYieldTokenID(
        tokenID: string,
    ): Promise<string> {
        const stakingProxiesAddress: string[] = await this.remoteConfigGetterService.getStakingProxyAddresses();

        for (const address of stakingProxiesAddress) {
            const dualYieldTokenID = await this.stakingProxyGetter.getDualYieldTokenID(
                address,
            );
            if (dualYieldTokenID === tokenID) {
                return address;
            }
        }

        return undefined;
    }
}
