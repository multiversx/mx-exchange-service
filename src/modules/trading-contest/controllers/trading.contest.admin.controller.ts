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
import { CreateTradingContestDto } from '../dtos/create.contest.dto';
import { ContestParticipantStats, LeaderBoardEntry } from '../types';
import { TradingContestParticipant } from '../schemas/trading.contest.participant.schema';
import { AuthUser } from 'src/modules/auth/auth.user';
import { JwtOrNativeAuthGuard } from 'src/modules/auth/jwt.or.native.auth.guard';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { JwtOrNativeAdminGuard } from 'src/modules/auth/jwt.or.native.admin.guard';

@Controller('trading-contests')
export class TradingContestAdminController {
    constructor(
        private readonly tradingContestService: TradingContestService,
    ) {}

    @UseGuards(JwtOrNativeAdminGuard)
    @Post('/')
    @UsePipes(
        new ValidationPipe({
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    async createContest(
        @Body() createContestDto: CreateTradingContestDto,
    ): Promise<TradingContest> {
        return this.tradingContestService.createContest(createContestDto);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/')
    async getAllContests(): Promise<TradingContest[]> {
        return this.tradingContestService.getContests();
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/:uuid')
    async getContest(@Param('uuid') uuid: string): Promise<TradingContest> {
        const contest = await this.tradingContestService.getContestByUuid(uuid);

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return contest;
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/:uuid/leaderboard')
    async getContestLeaderboard(
        @Param('uuid') uuid: string,
    ): Promise<LeaderBoardEntry[]> {
        const contest = await this.tradingContestService.getContestByUuid(uuid);

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getLeaderboard(contest);
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

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/:uuid/participants/:address')
    async getContestParticipant(
        @Param('uuid') uuid: string,
        @Param('address') address: string,
    ): Promise<ContestParticipantStats> {
        const contest = await this.tradingContestService.getContestByUuid(uuid);

        if (!contest) {
            throw new HttpException('Contest not found', HttpStatus.NOT_FOUND);
        }

        return this.tradingContestService.getParticipantStats(contest, address);
    }
}
