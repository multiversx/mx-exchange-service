import { Address } from '@elrondnetwork/erdjs/out';

export class PairProxyTopics {
    private eventName: string;
    private caller: Address;
    private firstTokenID: string;
    private secondTokenID: string;
    private pairAddress: Address;
    private epoch: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.firstTokenID = Buffer.from(rawTopics[1], 'base64').toString();
        this.secondTokenID = Buffer.from(rawTopics[2], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[3], 'base64'));
        this.pairAddress = new Address(Buffer.from(rawTopics[4], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[5], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            eventName: this.eventName,
            caller: this.caller.bech32(),
            firstTokenID: this.firstTokenID,
            secondTokenID: this.secondTokenID,
            pairAddress: this.pairAddress.bech32(),
            epoch: this.epoch,
        };
    }
}

export class FarmProxyTopics {
    private eventName: string;
    private tokenID: string;
    private caller: Address;
    private farmAddress: Address;
    private epoch: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.tokenID = Buffer.from(rawTopics[1], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[2], 'base64'));
        this.farmAddress = new Address(Buffer.from(rawTopics[3], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[4], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            eventName: this.eventName,
            tokenID: this.tokenID,
            caller: this.caller.bech32(),
            farmAddress: this.farmAddress.bech32(),
            epoch: this.epoch,
        };
    }
}
