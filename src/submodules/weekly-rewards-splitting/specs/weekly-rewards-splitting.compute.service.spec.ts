import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { MXCommunicationModule } from '../../../services/multiversx-communication/mx.communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import {
    WeekTimekeepingComputeHandlers,
    WeekTimekeepingComputeServiceMock,
} from '../../week-timekeeping/mocks/week-timekeeping.compute.service.mock';
import { WeeklyRewardsSplittingComputeService } from '../services/weekly-rewards-splitting.compute.service';
import { WeekTimekeepingComputeService } from '../../week-timekeeping/services/week-timekeeping.compute.service';
import {
    ProgressComputeHandlers,
    ProgressComputeServiceMock,
} from '../mocks/progress.compute.service.mock';
import { ProgressComputeService } from '../services/progress.compute.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import BigNumber from 'bignumber.js';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { EnergyGetterService } from '../../../modules/energy/services/energy.getter.service';
import { TokenComputeService } from '../../../modules/tokens/services/token.compute.service';
import { PairService } from '../../../modules/pair/services/pair.service';
import { WrapService } from '../../../modules/wrapping/wrap.service';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { TokenGetterServiceProvider } from '../../../modules/tokens/mocks/token.getter.service.mock';
import { RouterGetterServiceProvider } from '../../../modules/router/mocks/router.getter.service.stub';
import { RouterGetterService } from '../../../modules/router/services/router.getter.service';
import {
    EnergyGetterHandlers,
    EnergyGetterServiceMock,
} from '../../../modules/simple-lock/mocks/energy.getter.service.mock';
import {
    RouterGetterHandlers,
    RouterGetterServiceMock,
} from '../../../modules/router/mocks/router.getter.service.mock';
import {
    PairGetterHandlers,
    PairGetterServiceMock,
} from '../../../modules/pair/mocks/pair-getter-service-mock.service';
import { scAddress } from '../../../config';
import {
    TokenComputeHandlers,
    TokenComputeServiceMock,
} from '../../../modules/tokens/mocks/token.compute.service.mock';
import { EnergyModel } from 'src/modules/energy/models/energy.model';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';

describe('WeeklyRewardsSplittingComputeService', () => {
    const dummyScAddress = 'erd';

    it('init service; should be defined', async () => {
        const service = await createService({
            compute: {},
            pairGetter: {},
            progressCompute: {},
            routerGetter: {},
            energyGetter: {},
            tokenCompute: {},
        });
        expect(service).toBeDefined();
    });

    it(
        'computeUserRewardsForWeek' + 'totalRewardsForWeek returns empty array',
        async () => {
            const expectedEnergy = {
                amount: '100',
                lastUpdateEpoch: 50,
                totalLockedTokens: '500',
            };
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {},
                tokenCompute: {},
            });

            const totalRewardsForWeek = [];
            const userEnergyForWeek = expectedEnergy;
            const totalEnergyForWeek = '1000';
            const rewards = await service.computeUserRewardsForWeek(
                dummyScAddress,
                totalRewardsForWeek,
                userEnergyForWeek,
                totalEnergyForWeek,
            );
            expect(rewards).toEqual([]);
        },
    );
    it('computeUserRewardsForWeek' + 'user has no energy', async () => {
        const expectedEnergy = {
            amount: '0',
            lastUpdateEpoch: 50,
            totalLockedTokens: '500',
        };
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {},
            tokenCompute: {},
        });

        const totalRewardsForWeek = [
            new EsdtTokenPayment({
                amount: '100',
                nonce: 0,
                tokenID: 'WEGLD',
                tokenType: 0,
            }),
        ];
        const userEnergyForWeek = expectedEnergy;
        const totalEnergyForWeek = '1000';
        const rewards = await service.computeUserRewardsForWeek(
            dummyScAddress,
            totalRewardsForWeek,
            userEnergyForWeek,
            totalEnergyForWeek,
        );
        expect(rewards).toEqual([]);
    });
    it(
        'computeUserRewardsForWeek' +
            'should return rewards accordingly to the user energy',
        async () => {
            const expectedEnergy = {
                amount: '100',
                lastUpdateEpoch: 50,
                totalLockedTokens: '500',
            };
            const expectedTokenID = 'WEGLD';
            const expectedTokenType = 0;
            const expectedTokenNonce = 0;
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {},
                tokenCompute: {},
            });

            const totalRewardsForWeek = [
                new EsdtTokenPayment({
                    amount: '100',
                    nonce: expectedTokenNonce,
                    tokenID: expectedTokenID,
                    tokenType: expectedTokenType,
                }),
            ];
            const userEnergyForWeek = expectedEnergy;
            const totalEnergyForWeek = '1000';
            const rewards = await service.computeUserRewardsForWeek(
                dummyScAddress,
                totalRewardsForWeek,
                userEnergyForWeek,
                totalEnergyForWeek,
            );
            expect(rewards[0].amount).toEqual('10');
            expect(rewards[0].nonce).toEqual(expectedTokenNonce);
            expect(rewards[0].tokenID).toEqual(expectedTokenID);
            expect(rewards[0].tokenType).toEqual(expectedTokenType);
            expect(rewards.length).toEqual(1);
        },
    );

    it('computeTotalRewardsForWeekPriceUSD' + 'no rewards', async () => {
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {
                getFirstTokenPrice: (pairAddress) => {
                    expect(pairAddress).toEqual(scAddress.WEGLD_USDC);
                    return Promise.resolve('55');
                },
            },
            energyGetter: {},
            tokenCompute: {},
        });
        const usdValue = await service.computeTotalRewardsForWeekPriceUSD([]);
        expect(usdValue).toEqual('0');
    });
    it('computeTotalRewardsForWeekPriceUSD' + 'should work', async () => {
        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {},
            tokenCompute: {
                computeTokenPriceDerivedUSD: (tokenID) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            },
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
    it('computeTotalRewardsForWeekPriceUSD' + 'bad configuration', async () => {
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {
                getBaseAssetTokenID: () => {
                    return Promise.resolve('invalid token');
                },
            },
            tokenCompute: {},
        });
        const usdValue = await service.computeTotalLockedTokensForWeekPriceUSD(
            '0',
        );
        expect(usdValue).toEqual('0');
    });
    it(
        'computeTotalRewardsForWeekPriceUSD' + 'MEX-27f4cd has price 10',
        async () => {
            const mex = 'MEX-27f4cd';
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {
                    getBaseAssetTokenID: () => {
                        return Promise.resolve(mex);
                    },
                },
                tokenCompute: {
                    computeTokenPriceDerivedUSD: (tokenID: string) => {
                        expect(tokenID).toEqual(mex);
                        return Promise.resolve('10');
                    },
                },
            });
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
        'computeAprGivenLockedTokensAndRewards' + 'MEX-27f4cd has price 10',
        async () => {
            const mex = 'MEX-27f4cd';

            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
            priceMap.set(mex, '1');
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {
                    getBaseAssetTokenID: () => {
                        return Promise.resolve(mex);
                    },
                },
                tokenCompute: {
                    computeTokenPriceDerivedUSD: (tokenID: string) => {
                        return Promise.resolve(priceMap.get(tokenID));
                    },
                },
            });
            let apr = await service.computeAprGivenLockedTokensAndRewards(
                '1000',
                [
                    new EsdtTokenPayment({
                        amount: '100',
                        tokenID: 'firstToken',
                    }),
                    new EsdtTokenPayment({
                        amount: '200',
                        tokenID: 'thirdToken',
                    }),
                ],
            );
            expect(apr).toEqual('364'); // 100 * 10 + 200 * 30

            apr = await service.computeAprGivenLockedTokensAndRewards('1000', [
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
            expect(apr).toEqual('520');
        },
    );
    it('computeApr' + 'MEX-27f4cd has price 10', async () => {
        const mex = 'MEX-27f4cd';

        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');
        priceMap.set(mex, '1');
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {
                getBaseAssetTokenID: () => {
                    return Promise.resolve(mex);
                },
            },
            tokenCompute: {
                computeTokenPriceDerivedUSD: (tokenID: string) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            },
        });
        const totalLockedTokensForWeek = '1000';
        const totalRewardsForWeek = [
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
        ];
        const apr = await service.computeApr(
            totalLockedTokensForWeek,
            totalRewardsForWeek,
        );
        expect(apr).toEqual('520'); // 100 * 10 + 200 * 30
    });
    it('computeUserApr' + 'user has all the energy', async () => {
        const mex = 'MEX-27f4cd';

        const priceMap = new Map<string, string>();
        priceMap.set('firstToken', '10');
        priceMap.set('secondToken', '20');
        priceMap.set('thirdToken', '30');
        priceMap.set(mex, '1');
        const totalEnergyForWeek = '1000';
        const totalLockedTokensForWeek = '1000';
        const service = await createService({
            compute: {},
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {
                getBaseAssetTokenID: () => {
                    return Promise.resolve(mex);
                },
            },
            tokenCompute: {
                computeTokenPriceDerivedUSD: (tokenID: string) => {
                    return Promise.resolve(priceMap.get(tokenID));
                },
            },
        });

        const totalRewardsForWeek = [
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
        ];
        const userEnergyForWeek = new EnergyModel({
            amount: totalEnergyForWeek,
            totalLockedTokens: totalLockedTokensForWeek,
        });
        const apr = await service.computeUserApr(
            totalLockedTokensForWeek,
            totalRewardsForWeek,
            totalEnergyForWeek,
            userEnergyForWeek,
        );
        expect(apr).toEqual('520'); // 100 * 10 + 200 * 30
    });
    it(
        'computeUserApr' +
            '2 user has equal part of lk tokens & energy should have both global APR',
        async () => {
            const mex = 'MEX-27f4cd';

            const priceMap = new Map<string, string>();
            priceMap.set('firstToken', '10');
            priceMap.set('secondToken', '20');
            priceMap.set('thirdToken', '30');
            priceMap.set(mex, '1');
            const totalEnergyForWeek = '1000';
            const totalLockedTokensForWeek = '1000';
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {
                    getBaseAssetTokenID: () => {
                        return Promise.resolve(mex);
                    },
                },
                tokenCompute: {
                    computeTokenPriceDerivedUSD: (tokenID: string) => {
                        return Promise.resolve(priceMap.get(tokenID));
                    },
                },
            });

            const totalRewardsForWeek = [
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
            ];
            const userEnergyForWeek = new EnergyModel({
                amount: new BigNumber(totalEnergyForWeek).div(2).toFixed(),
                totalLockedTokens: new BigNumber(totalLockedTokensForWeek)
                    .div(2)
                    .toFixed(),
            });
            let apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                userEnergyForWeek,
            );
            expect(apr).toEqual('520');
            apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                userEnergyForWeek,
            );
            expect(apr).toEqual('520');
        },
    );
    it(
        'computeUserApr' +
            'first user has equal part of lk tokens but double energy' +
            'first user should have double APR compared with 2nd one',
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
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {
                    getBaseAssetTokenID: () => {
                        return Promise.resolve(mex);
                    },
                },
                tokenCompute: {
                    computeTokenPriceDerivedUSD: (tokenID: string) => {
                        return Promise.resolve(priceMap.get(tokenID));
                    },
                },
            });

            const totalRewardsForWeek = [
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
            ];
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

            let apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                user1Energy,
            );
            expect(apr).toEqual('693.33333333333333333333');
            apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                user2Energy,
            );
            expect(apr).toEqual('346.66666666666666666666');
        },
    );
    it(
        'computeUserApr' +
            'users has equal part of lk tokens but  one of them has 0 energy' +
            'first user should have global APR x2',
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
            const service = await createService({
                compute: {},
                progressCompute: {},
                routerGetter: {},
                pairGetter: {},
                energyGetter: {
                    getBaseAssetTokenID: () => {
                        return Promise.resolve(mex);
                    },
                },
                tokenCompute: {
                    computeTokenPriceDerivedUSD: (tokenID: string) => {
                        return Promise.resolve(priceMap.get(tokenID));
                    },
                },
            });

            const totalRewardsForWeek = [
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
            ];
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

            let apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                user1Energy,
            );
            expect(apr).toEqual('1040');
            apr = await service.computeUserApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                totalEnergyForWeek,
                user2Energy,
            );
            expect(apr).toEqual('0');
        },
    );
});

async function createService(handlers: {
    compute: Partial<WeekTimekeepingComputeHandlers>;
    progressCompute: Partial<ProgressComputeHandlers>;
    routerGetter: Partial<RouterGetterHandlers>;
    pairGetter: Partial<PairGetterHandlers>;
    energyGetter: Partial<EnergyGetterHandlers>;
    tokenCompute: Partial<TokenComputeHandlers>;
}) {
    const compute = new WeekTimekeepingComputeServiceMock(handlers.compute);
    const progressCompute = new ProgressComputeServiceMock(
        handlers.progressCompute,
    );
    const routerGetter = new RouterGetterServiceMock(handlers.routerGetter);
    const pairGetter = new PairGetterServiceMock(handlers.pairGetter);
    const energyGetter = new EnergyGetterServiceMock(handlers.energyGetter);
    const tokenCompute = new TokenComputeServiceMock(handlers.tokenCompute);

    const module: TestingModule = await Test.createTestingModule({
        imports: [MXCommunicationModule, CachingModule],
        providers: [
            PairComputeService,
            PairService,
            {
                provide: TokenComputeService,
                useValue: tokenCompute,
            },
            {
                provide: RouterGetterService,
                useValue: routerGetter,
            },
            TokenGetterServiceProvider,
            {
                provide: WrapService,
                useClass: WrapServiceMock,
            },
            ApiConfigService,
            {
                provide: PairGetterService,
                useValue: pairGetter,
            },
            RouterGetterServiceProvider,
            {
                provide: EnergyGetterService,
                useValue: energyGetter,
            },
            {
                provide: WeekTimekeepingComputeService,
                useValue: compute,
            },
            {
                provide: ProgressComputeService,
                useValue: progressCompute,
            },
            WeeklyRewardsSplittingComputeService,
            MXDataApiServiceProvider,
        ],
    }).compile();
    return module.get<WeeklyRewardsSplittingComputeService>(
        WeeklyRewardsSplittingComputeService,
    );
}
