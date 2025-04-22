export class CoinGeckoTicker {
    ticker_id: string;
    base_currency: string;
    target_currency: string;
    last_price: string;
    base_volume: string;
    target_volume: string;
    pool_id: string;
    liquidity_in_usd: string;

    constructor(init?: Partial<CoinGeckoTicker>) {
        Object.assign(this, init);
    }
}
