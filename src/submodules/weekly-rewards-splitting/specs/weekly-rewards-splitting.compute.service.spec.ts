import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyRewardsSplittingComputeService } from '../services/weekly-rewards-splitting.compute.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import BigNumber from 'bignumber.js';
import { EnergyModel } from 'src/modules/energy/models/energy.model';
import { WeeklyRewardsSplittingAbiServiceProvider } from '../mocks/weekly.rewards.splitting.abi.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WeeklyRewardsSplittingAbiService } from '../services/weekly-rewards-splitting.abi.service';
import { Address } from '@multiversx/sdk-core/out';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

describe('WeeklyRewardsSplittingComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
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
                WeeklyRewardsSplittingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
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
                AnalyticsQueryServiceProvider,
                ApiConfigService,
                MXApiServiceProvider,
            ],
        }).compile();
    });

    it('init service; should be defined', async () => {
        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        expect(service).toBeDefined();
    });

    it('computeTotalRewardsForWeekPriceUSD' + ' no rewards', async () => {
        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'totalRewardsForWeek',
        ).mockReturnValueOnce(Promise.resolve([]));

        const usdValue = await service.computeTotalRewardsForWeekUSD(
            Address.Zero().bech32(),
            1,
        );
        expect(usdValue).toEqual('0');
    });

    it('computeTotalRewardsForWeekPriceUSD' + ' should work', async () => {
        const priceMap = new Map<string, string>();
        priceMap.set('WEGLD-123456', '10');
        priceMap.set('MEX-123456', '20');
        priceMap.set('TOK4-123456', '30');

        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );

        jest.spyOn(
            tokenCompute,
            'getAllTokensPriceDerivedUSD',
        ).mockImplementation((tokenIDs: string[]) => {
            return Promise.resolve(
                tokenIDs.map((tokenID) => priceMap.get(tokenID)),
            );
        });
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'totalRewardsForWeek',
        ).mockReturnValueOnce(
            Promise.resolve([
                new EsdtTokenPayment({
                    amount: '100000000000000000000',
                    tokenID: 'WEGLD-123456',
                }),
                new EsdtTokenPayment({
                    amount: '200000000000000000000',
                    tokenID: 'TOK4-123456',
                }),
            ]),
        );
        let usdValue = await service.computeTotalRewardsForWeekUSD(
            Address.Zero().bech32(),
            1,
        );
        expect(usdValue).toEqual('7000'); // 100 * 10 + 200 * 30

        usdValue = await service.computeTotalRewardsForWeekUSD(
            Address.Zero().bech32(),
            1,
        );
        expect(usdValue).toEqual('10000');
    });

    it(
        'computeTotalRewardsForWeekPriceUSD' + ' MEX-123456 has price 10',
        async () => {
            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockReturnValue(
                Promise.resolve('10'),
            );

            let usdValue =
                await service.computeTotalLockedTokensForWeekPriceUSD('0');
            expect(usdValue).toEqual('0');
            usdValue = await service.computeTotalLockedTokensForWeekPriceUSD(
                '1',
            );
            expect(usdValue).toEqual('10');
            usdValue = await service.computeTotalLockedTokensForWeekPriceUSD(
                '25',
            );
            expect(usdValue).toEqual('250');
        },
    );

    it(
        'computeAprGivenLockedTokensAndRewards' + ' MEX-123456 has price 10',
        async () => {
            const mex = 'MEX-123456';

            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                tokenCompute,
                'getAllTokensPriceDerivedUSD',
            ).mockImplementation((tokenIDs: string[]) => {
                return Promise.resolve(
                    tokenIDs.map((tokenID) => priceMap.get(tokenID)),
                );
            });
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalRewardsForWeek',
            ).mockReturnValueOnce(
                Promise.resolve([
                    new EsdtTokenPayment({
                        amount: '100000000000000000000',
                        tokenID: 'WEGLD-123456',
                    }),
                    new EsdtTokenPayment({
                        amount: '200000000000000000000',
                        tokenID: 'TOK4-123456',
                    }),
                ]),
            );
            let apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
            expect(apr).toEqual('364'); // 100 * 10 + 200 * 30

            apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
            expect(apr).toEqual('371.8');
        },
    );

    it('computeApr' + ' MEX-123456 has price 10', async () => {
        const mex = 'MEX-123456';

        const priceMap = new Map<string, string>();
        priceMap.set('WEGLD-123456', '10');
        priceMap.set('MEX-123456', '20');
        priceMap.set('TOK4-123456', '30');
        priceMap.set(mex, '1');

        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);

        jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
            (tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            },
        );

        const apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
        expect(apr).toEqual('371.8'); // 100 * 10 + 200 * 30
    });

    it('computeUserApr' + ' user has all the energy', async () => {
        const mex = 'MEX-123456';

        const priceMap = new Map<string, string>();
        priceMap.set('WEGLD-123456', '10');
        priceMap.set('MEX-123456', '20');
        priceMap.set('TOK4-123456', '30');
        priceMap.set(mex, '1');

        const totalEnergyForWeek = '1000';
        const totalLockedTokensForWeek = '1000';

        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
            (tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            },
        );
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'userEnergyForWeek',
        ).mockReturnValue(
            Promise.resolve(
                new EnergyModel({
                    amount: totalEnergyForWeek,
                    totalLockedTokens: totalLockedTokensForWeek,
                }),
            ),
        );

        const apr = await service.computeUserApr(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            1,
        );
        expect(apr).toEqual('371.8'); // 100 * 10 + 200 * 30
    });

    it(
        'computeUserApr' +
            ' 2 user has equal part of lk tokens & energy should have both global APR',
        async () => {
            const mex = 'MEX-123456';

            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');
            const totalEnergyForWeek = '1000';
            const totalLockedTokensForWeek = '1000';

            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValue(
                Promise.resolve(
                    new EnergyModel({
                        amount: new BigNumber(totalEnergyForWeek)
                            .div(2)
                            .toFixed(),
                        totalLockedTokens: new BigNumber(
                            totalLockedTokensForWeek,
                        )
                            .div(2)
                            .toFixed(),
                    }),
                ),
            );

            const apr = await service.computeUserApr(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                1,
            );
            expect(apr).toEqual('371.8');
        },
    );

    it(
        'computeUserApr' +
            ' first user has equal part of lk tokens but double energy' +
            ' first user should have double APR compared with 2nd one',
        async () => {
            const user1 = 'erd1';
            const user2 = 'erd2';
            const mex = 'MEX-123456';
            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const totalEnergyForWeek = '3000';
            const totalLockedTokensForWeek = '1000';
            const user2EnergyAmount = new BigNumber(totalEnergyForWeek).div(3);
            const user1EnergyAmount = user2EnergyAmount.multipliedBy(2);
            const user2Energy = new EnergyModel({
                amount: user2EnergyAmount.toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .div(2)
                    .toFixed(),
            });
            const user1Energy = new EnergyModel({
                amount: user1EnergyAmount.toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .div(2)
                    .toFixed(),
            });

            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalEnergyForWeek',
            ).mockReturnValue(Promise.resolve(totalEnergyForWeek));

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValueOnce(Promise.resolve(user1Energy));
            let apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user1,
                1,
            );
            expect(apr).toEqual('495.73333333333333333333');

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValueOnce(Promise.resolve(user2Energy));

            apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user2,
                1,
            );
            expect(apr).toEqual('247.86666666666666666666');
        },
    );

    it(
        'computeUserApr' +
            ' users has equal part of lk tokens but  one of them has 0 energy' +
            ' first user should have global APR x2',
        async () => {
            const user1 = 'erd1';
            const user2 = 'erd2';
            const mex = 'MEX-123456';
            const priceMap = new Map<string, string>();
            priceMap.set('WEGLD-123456', '10');
            priceMap.set('MEX-123456', '20');
            priceMap.set('TOK4-123456', '30');
            priceMap.set(mex, '1');

            const totalEnergyForWeek = '3000';
            const totalLockedTokensForWeek = '1000';
            const user2EnergyAmount = new BigNumber(0);
            const user1EnergyAmount =
                user2EnergyAmount.plus(totalEnergyForWeek);
            const user2Energy = new EnergyModel({
                amount: user2EnergyAmount.toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .div(2)
                    .toFixed(),
            });
            const user1Energy = new EnergyModel({
                amount: user1EnergyAmount.toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .div(2)
                    .toFixed(),
            });

            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            const weeklyRewardsSplittingAbi =
                module.get<WeeklyRewardsSplittingAbiService>(
                    WeeklyRewardsSplittingAbiService,
                );
            jest.spyOn(tokenCompute, 'tokenPriceDerivedUSD').mockImplementation(
                (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            );
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalEnergyForWeek',
            ).mockReturnValue(Promise.resolve(totalEnergyForWeek));

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValueOnce(Promise.resolve(user1Energy));
            let apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user1,
                1,
            );
            expect(apr).toEqual('743.6');

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValueOnce(Promise.resolve(user2Energy));
            apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user2,
                1,
            );
            expect(apr).toEqual('0');
        },
    );
});
