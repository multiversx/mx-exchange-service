import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { TradingContestService } from '../services/trading.contest.service';
import { TradingContest } from '../schemas/trading.contest.schema';
import {
    AggregationParamsDto,
    TradingContestLeaderboardDto,
    TradingContestParamsDto,
} from '../dtos/contest.leaderboard.dto';
import {
    ContestParticipantStats,
    ContestStats,
    ContestTokenStats,
    LeaderBoardResponse,
} from '../types';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { TradingContestParticipant } from '../schemas/trading.contest.participant.schema';

@Controller('trading-contests')
export class TradingContestController {
    constructor(
        private readonly tradingContestService: TradingContestService,
    ) {}

    @Get('/:uuid')
    async getContest(@Param('uuid') uuid: string): Promise<TradingContest> {
        const contest = await this.tradingContestService.getContestByUuid(uuid);

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return contest;
    }

    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/:uuid/stats')
    async getContestStats(
        @Param('uuid') uuid: string,
        @Body() parameters: AggregationParamsDto,
    ): Promise<ContestStats> {
        const contest = await this.tradingContestService.getContestByUuid(
            uuid,
            { _id: 1 },
        );

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getContestStats(contest, parameters);
    }

    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/:uuid/token-stats')
    async getContestTokenStats(
        @Param('uuid') uuid: string,
        @Body() parameters: TradingContestParamsDto,
    ): Promise<ContestTokenStats[]> {
        const contest = await this.tradingContestService.getContestByUuid(
            uuid,
            { _id: 1 },
        );

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getContestTokenStats(
            contest,
            parameters,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Post('/:uuid/participants')
    async joinContest(
        @Param('uuid') uuid: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TradingContestParticipant> {
        const contest = await this.tradingContestService.getContestByUuid(uuid);

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.createContestParticipant(
            contest,
            user.address,
        );
    }

    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/:uuid/leaderboard')
    async contestLeaderboard(
        @Param('uuid') uuid: string,
        @Body() contestLeaderboardDto: TradingContestLeaderboardDto,
    ): Promise<LeaderBoardResponse> {
        const contest = await this.tradingContestService.getContestByUuid(
            uuid,
            { _id: 1 },
        );

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getLeaderboard(
            contest,
            contestLeaderboardDto,
        );
    }

    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/:uuid/participants/:address')
    async getContestParticipantStats(
        @Param('uuid') uuid: string,
        @Param('address') address: string,
        @Body() parameters: TradingContestParamsDto,
    ): Promise<ContestParticipantStats> {
        const contest = await this.tradingContestService.getContestByUuid(
            uuid,
            { _id: 1 },
        );

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getParticipantStats(
            contest,
            address,
            parameters,
        );
    }

    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/:uuid/participants/:address/token-stats')
    async getContestParticipantTokenStats(
        @Param('uuid') uuid: string,
        @Param('address') address: string,
        @Body() parameters: TradingContestParamsDto,
    ): Promise<ContestTokenStats[]> {
        const contest = await this.tradingContestService.getContestByUuid(
            uuid,
            { _id: 1 },
        );

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getParticipantTokenStats(
            contest,
            address,
            parameters,
        );
    }
}
