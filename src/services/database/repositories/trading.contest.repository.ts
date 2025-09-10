import { Injectable } from '@nestjs/common';
import { EntityRepository } from './entity.repository';
import {
    TradingContestSwap,
    TradingContestSwapDocument,
} from 'src/modules/trading-contest/schemas/trading.contest.swap.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    TradingContest,
    TradingContestDocument,
} from 'src/modules/trading-contest/schemas/trading.contest.schema';
import {
    TradingContestParticipant,
    TradingContestParticipantDocument,
} from 'src/modules/trading-contest/schemas/trading.contest.participant.schema';

@Injectable()
export class TradingContestRepository extends EntityRepository<TradingContestDocument> {
    constructor(
        @InjectModel(TradingContest.name)
        private readonly contestModel: Model<TradingContestDocument>,
    ) {
        super(contestModel);
    }

    getModel(): Model<TradingContestDocument> {
        return this.contestModel;
    }
}

@Injectable()
export class TradingContestSwapRepository extends EntityRepository<TradingContestSwapDocument> {
    constructor(
        @InjectModel(TradingContestSwap.name)
        private readonly swapModel: Model<TradingContestSwapDocument>,
    ) {
        super(swapModel);
    }

    getModel(): Model<TradingContestSwapDocument> {
        return this.swapModel;
    }
}

@Injectable()
export class TradingContestParticipantRepository extends EntityRepository<TradingContestParticipantDocument> {
    constructor(
        @InjectModel(TradingContestParticipant.name)
        private readonly participantModel: Model<TradingContestParticipantDocument>,
    ) {
        super(participantModel);
    }

    getModel(): Model<TradingContestParticipantDocument> {
        return this.participantModel;
    }
}
