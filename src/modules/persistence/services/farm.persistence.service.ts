import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import {
    GlobalInfoByWeekModel,
    GlobalInfoScType,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { farmsAddresses, farmType } from 'src/utils/farm.utils';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { FarmRepository } from '../repositories/farm.repository';
import { FarmDocument } from '../schemas/farm.schema';
import { GlobalInfoPersistenceService } from './global.info.persistence.service';
import { PairPersistenceService } from './pair.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

@Injectable()
export class FarmPersistenceService {
    constructor(
        private readonly farmRepository: FarmRepository,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly pairPersistence: PairPersistenceService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly globalInfoPersistence: GlobalInfoPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async upsertFarm(
        farm: FarmModelV2,
        projection: ProjectionType<FarmModelV2> = { __v: 0 },
    ): Promise<FarmDocument> {
        try {
            return this.farmRepository
                .getModel()
                .findOneAndUpdate({ address: farm.address }, farm, {
                    new: true,
                    upsert: true,
                    projection,
                });
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async getFarms(
        filterQuery: FilterQuery<FarmDocument>,
        projection?: ProjectionType<FarmDocument>,
        populateOptions?: PopulateOptions[],
    ): Promise<FarmDocument[]> {
        const profiler = new PerformanceProfiler();

        const farms = await this.farmRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();

        if (populateOptions) {
            await this.farmRepository
                .getModel()
                .populate(farms, populateOptions);
        }

        profiler.stop();

        this.logger.debug(`${this.getFarms.name} : ${profiler.duration}ms`, {
            context: FarmPersistenceService.name,
        });

        return farms;
    }

    async getFarmsWithPairAndFarmedToken(
        filterQuery: FilterQuery<FarmDocument> = {},
    ): Promise<FarmDocument[]> {
        return this.getFarms(filterQuery, {}, [
            { path: 'farmedToken', select: ['price', 'decimals'] },
            {
                path: 'pair',
                select: [
                    'liquidityPoolTokenPriceUSD',
                    'firstToken',
                    'secondToken',
                    'info',
                ],
                populate: {
                    path: 'firstToken secondToken',
                    select: ['price', 'decimals'],
                },
            },
        ]);
    }

    async populateFarms(): Promise<void> {
        this.logger.info(`Starting ${this.populateFarms.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        for (const address of farmAddresses) {
            try {
                await this.populateFarmModel(address);
            } catch (error) {
                this.logger.error(error, {
                    context: FarmPersistenceService.name,
                    farmAddress: address,
                });
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.populateFarms.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async populateFarmModel(farmAddress: string): Promise<void> {
        const [farmingTokenId, farmedTokenId, farmTokenCollection] =
            await Promise.all([
                this.farmAbiV2.getFarmingTokenIDRaw(farmAddress),
                this.farmAbiV2.getFarmedTokenIDRaw(farmAddress),
                this.farmAbiV2.getFarmTokenIDRaw(farmAddress),
            ]);

        const [[farmedToken], [pair]] = await Promise.all([
            this.tokenPersistence.getTokens(
                { identifier: farmedTokenId },
                { _id: 1, price: 1 },
            ),
            this.pairPersistence.getPairs(
                { liquidityPoolTokenId: farmingTokenId },
                {
                    _id: 1,
                    address: 1,
                    liquidityPoolToken: 1,
                    liquidityPoolTokenPriceUSD: 1,
                },
            ),
        ]);

        if (
            farmedToken === undefined ||
            pair === undefined ||
            !pair.liquidityPoolToken
        ) {
            throw new Error(
                `Could not get populate farm ${farmAddress} due to missing references`,
            );
        }

        const [currentWeek, firstWeekStartEpoch] = await Promise.all([
            this.weekTimekeepingAbi.getCurrentWeekRaw(farmAddress),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(farmAddress),
        ]);

        await this.globalInfoPersistence.populateGlobalInfo(
            farmAddress,
            currentWeek,
            GlobalInfoScType.FARM,
        );

        const rawFarm: Partial<FarmModelV2> = {
            address: farmAddress,
            farmedToken: farmedToken._id,
            farmedTokenId,
            farmTokenCollection,
            farmingToken: pair.liquidityPoolToken,
            farmingTokenId,
            pair: pair._id,
            pairAddress: pair.address,
            version: FarmVersion.V2,
            rewardType: farmType(farmAddress),
            time: this.weekTimekeepingCompute.computeWeekTimekeeping(
                farmAddress,
                currentWeek,
                firstWeekStartEpoch,
            ),
        };

        await this.upsertFarm(rawFarm as FarmModelV2);
    }

    async refreshWeekTimekeeping(): Promise<void> {
        this.logger.info(`Starting ${this.refreshWeekTimekeeping.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getFarms({}, { address: 1, time: 1 });

        for (const farm of farms) {
            try {
                const weekUpdated = await this.updateWeekTimekeeping(farm);

                if (weekUpdated) {
                    await this.updateFarmReserves(farm);
                    await this.updateFarmRewards(farm);
                }
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing week timekeeping for farm ${farm.address}`,
                    { context: FarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshWeekTimekeeping.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async updateWeekTimekeeping(farm: FarmDocument): Promise<boolean> {
        const currentWeek = await this.weekTimekeepingAbi.getCurrentWeekRaw(
            farm.address,
        );

        if (farm.time.currentWeek === currentWeek) {
            return false;
        }

        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpochRaw(farm.address);

        farm.time = this.weekTimekeepingCompute.computeWeekTimekeeping(
            farm.address,
            currentWeek,
            firstWeekStartEpoch,
        );

        await farm.save();

        return true;
    }

    async refreshPricesAPRsAndTVL(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPricesAPRsAndTVL.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getFarmsWithPairAndFarmedToken();

        for (const farm of farms) {
            try {
                await this.updatePricesAPRsAndTVL(farm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing prices, APRs and TVL for farm ${farm.address}`,
                    { context: FarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshPricesAPRsAndTVL.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async updatePricesAPRsAndTVL(farm: FarmDocument): Promise<void> {
        const {
            farmedToken,
            farmTokenSupply,
            pair,
            perBlockRewards,
            boostedYieldsRewardsPercenatage,
            boostedYieldsFactors,
        } = farm;

        farm.farmedTokenPriceUSD = farmedToken.price;
        farm.farmingTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;
        farm.farmTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;

        farm.totalValueLockedUSD = this.pairPersistence.getLiquidityPositionUSD(
            pair.info,
            pair.firstToken,
            pair.secondToken,
            farmTokenSupply,
        );

        const totalRewardsPerYear = new BigNumber(perBlockRewards)
            .multipliedBy(constantsConfig.BLOCKS_IN_YEAR)
            .toFixed();

        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear,
            farmedToken.decimals,
            farmedToken.price,
        );

        const baseApr = this.farmComputeV2
            .computeBaseRewards(
                totalRewardsPerYearUSD,
                boostedYieldsRewardsPercenatage,
            )
            .div(farm.totalValueLockedUSD);

        farm.baseApr = baseApr.toFixed();
        farm.boostedApr = baseApr
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(boostedYieldsRewardsPercenatage)
            .dividedBy(
                constantsConfig.MAX_PERCENT - boostedYieldsRewardsPercenatage,
            )
            .toFixed();

        await farm.save();
    }

    async refreshAbiFields(): Promise<void> {
        this.logger.info(`Starting ${this.refreshAbiFields.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getFarms(
            {},
            {
                address: 1,
            },
        );

        for (const farm of farms) {
            try {
                await this.updateAbiFields(farm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing ABI fields for farm ${farm.address}`,
                    { context: FarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshAbiFields.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async updateAbiFields(farm: FarmDocument): Promise<void> {
        const [
            produceRewardsEnabled,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs,
            energyFactoryAddress,
        ] = await Promise.all([
            this.farmAbiV2.getProduceRewardsEnabledRaw(farm.address),
            this.farmAbiV2.getRewardsPerBlockRaw(farm.address),
            this.farmAbiV2.getPenaltyPercentRaw(farm.address),
            this.farmAbiV2.getMinimumFarmingEpochsRaw(farm.address),
            this.farmAbiV2.getDivisionSafetyConstantRaw(farm.address),
            this.farmAbiV2.getStateRaw(farm.address),
            this.farmAbiV2.getBurnGasLimitRaw(farm.address),
            this.farmAbiV2.getBoostedYieldsRewardsPercenatageRaw(farm.address),
            this.farmAbiV2.getBoostedYieldsFactorsRaw(farm.address),
            this.farmAbiV2.getLockingScAddressRaw(farm.address),
            this.farmAbiV2.getLockEpochsRaw(farm.address),
            this.farmAbiV2.getEnergyFactoryAddressRaw(farm.address),
        ]);

        farm.produceRewardsEnabled = produceRewardsEnabled;
        farm.perBlockRewards = perBlockRewards;
        farm.penaltyPercent = penaltyPercent;
        farm.minimumFarmingEpochs = minimumFarmingEpochs;
        farm.divisionSafetyConstant = divisionSafetyConstant;
        farm.state = state;
        farm.burnGasLimit = burnGasLimit;
        farm.boostedYieldsRewardsPercenatage = boostedYieldsRewardsPercentage;
        farm.boostedYieldsFactors = boostedYieldsFactors;
        farm.lockingScAddress = lockingScAddress;
        farm.lockEpochs = lockEpochs.toString();
        farm.energyFactoryAddress = energyFactoryAddress;

        await farm.save();
    }

    async refreshFarmsReserves(): Promise<void> {
        this.logger.info(`Starting ${this.refreshFarmsReserves.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getFarms({});

        for (const farm of farms) {
            try {
                await this.updateFarmReserves(farm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing reserves for farm ${farm.address}`,
                    { context: FarmPersistenceService.name },
                );
                this.logger.info(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshFarmsReserves.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async updateFarmReserves(farm: FarmDocument): Promise<void> {
        const [
            farmTokenSupply,
            farmTokenSupplyCurrentWeek,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
        ] = await Promise.all([
            this.farmAbiV2.getFarmTokenSupplyRaw(farm.address),
            this.farmAbiV2.getFarmSupplyForWeekRaw(
                farm.address,
                farm.time.currentWeek,
            ),
            this.farmAbiV2.getLastRewardBlockNonceRaw(farm.address),
            this.farmAbiV2.getRewardPerShareRaw(farm.address),
            this.farmAbiV2.getRewardReserveRaw(farm.address),
        ]);

        farm.farmTokenSupply = farmTokenSupply;
        farm.farmTokenSupplyCurrentWeek = farmTokenSupplyCurrentWeek;
        farm.lastRewardBlockNonce = lastRewardBlockNonce;
        farm.rewardPerShare = rewardPerShare;
        farm.rewardReserve = rewardReserve;

        await farm.save();
    }

    async refreshFarmsRewards(): Promise<void> {
        this.logger.info(`Starting ${this.refreshFarmsRewards.name}`, {
            context: FarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getFarms({});

        for (const farm of farms) {
            try {
                await this.updateFarmRewards(farm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing rewards for farm ${farm.address}`,
                    { context: FarmPersistenceService.name },
                );
                this.logger.info(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshFarmsRewards.name} : ${profiler.duration}ms`,
            {
                context: FarmPersistenceService.name,
            },
        );
    }

    async updateFarmRewards(farm: FarmDocument): Promise<void> {
        const [
            globalInfo,
            undistributedBoostedRewards,
            accumulatedRewards,
            lastGlobalUpdateWeek,
        ] = await Promise.all([
            this.globalInfoPersistence.populateGlobalInfoModel(
                new GlobalInfoByWeekModel({
                    scAddress: farm.address,
                    scType: GlobalInfoScType.FARM,
                    week: farm.time.currentWeek,
                }),
            ),
            this.farmComputeV2.undistributedBoostedRewardsRaw(
                farm.address,
                farm.time.currentWeek,
            ),
            this.farmAbiV2.getAccumulatedRewardsForWeekRaw(
                farm.address,
                farm.time.currentWeek,
            ),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(
                farm.address,
            ),
        ]);

        farm.undistributedBoostedRewards = undistributedBoostedRewards
            .integerValue()
            .toFixed();

        farm.allAccumulatedRewards.set(
            farm.time.currentWeek.toString(),
            accumulatedRewards,
        );

        farm.boostedRewardsPerWeek =
            this.farmComputeV2.calculateBoostedRewardsPerWeek(farm);

        farm.optimalEnergyPerLp =
            this.farmComputeV2.calculateOptimalEnergyPerLP(
                farm,
                globalInfo.totalEnergyForWeek,
            );

        farm.lastGlobalUpdateWeek = lastGlobalUpdateWeek;

        await farm.save();
    }
}
