import { BinaryCodec, StructType } from '@elrondnetwork/erdjs/out';
import { Field } from '@nestjs/graphql';
import { PriceDiscoveryEventTopics } from './price.discovery.event.topics';
import { PriceDiscoveryEventType } from './price.discovery.types';

export class PriceDiscoveryEvent {
    @Field(() => String)
    private address = '';
    private identifier = '';
    protected topics = [];
    protected data = '';
    private decodedTopics: PriceDiscoveryEventTopics;

    constructor(init?: Partial<PriceDiscoveryEvent>) {
        Object.assign(this, init);
        this.decodedTopics = new PriceDiscoveryEventTopics(this.topics);
    }

    getAddress(): string {
        return this.address;
    }

    getIdentifier(): string {
        return this.identifier;
    }

    getTopics(): PriceDiscoveryEventTopics {
        return this.decodedTopics;
    }

    toJSON(): PriceDiscoveryEventType {
        return {
            address: this.address,
            identifier: this.identifier,
        };
    }

    protected decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure();

        const [decoded] = codec.decodeNested(data, eventStruct);

        return decoded.valueOf();
    }

    protected getStructure(): StructType {
        return;
    }
}
