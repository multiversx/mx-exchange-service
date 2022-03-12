import { Address } from '@elrondnetwork/erdjs/out';

export class MetabondingEventTopics {
    private readonly eventName: string;
    private readonly caller: Address;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[1], 'base64'));
    }

    toJSON() {
        return {
            eventName: this.eventName,
            caller: this.caller.bech32(),
        };
    }

    getCaller(): Address {
        return this.caller;
    }

    getEventName(): string {
        return this.eventName;
    }
}
