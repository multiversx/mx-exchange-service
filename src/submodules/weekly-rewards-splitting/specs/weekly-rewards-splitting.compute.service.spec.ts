import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import {
    WeekTimekeepingComputeHandlers,
    WeekTimekeepingComputeServiceMock
} from "../../week-timekeeping/mocks/week-timekeeping.compute.service.mock";
import { WeeklyRewardsSplittingComputeService } from "../services/weekly-rewards-splitting.compute.service";
import { WeekTimekeepingGetterService } from "../../week-timekeeping/services/week-timekeeping.getter.service";
import { WeekTimekeepingComputeService } from "../../week-timekeeping/services/week-timekeeping.compute.service";
import {
    WeekTimekeepingGetterHandlers,
    WeekTimekeepingGetterServiceMock
} from "../../week-timekeeping/mocks/week-timekeeping.getter.service.mock";
import { WeeklyRewardsSplittingGetterService } from "../services/weekly-rewards-splitting.getter.service";
import {
    WeeklyRewardsSplittingGetterHandlers,
    WeeklyRewardsSplittingGetterServiceMock
} from "../mocks/weekly-rewards-splitting.getter.service.mock";
import { ProgressComputeHandlers, ProgressComputeServiceMock } from "../mocks/progress.compute.service.mock";
import { ProgressComputeService } from "../services/progress.compute.service";
import { createMockProgress } from "./progress.compute.service.spec";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";
import BigNumber from "bignumber.js";
import { PairComputeService } from "../../../modules/pair/services/pair.compute.service";
import { EnergyGetterService } from "../../../modules/simple-lock/services/energy/energy.getter.service";
import { TokenComputeService } from "../../../modules/tokens/services/token.compute.service";
import { PairService } from "../../../modules/pair/services/pair.service";
import { WrapService } from "../../../modules/wrapping/wrap.service";
import { PairGetterService } from "../../../modules/pair/services/pair.getter.service";
import {
    TokenGetterServiceProvider
} from "../../../modules/tokens/mocks/token.getter.service.mock";
import {
    RouterGetterServiceProvider
} from "../../../modules/router/mocks/routerGetterServiceStub";
import { RouterGetterService } from "../../../modules/router/services/router.getter.service";
import {
    EnergyGetterHandlers,
    EnergyGetterServiceMock
} from "../../../modules/simple-lock/mocks/energy.getter.service.mock";
import { RouterGetterHandlers, RouterGetterServiceMock } from "../../../modules/router/mocks/routerGetterServiceMock";
import {
    PairGetterHandlers,
    PairGetterServiceMock
} from "../../../modules/pair/mocks/pair-getter-service-mock.service";
import { EnergyModel } from "../../../modules/simple-lock/models/simple.lock.model";

describe('WeeklyRewardsSplittingComputeService', () => {
    const dummyScAddress = 'erd'
    const dummyUserAddress = 'erdxxxuser'
    it('init service; should be defined', async () => {
        const service = await createService({
            getter: {},
            compute: {},
            pairGetter: {},
            progressCompute: {},
            routerGetter: {},
            weeklyGetter: {},
            energyGetter: {}
        })
        expect(service).toBeDefined();
    });
    it('advanceWeek', async () => {
        const currentWeek = 10;
        const progress = createMockProgress(currentWeek)
        const expectedEnergy = {
            amount: "100",
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const service = await createService({
            getter: {},
            compute: {},
            weeklyGetter: {
                userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                    expect(userAddress).toEqual(dummyUserAddress)
                    expect(week).toEqual(currentWeek + 1)
                    return Promise.resolve(expectedEnergy);
                }
            },
            progressCompute: {
                advanceWeek:(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => {
                    return new ClaimProgress({
                        week: currentWeek + 1,
                        energy: expectedEnergy
                    })
                }
            },
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const returnedProgress = await service.advanceWeek(dummyScAddress, dummyUserAddress, progress)
        expect(returnedProgress.week)
            .toEqual(currentWeek + 1);
        expect(returnedProgress.energy)
            .toEqual(expectedEnergy);
    });
    it('computeUserRewardsForWeek' +
        'totalRewardsForWeek returns empty array', async () => {
        const currentWeek = 10;
        const expectedEnergy = {
            amount: "100",
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const service = await createService({
            getter: {},
            compute: {},
            weeklyGetter: {
                totalRewardsForWeek: (scAddress: string, week: number) => {
                    return Promise.resolve([])
                },
                userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                    return Promise.resolve(expectedEnergy)
                },
                totalEnergyForWeek: (scAddress: string, week: number) => {
                    return Promise.resolve("1000")
                }
            },
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const rewards = await service.computeUserRewardsForWeek(dummyScAddress, currentWeek, dummyUserAddress)
        expect(rewards).toEqual([])
    });
    it('computeUserRewardsForWeek' +
        'user has no energy', async () => {
        const currentWeek = 10;
        const expectedEnergy = {
            amount: "0",
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const service = await createService({
            getter: {},
            compute: {},
            weeklyGetter: {
                totalRewardsForWeek: (scAddress: string, week: number) => {
                    const rewards = []
                    rewards.push(new EsdtTokenPayment({
                        amount: "100",
                        nonce: 0,
                        tokenID: "WEGLD",
                        tokenType: 0
                    }))
                    return Promise.resolve(rewards)
                },
                userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                    return Promise.resolve(expectedEnergy)
                },
                totalEnergyForWeek: (scAddress: string, week: number) => {
                    return Promise.resolve("1000")
                }
            },
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const rewards = await service.computeUserRewardsForWeek(dummyScAddress, currentWeek, dummyUserAddress)
        expect(rewards).toEqual([])
    });
    it('computeUserRewardsForWeek' +
        'should return rewards accordingly to the user energy', async () => {
        const currentWeek = 10;
        const expectedEnergy = {
            amount: "100",
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const expectedTokenID = "WEGLD"
        const expectedTokenType = 0
        const expectedTokenNonce = 0
        const service = await createService({
            getter: {},
            compute: {},
            weeklyGetter: {
                totalRewardsForWeek: (scAddress: string, week: number) => {
                    const rewards = []
                    rewards.push(new EsdtTokenPayment({
                        amount: "100",
                        nonce: expectedTokenNonce,
                        tokenID: expectedTokenID,
                        tokenType: expectedTokenType
                    }))
                    return Promise.resolve(rewards)
                },
                userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                    return Promise.resolve(expectedEnergy)
                },
                totalEnergyForWeek: (scAddress: string, week: number) => {
                    return Promise.resolve("1000")
                }
            },
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const rewards = await service.computeUserRewardsForWeek(dummyScAddress, currentWeek, dummyUserAddress)
        expect(rewards[0].amount).toEqual("10");
        expect(rewards[0].nonce).toEqual(expectedTokenNonce);
        expect(rewards[0].tokenID).toEqual(expectedTokenID);
        expect(rewards[0].tokenType).toEqual(expectedTokenType);
        expect(rewards.length).toEqual(1);
    });
    it('computeUserAllRewards' +
        'currentWeek == userProgress.week', async () => {
        const currentWeek = 10
        const energy = {
            amount: "100",
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const service = await createService({
            getter: {
                getCurrentWeek: (scAddress: string) => {
                    return Promise.resolve(currentWeek)
                }
            },
            compute: {},
            weeklyGetter: {
                currentClaimProgress:(scAddress: string, userAddress: string) => {
                    return Promise.resolve(new ClaimProgress({
                        energy: energy,
                        week: currentWeek
                    }))
                }
            },
            progressCompute: {},
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const rewards = await service.computeUserAllRewards(dummyScAddress, dummyUserAddress)
        expect(rewards).toEqual([])
    });
    it('computeUserAllRewards' +
        'same rewards twice in every week', async () => {
        const currentWeek = 10
        let userEnergy = new BigNumber("1000");
        const energy = {
            amount: userEnergy.toFixed(),
            lastUpdateEpoch: 50,
            totalLockedTokens: "500"
        }
        const expectedTokenID = "WEGLD"
        const expectedTokenType = 0
        const expectedTokenNonce = 0
        const service = await createService({
            getter: {
                getCurrentWeek: (scAddress: string) => {
                    return Promise.resolve(currentWeek)
                }
            },
            compute: {},
            weeklyGetter: {
                currentClaimProgress:(scAddress: string, userAddress: string) => {
                    return Promise.resolve(new ClaimProgress({
                        energy: energy,
                        week: 1
                    }))
                },
                totalRewardsForWeek: (scAddress: string, week: number) => {
                    const rewards = []
                    rewards.push(new EsdtTokenPayment({
                        amount: "100",
                        nonce: expectedTokenNonce,
                        tokenID: expectedTokenID,
                        tokenType: expectedTokenType
                    }))
                    rewards.push(new EsdtTokenPayment({
                        amount: "100",
                        nonce: expectedTokenNonce,
                        tokenID: expectedTokenID,
                        tokenType: expectedTokenType
                    }))
                    return Promise.resolve(rewards)
                },
                userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                    userEnergy = userEnergy.minus(new BigNumber("10"))
                    return Promise.resolve(new EnergyModel({
                        amount: userEnergy.toFixed()
                    }));
                },
                totalEnergyForWeek: (scAddress: string, week: number) => {
                    return Promise.resolve("1000");
                }
            },
            progressCompute: {
                advanceWeek: (progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => {
                    progress.week += 1
                    progress.energy = nextWeekEnergy
                    return progress
                }
            },
            routerGetter: {},
            pairGetter: {},
            energyGetter: {}
        })
        const rewards = await service.computeUserAllRewards(dummyScAddress, dummyUserAddress)
        expect(rewards[0].amount).toEqual("1728");
        expect(rewards[0].nonce).toEqual(expectedTokenNonce);
        expect(rewards[0].tokenID).toEqual(expectedTokenID);
        expect(rewards[0].tokenType).toEqual(expectedTokenType);
        expect(rewards.length).toEqual(1);
    });
});

async function createService(
    handlers: {
        getter: Partial<WeekTimekeepingGetterHandlers>,
        compute: Partial<WeekTimekeepingComputeHandlers>,
        weeklyGetter: Partial<WeeklyRewardsSplittingGetterHandlers>,
        progressCompute: Partial<ProgressComputeHandlers>,
        routerGetter: Partial<RouterGetterHandlers>,
        pairGetter: Partial<PairGetterHandlers>,
        energyGetter: Partial<EnergyGetterHandlers>
    }
) {
    const getter = new WeekTimekeepingGetterServiceMock(handlers.getter);
    const compute = new WeekTimekeepingComputeServiceMock(handlers.compute);
    const weeklyGetter = new WeeklyRewardsSplittingGetterServiceMock(handlers.weeklyGetter);
    const progressCompute = new ProgressComputeServiceMock(handlers.progressCompute);
    const routerGetter = new RouterGetterServiceMock(handlers.routerGetter);
    const pairGetter = new PairGetterServiceMock(handlers.pairGetter);
    const energyGetter = new EnergyGetterServiceMock(handlers.energyGetter)

    const module: TestingModule = await Test.createTestingModule({
        imports: [
            ElrondCommunicationModule,
            CachingModule,
        ],
        providers: [
            {
                provide: RouterGetterService,
                useValue: routerGetter
            },
            PairComputeService,
            PairService,
            TokenComputeService,
            WrapService,
            ApiConfigService,
            {
                provide: PairGetterService,
                useValue: pairGetter
            },
            TokenGetterServiceProvider,
            RouterGetterServiceProvider,
            {
                provide: EnergyGetterService,
                useValue: energyGetter
            },
            {
                provide: WeekTimekeepingGetterService,
                useValue: getter,
            },
            {
                provide: WeekTimekeepingComputeService,
                useValue: compute,
            },
            {
                provide: WeeklyRewardsSplittingGetterService,
                useValue: weeklyGetter,
            },
            {
                provide: ProgressComputeService,
                useValue: progressCompute,
            },
            WeeklyRewardsSplittingComputeService
        ],
    }).compile();
    return module.get<WeeklyRewardsSplittingComputeService>(WeeklyRewardsSplittingComputeService);
}