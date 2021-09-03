import { Address } from '@elrondnetwork/erdjs/out';

export class PairEventTopics {
    private firstTokenID: string;
    private secondTokenID: string;
    private caller: Address;
    private epoch: number;

    constructor(rawTopics: string[]) {
        this.firstTokenID = Buffer.from(rawTopics[0], 'base64').toString();
        this.secondTokenID = Buffer.from(rawTopics[1], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[2], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[3], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            firstTokenID: this.firstTokenID,
            secondTokenID: this.secondTokenID,
            caller: this.caller.bech32(),
            epoch: this.epoch,
        };
    }
}

export class SwapNoFeeTopics {
    private tokenOutID: string;
    private caller: Address;
    private epoch: number;

    constructor(rawTopics: string[]) {
        this.tokenOutID = Buffer.from(rawTopics[0], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[1], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[2], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            tokenOutID: this.tokenOutID,
            caller: this.caller.bech32(),
            epoch: this.epoch,
        };
    }
}
