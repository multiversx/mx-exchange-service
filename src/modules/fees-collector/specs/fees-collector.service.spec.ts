import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { MXCommunicationModule } from '../../../services/multiversx-communication/mx.communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { FeesCollectorGetterService } from '../services/fees-collector.getter.service';
import {
    FeesCollectorGetterHandlers,
    FeesCollectorGetterServiceMock,
} from '../mocks/fees-collector.getter.service.mock';
import { FeesCollectorService } from '../services/fees-collector.service';
import { WeeklyRewardsSplittingHandlers } from '../../../submodules/weekly-rewards-splitting/mocks/weekly-rewards-splitting.service.mock';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';

describe('FeesCollectorService', () => {
    const dummyScAddress = 'erd';
    it('init service; should be defined', async () => {
        const service = await createService({
            getter: {},
            weeklyRewards: {},
        });
        expect(service).toBeDefined();
    });
    it('getAccumulatedFees' + 'no rewards for tokens', async () => {
        const energyToken = 'ELKMEX-123456';
        const service = await createService({
            getter: {
                getAccumulatedFees: (
                    scAddress: string,
                    week: number,
                    token: string,
                ) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve('0');
                },
                getLockedTokenId: (scAddress) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(energyToken);
                },
                getAccumulatedTokenForInflation: (scAddress) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve('0');
                },
            },
            weeklyRewards: {},
        });
        const tokens = [];
        const firstToken = 'WEGLD-abcabc';
        tokens.push(firstToken);
        let rewards = await service.getAccumulatedFees(
            dummyScAddress,
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
        rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens);
        expect(rewards.length).toEqual(3);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual('0');
        expect(rewards[1].tokenID).toEqual(secondToken);
        expect(rewards[1].amount).toEqual('0');
        expect(rewards[2].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[2].amount).toEqual('0');
    });
    it('getAccumulatedFees' + 'should work', async () => {
        const firstToken = 'WEGLD-abcabc';
        const secondToken = 'MEX-abcabc';
        const energyToken = 'ELKMEX-123456';
        const rewardsFirstToken = '100';
        const rewardsSecondToken = '300';
        const rewardsMinted = '1000';
        const service = await createService({
            getter: {
                getAccumulatedFees: (
                    scAddress: string,
                    week: number,
                    token: string,
                ) => {
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
                getLockedTokenId: (scAddress) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(energyToken);
                },
                getAccumulatedTokenForInflation: (scAddress) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(rewardsMinted);
                },
            },
            weeklyRewards: {},
        });
        const tokens = [];

        tokens.push(firstToken);
        let rewards = await service.getAccumulatedFees(
            dummyScAddress,
            250,
            tokens,
        );
        expect(rewards.length).toEqual(2);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual(rewardsFirstToken);
        expect(rewards[1].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[1].amount).toEqual(rewardsMinted);
        tokens.push(secondToken);
        rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens);
        expect(rewards.length).toEqual(3);
        expect(rewards[0].tokenID).toEqual(firstToken);
        expect(rewards[0].amount).toEqual(rewardsFirstToken);
        expect(rewards[1].tokenID).toEqual(secondToken);
        expect(rewards[1].amount).toEqual(rewardsSecondToken);
        expect(rewards[2].tokenID).toEqual('Minted' + energyToken);
        expect(rewards[2].amount).toEqual(rewardsMinted);
    });
    it('feesCollector' + 'empty tokens should return []', async () => {
        const expectedTokens = [];
        expectedTokens.push('token1');
        expectedTokens.push('token2');
        expectedTokens.push('token3');
        expectedTokens.push('token4');
        const expectedCurrentWeek = 250;
        const service = await createService({
            getter: {
                getAllTokens: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve([]);
                },
                getCurrentWeek: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(expectedCurrentWeek);
                },
            },
            weeklyRewards: {},
        });

        const model = await service.feesCollector(dummyScAddress);
        expect(model.allTokens).toEqual([]);
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek);
    });
    it('feesCollector' + 'should work', async () => {
        const expectedTokens = [];
        expectedTokens.push('token1');
        expectedTokens.push('token2');
        expectedTokens.push('token3');
        expectedTokens.push('token4');
        const expectedCurrentWeek = 250;
        const service = await createService({
            getter: {
                getAllTokens: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(expectedTokens);
                },
                getCurrentWeek: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress);
                    return Promise.resolve(expectedCurrentWeek);
                },
            },
            weeklyRewards: {},
        });
        const model = await service.feesCollector(dummyScAddress);
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek);
        expect(model.allTokens.length).toEqual(expectedTokens.length);
        for (const i in expectedTokens) {
            expect(model.allTokens[i]).toEqual(expectedTokens[i]);
        }
    });
});

async function createService(handlers: {
    getter: Partial<FeesCollectorGetterHandlers>;
    weeklyRewards: Partial<WeeklyRewardsSplittingHandlers>;
}) {
    const getter = new FeesCollectorGetterServiceMock(handlers.getter);

    const module: TestingModule = await Test.createTestingModule({
        imports: [MXCommunicationModule, CachingModule],
        providers: [
            ApiConfigService,
            {
                provide: FeesCollectorGetterService,
                useValue: getter,
            },
            FeesCollectorService,
            WeekTimekeepingComputeService,
            WeekTimekeepingAbiServiceProvider,
        ],
    }).compile();
    return module.get<FeesCollectorService>(FeesCollectorService);
}
