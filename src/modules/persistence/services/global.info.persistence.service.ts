import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { FilterQuery, ProjectionType } from 'mongoose';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress } from 'src/config';
import {
    MongoCollections,
    MongoQueries,
    PersistenceMetrics,
} from 'src/helpers/decorators/persistence.metrics.decorator';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import {
    GlobalInfoByWeekModel,
    GlobalInfoScType,
    TokenDistributionModel,
} from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { GlobalInfoRepository } from '../repositories/global.info.repository';
import { GlobalInfoDocument } from '../schemas/global.info.schema';
import { TokenPersistenceService } from './token.persistence.service';

@Injectable()
export class GlobalInfoPersistenceService {
    constructor(
        private readonly globalInfoRepository: GlobalInfoRepository,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly energyAbi: EnergyAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @PersistenceMetrics(MongoCollections.GlobalInfo, MongoQueries.Upsert)
    async upsertGlobalInfo(
        globalInfo: GlobalInfoByWeekModel,
        projection: ProjectionType<GlobalInfoByWeekModel> = { __v: 0 },
    ): Promise<GlobalInfoDocument> {
        try {
            return this.globalInfoRepository
                .getModel()
                .findOneAndUpdate(
                    { scAddress: globalInfo.scAddress, week: globalInfo.week },
                    globalInfo,
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

    @PersistenceMetrics(MongoCollections.GlobalInfo, MongoQueries.Find)
    async getGlobalInfo(
        filterQuery: FilterQuery<GlobalInfoDocument>,
        projection?: ProjectionType<GlobalInfoDocument>,
    ): Promise<GlobalInfoDocument[]> {
        return this.globalInfoRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();
    }

    async populateGlobalInfo(
        scAddress: string,
        currentWeek: number,
        scType: GlobalInfoScType,
    ): Promise<void> {
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }

            const rawGlobalInfo: Partial<GlobalInfoByWeekModel> = {
                scAddress,
                scType,
                week,
            };

            await this.populateGlobalInfoModel(
                rawGlobalInfo as GlobalInfoByWeekModel,
            );
        }
    }

    async populateGlobalInfoModel(
        rawGlobalInfo: GlobalInfoByWeekModel,
    ): Promise<GlobalInfoDocument> {
        const { scAddress, week } = rawGlobalInfo;

        const [
            totalRewardsForWeek,
            totalEnergyForWeek,
            totalLockedTokensForWeek,
            baseAssetTokenID,
            lockedTokenID,
        ] = await Promise.all([
            this.weeklyRewardsSplittingAbi.totalRewardsForWeekRaw(
                scAddress,
                week,
            ),
            this.weeklyRewardsSplittingAbi.totalEnergyForWeekRaw(
                scAddress,
                week,
            ),
            this.weeklyRewardsSplittingAbi.totalLockedTokensForWeekRaw(
                scAddress,
                week,
            ),
            this.energyAbi.baseAssetTokenID(),
            this.energyAbi.lockedTokenID(),
        ]);

        const [baseAssetToken] = await this.tokenPersistence.getTokens({
            identifier: baseAssetTokenID,
        });

        const [rewardsDistributionForWeek, apr] = await Promise.all([
            this.computeDistribution(totalRewardsForWeek),
            this.computeWeekAPR(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
                baseAssetToken,
                lockedTokenID,
            ),
        ]);

        const globalInfo = new GlobalInfoByWeekModel({
            ...rawGlobalInfo,
            totalRewardsForWeek,
            totalEnergyForWeek,
            rewardsDistributionForWeek,
            totalLockedTokensForWeek,
            apr,
        });

        return this.upsertGlobalInfo(globalInfo);
    }

    async computeDistribution(
        payments: EsdtTokenPayment[],
    ): Promise<TokenDistributionModel[]> {
        const tokens = await this.tokenPersistence.getTokens(
            { identifier: { $in: payments.map((payment) => payment.tokenID) } },
            { identifier: 1, price: 1, decimals: 1 },
        );

        let totalPriceUSD = new BigNumber(0);
        const paymentsValueUSD = payments.map((payment) => {
            const token = tokens.find(
                (token) => token.identifier === payment.tokenID,
            );

            if (!token) {
                throw new Error(`Token ${payment.tokenID} missing`);
            }

            const reward = computeValueUSD(
                payment.amount,
                token.decimals,
                token.price,
            );

            totalPriceUSD = totalPriceUSD.plus(reward);
            return reward;
        });

        return payments.map((payment, index) => {
            const valueUSD = paymentsValueUSD[index];
            const percentage = totalPriceUSD.isZero()
                ? '0.0000'
                : valueUSD
                      .dividedBy(totalPriceUSD)
                      .multipliedBy(100)
                      .toFixed(4);
            return new TokenDistributionModel({
                tokenId: payment.tokenID,
                percentage,
            });
        });
    }

    private async computeWeekAPR(
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        baseAssetToken: EsdtToken,
        lockedTokenId: string,
    ): Promise<string> {
        const tokenPriceUSD = scAddress.has(baseAssetToken.identifier)
            ? baseAssetToken.price
            : '0';

        const totalLockedTokensForWeekPriceUSD = new BigNumber(
            totalLockedTokensForWeek,
        )
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();

        const totalRewardsForWeekPriceUSD =
            await this.computeTotalRewardsForWeekUSD(
                totalRewardsForWeek,
                baseAssetToken,
                lockedTokenId,
            );

        const weekAPR = new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD);

        return weekAPR.isNaN() || !weekAPR.isFinite() ? '0' : weekAPR.toFixed();
    }

    private async computeTotalRewardsForWeekUSD(
        totalRewardsForWeek: EsdtTokenPayment[],
        baseAssetToken: EsdtToken,
        lockedTokenId: string,
    ): Promise<string> {
        const tokenIDs = totalRewardsForWeek.map((reward) =>
            reward.tokenID === lockedTokenId
                ? baseAssetToken.identifier
                : reward.tokenID,
        );

        const tokens = await this.tokenPersistence.getTokens(
            {
                identifier: { $in: [...new Set(tokenIDs)] },
            },
            { identifier: 1, price: 1, decimals: 1 },
        );

        return totalRewardsForWeek
            .reduce((acc, reward) => {
                const token = tokens.find(
                    (token) => token.identifier === reward.tokenID,
                );

                if (!token) {
                    throw new Error(`Token ${reward.tokenID} missing`);
                }

                const rewardUSD = computeValueUSD(
                    reward.amount,
                    token.decimals,
                    token.price,
                );
                return acc.plus(rewardUSD);
            }, new BigNumber(0))
            .toFixed();
    }
}
