import { Test, TestingModule } from '@nestjs/testing';
import { FeesCollectorComputeService } from '../services/fees-collector.compute.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import {
    ContextGetterServiceMock,
    ContextGetterServiceProvider,
} from 'src/services/context/mocks/context.getter.service.mock';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { FeesCollectorAbiServiceProvider } from '../mocks/fees.collector.abi.service.mock';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import {
    EnergyModel,
    UserEnergyModel,
} from 'src/modules/energy/models/energy.model';
import BigNumber from 'bignumber.js';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { EnergyComputeService } from 'src/modules/energy/services/energy.compute.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

describe('FeesCollectorComputeService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                FeesCollectorComputeService,
                FeesCollectorAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                EnergyService,
                EnergyComputeService,
                EnergyAbiServiceProvider,
                TokenComputeService,
                TokenServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                WrapAbiServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                ContextGetterServiceProvider,
                {
                    provide: ContextGetterService,
                    useClass: ContextGetterServiceMock,
                },
                AnalyticsQueryServiceProvider,
                ApiConfigService,
                MXApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: FeesCollectorComputeService =
            module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
        expect(service).toBeDefined();
    });

    it(
        'computeUserRewardsForWeek' +
            ' totalRewardsForWeek returns empty array',
        async () => {
            const expectedEnergy = {
                amount: '100',
                lastUpdateEpoch: 50,
                totalLockedTokens: '500',
            };

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalRewardsForWeek',
            ).mockReturnValue(Promise.resolve([]));
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(Promise.resolve(expectedEnergy));

            const rewards = await service.computeUserRewardsForWeek(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                1,
            );
            expect(rewards).toEqual([]);
        },
    );

    it('computeUserRewardsForWeek' + ' user has no energy', async () => {
        const expectedEnergy = {
            amount: '0',
            lastUpdateEpoch: 50,
            totalLockedTokens: '500',
        };

        const service = module.get<FeesCollectorComputeService>(
            FeesCollectorComputeService,
        );
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'totalRewardsForWeek',
        ).mockReturnValue(
            Promise.resolve([
                new EsdtTokenPayment({
                    amount: '100',
                    nonce: 0,
                    tokenID: 'WEGLD',
                    tokenType: 0,
                }),
            ]),
        );
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'userEnergyForWeek',
        ).mockReturnValue(Promise.resolve(expectedEnergy));

        const rewards = await service.computeUserRewardsForWeek(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            1,
        );
        expect(rewards).toEqual([]);
    });

    it(
        'computeUserRewardsForWeek' +
            ' should return rewards accordingly to the user energy',
        async () => {
            const expectedEnergy = {
                amount: '100',
                lastUpdateEpoch: 50,
                totalLockedTokens: '500',
            };
            const expectedTokenID = 'WEGLD';
            const expectedTokenType = 0;
            const expectedTokenNonce = 0;

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalRewardsForWeek',
            ).mockReturnValue(
                Promise.resolve([
                    new EsdtTokenPayment({
                        amount: '100',
                        nonce: expectedTokenNonce,
                        tokenID: expectedTokenID,
                        tokenType: expectedTokenType,
                    }),
                ]),
            );
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(Promise.resolve(expectedEnergy));

            const rewards = await service.computeUserRewardsForWeek(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                1,
            );

            expect(rewards[0].amount).toEqual('10');
            expect(rewards[0].nonce).toEqual(expectedTokenNonce);
            expect(rewards[0].tokenID).toEqual(expectedTokenID);
            expect(rewards[0].tokenType).toEqual(expectedTokenType);
            expect(rewards.length).toEqual(1);
        },
    );

    it(
        'computeUserApr' + ' last week' + ' with default user energy',
        async () => {
            const user1 = 'erd1';
            const mex = 'MEX-123456';
            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const totalEnergyForWeek = '3000000000000000000000000';
            const totalLockedTokensForWeek = '1000000000000000000000000';
            const user1EnergyAmount = new BigNumber(totalEnergyForWeek);

            const user1Energy = new UserEnergyModel({
                amount: user1EnergyAmount.toFixed(),
                totalLockedTokens: new BigNumber(
                    totalLockedTokensForWeek,
                ).toFixed(),
                league: 'Bronze',
            });

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            const energyService = module.get<EnergyService>(EnergyService);

            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockImplementation((tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            });
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalEnergyForWeek',
            ).mockReturnValue(Promise.resolve(totalEnergyForWeek));

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(Promise.resolve(user1Energy));

            jest.spyOn(energyService, 'getUserEnergy').mockReturnValueOnce(
                Promise.resolve(user1Energy),
            );

            const apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
            );

            expect(apr.toFixed()).toEqual('37.18');
        },
    );

    it(
        'computeUserApr' + ' last week' + ' with custom user energy',
        async () => {
            const user1 = 'erd1';
            const mex = 'MEX-123456';
            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const totalEnergyForWeek = '3000000000000000000000000';
            const totalLockedTokensForWeek = '1000000000000000000000000';
            const user1EnergyAmount = new BigNumber(totalEnergyForWeek);

            const user1Energy = new UserEnergyModel({
                amount: user1EnergyAmount.dividedBy(4).toFixed(),
                totalLockedTokens: new BigNumber(
                    totalLockedTokensForWeek,
                ).toFixed(),
                league: 'Bronze',
            });

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            const energyService = module.get<EnergyService>(EnergyService);

            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockImplementation((tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            });
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalEnergyForWeek',
            ).mockReturnValue(Promise.resolve(totalEnergyForWeek));

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(Promise.resolve(user1Energy));
            jest.spyOn(energyService, 'getUserEnergy').mockReturnValueOnce(
                Promise.resolve(user1Energy),
            );

            const apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
                new BigNumber(totalEnergyForWeek).dividedBy(4).toFixed(),
            );

            expect(apr.toFixed()).toEqual('14.872');
        },
    );

    it(
        'computeUserApr' +
            ' last week' +
            ' with custom user energy and locked tokens',
        async () => {
            const user1 = 'erd1';
            const mex = 'MEX-123456';
            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const totalEnergyForWeek = '3000000000000000000000000';
            const totalLockedTokensForWeek = '1000000000000000000000000';
            const user1EnergyAmount = new BigNumber(totalEnergyForWeek);

            const user1Energy = new UserEnergyModel({
                amount: user1EnergyAmount.dividedBy(4).toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .dividedBy(4)
                    .toFixed(),
                league: 'Bronze',
            });

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            const energyService = module.get<EnergyService>(EnergyService);

            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockImplementation((tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            });
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalEnergyForWeek',
            ).mockReturnValue(Promise.resolve(totalEnergyForWeek));

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(Promise.resolve(user1Energy));

            jest.spyOn(energyService, 'getUserEnergy').mockReturnValueOnce(
                Promise.resolve(user1Energy),
            );

            const apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
                new BigNumber(totalEnergyForWeek).dividedBy(4).toFixed(),
                new BigNumber(totalLockedTokensForWeek).dividedBy(2).toFixed(),
            );

            expect(apr.toFixed()).toEqual('29.744');
        },
    );

    it(
        'computeUserApr' +
            ' last week' +
            ' with 0 user energy and locked tokens',
        async () => {
            const user1 = 'erd1';

            const service = module.get<FeesCollectorComputeService>(
                FeesCollectorComputeService,
            );

            let apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
                new BigNumber(0).toFixed(),
                new BigNumber(0).toFixed(),
            );

            expect(apr.toFixed()).toEqual('0');

            apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
                new BigNumber('1440000000000000000000').toFixed(),
                new BigNumber(0).toFixed(),
            );

            expect(apr.toFixed()).toEqual('0');

            apr = await service.computeUserRewardsAPR(
                Address.Zero().bech32(),
                user1,
                new BigNumber(0).toFixed(),
                new BigNumber('1000000000000000000').toFixed(),
            );

            expect(apr.toFixed()).toEqual('0');
        },
    );
});
