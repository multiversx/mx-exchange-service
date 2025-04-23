import { Controller, Get } from '@nestjs/common';
import { CoinGeckoService } from '../services/coin.gecko.service';
import { CoinGeckoTicker } from '../dtos/coin.gecko.ticker';

@Controller('coingecko')
export class CoinGeckoController {
    constructor(private readonly coinGeckoService: CoinGeckoService) {}

    @Get('/tickers')
    async getTickers(): Promise<CoinGeckoTicker[]> {
        return this.coinGeckoService.getTickersFromPairs();
    }
}
