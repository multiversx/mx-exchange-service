import {
    Address,
    AddressType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { FftTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { FftTokenAmountPairType } from '../generic.types';
import { SwapNoFeeTopics } from './pair.event.topics';
import { SwapNoFeeEventType } from './pair.types';

export class SwapNoFeeEvent extends GenericEvent {
    private decodedTopics: SwapNoFeeTopics;

    private tokenAmountOut: FftTokenAmountPairType;
    private destination: Address;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new SwapNoFeeTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
    }

    toPlainObject(): SwapNoFeeEventType {
        return {
            ...super.toJSON(),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('SwapNoFeeAndForwardEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'tokenAmountOut',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('destination', '', new AddressType()),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
