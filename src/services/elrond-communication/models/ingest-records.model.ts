export class IngestRecord {
    series: string;
    key: string;
    value: string;
    timestamp: number;

    constructor(init?: Partial<IngestRecord>) {
        Object.assign(this, init);
    }
}
