import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
    TradingContestParticipantRepository,
    TradingContestRepository,
    TradingContestSwapRepository,
} from 'src/services/database/repositories/trading.contest.repository';
import { Logger } from 'winston';
import {
    TradingContestSwap,
    TradingContestSwapDocument,
} from '../schemas/trading.contest.swap.schema';
import {
    TradingContest,
    TradingContestDocument,
} from '../schemas/trading.contest.schema';
import { TradingContestParticipantDocument } from '../schemas/trading.contest.participant.schema';
import { CreateTradingContestDto } from '../dtos/create.contest.dto';
import { randomUUID } from 'node:crypto';
import {
    LeaderBoardEntry,
    RawSwapStat,
    ContestParticipantTokenStats,
    ContestParticipantStats,
} from '../types';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { globalLeaderboardPipeline } from '../pipelines/global.leaderboard.pipeline';
import { participantTokenStatsPipeline } from '../pipelines/participant.token.stats.pipeline';
import {
    TradingContestLeaderboardDto,
    TradingContestParticipantDto,
} from '../dtos/contest.leaderboard.dto';
import { participantStatsPipeline } from '../pipelines/participant.stats.pipeline';
import { ESOperationsService } from 'src/services/elastic-search/services/es.operations.service';
import { Address } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';

@Injectable()
export class TradingContestService {
    constructor(
        private readonly swapRepository: TradingContestSwapRepository,
        private readonly contestRepository: TradingContestRepository,
        private readonly participantRepository: TradingContestParticipantRepository,
        private readonly elasticOperationsService: ESOperationsService,
        private readonly routerAbi: RouterAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getActiveContests(): Promise<TradingContestDocument[]> {
        const now = moment().unix();

        return this.contestRepository.find(
            {
                start: { $lte: now },
                end: { $gt: now },
            },
            { _id: 1 },
        );
    }

    async getOrCreateContestParticipant(
        contest: TradingContestDocument,
        address: string,
    ): Promise<TradingContestParticipantDocument | undefined> {
        const existingParticipant = await this.getContestParticipant(
            contest,
            address,
        );

        if (contest.requiresRegistration && !existingParticipant) {
            return undefined;
        }

        if (existingParticipant) {
            return existingParticipant;
        }

        return this.createContestParticipant(contest, address);
    }

    async getContestParticipant(
        contest: TradingContestDocument,
        address: string,
    ): Promise<TradingContestParticipantDocument> {
        return this.participantRepository.findOne(
            {
                contest: contest._id,
                address,
            },
            { _id: 1 },
        );
    }

    async getContestSwapByHash(
        contest: TradingContestDocument,
        txHash: string,
    ): Promise<TradingContestSwapDocument> {
        return this.swapRepository.findOne({
            contest: contest._id,
            txHash,
        });
    }

    async createContestSwap(swap: TradingContestSwap): Promise<void> {
        try {
            await this.swapRepository.create(swap);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.info(
                    `Swap already persisted for contest ${swap.contest}`,
                    { context: TradingContestService.name },
                );
                return;
            }

            this.logger.error(error);
            throw error;
        }
    }

    async createContestParticipant(
        contest: TradingContestDocument,
        address: string,
    ): Promise<TradingContestParticipantDocument> {
        try {
            const participant = await this.participantRepository.create({
                contest: contest._id,
                address,
            });
            return participant;
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.warn(
                    `Address ${address} is already a participant for contest ${contest._id}`,
                    { context: TradingContestService.name },
                );
                return this.getContestParticipant(contest, address);
            }

            this.logger.error(error);
            throw error;
        }
    }

    async getParticipantTokenStats(
        contest: TradingContestDocument,
        address: string,
        parameters: TradingContestParticipantDto,
    ): Promise<ContestParticipantTokenStats[]> {
        const participant = await this.getContestParticipant(contest, address);

        if (!participant) {
            throw new HttpException(
                `Address is not a valid participant for contest ${contest.uuid}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const aggregatedResults = await this.swapRepository
            .getModel()
            .aggregate<RawSwapStat>(
                participantTokenStatsPipeline(
                    contest._id,
                    participant._id,
                    parameters,
                ),
            )
            .exec();

        return this.transformSwapStats(aggregatedResults);
    }

    async getParticipantStats(
        contest: TradingContestDocument,
        address: string,
        parameters: TradingContestParticipantDto,
    ): Promise<ContestParticipantStats> {
        const participant = await this.getContestParticipant(contest, address);

        if (!participant) {
            throw new HttpException(
                `Address is not a valid participant for contest ${contest.uuid}`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const [aggregatedResults] = await this.swapRepository
            .getModel()
            .aggregate<ContestParticipantStats>(
                participantStatsPipeline(
                    contest._id,
                    participant._id,
                    parameters,
                ),
            )
            .exec();

        return aggregatedResults;
    }

    async getContestByUuid(
        uuid: string,
        projection?: Record<string, unknown>,
    ): Promise<TradingContestDocument> {
        return this.contestRepository.findOne(
            {
                uuid: uuid,
            },
            projection,
        );
    }

    async getContests(): Promise<TradingContestDocument[]> {
        return this.contestRepository.find({});
    }

    async getLeaderboard(
        contest: TradingContestDocument,
        parameters: TradingContestLeaderboardDto,
    ): Promise<LeaderBoardEntry[]> {
        const result = await this.swapRepository
            .getModel()
            .aggregate<LeaderBoardEntry>(
                globalLeaderboardPipeline(contest._id, parameters),
            )
            .allowDiskUse(true) // safety net for very large datasets
            .exec();

        await this.participantRepository.getModel().populate(result, {
            path: 'sender',
            select: { address: 1, _id: 0 },
        });

        return result;
    }

    async createContest(
        createContestDto: CreateTradingContestDto,
    ): Promise<TradingContestDocument> {
        try {
            await this.validateContestDto(createContestDto);

            const contest: TradingContest = {
                name: createContestDto.name,
                uuid: randomUUID(),
                start: createContestDto.start,
                end: createContestDto.end,
                minSwapAmountUSD: createContestDto.minSwapAmountUSD,
                tokens: createContestDto.tokens,
                pairAddresses: createContestDto.pairAddresses,
                tokensPair: createContestDto.tokensPair,
                requiresRegistration: createContestDto.requiresRegistration,
            };

            const result = await this.contestRepository.create(contest);
            return result;
        } catch (error) {
            this.logger.error(error, { context: TradingContestService.name });

            if (error.name === 'MongoServerError' && error.code === 11000) {
                throw new HttpException(
                    'Duplicate key error. A contest with the same name already exists',
                    HttpStatus.BAD_REQUEST,
                );
            }

            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    private async validateContestDto(
        contestDto: CreateTradingContestDto,
    ): Promise<void> {
        const start = moment.unix(contestDto.start);
        const end = moment.unix(contestDto.end);
        const now = moment();

        if (
            !start.isValid() ||
            !end.isValid() ||
            start.isAfter(end) ||
            end.isBefore(now)
        ) {
            throw new Error('Invalid start or end date');
        }

        if (
            !contestDto.tokens &&
            !contestDto.pairAddresses &&
            !contestDto.tokensPair
        ) {
            throw new Error(
                'You need to provide at least 1 type of indexing constraint (tokens, pairAddresses or tokensPair)',
            );
        }

        const tokenIDs: Set<string> = new Set();
        const pairAddresses: string[] = [];

        const [activeContests, pairsMetadata] = await Promise.all([
            this.getActiveContests(),
            this.routerAbi.pairsMetadata(),
        ]);

        pairsMetadata.forEach((pair) => {
            tokenIDs.add(pair.firstTokenID);
            tokenIDs.add(pair.secondTokenID);
            pairAddresses.push(pair.address);
        });

        if (contestDto.pairAddresses) {
            contestDto.pairAddresses.forEach((address) => {
                if (!pairAddresses.includes(address)) {
                    throw new Error(`Invalid pair address ${address}`);
                }
            });
        }

        if (contestDto.tokens) {
            contestDto.tokens.forEach((token) => {
                if (!tokenIDs.has(token)) {
                    throw new Error(`Invalid token identifier ${token}`);
                }
            });
        }

        if (contestDto.tokensPair) {
            contestDto.tokensPair.forEach((token) => {
                if (!tokenIDs.has(token)) {
                    throw new Error(`Invalid token identifier ${token}`);
                }
            });
        }

        activeContests.forEach((contest) => {
            const contestIndexingConstraints = {
                tokens: contest.tokens.sort(),
                pairs: contest.pairAddresses.sort(),
                tokensPair: contest.tokensPair.sort(),
            };
            const dtoIndexingConstraints = {
                tokens: contestDto.tokens?.sort() ?? [],
                pairs: contestDto.pairAddresses?.sort() ?? [],
                tokensPair: contestDto.tokensPair?.sort() ?? [],
            };

            if (
                JSON.stringify(contestIndexingConstraints) ==
                JSON.stringify(dtoIndexingConstraints)
            ) {
                throw new Error(
                    `A contest with the same indexing constraints is already active`,
                );
            }
        });
    }

    private transformSwapStats(
        rawStats: RawSwapStat[],
    ): ContestParticipantTokenStats[] {
        const tokenMap: Record<string, ContestParticipantTokenStats> = {};

        for (const stat of rawStats) {
            const {
                tokenIn,
                tokenOut,
                totalVolumeUSD,
                tradeCount,
                tokenInAmount,
                tokenOutAmount,
            } = stat;

            if (!tokenMap[tokenIn]) {
                tokenMap[tokenIn] = {
                    tokenID: tokenIn,
                    buyVolumeUSD: 0,
                    buyAmount: '0',
                    sellVolumeUSD: 0,
                    sellAmount: '0',
                };
                if (tradeCount) {
                    tokenMap[tokenIn].buyCount = 0;
                    tokenMap[tokenIn].sellCount = 0;
                }
            }

            if (!tokenMap[tokenOut]) {
                tokenMap[tokenOut] = {
                    tokenID: tokenOut,
                    buyVolumeUSD: 0,
                    buyAmount: '0',
                    sellVolumeUSD: 0,
                    sellAmount: '0',
                };
                if (tradeCount) {
                    tokenMap[tokenOut].buyCount = 0;
                    tokenMap[tokenOut].sellCount = 0;
                }
            }

            const sellAmount = new BigNumber(tokenInAmount).plus(
                tokenMap[tokenIn].sellAmount,
            );
            const buyAmount = new BigNumber(tokenOutAmount).plus(
                tokenMap[tokenIn].buyAmount,
            );
            tokenMap[tokenIn].sellVolumeUSD += totalVolumeUSD;
            tokenMap[tokenIn].sellAmount = sellAmount.toFixed();
            tokenMap[tokenOut].buyVolumeUSD += totalVolumeUSD;
            tokenMap[tokenOut].buyAmount = buyAmount.toFixed();

            if (tradeCount) {
                tokenMap[tokenIn].sellCount += tradeCount;
                tokenMap[tokenOut].buyCount += tradeCount;
            }
        }

        return Object.values(tokenMap);
    }

    async getSwapsWithoutParticipant(): Promise<TradingContestSwapDocument[]> {
        const now = moment().subtract(2, 'minutes').unix();
        const swaps = await this.swapRepository
            .getModel()
            .find({ participant: { $eq: null }, timestamp: { $lt: now } })
            .populate('contest')
            .exec();
        return swaps;
    }

    async getSenderFromElastic(hash: string): Promise<string> {
        const operations =
            await this.elasticOperationsService.getOperationsByHash(hash);

        if (!operations || operations.length === 0) {
            this.logger.warn(
                `Could not find transactions or SC results for ${hash} in ES`,
                { context: TradingContestService.name },
            );
            return undefined;
        }

        const transaction = operations.find(
            (operation) =>
                operation.type === 'normal' && operation._search === hash,
        );

        if (transaction) {
            const originalSender = Address.newFromBech32(transaction.sender);

            if (
                !originalSender.isEmpty() &&
                !originalSender.isSmartContract()
            ) {
                return originalSender.toBech32();
            }
        }

        const scResult = operations.find(
            (operation) =>
                operation.type === 'unsigned' && operation._search === hash,
        );

        if (scResult) {
            const originalSender = Address.newFromBech32(
                scResult.originalSender ?? transaction.sender,
            );

            if (
                !originalSender.isEmpty() &&
                !originalSender.isSmartContract()
            ) {
                return originalSender.toBech32();
            }
        }

        this.logger.warn(`Could not extract sender for hash ${hash}`, {
            context: TradingContestService.name,
        });
        return undefined;
    }

    async bulkUpdateSwaps(bulkOps: any[]): Promise<void> {
        try {
            await this.swapRepository.getModel().bulkWrite(bulkOps);
        } catch (error) {
            this.logger.error(error);
        }
    }
}
