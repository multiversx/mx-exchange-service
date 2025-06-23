import { Inject, Injectable } from '@nestjs/common';
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
import { TradingContestDocument } from '../schemas/trading.contest.schema';
import { TradingContestParticipantDocument } from '../schemas/trading.contest.participant.schema';

@Injectable()
export class TradingContestService {
    constructor(
        private readonly swapRepository: TradingContestSwapRepository,
        private readonly contestRepository: TradingContestRepository,
        private readonly participantRepository: TradingContestParticipantRepository,
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
}
