import {
    Controller,
    DefaultValuePipe,
    Get,
    ParseIntPipe,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';

@Controller('trading-view')
export class TradingViewController {
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
                'D',
                '7D',
                '1M',
            ],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_group_request: false,
            supports_search: true,
        };
    }

    @Get('/history')
    @UsePipes(
        new ValidationPipe({
            // skipNullProperties: true,
            // skipMissingProperties: true,
            // skipUndefinedProperties: true,
        }),
    )
    async historyBars(
        @Query('symbol') symbol: string,
        @Query('from', new ParseIntPipe()) from: number,
        @Query('to', new ParseIntPipe()) to: number,
        @Query('resolution') resolution: string,
        @Query('countback', new ParseIntPipe({ optional: true }))
        countback?: number,
    ) {
        return {
            symbol,
            from,
            to,
            resolution,
            countback,
        };
    }
}
