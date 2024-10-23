import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

export class PairMetadata {
    address: string;
    firstToken: EsdtToken;
    secondToken: EsdtToken;
    totalFeePercent: number;

    constructor(init?: Partial<PairMetadata>) {
        Object.assign(this, init);
    }
}
