import {
    Controller,
    Get,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { BarsQueryArgs, BarsResponse } from './dtos/bars.response';
import { TradingViewService } from './services/trading.view.service';

@Controller('trading-view')
export class TradingViewController {
    constructor(private readonly tradingViewService: TradingViewService) {}

    @Get('/config')
    async config() {
        return {
            supported_resolutions: [
                '1',
                '5',
                '15',
                '30',
                '60',
                '240',
                '1D',
                '7D',
                '1M',
            ],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_group_request: false,
            supports_search: true,
            supports_time: false,
        };
    }

    @Get('/symbols')
    async symbolResolve(@Query('symbol') symbol: string) {
        return {
            ticker: symbol,
            name: symbol,
            description: symbol,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'xExchange',
            minmov: 1,
            pricescale: 100,
            has_daily: true,
            has_intraday: true,
            visible_plots_set: 'ohlc',
            has_weekly_and_monthly: true,
            supported_resolutions: [
                '1',
                '5',
                '15',
                '30',
                '60',
                '240',
                '1D',
                '7D',
                '1M',
            ],
            // volume_precision: 2,
            data_status: 'streaming',
        };
    }

    @Get('/history')
    async historyBars(
        @Query(new ValidationPipe()) queryArgs: BarsQueryArgs,
    ): Promise<BarsResponse> {
        return await this.tradingViewService.getBars(queryArgs);
    }
}
