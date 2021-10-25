import { Address } from '@elrondnetwork/erdjs/out';

export class FarmEventsTopics {
    private eventName: string;
    private caller: Address;
    private tokenID: string;
    private lockedRewards: boolean;
    private epoch: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[1], 'base64'));
        this.tokenID = Buffer.from(rawTopics[2], 'base64').toString();
        this.lockedRewards =
            Buffer.from(rawTopics[3], 'base64').toString() === 'true';
        this.epoch = parseInt(
            Buffer.from(rawTopics[4], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            eventName: this.eventName,
            caller: this.caller.bech32(),
            tokenID: this.tokenID,
            lockedRewards: this.lockedRewards,
            epoch: this.epoch,
        };
    }
}
