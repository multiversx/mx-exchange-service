import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { FeesCollectorGetterService } from "../services/fees-collector.getter.service";
import { FeesCollectorGetterServiceMock } from "../mocks/fees-collector.getter.service.mock";
import { FeesCollectorService } from "../services/fees-collector.service";
import { WeekTimekeepingService } from "../../../submodules/week-timekeeping/services/week-timekeeping.service";
import {
    WeeklyRewardsSplittingServiceMock
} from "../../../submodules/weekly-rewards-splitting/mocks/weekly-rewards-splitting.service.mock";
import { WeekTimekeepingServiceMock } from "../../../submodules/week-timekeeping/mocks/week-timekeeping.service.mock";
import {
    WeeklyRewardsSplittingService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service";
import {
    WeekFilterPeriodModel
} from "../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { WeekTimekeepingModel } from "../../../submodules/week-timekeeping/models/week-timekeeping.model";

describe('FeesCollectorService', () => {
    const dummyScAddress = 'erd'
    const dummyWeekFilter = new WeekFilterPeriodModel({
        start: 1,
        end: 10
    })
    it('init service; should be defined', async () => {
        const service = await createService({}, {}, {});
        expect(service).toBeDefined();
    });
    it('getAccumulatedFees' +
        'no rewards for tokens', async () => {
        const service = await createService({
            getAccumulatedFees: (scAddress: string, week: number, token: string) => {
                expect(scAddress).toEqual(dummyScAddress)
                return Promise.resolve("0")
        }
        }, {}, {})
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
        const rewardsFirstToken =  "100"
        const rewardsSecondToken =  "300"
        const service = await createService({
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
        }, {}, {})
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
            getAllTokens: (scAddress: string) => {
                expect(scAddress).toEqual(dummyScAddress)
                return Promise.resolve([])
            }
        }, {
            getWeeklyTimekeeping: (scAddress: string) => {
                expect(scAddress).toEqual(dummyScAddress)
                return Promise.resolve(new WeekTimekeepingModel({
                    scAddress: dummyScAddress,
                    currentWeek: expectedCurrentWeek
                }))
            }
        }, {})

        const model = await service.feesCollector(dummyScAddress, dummyWeekFilter);
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
            getAllTokens: (scAddress: string) => {
                expect(scAddress).toEqual(dummyScAddress)
                return Promise.resolve(expectedTokens)
            }
        }, {
            getWeeklyTimekeeping: (scAddress: string) => {
                expect(scAddress).toEqual(dummyScAddress)
                return Promise.resolve(new WeekTimekeepingModel({
                    scAddress: dummyScAddress,
                    currentWeek: expectedCurrentWeek
                }))
            }
            }, {}
        )
        const model = await service.feesCollector(dummyScAddress, dummyWeekFilter)
        expect(model.time.currentWeek).toEqual(expectedCurrentWeek)
        expect(model.allTokens.length).toEqual(expectedTokens.length)
        for (const i in expectedTokens) {
            expect(model.allTokens[i]).toEqual(expectedTokens[i])
        }
    });

});

async function createService(getterHandlers: any, weekTimekeepingServiceHandlers: any, weeklyServiceHandlers: any) {
    const getter = new FeesCollectorGetterServiceMock(getterHandlers);
    const timekeepingService = new WeekTimekeepingServiceMock(weekTimekeepingServiceHandlers);
    const weeklyRewardsService = new WeeklyRewardsSplittingServiceMock(weeklyServiceHandlers);
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
            FeesCollectorService
        ],
    }).compile();
    return module.get<FeesCollectorService>(FeesCollectorService);
}