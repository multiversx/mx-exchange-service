import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import {
    BarsQueryArgs,
    BarsResponse,
    ConfigResponse,
    SymbolsResponse,
    supportedResolutions,
} from '../dtos/bars.response';
import { TradingViewService } from '../services/trading.view.service';
import { TokenService } from '../../tokens/services/token.service';

@Controller('trading-view')
export class TradingViewController {
    constructor(
        private readonly tradingViewService: TradingViewService,
        private readonly tokenService: TokenService,
    ) {}

    @Get('/config')
    config(): ConfigResponse {
        return new ConfigResponse({
            supported_resolutions: supportedResolutions,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_group_request: false,
            supports_search: true,
            supports_time: false,
        });
    }

    @Get('/symbols')
    async symbolResolve(
        @Query('symbol') symbol: string,
    ): Promise<SymbolsResponse> {
        const resolvedSymbol = await this.tradingViewService.resolveSymbol(
            symbol,
        );

        return new SymbolsResponse({
            ticker: resolvedSymbol.ticker,
            name: resolvedSymbol.name,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'xExchange',
            minmov: 1,
            pricescale: resolvedSymbol.pricescale,
            has_daily: true,
            has_intraday: true,
            has_weekly_and_monthly: true,
            has_empty_bars: true,
            visible_plots_set: 'ohlcv',
            volume_precision: 2,
            supported_resolutions: supportedResolutions,
            data_status: 'streaming',
        });
    }

    @Get('/history')
    async historyBars(
        @Query(new ValidationPipe()) queryArgs: BarsQueryArgs,
    ): Promise<BarsResponse> {
        return await this.tradingViewService.getBars(queryArgs);
    }
}
