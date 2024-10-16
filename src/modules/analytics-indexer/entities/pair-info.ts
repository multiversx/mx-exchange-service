export class PairInfoModel {
    reserves0: string;
    reserves1: string;
    totalSupply: string;

    constructor(init?: Partial<PairInfoModel>) {
        Object.assign(this, init);
    }
}
