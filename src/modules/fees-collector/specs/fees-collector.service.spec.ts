import { Test, TestingModule } from '@nestjs/testing';
import { MXCommunicationModule } from '../../../services/multiversx-communication/mx.communication.module';
import { FeesCollectorService } from '../services/fees-collector.service';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { FeesCollectorAbiServiceProvider } from '../mocks/fees.collector.abi.service.mock';
import { FeesCollectorComputeService } from '../services/fees-collector.compute.service';
import { Address } from '@multiversx/sdk-core/out';
import { FeesCollectorAbiService } from '../services/fees-collector.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { EnergyComputeService } from 'src/modules/energy/services/energy.compute.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

describe('FeesCollectorService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                MXCommunicationModule,
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                FeesCollectorService,
                FeesCollectorAbiServiceProvider,
                FeesCollectorComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                EnergyService,
                EnergyComputeService,
                EnergyAbiServiceProvider,
                TokenComputeService,
                TokenServiceProvider,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                WrapAbiServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                {
                    provide: ContextGetterService,
                    useClass: ContextGetterServiceMock,
                },
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('init service; should be defined', async () => {
        const service = module.get<FeesCollectorService>(FeesCollectorService);
        expect(service).toBeDefined();
    });

    it('getAccumulatedFees' + ' no rewards for tokens', async () => {
        const service = module.get<FeesCollectorService>(FeesCollectorService);
        const feesCollectorAbi = module.get<FeesCollectorAbiService>(
            FeesCollectorAbiService,
        );
        const feesCollectorCompute = module.get<FeesCollectorComputeService>(
            FeesCollectorComputeService,
        );
        jest.spyOn(
            feesCollectorCompute,
            'accumulatedFeesUntilNow',
        ).mockReturnValue(Promise.resolve('0'));

        const energyToken = await feesCollectorAbi.lockedTokenID();
        const tokens = [];
        const firstToken = 'WEGLD-abcabc';
        tokens.push(firstToken);
        let rewards = await service.getAccumulatedFees(
            Address.Zero().bech32(),
            250,
            tokens,
        );
        expect(rewards.length).toEqual(2);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual('0');
        expect(rewards[1].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[1].amount).toEqual('0');
        const secondToken = 'MEX-abcabc';
        tokens.push(secondToken);
        rewards = await service.getAccumulatedFees(
            Address.Zero().bech32(),
            10,
            tokens,
        );
        expect(rewards.length).toEqual(3);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual('0');
        expect(rewards[1].tokenID).toEqual(secondToken);
        expect(rewards[1].amount).toEqual('0');
        expect(rewards[2].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[2].amount).toEqual('0');
    });

    it('getAccumulatedFees' + ' should work', async () => {
        const firstToken = 'WEGLD-abcabc';
        const secondToken = 'MEX-abcabc';
        const rewardsFirstToken = '100';
        const rewardsSecondToken = '300';
        const rewardsMinted = '1000';

        const service = module.get<FeesCollectorService>(FeesCollectorService);
        const feesCollectorAbi = module.get<FeesCollectorAbiService>(
            FeesCollectorAbiService,
        );
        const feesCollectorCompute = module.get<FeesCollectorComputeService>(
            FeesCollectorComputeService,
        );

        jest.spyOn(feesCollectorAbi, 'accumulatedFees').mockImplementation(
            (week: number, token: string) => {
                let rewards = '0';
                switch (token) {
                    case firstToken:
                        rewards = rewardsFirstToken;
                        break;
                    case secondToken:
                        rewards = rewardsSecondToken;
                        break;
                }
                return Promise.resolve(rewards);
            },
        );
        jest.spyOn(
            feesCollectorCompute,
            'accumulatedFeesUntilNow',
        ).mockReturnValue(Promise.resolve(rewardsMinted));

        const energyToken = await feesCollectorAbi.lockedTokenID();
        const tokens = [];

        tokens.push(firstToken);
        let rewards = await service.getAccumulatedFees(
            Address.Zero().bech32(),
            250,
            tokens,
        );
        expect(rewards.length).toEqual(2);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual(rewardsFirstToken);
        expect(rewards[1].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[1].amount).toEqual(rewardsMinted);
        tokens.push(secondToken);
        rewards = await service.getAccumulatedFees(
            Address.Zero().bech32(),
            10,
            tokens,
        );
        expect(rewards.length).toEqual(3);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual(rewardsFirstToken);
        expect(rewards[1].tokenID).toEqual(secondToken);
        expect(rewards[1].amount).toEqual(rewardsSecondToken);
        expect(rewards[2].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[2].amount).toEqual(rewardsMinted);
    });

    it('feesCollector' + ' empty tokens should return []', async () => {
        const expectedTokens = [];
        expectedTokens.push('token1');
        expectedTokens.push('token2');
        expectedTokens.push('token3');
        expectedTokens.push('token4');
        const expectedCurrentWeek = 250;

        const service = module.get<FeesCollectorService>(FeesCollectorService);
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        jest.spyOn(weekTimekeepingAbi, 'currentWeek').mockReturnValue(
            Promise.resolve(expectedCurrentWeek),
        );

        const model = await service.feesCollector(Address.Zero().bech32());
        expect(model.allTokens).toEqual([]);
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek);
    });

    it('feesCollector' + ' should work', async () => {
        const expectedTokens = [];
        expectedTokens.push('token1');
        expectedTokens.push('token2');
        expectedTokens.push('token3');
        expectedTokens.push('token4');
        const expectedCurrentWeek = 250;

        const service = module.get<FeesCollectorService>(FeesCollectorService);
        const feesCollectorAbi = module.get<FeesCollectorAbiService>(
            FeesCollectorAbiService,
        );
        const weekTimekeepingAbi = module.get<WeekTimekeepingAbiService>(
            WeekTimekeepingAbiService,
        );
        jest.spyOn(feesCollectorAbi, 'allTokens').mockReturnValue(
            Promise.resolve(expectedTokens),
        );
        jest.spyOn(weekTimekeepingAbi, 'currentWeek').mockReturnValue(
            Promise.resolve(expectedCurrentWeek),
        );

        const model = await service.feesCollector(Address.Zero().bech32());
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek);
        expect(model.allTokens.length).toEqual(expectedTokens.length);
        for (const i in expectedTokens) {
            expect(model.allTokens[i]).toEqual(expectedTokens[i]);
        }
    });
});
