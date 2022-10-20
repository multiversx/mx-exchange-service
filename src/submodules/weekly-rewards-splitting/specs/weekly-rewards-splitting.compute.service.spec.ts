import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../../../services/caching/cache.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WeekTimekeepingComputeServiceMock } from "../../week-timekeeping/mocks/week-timekeeping.compute.service.mock";
import { WeeklyRewardsSplittingComputeService } from "../services/weekly-rewards-splitting.compute.service";
import { WeekTimekeepingGetterService } from "../../week-timekeeping/services/week-timekeeping.getter.service";
import { WeekTimekeepingComputeService } from "../../week-timekeeping/services/week-timekeeping.compute.service";
import { WeekTimekeepingGetterServiceMock } from "../../week-timekeeping/mocks/week-timekeeping.getter.service.mock";
import { WeeklyRewardsSplittingGetterService } from "../services/weekly-rewards-splitting.getter.service";
import { WeeklyRewardsSplittingGetterServiceMock } from "../mocks/weekly-rewards-splitting.getter.service.mock";
import { ProgressComputeServiceMock } from "../mocks/progress.compute.service.mock";
import { ProgressComputeService } from "../services/progress.compute.service";
import { createMockProgress } from "./progress.compute.service.spec";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";
import BigNumber from "bignumber.js";
import { AbiRouterService } from "../../../modules/router/services/abi.router.service";
import { PairComputeService } from "../../../modules/pair/services/pair.compute.service";
import { EnergyGetterService } from "../../../modules/simple-lock/services/energy/energy.getter.service";
import { TokenComputeService } from "../../../modules/tokens/services/token.compute.service";
import { PairService } from "../../../modules/pair/services/pair.service";
import { WrapService } from "../../../modules/wrapping/wrap.service";
import { PairGetterServiceMock } from "../../../modules/pair/mocks/pair.getter.service.mock";
import { PairGetterService } from "../../../modules/pair/services/pair.getter.service";
import { TokenGetterServiceMock } from "../../../modules/tokens/mocks/token.getter.service.mock";
import { RouterGetterServiceMock } from "../../../modules/router/mocks/router.getter.service.mock";
import { RouterGetterService } from "../../../modules/router/services/router.getter.service";
import { TokenGetterService } from "../../../modules/tokens/services/token.getter.service";
import { EnergyGetterServiceMock } from "../../../modules/simple-lock/mocks/energy.getter.service.mock";

describe('WeeklyRewardsSplittingComputeService', () => {
    const dummyScAddress = 'erd'
    const dummyUserAddress = 'erdxxxuser'
    const expectedErr = new Error('expected err')
    it('init service; should be defined', async () => {
        const service = await createService({}, {}, {}, {});
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
        const service = await createService({}, {}, {
            userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                expect(userAddress).toEqual(dummyUserAddress)
                expect(week).toEqual(currentWeek + 1)
                return expectedEnergy
            }
        }, {
            advanceWeek:(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => {
                return new ClaimProgress({
                    week: currentWeek + 1,
                    energy: expectedEnergy
                })
            }
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
        const service = await createService({}, {}, {
            totalRewardsForWeek: (scAddress: string, week: number) => {
                return []
            },
            userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                return expectedEnergy
            },
            totalEnergyForWeek: (scAddress: string, week: number) => {
                return "1000"
            }
        }, {})
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
        const service = await createService({}, {}, {
            totalRewardsForWeek: (scAddress: string, week: number) => {
                const rewards = []
                rewards.push(new EsdtTokenPayment({
                    amount: "100",
                    nonce: 0,
                    tokenID: "WEGLD",
                    tokenType: 0
                }))
                return rewards
            },
            userEnergyForWeek: (scAddress: string, userAddress: string, week: number) => {
                return expectedEnergy
            },
            totalEnergyForWeek: (scAddress: string, week: number) => {
                return "1000"
            }
        }, {})
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
        const service = await createService({}, {}, {
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
        }, {})
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
        const service = await createService(
            {
                getCurrentWeek: (scAddress: string) => {
                    return Promise.resolve(currentWeek)
                }
            },
            {},
            {
                currentClaimProgress:(scAddress: string, userAddress: string) => {
                    return Promise.resolve(new ClaimProgress({
                        energy: energy,
                        week: currentWeek
                    }))
                }
            },
            {}
        );
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
        const service = await createService(
            {
                getCurrentWeek: (scAddress: string) => {
                    return Promise.resolve(currentWeek)
                }
            },
            {},
            {
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
                    return Promise.resolve(userEnergy.toFixed())
                },
                totalEnergyForWeek: (scAddress: string, week: number) => {
                    return "1000"
                }
            },
            {
                advanceWeek: (progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => {
                    progress.week += 1
                    progress.energy = nextWeekEnergy
                    return progress
                }
            }
        );
        const rewards = await service.computeUserAllRewards(dummyScAddress, dummyUserAddress)
        expect(rewards[0].amount).toEqual("200");
        expect(rewards[0].nonce).toEqual(expectedTokenNonce);
        expect(rewards[0].tokenID).toEqual(expectedTokenID);
        expect(rewards[0].tokenType).toEqual(expectedTokenType);
        expect(rewards.length).toEqual(1);
    });
});

async function createService(getterHandlers: any, computeHandlers: any, weeklyGetterHandlers: any, progressComputeHandlers: any) {
    const getter = new WeekTimekeepingGetterServiceMock(getterHandlers);
    const compute = new WeekTimekeepingComputeServiceMock(computeHandlers);
    const weeklyGetter = new WeeklyRewardsSplittingGetterServiceMock(weeklyGetterHandlers);
    const progressCompute = new ProgressComputeServiceMock(progressComputeHandlers);
    const module: TestingModule = await Test.createTestingModule({
        imports: [
            ElrondCommunicationModule,
            CachingModule,
        ],
        providers: [
            AbiRouterService,
            PairComputeService,
            PairService,
            TokenComputeService,
            WrapService,
            ApiConfigService,
            {
                provide: PairGetterService,
                useClass: PairGetterServiceMock
            },
            {
                provide: TokenGetterService,
                useClass: TokenGetterServiceMock
            },
            {
                provide: RouterGetterService,
                useClass: RouterGetterServiceMock
            },
            {
                provide: EnergyGetterService,
                useValue: EnergyGetterServiceMock
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