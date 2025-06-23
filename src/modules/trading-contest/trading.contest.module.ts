import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    TradingContest,
    TradingContestSchema,
} from './schemas/trading.contest.schema';
import {
    TradingContestParticipant,
    TradingContestParticipantSchema,
} from './schemas/trading.contest.participant.schema';
import {
    TradingContestSwap,
    TradingContestSwapSchema,
} from './schemas/trading.contest.swap.schema';
import {
    TradingContestParticipantRepository,
    TradingContestRepository,
    TradingContestSwapRepository,
} from 'src/services/database/repositories/trading.contest.repository';
import { TradingContestSwapHandlerService } from './services/trading.contest.swap.handler.service';
import { TradingContestService } from './services/trading.contest.service';
import { RouterModule } from '../router/router.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TradingContest.name, schema: TradingContestSchema },
            {
                name: TradingContestParticipant.name,
                schema: TradingContestParticipantSchema,
            },
            { name: TradingContestSwap.name, schema: TradingContestSwapSchema },
        ]),
        RouterModule,
    ],
    providers: [
        TradingContestRepository,
        TradingContestSwapRepository,
        TradingContestParticipantRepository,
        TradingContestService,
        TradingContestSwapHandlerService,
    ],
    exports: [TradingContestService, TradingContestSwapHandlerService],
})
export class TradingContestModule {}
