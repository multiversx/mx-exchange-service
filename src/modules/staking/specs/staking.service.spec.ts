import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { StakingService } from '../services/staking.service';
import { StakingComputeService } from '../services/staking.compute.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { RemoteConfigGetterServiceProvider } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { Address } from '@multiversx/sdk-core';
import { TokenServiceProvider } from '../../tokens/mocks/token.service.mock';
import { StakingAbiServiceProvider } from '../mocks/staking.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { StakingFilteringService } from '../services/staking.filtering.service';

describe('StakingService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                StakingService,
                StakingAbiServiceProvider,
                StakingComputeService,
                EnergyAbiServiceProvider,
                ContextGetterServiceProvider,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                RemoteConfigGetterServiceProvider,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                MXGatewayService,
                TokenServiceProvider,
                TokenComputeServiceProvider,
                ApiConfigService,
                StakingFilteringService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: StakingService =
            module.get<StakingService>(StakingService);
        expect(service).toBeDefined();
    });

    it('should get farms staking', async () => {
        const service: StakingService =
            module.get<StakingService>(StakingService);
        const farmsStaking = await service.getFarmsStaking();
        expect(farmsStaking.length).toBeGreaterThanOrEqual(1);
    });

    it('should get rewards for position', async () => {
        const service: StakingService =
            module.get<StakingService>(StakingService);
        const rewards = await service.getRewardsForPosition({
            farmAddress:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqes9lzxht',
            liquidity: '1000000000000000',
            identifier: 'MEXFARML-772223-14',
            attributes:
                'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
            vmQuery: false,
            user: Address.Zero().bech32(),
        });
        expect(rewards).toEqual({
            decodedAttributes: {
                attributes:
                    'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                compoundedReward: '0',
                currentFarmAmount:
                    '519205458813209018315265407815173060004346493743728287017479820327455628280230924139593728',
                identifier: 'MEXFARML-772223-14',
                rewardPerShare: '0',
                type: 'stakingFarmToken',
            },
            rewards: '150000000000000001046423',
        });
    });

    it('should get batch rewards for position', async () => {
        const service: StakingService =
            module.get<StakingService>(StakingService);
        const batchRewards = await service.getBatchRewardsForPosition([
            {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqes9lzxht',
                liquidity: '1000000000000000',
                identifier: 'MEXFARML-772223-14',
                attributes:
                    'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                vmQuery: false,
                user: Address.Zero().bech32(),
            },
        ]);
        expect(batchRewards).toEqual([
            {
                decodedAttributes: {
                    attributes:
                        'AAAAAAAAAAAAAAQUAAAAAAAABBQAAAAMBP50cQa8hndHG4AAAAAAAAAAAAwE/nRxBryGd0cbgAA=',
                    compoundedReward: '0',
                    currentFarmAmount:
                        '519205458813209018315265407815173060004346493743728287017479820327455628280230924139593728',
                    identifier: 'MEXFARML-772223-14',
                    rewardPerShare: '0',
                    type: 'stakingFarmToken',
                },
                rewards: '150000000000000001046423',
            },
        ]);
    });
});
