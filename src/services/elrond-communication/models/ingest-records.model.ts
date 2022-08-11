export class IngestRecord {
    series: string;
    key: string;
    value: string;
    timestamp: number;
    //version: number;
    //valueType: string

    constructor(init?: Partial<IngestRecord>) {
        Object.assign(this, init);
    }
}
