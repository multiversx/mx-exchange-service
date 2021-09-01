import {
    Address,
    AddressType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { FftTokenAmountPair } from 'src/models/fftTokenAmountPair.model';
import { GenericEvent } from '../generic.event';
import { SwapNoFeeTopics } from './pair.event.topics';
import { SwapNoFeeEventType } from './pair.types';

@ObjectType()
export class SwapNoFeeEvent extends GenericEvent {
    private decodedTopics: SwapNoFeeTopics;

    @Field(type => FftTokenAmountPair)
    private tokenAmountOut: FftTokenAmountPair;
    @Field(type => String)
    private destination: Address;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new SwapNoFeeTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.tokenAmountOut = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.tokenAmountOut,
        );
    }

    toJSON(): SwapNoFeeEventType {
        return {
            ...super.toJSON(),
            tokenAmountOut: this.tokenAmountOut.toJSON(),
            destination: this.destination.toString(),
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
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition('destination', '', new AddressType()),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
