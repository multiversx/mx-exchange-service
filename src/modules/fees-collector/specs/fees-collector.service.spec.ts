import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { FeesCollectorGetterService } from "../services/fees-collector.getter.service";
import {
    FeesCollectorGetterHandlers,
    FeesCollectorGetterServiceMock
} from "../mocks/fees-collector.getter.service.mock";
import { FeesCollectorService } from "../services/fees-collector.service";
import { WeekTimekeepingService } from "../../../submodules/week-timekeeping/services/week-timekeeping.service";
import {
    WeeklyRewardsSplittingHandlers,
    WeeklyRewardsSplittingServiceMock
} from "../../../submodules/weekly-rewards-splitting/mocks/weekly-rewards-splitting.service.mock";
import {
    WeekTimekeepingHandlers,
    WeekTimekeepingServiceMock
} from "../../../submodules/week-timekeeping/mocks/week-timekeeping.service.mock";
import {
    WeeklyRewardsSplittingService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service";
import { WeekTimekeepingModel } from "../../../submodules/week-timekeeping/models/week-timekeeping.model";
import {
    WeekTimekeepingGetterHandlers, WeekTimekeepingGetterServiceMock
} from "../../../submodules/week-timekeeping/mocks/week-timekeeping.getter.service.mock";
import {
    WeeklyRewardsSplittingGetterHandlers, WeeklyRewardsSplittingGetterServiceMock
} from "../../../submodules/weekly-rewards-splitting/mocks/weekly-rewards-splitting.getter.service.mock";
import {
    WeekTimekeepingGetterService
} from "../../../submodules/week-timekeeping/services/week-timekeeping.getter.service";
import {
    WeeklyRewardsSplittingGetterService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service";

describe('FeesCollectorService', () => {
    const dummyScAddress = 'erd'
    it('init service; should be defined', async () => {
        const service = await createService({
            getter: {}, weekTimekeeping: {}, weeklyRewards: {},
            weekTimekeepingGetter: {},
            weeklyRewardsGetter: {}
        });
        expect(service).toBeDefined();
    });
    it('getAccumulatedFees' +
        'no rewards for tokens', async () => {
        const service = await createService({
            getter: {
                getAccumulatedFees: (scAddress: string, week: number, token: string) => {
                    expect(scAddress).toEqual(dummyScAddress)
                    return Promise.resolve("0")
                }
            }, weeklyRewards: {}, weekTimekeeping: {},
            weekTimekeepingGetter: {},
            weeklyRewardsGetter: {}
        })
        const tokens = []
        const firstToken = "WEGLD-abcabc"
        tokens.push(firstToken)
        let rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens);
        expect(rewards.length).toEqual(1)
        expect(rewards[0].tokenID).toEqual(firstToken)
        expect(rewards[0].amount).toEqual("0")
        const secondToken = "MEX-abcabc"
        tokens.push(secondToken)
        rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens)
        expect(rewards.length).toEqual(2)
        expect(rewards[0].tokenID).toEqual(firstToken)
        expect(rewards[0].amount).toEqual("0")
        expect(rewards[1].tokenID).toEqual(secondToken)
        expect(rewards[1].amount).toEqual("0")
    });
    it('getAccumulatedFees' +
        'should work', async () => {
        const firstToken = "WEGLD-abcabc"
        const secondToken = "MEX-abcabc"
        const rewardsFirstToken = "100"
        const rewardsSecondToken = "300"
        const service = await createService({
            getter: {
                getAccumulatedFees: (scAddress: string, week: number, token: string) => {
                    let rewards = "0"
                    switch (token) {
                        case firstToken:
                            rewards = rewardsFirstToken
                            break
                        case secondToken:
                            rewards = rewardsSecondToken
                            break
                    }
                    return Promise.resolve(rewards)
                }
            },
            weekTimekeeping: {},
            weeklyRewards: {},
            weekTimekeepingGetter: {},
            weeklyRewardsGetter: {}
        })
        const tokens = []

        tokens.push(firstToken)
        let rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens);
        expect(rewards.length).toEqual(1)
        expect(rewards[0].tokenID).toEqual(firstToken)
        expect(rewards[0].amount).toEqual(rewardsFirstToken)

        tokens.push(secondToken)
        rewards = await service.getAccumulatedFees(dummyScAddress, 10, tokens)
        expect(rewards.length).toEqual(2)
        expect(rewards[0].tokenID).toEqual(firstToken)
        expect(rewards[0].amount).toEqual(rewardsFirstToken)
        expect(rewards[1].tokenID).toEqual(secondToken)
        expect(rewards[1].amount).toEqual(rewardsSecondToken)
    });
    it('feesCollector' +
        'empty tokens should return []', async () => {
        const expectedTokens = [];
        expectedTokens.push("token1")
        expectedTokens.push("token2")
        expectedTokens.push("token3")
        expectedTokens.push("token4")
        const expectedCurrentWeek = 10
        const service = await createService({
            getter: {
                getAllTokens: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress)
                    return Promise.resolve([])
                }
            },
            weekTimekeeping: {
                getWeeklyTimekeeping: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress)
                    return Promise.resolve(new WeekTimekeepingModel({
                        scAddress: dummyScAddress,
                        currentWeek: expectedCurrentWeek
                    }))
                }
            },
            weeklyRewards: {},
            weekTimekeepingGetter: {},
            weeklyRewardsGetter: {}
        })

        const model = await service.feesCollector(dummyScAddress);
        expect(model.allTokens).toEqual([])
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek)
    });
    it('feesCollector' +
        'should work', async () => {
        const expectedTokens = [];
        expectedTokens.push("token1")
        expectedTokens.push("token2")
        expectedTokens.push("token3")
        expectedTokens.push("token4")
        const expectedCurrentWeek = 10
        const service = await createService({
            getter:
                {
                    getAllTokens: (scAddress: string) => {
                        expect(scAddress).toEqual(dummyScAddress)
                        return Promise.resolve(expectedTokens)
                    }
                },
            weekTimekeeping: {
                getWeeklyTimekeeping: (scAddress: string) => {
                    expect(scAddress).toEqual(dummyScAddress)
                    return Promise.resolve(new WeekTimekeepingModel({
                        scAddress: dummyScAddress,
                        currentWeek: expectedCurrentWeek
                    }))
                }
            },
            weeklyRewards: {},
            weekTimekeepingGetter: {},
            weeklyRewardsGetter: {}
        })
        const model = await service.feesCollector(dummyScAddress)
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek)
        expect(model.allTokens.length).toEqual(expectedTokens.length)
        for (const i in expectedTokens) {
            expect(model.allTokens[i]).toEqual(expectedTokens[i])
        }
    });

});

async function createService(
    handlers: {
        getter: Partial<FeesCollectorGetterHandlers>,
        weekTimekeeping: Partial<WeekTimekeepingHandlers>,
        weeklyRewards: Partial<WeeklyRewardsSplittingHandlers>
        weekTimekeepingGetter: Partial<WeekTimekeepingGetterHandlers>,
        weeklyRewardsGetter: Partial<WeeklyRewardsSplittingGetterHandlers>
    }) {
    const getter = new FeesCollectorGetterServiceMock(handlers.getter);
    const timekeepingService = new WeekTimekeepingServiceMock(handlers.weekTimekeeping);
    const weeklyRewardsService = new WeeklyRewardsSplittingServiceMock(handlers.weeklyRewards);
    const timekeepingGetter = new WeekTimekeepingGetterServiceMock(handlers.weekTimekeepingGetter);
    const weeklyRewardsGetter = new WeeklyRewardsSplittingGetterServiceMock(handlers.weeklyRewardsGetter);
    const module: TestingModule = await Test.createTestingModule({
        imports: [ElrondCommunicationModule, CachingModule],
        providers: [
            ApiConfigService,
            {
                provide: FeesCollectorGetterService,
                useValue: getter,
            },
            {
                provide: WeekTimekeepingService,
                useValue: timekeepingService,
            },
            {
                provide: WeeklyRewardsSplittingService,
                useValue: weeklyRewardsService,
            },
            {
                provide: WeekTimekeepingGetterService,
                useValue: timekeepingGetter,
            },
            {
                provide: WeeklyRewardsSplittingGetterService,
                useValue: weeklyRewardsGetter,
            },
            FeesCollectorService
        ],
    }).compile();
    return module.get<FeesCollectorService>(FeesCollectorService);
}