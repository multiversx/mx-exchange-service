import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import {
    PairCompoundedAPRModel,
    PairModel,
    PairRewardTokensModel,
} from 'src/modules/pair/models/pair.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import {
    GlobalStateInitStatus,
    GlobalState,
    PairEsdtTokens,
} from '../entities/global.state';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import {
    AssetsModel,
    SocialModel,
} from 'src/modules/tokens/models/assets.model';
import { RolesModel } from 'src/modules/tokens/models/roles.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';

@Injectable()
export class InMemoryStoreService {
    constructor(
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly routerAbi: RouterAbiService,
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly energyService: EnergyService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly farmCompute: FarmComputeServiceV2,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const callback = async () => await this.initData();

        const initDataTimeout = setTimeout(callback, 5000);
        this.schedulerRegistry.addTimeout(
            'initPairGlobalState',
            initDataTimeout,
        );
    }

    async initData(): Promise<void> {
        if (GlobalState.initStatus !== GlobalStateInitStatus.NOT_STARTED) {
            return;
        }

        GlobalState.initStatus = GlobalStateInitStatus.IN_PROGRESS;

        this.logger.info(`Starting init for in memory store`, {
            context: 'InMemoryStoreService',
        });

        const profiler = new PerformanceProfiler();

        try {
            const pairsMetadata = await this.routerAbi.pairsMetadata();

            await this.updateAddressesAndTokenIDs(pairsMetadata);

            const pairAddresses = [];
            const pairStakingProxyAddresses = [];
            for (const pair of Object.values(GlobalState.pairsState)) {
                pairAddresses.push(pair.address);

                if (pair.stakingProxyAddress !== undefined) {
                    pairStakingProxyAddresses.push(pair.stakingProxyAddress);
                }
            }

            await this.updatePairsData(pairAddresses);

            await this.updatePairsCompoundedAPRs(
                pairAddresses,
                pairStakingProxyAddresses,
            );

            await this.updatePairsRewardTokens(pairAddresses);

            GlobalState.initStatus = GlobalStateInitStatus.DONE;
        } catch (error) {
            this.logger.error(`${error.message}`, {
                context: 'InMemoryStoreService',
            });
            GlobalState.initStatus = GlobalStateInitStatus.FAILED;
        } finally {
            profiler.stop();

            this.logger.info(
                `initData completed with status ${GlobalState.initStatus} in ${profiler.duration}ms.`,
                { context: 'InMemoryStoreService' },
            );
        }
    }

    private async updateAddressesAndTokenIDs(
        pairsMetadata: PairMetadata[],
    ): Promise<void> {
        const tokenIDs = [];

        const pairAddresses = pairsMetadata.map((pair) => pair.address);

        const allFarmAddresses = await this.pairCompute.getAllPairsFarmAddress(
            pairAddresses,
        );

        const allPairsStakingProxyAddresses =
            await this.pairCompute.getAllPairsStakingProxyAddress(
                pairAddresses,
            );

        const pairsStakingProxies = allPairsStakingProxyAddresses.filter(
            (address) => address !== undefined,
        );

        const stakingTokenIDs =
            await this.stakingProxyAbi.getAllStakingTokenIDs(
                pairsStakingProxies,
            );

        const allLpTokenIDs = await this.pairService.getAllLpTokensIds(
            pairAddresses,
        );

        const allPairsStakingTokenIds = allPairsStakingProxyAddresses.map(
            (address) => {
                if (address === undefined) {
                    return undefined;
                }
                const stakingProxyIndex = pairsStakingProxies.findIndex(
                    (stakingProxyAddress) => stakingProxyAddress === address,
                );
                return stakingTokenIDs[stakingProxyIndex];
            },
        );

        pairsMetadata.forEach((pair) => {
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs.push(
            ...allLpTokenIDs.filter((tokenID) => tokenID !== undefined),
        );
        tokenIDs.push(...stakingTokenIDs);

        const uniqueTokenIDs = [...new Set(tokenIDs)];

        const tokensMetadata = await this.tokenService.getAllTokensMetadata(
            uniqueTokenIDs,
        );

        const allTokensType = await this.tokenService.getAllEsdtTokensType(
            uniqueTokenIDs,
        );

        for (const [index, tokenID] of uniqueTokenIDs.entries()) {
            // todo - update existing tokens without overriding computed fields
            const assets = new AssetsModel({
                social: new SocialModel(tokensMetadata[index].assets.social),
                ...tokensMetadata[index].assets,
            });

            if (GlobalState.tokensState[tokenID] !== undefined) {
                GlobalState.tokensState[tokenID] = new EsdtToken({
                    ...GlobalState.tokensState[tokenID],
                    ...tokensMetadata[index],
                    type: allTokensType[index],
                    assets: assets,
                });

                continue;
            }

            GlobalState.tokensState[tokenID] = new EsdtToken({
                ...tokensMetadata[index],
                type: allTokensType[index],
                assets: assets,
            });
        }

        for (const [index, pair] of pairsMetadata.entries()) {
            // update all pair related token IDs
            GlobalState.pairsEsdtTokens[pair.address] = new PairEsdtTokens({
                firstTokenID: pair.firstTokenID,
                secondTokenID: pair.secondTokenID,
                lpTokenID: allLpTokenIDs[index],
                dualFarmRewardTokenID: allPairsStakingTokenIds[index],
            });

            // update farm and staking proxy addresses
            if (GlobalState.pairsState[pair.address] !== undefined) {
                GlobalState.pairsState[pair.address].farmAddress =
                    allFarmAddresses[index];
                GlobalState.pairsState[pair.address].stakingProxyAddress =
                    allPairsStakingProxyAddresses[index];

                continue;
            }

            const newPair = new PairModel({
                address: pair.address,
                farmAddress: allFarmAddresses[index],
                stakingProxyAddress: allPairsStakingProxyAddresses[index],
            });

            GlobalState.pairsState[pair.address] = newPair;
        }
    }

    private async updatePairsData(pairAddresses: string[]): Promise<void> {
        const {
            allFirstTokensPrice,
            allFirstTokensPriceUSD,
            allFirstTokensLockedValueUSD,
            allSecondTokensPrice,
            allSecondTokensPriceUSD,
            allSecondTokensLockedValueUSD,
            allLpTokensPriceUSD,
            allLockedValueUSD,
            allPrevious24hLockedValueUSD,
            allFeesUSD,
            allTradesCount,
            allTradesCount24h,
            allDeployedAt,
            allVolumeUSD24h,
            allStates,
            allFeeStates,
            allInfoMetadata,
            allType,
            allTotalFeePercent,
            allSpecialFeePercent,
        } = await this.getPairData(pairAddresses);

        for (const [index, address] of pairAddresses.entries()) {
            const {
                firstTokenID,
                secondTokenID,
                lpTokenID,
                dualFarmRewardTokenID,
            } = GlobalState.pairsEsdtTokens[address];

            GlobalState.pairsState[address].firstToken = new EsdtToken({
                ...GlobalState.tokensState[firstTokenID],
            });
            GlobalState.pairsState[address].firstTokenPrice =
                allFirstTokensPrice[index];
            GlobalState.pairsState[address].firstTokenPriceUSD =
                allFirstTokensPriceUSD[index];
            GlobalState.pairsState[address].firstTokenLockedValueUSD =
                allFirstTokensLockedValueUSD[index];

            GlobalState.pairsState[address].secondToken = new EsdtToken({
                ...GlobalState.tokensState[secondTokenID],
            });
            GlobalState.pairsState[address].secondTokenPrice =
                allSecondTokensPrice[index];
            GlobalState.pairsState[address].secondTokenPriceUSD =
                allSecondTokensPriceUSD[index];
            GlobalState.pairsState[address].secondTokenLockedValueUSD =
                allSecondTokensLockedValueUSD[index];

            GlobalState.pairsState[address].liquidityPoolToken =
                lpTokenID !== undefined
                    ? new EsdtToken({
                          ...GlobalState.tokensState[lpTokenID],
                      })
                    : undefined;
            GlobalState.pairsState[address].liquidityPoolTokenPriceUSD =
                allLpTokensPriceUSD[index];

            GlobalState.pairsState[address].lockedValueUSD =
                allLockedValueUSD[index];
            GlobalState.pairsState[address].previous24hLockedValueUSD =
                allPrevious24hLockedValueUSD[index];

            GlobalState.pairsState[address].hasFarms =
                GlobalState.pairsState[address].farmAddress !== undefined;
            GlobalState.pairsState[address].hasDualFarms =
                dualFarmRewardTokenID !== undefined;

            GlobalState.pairsState[address].feesUSD24h = allFeesUSD[index];
            GlobalState.pairsState[address].tradesCount = allTradesCount[index];
            GlobalState.pairsState[address].tradesCount24h =
                allTradesCount24h[index];
            GlobalState.pairsState[address].deployedAt = allDeployedAt[index];
            GlobalState.pairsState[address].volumeUSD24h =
                allVolumeUSD24h[index];
            GlobalState.pairsState[address].state = allStates[index];
            GlobalState.pairsState[address].feeState = allFeeStates[index];
            GlobalState.pairsState[address].info = allInfoMetadata[index];
            GlobalState.pairsState[address].type = allType[index];
            GlobalState.pairsState[address].totalFeePercent =
                allTotalFeePercent[index];
            GlobalState.pairsState[address].specialFeePercent =
                allSpecialFeePercent[index];
        }
    }

    private async updatePairsCompoundedAPRs(
        pairAddresses: string[],
        pairsStakingProxyAddresses: string[],
    ): Promise<void> {
        const stakeFarmAddresses =
            await this.stakingProxyAbi.getAllStakingFarmAddresses(
                pairsStakingProxyAddresses,
            );

        const allStakeFarmsAPRs =
            await this.stakingCompute.getAllBaseAndMaxBoostedAPRs(
                stakeFarmAddresses,
            );

        const allFeesAPR = await this.pairCompute.getAllFeesAPR(pairAddresses);

        const farmAddresses = farmsAddresses([FarmVersion.V2]);
        const allFarmBaseAPR = await this.farmCompute.getAllBaseAPR(
            farmAddresses,
        );

        const allFarmMaxBoostedAPR = await this.farmCompute.getAllMaxBoostedAPR(
            farmAddresses,
        );
        for (const [index, address] of pairAddresses.entries()) {
            let farmBaseAPR = '0';
            let farmBoostedAPR = '0';
            let dualFarmBaseAPR = '0';
            let dualFarmBoostedAPR = '0';

            if (GlobalState.pairsState[address].hasFarms) {
                const farmIndex = farmAddresses.findIndex(
                    (farmAddress) =>
                        farmAddress ===
                        GlobalState.pairsState[address].farmAddress,
                );
                farmBaseAPR = allFarmBaseAPR[farmIndex];
                farmBoostedAPR = allFarmMaxBoostedAPR[farmIndex];
            }

            if (GlobalState.pairsState[address].hasDualFarms) {
                const stakingProxyIndex = pairsStakingProxyAddresses.findIndex(
                    (stakingProxyAddress) =>
                        stakingProxyAddress ===
                        GlobalState.pairsState[address].stakingProxyAddress,
                );
                dualFarmBaseAPR = allStakeFarmsAPRs[stakingProxyIndex].baseAPR;
                dualFarmBoostedAPR =
                    allStakeFarmsAPRs[stakingProxyIndex].maxBoostedAPR;
            }

            GlobalState.pairsState[address].feesAPR = allFeesAPR[index];
            GlobalState.pairsState[address].compoundedAPR =
                new PairCompoundedAPRModel({
                    address: address,
                    feesAPR: allFeesAPR[index],
                    farmBaseAPR: farmBaseAPR,
                    farmBoostedAPR: farmBoostedAPR,
                    dualFarmBaseAPR: dualFarmBaseAPR,
                    dualFarmBoostedAPR: dualFarmBoostedAPR,
                });
        }
    }

    private async updatePairsRewardTokens(pairAddresses): Promise<void> {
        const lockedToken = await this.energyService.getLockedToken();

        for (const address of pairAddresses) {
            const { firstTokenID, secondTokenID, dualFarmRewardTokenID } =
                GlobalState.pairsEsdtTokens[address];

            GlobalState.pairsState[address].rewardTokens =
                new PairRewardTokensModel({
                    address: address,
                    poolRewards: [
                        GlobalState.tokensState[firstTokenID],
                        GlobalState.tokensState[secondTokenID],
                    ],
                    farmReward:
                        GlobalState.pairsState[address].farmAddress !==
                        undefined
                            ? lockedToken
                            : undefined,
                    dualFarmReward:
                        dualFarmRewardTokenID !== undefined
                            ? {
                                  ...GlobalState.tokensState[
                                      dualFarmRewardTokenID
                                  ],
                              }
                            : undefined,
                });
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'refreshRouterData', verbose: true })
    async refreshRouterData(): Promise<void> {
        if (GlobalState.initStatus !== GlobalStateInitStatus.DONE) {
            return;
        }

        const pairsMetadata = await this.routerAbi.pairsMetadata();
        await this.updateAddressesAndTokenIDs(pairsMetadata);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'refreshPairsInMemoryStore', verbose: true })
    async refreshPairsInMemoryStore(): Promise<void> {
        if (GlobalState.initStatus !== GlobalStateInitStatus.DONE) {
            return;
        }

        const pairAddresses = [];
        const pairStakingProxyAddresses = [];
        for (const pair of Object.values(GlobalState.pairsState)) {
            pairAddresses.push(pair.address);

            if (pair.stakingProxyAddress !== undefined) {
                pairStakingProxyAddresses.push(pair.stakingProxyAddress);
            }
        }

        try {
            await this.updatePairsData(pairAddresses);

            await this.updatePairsCompoundedAPRs(
                pairAddresses,
                pairStakingProxyAddresses,
            );

            await this.updatePairsRewardTokens(pairAddresses);
        } catch (error) {
            this.logger.error(
                `refreshPairsInMemoryStore failed with error: ${error.message}`,
                {
                    context: 'InMemoryStoreService',
                },
            );
            GlobalState.initStatus = GlobalStateInitStatus.FAILED;
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'refreshTokensInMemoryStore', verbose: true })
    async refreshTokensInMemoryStore(): Promise<void> {
        if (GlobalState.initStatus !== GlobalStateInitStatus.DONE) {
            return;
        }

        const tokenIDs = Object.keys(GlobalState.tokensState);
        try {
            const tokensMetadata = await this.tokenService.getAllTokensMetadata(
                tokenIDs,
            );

            const allTokensType = await this.tokenService.getAllEsdtTokensType(
                tokenIDs,
            );

            const {
                allPriceDerivedEGLD,
                allPriceUSD,
                allPrevious24hPrice,
                allPrevious7dPrice,
                allVolumeUSD24h,
                allPrevious24hVolumeUSD,
                allLiquidityUSD,
                allCreatedAt,
                allTrendingScore,
            } = await this.getTokensData(tokenIDs);

            for (const [index, tokenID] of tokenIDs.entries()) {
                const assets = new AssetsModel({
                    social: new SocialModel(
                        tokensMetadata[index].assets.social,
                    ),
                    ...tokensMetadata[index].assets,
                });

                GlobalState.tokensState[tokenID] = {
                    ...tokensMetadata[index],
                    ...{
                        derivedEGLD: allPriceDerivedEGLD[index],
                        price: allPriceUSD[index],
                        previous24hPrice: allPrevious24hPrice[index],
                        type: allTokensType[index],
                        assets: assets,
                        roles: new RolesModel(tokensMetadata[index].roles),
                        previous7dPrice: allPrevious7dPrice[index],
                        volumeUSD24h: allVolumeUSD24h[index],
                        previous24hVolume: allPrevious24hVolumeUSD[index],
                        liquidityUSD: allLiquidityUSD[index],
                        createdAt: allCreatedAt[index],
                        trendingScore: allTrendingScore[index],
                    },
                };
            }
        } catch (error) {
            this.logger.error(
                `refreshTokensInMemoryStore failed with error: ${error.message}`,
                {
                    context: 'InMemoryStoreService',
                },
            );
            GlobalState.initStatus = GlobalStateInitStatus.FAILED;
        }
    }

    private async getPairData(pairAddresses: string[]): Promise<{
        allFirstTokensPrice: string[];
        allFirstTokensPriceUSD: string[];
        allFirstTokensLockedValueUSD: string[];
        allSecondTokensPrice: string[];
        allSecondTokensPriceUSD: string[];
        allSecondTokensLockedValueUSD: string[];
        allLpTokensPriceUSD: string[];
        allLockedValueUSD: string[];
        allPrevious24hLockedValueUSD: string[];
        allFeesUSD: string[];
        allTradesCount: number[];
        allTradesCount24h: number[];
        allDeployedAt: number[];
        allVolumeUSD24h: string[];
        allStates: string[];
        allFeeStates: boolean[];
        allInfoMetadata: PairInfoModel[];
        allType: string[];
        allTotalFeePercent: number[];
        allSpecialFeePercent: number[];
    }> {
        const allFirstTokensPrice =
            await this.pairCompute.getAllFirstTokensPrice(pairAddresses);
        const allFirstTokensPriceUSD =
            await this.pairCompute.getAllFirstTokensPriceUSD(pairAddresses);
        const allFirstTokensLockedValueUSD =
            await this.pairCompute.getAllFirstTokensLockedValueUSD(
                pairAddresses,
            );

        const allSecondTokensPrice =
            await this.pairCompute.getAllSecondTokensPrice(pairAddresses);
        const allSecondTokensPriceUSD =
            await this.pairCompute.getAllSecondTokensPricesUSD(pairAddresses);
        const allSecondTokensLockedValueUSD =
            await this.pairCompute.getAllSecondTokensLockedValueUSD(
                pairAddresses,
            );

        const allLpTokensPriceUSD =
            await this.pairCompute.getAllLpTokensPriceUSD(pairAddresses);

        const allLockedValueUSD = await this.pairService.getAllLockedValueUSD(
            pairAddresses,
        );
        const allPrevious24hLockedValueUSD =
            await this.pairCompute.getAllPrevious24hLockedValueUSD(
                pairAddresses,
            );

        const allFeesUSD = await this.pairCompute.getAllFeesUSD(pairAddresses);
        const allTradesCount = await this.pairService.getAllTradesCount(
            pairAddresses,
        );
        const allTradesCount24h = await this.pairCompute.getAllTradesCount24h(
            pairAddresses,
        );
        const allDeployedAt = await this.pairService.getAllDeployedAt(
            pairAddresses,
        );
        const allVolumeUSD24h = await this.pairCompute.getAllVolumeUSD(
            pairAddresses,
        );
        const allStates = await this.pairService.getAllStates(pairAddresses);
        const allFeeStates = await this.pairService.getAllFeeStates(
            pairAddresses,
        );
        const allInfoMetadata = await this.pairAbi.getAllPairsInfoMetadata(
            pairAddresses,
        );
        const allType = await this.pairCompute.getAllType(pairAddresses);
        const allTotalFeePercent = await this.pairAbi.getAllTotalFeePercent(
            pairAddresses,
        );
        const allSpecialFeePercent = await this.pairAbi.getAllSpecialFeePercent(
            pairAddresses,
        );

        return {
            allFirstTokensPrice,
            allFirstTokensPriceUSD,
            allFirstTokensLockedValueUSD,
            allSecondTokensPrice,
            allSecondTokensPriceUSD,
            allSecondTokensLockedValueUSD,
            allLpTokensPriceUSD,
            allLockedValueUSD,
            allPrevious24hLockedValueUSD,
            allFeesUSD,
            allTradesCount,
            allTradesCount24h,
            allDeployedAt,
            allVolumeUSD24h,
            allStates,
            allFeeStates,
            allInfoMetadata,
            allType,
            allTotalFeePercent,
            allSpecialFeePercent,
        };
    }

    private async getTokensData(tokenIDs: string[]): Promise<{
        allPriceDerivedEGLD: string[];
        allPriceUSD: string[];
        allPrevious24hPrice: string[];
        allPrevious7dPrice: string[];
        allVolumeUSD24h: string[];
        allPrevious24hVolumeUSD: string[];
        allLiquidityUSD: string[];
        allCreatedAt: string[];
        // allSwapCount24h: number[];
        // allPrevious24hSwapCount: number[];
        allTrendingScore: string[];
    }> {
        const allPriceDerivedEGLD =
            await this.tokenCompute.getAllTokensPriceDerivedEGLD(tokenIDs);

        const allPriceUSD = await this.tokenCompute.getAllTokensPriceDerivedUSD(
            tokenIDs,
        );

        const allPrevious24hPrice =
            await this.tokenCompute.getAllTokensPrevious24hPrice(tokenIDs);

        const allPrevious7dPrice =
            await this.tokenCompute.getAllTokensPrevious7dPrice(tokenIDs);

        const allVolumeUSD24h =
            await this.tokenCompute.getAllTokensVolumeUSD24h(tokenIDs);

        const allPrevious24hVolumeUSD =
            await this.tokenCompute.getAllTokensPrevious24hVolumeUSD(tokenIDs);

        const allLiquidityUSD =
            await this.tokenCompute.getAllTokensLiquidityUSD(tokenIDs);

        const allCreatedAt = await this.tokenCompute.getAllTokensCreatedAt(
            tokenIDs,
        );

        const allTrendingScore =
            await this.tokenCompute.getAllTokensTrendingScore(tokenIDs);

        return {
            allPriceDerivedEGLD,
            allPriceUSD,
            allPrevious24hPrice,
            allPrevious7dPrice,
            allVolumeUSD24h,
            allPrevious24hVolumeUSD,
            allLiquidityUSD,
            allCreatedAt,
            allTrendingScore,
        };
    }
}
