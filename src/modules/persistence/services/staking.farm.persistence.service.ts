import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { FilterQuery, PopulateOptions, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import {
    MongoCollections,
    MongoQueries,
    PersistenceMetrics,
} from 'src/helpers/decorators/persistence.metrics.decorator';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import {
    GlobalInfoByWeekModel,
    GlobalInfoScType,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { StakingFarmRepository } from '../repositories/staking.farm.repository';
import { StakingFarmDocument } from '../schemas/staking.farm.schema';
import { GlobalInfoPersistenceService } from './global.info.persistence.service';
import { TokenPersistenceService } from './token.persistence.service';

@Injectable()
export class StakingFarmPersistenceService {
    constructor(
        private readonly stakingFarmRepository: StakingFarmRepository,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly tokenService: TokenService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly globalInfoPersistence: GlobalInfoPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @PersistenceMetrics(MongoCollections.Staking, MongoQueries.Upsert)
    async upsertStakingFarm(
        stakingFarm: StakingModel,
        projection: ProjectionType<StakingModel> = { __v: 0 },
    ): Promise<StakingFarmDocument> {
        try {
            return this.stakingFarmRepository
                .getModel()
                .findOneAndUpdate(
                    { address: stakingFarm.address },
                    stakingFarm,
                    {
                        new: true,
                        upsert: true,
                        projection,
                    },
                );
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    @PersistenceMetrics(MongoCollections.Staking, MongoQueries.Update, 1)
    async updateStakingFarm(
        stakingFarm: StakingFarmDocument,
        operation: string,
    ): Promise<void> {
        this.logger.debug(`${this.updateStakingFarm.name}`, {
            context: StakingFarmPersistenceService.name,
            operation,
            changes: stakingFarm.getChanges(),
        });

        await stakingFarm.save();
    }

    @PersistenceMetrics(MongoCollections.Staking, MongoQueries.Find)
    async getStakingFarms(
        filterQuery: FilterQuery<StakingFarmDocument>,
        projection?: ProjectionType<StakingFarmDocument>,
        populateOptions?: PopulateOptions[],
    ): Promise<StakingFarmDocument[]> {
        const stakingFarms = await this.stakingFarmRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();

        if (populateOptions) {
            await this.stakingFarmRepository
                .getModel()
                .populate(stakingFarms, populateOptions);
        }

        return stakingFarms;
    }

    async getStakingFarmsWithFarmingToken(
        filterQuery: FilterQuery<StakingFarmDocument> = {},
    ): Promise<StakingFarmDocument[]> {
        return this.getStakingFarms(filterQuery, {}, [
            { path: 'farmingToken', select: ['price', 'decimals'] },
        ]);
    }

    async populateStakingFarms(): Promise<void> {
        this.logger.info(`Starting ${this.populateStakingFarms.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const addresses = await this.remoteConfigGetter.getStakingAddresses();

        for (const address of addresses) {
            try {
                await this.populateStakingFarmModel(address);
            } catch (error) {
                this.logger.error(error, {
                    context: StakingFarmPersistenceService.name,
                    stakingAddress: address,
                });
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.populateStakingFarms.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async populateStakingFarmModel(stakeAddress: string): Promise<void> {
        try {
            const [
                farmTokenCollection,
                farmingTokenID,
                rewardTokenID,
                deployedAt,
            ] = await Promise.all([
                this.stakingAbi.getFarmTokenIDRaw(stakeAddress),
                this.stakingAbi.getFarmingTokenIDRaw(stakeAddress),
                this.stakingAbi.getRewardTokenIDRaw(stakeAddress),
                this.stakingCompute.computeDeployedAt(stakeAddress),
            ]);

            const [tokens, farmTokenMetadata] = await Promise.all([
                this.tokenPersistence.getTokens(
                    { identifier: { $in: [farmingTokenID, rewardTokenID] } },
                    { _id: 1, identifier: 1, price: 1, decimals: 1 },
                ),
                this.tokenService.getNftCollectionMetadata(farmTokenCollection),
            ]);

            const farmingToken = tokens.find(
                (token) => token.identifier === farmingTokenID,
            );
            const rewardToken = tokens.find(
                (token) => token.identifier === rewardTokenID,
            );

            if (
                farmingToken === undefined ||
                rewardToken === undefined ||
                farmTokenMetadata === undefined
            ) {
                throw new Error(
                    `Could not get tokens (${farmingTokenID}, ${rewardTokenID}) for staking farm ${stakeAddress}`,
                );
            }

            const [currentWeek, firstWeekStartEpoch] = await Promise.all([
                this.weekTimekeepingAbi.getCurrentWeekRaw(stakeAddress),
                this.weekTimekeepingAbi.firstWeekStartEpochRaw(stakeAddress),
            ]);

            this.globalInfoPersistence.populateGlobalInfo(
                stakeAddress,
                currentWeek,
                GlobalInfoScType.STAKING,
            );

            const rawStakingFarm: Partial<StakingModel> = {
                address: stakeAddress,
                farmTokenCollection,
                farmTokenDecimals: farmTokenMetadata.decimals,
                farmingToken: farmingToken._id,
                farmingTokenID,
                rewardToken: rewardToken._id,
                rewardTokenID,
                deployedAt,
                time: this.weekTimekeepingCompute.computeWeekTimekeeping(
                    stakeAddress,
                    currentWeek,
                    firstWeekStartEpoch,
                ),
            };

            await this.upsertStakingFarm(rawStakingFarm as StakingModel);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async refreshWeekTimekeeping(): Promise<void> {
        this.logger.info(`Starting ${this.refreshWeekTimekeeping.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getStakingFarms({}, { address: 1, time: 1 });

        for (const farm of farms) {
            try {
                const weekUpdated = await this.updateWeekTimekeeping(farm);

                if (weekUpdated) {
                    await this.updateReserves(farm);
                    await this.updateStakingFarmRewards(farm);
                }
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing week timekeeping for staking farm ${farm.address}`,
                    { context: StakingFarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshWeekTimekeeping.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async updateWeekTimekeeping(
        stakingFarm: StakingFarmDocument,
    ): Promise<boolean> {
        const currentWeek = await this.weekTimekeepingAbi.getCurrentWeekRaw(
            stakingFarm.address,
        );

        if (stakingFarm.time.currentWeek === currentWeek) {
            return false;
        }

        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpochRaw(
                stakingFarm.address,
            );

        stakingFarm.time = this.weekTimekeepingCompute.computeWeekTimekeeping(
            stakingFarm.address,
            currentWeek,
            firstWeekStartEpoch,
        );

        await this.updateStakingFarm(
            stakingFarm,
            this.updateWeekTimekeeping.name,
        );

        return true;
    }

    async refreshAbiFields(): Promise<void> {
        this.logger.info(`Starting ${this.refreshAbiFields.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const farms = await this.getStakingFarms(
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
                    { context: StakingFarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshAbiFields.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async updateAbiFields(stakingFarm: StakingFarmDocument): Promise<void> {
        const [
            annualPercentageRewards,
            perBlockRewards,
            minUnboundEpochs,
            divisionSafetyConstant,
            produceRewardsEnabled,
            lockedAssetFactoryManagedAddress,
            state,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            energyFactoryAddress,
            stakingPositionMigrationNonce,
        ] = await Promise.all([
            this.stakingAbi.getAnnualPercentageRewardsRaw(stakingFarm.address),
            this.stakingAbi.getPerBlockRewardsAmountRaw(stakingFarm.address),
            this.stakingAbi.getMinUnbondEpochsRaw(stakingFarm.address),
            this.stakingAbi.getDivisionSafetyConstantRaw(stakingFarm.address),
            this.stakingAbi.getProduceRewardsEnabledRaw(stakingFarm.address),
            this.stakingAbi.getLockedAssetFactoryAddressRaw(
                stakingFarm.address,
            ),
            this.stakingAbi.getStateRaw(stakingFarm.address),
            this.stakingAbi.getBoostedYieldsRewardsPercenatageRaw(
                stakingFarm.address,
            ),
            this.stakingAbi.getBoostedYieldsFactorsRaw(stakingFarm.address),
            this.stakingAbi.getEnergyFactoryAddressRaw(stakingFarm.address),
            this.stakingAbi.getFarmPositionMigrationNonceRaw(
                stakingFarm.address,
            ),
        ]);

        stakingFarm.annualPercentageRewards = annualPercentageRewards;
        stakingFarm.perBlockRewards = perBlockRewards;
        stakingFarm.minUnboundEpochs = minUnboundEpochs;
        stakingFarm.divisionSafetyConstant = divisionSafetyConstant.toString();
        stakingFarm.produceRewardsEnabled = produceRewardsEnabled;
        stakingFarm.lockedAssetFactoryManagedAddress =
            lockedAssetFactoryManagedAddress;
        stakingFarm.state = state;
        stakingFarm.boostedYieldsRewardsPercenatage =
            boostedYieldsRewardsPercentage;
        stakingFarm.boostedYieldsFactors = boostedYieldsFactors;
        stakingFarm.energyFactoryAddress = energyFactoryAddress;
        stakingFarm.stakingPositionMigrationNonce =
            stakingPositionMigrationNonce;

        await this.updateStakingFarm(stakingFarm, this.updateAbiFields.name);
    }

    async refreshPricesAPRsAndTVL(): Promise<void> {
        this.logger.info(`Starting ${this.refreshPricesAPRsAndTVL.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const stakingFarms = await this.getStakingFarmsWithFarmingToken();

        for (const stakingFarm of stakingFarms) {
            try {
                await this.updatePricesAPRsAndTVL(stakingFarm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing prices, APRs and TVL for staking farm ${stakingFarm.address}`,
                    { context: StakingFarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshPricesAPRsAndTVL.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async updatePricesAPRsAndTVL(
        stakingFarm: StakingFarmDocument,
    ): Promise<void> {
        const {
            farmingToken,
            farmTokenDecimals,
            farmTokenSupply,
            isProducingRewards,
            perBlockRewards,
            rewardsPerBlockAPRBound,
            boostedYieldsRewardsPercenatage,
            boostedYieldsFactors,
            annualPercentageRewards,
        } = stakingFarm;

        const stakedValueUSD = computeValueUSD(
            farmTokenSupply,
            farmTokenDecimals,
            farmingToken.price,
        ).toFixed();

        const rewardsAPRBounded = new BigNumber(
            rewardsPerBlockAPRBound,
        ).multipliedBy(constantsConfig.BLOCKS_IN_YEAR);

        const apr = this.stakingCompute.calculateStakeFarmAPR(
            isProducingRewards,
            perBlockRewards,
            farmTokenSupply,
            annualPercentageRewards,
            rewardsAPRBounded,
        );

        const aprUncapped = this.stakingCompute.calculateStakeFarmUncappedAPR(
            perBlockRewards,
            farmTokenSupply,
            isProducingRewards,
        );

        const boostedApr = this.stakingCompute.calculateBoostedAPR(
            boostedYieldsRewardsPercenatage,
            apr,
        );

        const baseApr = this.stakingCompute.calculateStakeFarmBaseAPR(
            apr,
            boostedApr,
        );

        const maxBoostedApr = this.stakingCompute.calculateMaxBoostedApr(
            baseApr,
            boostedYieldsFactors,
            boostedYieldsRewardsPercenatage,
        );

        stakingFarm.farmingTokenPriceUSD = farmingToken.price;
        stakingFarm.stakedValueUSD = stakedValueUSD;

        stakingFarm.apr = apr;
        stakingFarm.aprUncapped = aprUncapped;
        stakingFarm.boostedApr = boostedApr;
        stakingFarm.baseApr = baseApr;
        stakingFarm.maxBoostedApr = maxBoostedApr;

        await this.updateStakingFarm(
            stakingFarm,
            this.updatePricesAPRsAndTVL.name,
        );
    }

    async refreshReserves(): Promise<void> {
        this.logger.info(`Starting ${this.refreshReserves.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const stakingFarms = await this.getStakingFarms({});

        for (const stakingFarm of stakingFarms) {
            try {
                await this.updateReserves(stakingFarm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing reserves for staking farm ${stakingFarm.address}`,
                    { context: StakingFarmPersistenceService.name },
                );
                this.logger.error(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `Finished ${this.refreshReserves.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async updateReserves(stakingFarm: StakingFarmDocument): Promise<void> {
        const [
            farmTokenSupply,
            farmTokenSupplyCurrentWeek,
            accumulatedRewards,
            rewardPerShare,
            rewardCapacity,
            lastRewardBlockNonce,
        ] = await Promise.all([
            this.stakingAbi.getFarmTokenSupplyRaw(stakingFarm.address),
            this.stakingAbi.getFarmSupplyForWeekRaw(
                stakingFarm.address,
                stakingFarm.time.currentWeek,
            ),
            this.stakingAbi.getAccumulatedRewardsRaw(stakingFarm.address),
            this.stakingAbi.getRewardPerShareRaw(stakingFarm.address),
            this.stakingAbi.getRewardCapacityRaw(stakingFarm.address),
            this.stakingAbi.getLastRewardBlockNonceRaw(stakingFarm.address),
        ]);

        const isProducingRewards =
            !stakingFarm.produceRewardsEnabled ||
            new BigNumber(accumulatedRewards).isEqualTo(rewardCapacity)
                ? false
                : true;

        const rewardsPerBlockAPRBound =
            this.stakingCompute.calculateRewardsPerBlockAPRBound(
                farmTokenSupply,
                stakingFarm.annualPercentageRewards,
            );

        const rewardsRemainingDays =
            this.stakingCompute.calculateRewardsRemainingDaysBase(
                stakingFarm.perBlockRewards,
                rewardCapacity,
                accumulatedRewards,
                rewardsPerBlockAPRBound,
            );

        stakingFarm.farmTokenSupply = farmTokenSupply;
        stakingFarm.farmTokenSupplyCurrentWeek = farmTokenSupplyCurrentWeek;
        stakingFarm.rewardPerShare = rewardPerShare;
        stakingFarm.rewardCapacity = rewardCapacity;
        stakingFarm.lastRewardBlockNonce = lastRewardBlockNonce;
        stakingFarm.rewardsRemainingDays = rewardsRemainingDays;
        stakingFarm.rewardsPerBlockAPRBound = rewardsPerBlockAPRBound.toFixed();
        stakingFarm.isProducingRewards = isProducingRewards;

        await this.updateStakingFarm(stakingFarm, this.updateReserves.name);
    }

    async refreshStakingFarmsRewards(): Promise<void> {
        this.logger.info(`Starting ${this.refreshStakingFarmsRewards.name}`, {
            context: StakingFarmPersistenceService.name,
        });

        const profiler = new PerformanceProfiler();

        const stakingFarms = await this.getStakingFarms({});

        for (const farm of stakingFarms) {
            try {
                await this.updateStakingFarmRewards(farm);
            } catch (error) {
                this.logger.error(
                    `Failed while refreshing rewards for staking farm ${farm.address}`,
                    { context: StakingFarmPersistenceService.name },
                );
                this.logger.log(error);
            }
        }

        profiler.stop();

        this.logger.debug(
            `${this.refreshStakingFarmsRewards.name} : ${profiler.duration}ms`,
            {
                context: StakingFarmPersistenceService.name,
            },
        );
    }

    async updateStakingFarmRewards(
        stakingFarm: StakingFarmDocument,
    ): Promise<void> {
        const [
            globalInfo,
            undistributedBoostedRewards,
            accumulatedRewards,
            lastGlobalUpdateWeek,
        ] = await Promise.all([
            this.globalInfoPersistence.populateGlobalInfoModel(
                new GlobalInfoByWeekModel({
                    scAddress: stakingFarm.address,
                    scType: GlobalInfoScType.STAKING,
                    week: stakingFarm.time.currentWeek,
                }),
            ),
            this.stakingCompute.undistributedBoostedRewardsRaw(
                stakingFarm.address,
                stakingFarm.time.currentWeek,
            ),
            this.stakingAbi.getAccumulatedRewardsForWeekRaw(
                stakingFarm.address,
                stakingFarm.time.currentWeek,
            ),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(
                stakingFarm.address,
            ),
        ]);

        stakingFarm.optimalEnergyPerStaking =
            this.stakingCompute.calculateOptimalEnergyPerStaking(
                stakingFarm.boostedYieldsFactors,
                stakingFarm.farmTokenSupply,
                globalInfo.totalEnergyForWeek,
            );

        stakingFarm.undistributedBoostedRewards = undistributedBoostedRewards
            .integerValue()
            .toFixed();

        stakingFarm.allAccumulatedRewards.set(
            stakingFarm.time.currentWeek.toString(),
            accumulatedRewards,
        );

        stakingFarm.lastGlobalUpdateWeek = lastGlobalUpdateWeek;

        await this.updateStakingFarm(
            stakingFarm,
            this.updateStakingFarmRewards.name,
        );
    }
}
