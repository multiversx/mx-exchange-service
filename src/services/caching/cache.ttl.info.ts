import { Constants } from '@multiversx/sdk-nestjs-common';

export class CacheTtlInfo {
    remoteTtl: number;
    localTtl?: number;

    constructor(remoteTtl = Constants.oneMinute(), localTtl?: number) {
        this.remoteTtl = remoteTtl;
        this.localTtl = localTtl ? localTtl : this.remoteTtl / 2;
    }

    static TokenID: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneDay(),
        Constants.oneDay(),
    );

    static Token: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 10,
        Constants.oneMinute() * 7,
    );

    static BaseToken: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneDay(),
        Constants.oneDay(),
    );

    static TokenAnalytics: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 30,
        Constants.oneMinute() * 10,
    );

    static ContractState: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 10,
        Constants.oneMinute() * 3,
    );

    static ContractInfo: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 3,
        Constants.oneMinute(),
    );

    static ContractBalance: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 2,
        Constants.oneMinute() * 1,
    );

    static Price: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 2,
        Constants.oneMinute() * 1,
    );

    static Analytics: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 30,
        Constants.oneMinute() * 10,
    );

    static Attributes: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneHour(),
        Constants.oneMinute() * 45,
    );

    static NullValue: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 2,
        Constants.oneMinute(),
    );
}
