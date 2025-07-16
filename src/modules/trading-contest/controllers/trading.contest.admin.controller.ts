import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { TradingContestService } from '../services/trading.contest.service';
import { TradingContest } from '../schemas/trading.contest.schema';
import { CreateTradingContestDto } from '../dtos/create.contest.dto';
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
}
