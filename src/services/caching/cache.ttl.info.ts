import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';

export class CacheTtlInfo {
    remoteTtl: number;
    localTtl?: number;

    constructor(remoteTtl = oneMinute(), localTtl?: number) {
        this.remoteTtl = remoteTtl;
        this.localTtl = localTtl ? localTtl : this.remoteTtl / 2;
    }

    static Token: CacheTtlInfo = new CacheTtlInfo(
        oneMinute() * 10,
        oneMinute() * 5,
    );

    static ContractState: CacheTtlInfo = new CacheTtlInfo(
        oneMinute() * 10,
        oneMinute() * 3,
    );

    static ContractInfo: CacheTtlInfo = new CacheTtlInfo(
        oneMinute() * 3,
        oneMinute(),
    );

    static ContractBalance: CacheTtlInfo = new CacheTtlInfo(
        oneMinute(),
        oneSecond() * 30,
    );

    static Price: CacheTtlInfo = new CacheTtlInfo(
        oneMinute(),
        oneSecond() * 30,
    );

    static Analytics: CacheTtlInfo = new CacheTtlInfo(
        oneMinute() * 30,
        oneMinute() * 10,
    );

    static Attributes: CacheTtlInfo = new CacheTtlInfo(
        oneHour(),
        oneMinute() * 45,
    );
}
