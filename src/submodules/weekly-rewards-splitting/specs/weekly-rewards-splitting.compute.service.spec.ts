import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyRewardsSplittingComputeService } from '../services/weekly-rewards-splitting.compute.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import BigNumber from 'bignumber.js';
import { EnergyModel } from 'src/modules/energy/models/energy.model';
import { WeeklyRewardsSplittingAbiServiceProvider } from '../mocks/weekly.rewards.splitting.abi.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair-getter-service-mock.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WeeklyRewardsSplittingAbiService } from '../services/weekly-rewards-splitting.abi.service';
import { Address } from '@multiversx/sdk-core/out';
import { CachingModule } from 'src/services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';

describe('WeeklyRewardsSplittingComputeService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                WeeklyRewardsSplittingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                EnergyAbiServiceProvider,
                TokenComputeService,
                {
                    provide: PairGetterService,
                    useClass: PairGetterServiceMock,
                },
                RouterGetterServiceProvider,
                MXDataApiServiceProvider,
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
        const usdValue = await service.computeTotalRewardsForWeekPriceUSD([]);
        expect(usdValue).toEqual('0');
    });

    it('computeTotalRewardsForWeekPriceUSD' + ' should work', async () => {
        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');

        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);
        jest.spyOn(
            tokenCompute,
            'computeTokenPriceDerivedUSD',
        ).mockImplementation((tokenID) => {
            return Promise.resolve(priceMap.get(tokenID));
        });

        let usdValue = await service.computeTotalRewardsForWeekPriceUSD([
            new EsdtTokenPayment({
                amount: '100',
                tokenID: 'firstToken',
            }),
            new EsdtTokenPayment({
                amount: '200',
                tokenID: 'thirdToken',
            }),
        ]);
        expect(usdValue).toEqual('7000'); // 100 * 10 + 200 * 30

        usdValue = await service.computeTotalRewardsForWeekPriceUSD([
            new EsdtTokenPayment({
                amount: '100',
                tokenID: 'firstToken',
            }),
            new EsdtTokenPayment({
                amount: '150',
                tokenID: 'secondToken',
            }),
            new EsdtTokenPayment({
                amount: '200',
                tokenID: 'thirdToken',
            }),
        ]);
        expect(usdValue).toEqual('10000');
    });

    it(
        'computeTotalRewardsForWeekPriceUSD' + ' MEX-27f4cd has price 10',
        async () => {
            const service = module.get<WeeklyRewardsSplittingComputeService>(
                WeeklyRewardsSplittingComputeService,
            );
            const tokenCompute =
                module.get<TokenComputeService>(TokenComputeService);
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockReturnValue(Promise.resolve('10'));

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
        'computeAprGivenLockedTokensAndRewards' + ' MEX-27f4cd has price 10',
        async () => {
            const mex = 'MEX-27f4cd';

            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
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
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockImplementation((tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            });
            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'totalRewardsForWeek',
            ).mockReturnValueOnce(
                Promise.resolve([
                    new EsdtTokenPayment({
                        amount: '100',
                        tokenID: 'firstToken',
                    }),
                    new EsdtTokenPayment({
                        amount: '200',
                        tokenID: 'thirdToken',
                    }),
                ]),
            );
            let apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
            expect(apr).toEqual('364'); // 100 * 10 + 200 * 30

            apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
            expect(apr).toEqual('520');
        },
    );

    it('computeApr' + ' MEX-27f4cd has price 10', async () => {
        const mex = 'MEX-27f4cd';

        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');
        priceMap.set(mex, '1');

        const service = module.get<WeeklyRewardsSplittingComputeService>(
            WeeklyRewardsSplittingComputeService,
        );
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);

        jest.spyOn(
            tokenCompute,
            'computeTokenPriceDerivedUSD',
        ).mockImplementation((tokenID) => {
            return Promise.resolve(priceMap.get(tokenID));
        });

        const apr = await service.computeWeekAPR(Address.Zero().bech32(), 1);
        expect(apr).toEqual('520'); // 100 * 10 + 200 * 30
    });

    it('computeUserApr' + ' user has all the energy', async () => {
        const mex = 'MEX-27f4cd';

        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');
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
        jest.spyOn(
            tokenCompute,
            'computeTokenPriceDerivedUSD',
        ).mockImplementation((tokenID) => {
            return Promise.resolve(priceMap.get(tokenID));
        });
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
        expect(apr).toEqual('520'); // 100 * 10 + 200 * 30
    });

    it(
        'computeUserApr' +
            ' 2 user has equal part of lk tokens & energy should have both global APR',
        async () => {
            const mex = 'MEX-27f4cd';

            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
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
            jest.spyOn(
                tokenCompute,
                'computeTokenPriceDerivedUSD',
            ).mockImplementation((tokenID) => {
                return Promise.resolve(priceMap.get(tokenID));
            });

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
            expect(apr).toEqual('520');
        },
    );

    it(
        'computeUserApr' +
            ' first user has equal part of lk tokens but double energy' +
            ' first user should have double APR compared with 2nd one',
        async () => {
            const user1 = 'erd1';
            const user2 = 'erd2';
            const mex = 'MEX-27f4cd';
            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
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
            ).mockReturnValueOnce(Promise.resolve(user1Energy));
            let apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user1,
                1,
            );
            expect(apr).toEqual('693.33333333333333333333');

            jest.spyOn(
                weeklyRewardsSplittingAbi,
                'userEnergyForWeek',
            ).mockReturnValueOnce(Promise.resolve(user2Energy));

            apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user2,
                1,
            );
            expect(apr).toEqual('346.66666666666666666666');
        },
    );

    it(
        'computeUserApr' +
            ' users has equal part of lk tokens but  one of them has 0 energy' +
            ' first user should have global APR x2',
        async () => {
            const user1 = 'erd1';
            const user2 = 'erd2';
            const mex = 'MEX-27f4cd';
            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
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
            ).mockReturnValueOnce(Promise.resolve(user1Energy));
            let apr = await service.computeUserApr(
                Address.Zero().bech32(),
                user1,
                1,
            );
            expect(apr).toEqual('1040');

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
