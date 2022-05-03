import { Address } from '@elrondnetwork/erdjs/out';
import { PriceDiscoveryTopicsType } from './price.discovery.types';

export class PriceDiscoveryEventTopics {
    protected eventName: string;
    protected caller: Address;
    protected block: number;
    protected epoch: number;
    protected timestamp: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[1], 'base64'));
        this.block = parseInt(
            Buffer.from(rawTopics[2], 'base64').toString('hex'),
            16,
        );
        this.epoch = parseInt(
            Buffer.from(rawTopics[3], 'base64').toString('hex'),
            16,
        );
        this.timestamp = parseInt(
            Buffer.from(rawTopics[4], 'base64').toString('hex'),
            16,
        );
    }

    public toJSON(): PriceDiscoveryTopicsType {
        return {
            eventName: this.eventName,
            caller: this.caller.bech32(),
            block: this.block,
            epoch: this.epoch,
            timestamp: this.timestamp,
        };
    }
}
