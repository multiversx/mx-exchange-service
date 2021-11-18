export class Stats {
    shards: number;
    blocks: number;
    accounts: number;
    transactions: number;
    refreshRate: number;
    epoch: number;
    roundsPassed: number;
    roundsPerEpoch: number;

    constructor(init?: Partial<Stats>) {
        Object.assign(this, init);
    }
}
