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
import { FeesCollectorGetterService } from '../services/fees-collector.getter.service';
import { FeesCollectorAbiServiceProvider } from '../mocks/fees.collector.abi.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';

describe('FeesCollectorComputeService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                FeesCollectorComputeService,
                FeesCollectorGetterService,
                FeesCollectorAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                EnergyAbiServiceProvider,
                TokenComputeService,
                TokenGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                RouterGetterServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
                ContextGetterServiceProvider,
                {
                    provide: ContextGetterService,
                    useClass: ContextGetterServiceMock,
                },
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
});
