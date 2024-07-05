import { Column, Entity, PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';

@Entity('hyper_dex_analytics')
export class XExchangeAnalyticsEntity {
    @PrimaryColumn({ nullable: false, type: 'timestamp without time zone' })
    timestamp: Date;

    @PrimaryColumn({ nullable: false, type: 'varchar' })
    series: string;

    @PrimaryColumn({ nullable: false, type: 'varchar' })
    key: string;

    @Column({
        type: 'decimal',
        precision: 128,
        scale: 64,
        default: 0,
        nullable: false,
    })
    value = '0';

    constructor(init?: Partial<XExchangeAnalyticsEntity>) {
        Object.assign(this, init);
    }

    public static fromObject(
        timestamp: Date,
        object: Record<string, Record<string, string>>,
    ): XExchangeAnalyticsEntity[] {
        const entities = Object.entries(object)
            .map(([series, record]: [string, Record<string, string>]) =>
                XExchangeAnalyticsEntity.fromRecord(timestamp, record, series),
            )
            .flat(1);
        return entities;
    }

    private static fromRecord(
        timestamp: Date,
        record: Record<string, string>,
        series?: string,
    ): XExchangeAnalyticsEntity[] {
        const entities = Object.entries(record).map(([key, value]) => {
            const entity = new XExchangeAnalyticsEntity();
            entity.timestamp = timestamp;
            entity.series = series;
            entity.key = key;
            entity.value = value;
            return entity;
        });
        return entities;
    }
}

@ViewEntity({
    expression: `
    SELECT
      time_bucket('1 day', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key = 'feesUSD' OR key = 'volumeUSD'
    GROUP BY time, series, key;
  `,
    materialized: true,
    name: 'sum_daily',
})
export class SumDaily {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    sum = '0';

    @ViewColumn()
    series?: string;

    @ViewColumn()
    key?: string;

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
    SELECT
      time_bucket('1 hour', timestamp) AS time, series, key,
      last(value, timestamp) AS last,sum(value) AS sum
    FROM "hyper_dex_analytics"
    WHERE key IN ('feesUSD', 'volumeUSD')
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;
  `,
    materialized: true,
    name: 'sum_hourly',
})
export class SumHourly {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    sum = '0';

    @ViewColumn()
    series?: string;

    @ViewColumn()
    key?: string;

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
    SELECT 
      time_bucket('1 day', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')
    GROUP BY time, series, key;
  `,
    materialized: true,
    name: 'close_daily',
})
export class CloseDaily {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    last = '0';

    @ViewColumn()
    series?: string;

    @ViewColumn()
    key?: string;

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
    SELECT 
      time_bucket('1 hour', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('priceUSD', 'liquidityUSD', 'lockedValueUSD', 'totalLockedValueUSD', 'firstTokenPrice', 'secondTokenPrice')
    AND timestamp >= NOW() - INTERVAL '1 day'
    GROUP BY time, series, key;
  `,
    materialized: true,
    name: 'close_hourly',
})
export class CloseHourly {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    last = '0';

    @ViewColumn()
    series?: string;

    @ViewColumn()
    key?: string;

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
    SELECT 
      time_bucket('1 minute', timestamp) as time,
      series,
      key,
      last(value, timestamp) as last
    FROM "hyper_dex_analytics"
    WHERE key IN ('launchedTokenAmount',
        'acceptedTokenAmount',
        'launchedTokenPrice',
        'acceptedTokenPrice',
        'launchedTokenPriceUSD',
        'acceptedTokenPriceUSD')
    GROUP BY time, series, key;
  `,
    materialized: true,
    name: 'pd_close_minute',
})
export class PDCloseMinute {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    last = '0';

    @ViewColumn()
    series?: string;

    @ViewColumn()
    key?: string;

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
        SELECT
            time_bucket('1 week', timestamp) AS time, series, key,
            sum(value) AS sum
        FROM "hyper_dex_analytics"
        WHERE key = 'feeBurned' OR key = 'penaltyBurned'
        GROUP BY time, series, key ORDER BY time ASC;
    `,
    materialized: true,
    name: 'token_burned_weekly',
})
export class TokenBurnedWeekly {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    series: string;

    @ViewColumn()
    key: string;

    @ViewColumn()
    sum = '0';

    constructor(init?: Partial<SumDaily>) {
        Object.assign(this, init);
    }
}

@ViewEntity({
    expression: `
      SELECT
          time_bucket('1 minute', timestamp) AS time, series, key,
          first(value, timestamp) AS open,
          min(value) AS low,
          max(value) AS high,
          last(value, timestamp) AS close
      FROM "hyper_dex_analytics"
      WHERE key in ('firstTokenPrice','secondTokenPrice', 'priceUSD')
      GROUP BY time, series, key ORDER BY time ASC;
  `,
    materialized: true,
    name: 'price_candle_minute',
})
export class PriceCandleMinute {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    series: string;

    @ViewColumn()
    key: string;

    @ViewColumn()
    open = '0';

    @ViewColumn()
    close = '0';

    @ViewColumn()
    low = '0';

    @ViewColumn()
    high = '0';
}

@ViewEntity({
    expression: `
      SELECT
          time_bucket('1 hour', time) AS time, series, key,
          first(open, time) AS open,
          min(low) AS low,
          max(high) AS high,
          last(close, time) AS close
      FROM "price_candle_minute"
      GROUP BY time_bucket('1 hour', time), series, key ORDER BY time ASC;
  `,
    materialized: true,
    name: 'price_candle_hourly',
    dependsOn: ['price_candle_minute'],
})
export class PriceCandleHourly {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    series: string;

    @ViewColumn()
    key: string;

    @ViewColumn()
    open = '0';

    @ViewColumn()
    close = '0';

    @ViewColumn()
    low = '0';

    @ViewColumn()
    high = '0';
}

@ViewEntity({
    expression: `
      SELECT
          time_bucket('1 day', time) AS time, series, key,
          first(open, time) AS open,
          min(low) AS low,
          max(high) AS high,
          last(close, time) AS close
      FROM "price_candle_hourly"
      GROUP BY time_bucket('1 day', time), series, key ORDER BY time ASC;
  `,
    materialized: true,
    name: 'price_candle_daily',
    dependsOn: ['pair_candle_hourly'],
})
export class PriceCandleDaily {
    @ViewColumn()
    @PrimaryColumn()
    time: Date = new Date();

    @ViewColumn()
    series: string;

    @ViewColumn()
    key: string;

    @ViewColumn()
    open = '0';

    @ViewColumn()
    close = '0';

    @ViewColumn()
    low = '0';

    @ViewColumn()
    high = '0';
}
