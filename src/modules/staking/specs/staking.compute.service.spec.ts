import { Test, TestingModule } from '@nestjs/testing';
import { StakingComputeService } from '../services/staking.compute.service';
import { Address } from '@multiversx/sdk-core';
import { StakingTokenAttributesModel } from '../models/stakingTokenAttributes.model';
import BigNumber from 'bignumber.js';
import { StakingFarmTokenType } from '@multiversx/sdk-exchange';
import { TokenServiceProvider } from '../../tokens/mocks/token.service.mock';
import { StakingAbiServiceProvider } from '../mocks/staking.abi.service.mock';
import { StakingAbiService } from '../services/staking.abi.service';
import { StakingService } from '../services/staking.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { RemoteConfigGetterServiceProvider } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { OptimalCompoundModel } from '../models/staking.model';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { StakingFilteringService } from '../services/staking.filtering.service';

describe('StakingComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({}),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                StakingComputeService,
                StakingService,
                StakingAbiServiceProvider,
                EnergyAbiServiceProvider,
                TokenServiceProvider,
                TokenComputeServiceProvider,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                ContextGetterServiceProvider,
                MXApiServiceProvider,
                RemoteConfigGetterServiceProvider,
                ApiConfigService,
                StakingFilteringService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );
        expect(service).toBeDefined();
    });

    it('should compute stake rewards for position', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );

        const stakeRewardsForPosition =
            await service.computeStakeRewardsForPosition(
                Address.Zero().bech32(),
                '10000000000',
                new StakingTokenAttributesModel({
                    type: StakingFarmTokenType.STAKING_FARM_TOKEN,
                    rewardPerShare: '1000',
                    compoundedReward: '1000000',
                    currentFarmAmount: '1000000000',
                }),
            );
        expect(stakeRewardsForPosition.toFixed()).toEqual(
            '1500000000000000000.46423135464231354642',
        );
    });

    it('should compute future rewards per share', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );

        const futureRewardsPerShare =
            await service.computeFutureRewardsPerShare(Address.Zero().bech32());
        expect(futureRewardsPerShare.toFixed()).toEqual(
            '150000000000000001046.42313546423135464231',
        );
    });

    it('should compute extra rewards since last allocation', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );

        const extraRewardsSinceLastAllocation =
            await service.computeExtraRewardsSinceLastAllocation(
                Address.Zero().bech32(),
            );
        expect(extraRewardsSinceLastAllocation).toEqual(
            new BigNumber(5500000000),
        );
    });

    it('should compute extra rewards bounded', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );

        const extraRewardsBounded = await service.computeExtraRewardsBounded(
            Address.Zero().bech32(),
            new BigNumber(100000000),
        );
        expect(extraRewardsBounded).toEqual(
            new BigNumber(10000000000000000000),
        );
    });

    it('should compute farm staking apr from token supply', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );
        const stakingAbi = module.get<StakingAbiService>(StakingAbiService);

        jest.spyOn(stakingAbi, 'farmTokenSupply').mockImplementation(
            async () => '10000000000000000000000000',
        );
        jest.spyOn(stakingAbi, 'perBlockRewardsAmount').mockImplementation(
            async () => '4138000000000000000',
        );
        jest.spyOn(stakingAbi, 'annualPercentageRewards').mockImplementation(
            async () => '2500',
        );

        const apr = await service.computeStakeFarmAPR(Address.Zero().bech32());
        expect(apr).toEqual('0.25');
    });

    it('should compute farm staking apr from rewards', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );
        const stakingAbi = module.get<StakingAbiService>(StakingAbiService);
        jest.spyOn(stakingAbi, 'farmTokenSupply').mockImplementation(
            async () => '100000000000000000000000000',
        );
        jest.spyOn(stakingAbi, 'perBlockRewardsAmount').mockImplementation(
            async () => '4138000000000000000',
        );
        jest.spyOn(stakingAbi, 'annualPercentageRewards').mockImplementation(
            async () => '2500',
        );

        const apr = await service.computeStakeFarmAPR(Address.Zero().bech32());
        expect(apr).toEqual('0.21749328');
    });

    it('should compute optimal compound frequency', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );
        jest.spyOn(service, 'stakeFarmAPR').mockResolvedValue('0.10');
        const optimalCompoundFrequency =
            await service.computeOptimalCompoundFrequency(
                Address.Zero().bech32(),
                '1000000000000000000000',
                365,
            );

        expect(optimalCompoundFrequency).toEqual(
            new OptimalCompoundModel({
                optimalProfit: 103.68922538240217,
                interval: 7,
                days: 52,
                hours: 3,
                minutes: 25,
            }),
        );
    });

    it('should NOT compute optimal compound frequency', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );
        jest.spyOn(service, 'stakeFarmAPR').mockResolvedValue('0.10');
        const optimalCompoundFrequency =
            await service.computeOptimalCompoundFrequency(
                Address.Zero().bech32(),
                '100000000000000000',
                365,
            );

        expect(optimalCompoundFrequency).toEqual(
            new OptimalCompoundModel({
                optimalProfit: 0,
                interval: 0,
                days: 0,
                hours: 0,
                minutes: 0,
            }),
        );
    });

    it('should compute rewards remaining days', async () => {
        const service = module.get<StakingComputeService>(
            StakingComputeService,
        );

        const stakingAbi = module.get<StakingAbiService>(StakingAbiService);
        jest.spyOn(stakingAbi, 'accumulatedRewards').mockResolvedValue('100');
        jest.spyOn(stakingAbi, 'rewardCapacity').mockResolvedValue('14500');
        jest.spyOn(stakingAbi, 'perBlockRewardsAmount').mockResolvedValue('1');

        const rewardsRemainingDays = await service.computeRewardsRemainingDays(
            Address.Zero().bech32(),
        );
        expect(rewardsRemainingDays).toEqual(1);
    });
});
