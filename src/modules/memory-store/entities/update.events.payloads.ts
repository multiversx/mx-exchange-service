import { PairFieldsType, TokenFieldsType } from './global.state';

export class UpdateTokenPayload {
    identifier: string;
    timestamp: number;
    fieldsTypes?: TokenFieldsType[];

    constructor(init?: Partial<UpdateTokenPayload>) {
        Object.assign(this, init);
    }
}

export class UpdatePairPayload {
    address: string;
    timestamp: number;
    fieldsType?: PairFieldsType;

    constructor(init?: Partial<UpdatePairPayload>) {
        Object.assign(this, init);
    }
}
