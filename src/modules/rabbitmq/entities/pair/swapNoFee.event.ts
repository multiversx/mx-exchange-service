import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEvent } from '../generic.event';
import { SwapNoFeeTopics } from './pair.event.topics';
import { SwapNoFeeEventType } from './pair.types';

@ObjectType()
export class SwapNoFeeEvent extends GenericEvent {
    private decodedTopics: SwapNoFeeTopics;

    @Field(() => GenericToken)
    private tokenIn: GenericToken;
    @Field(() => GenericToken)
    private tokenOut: GenericToken;
    @Field(() => String)
    private destination: Address;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new SwapNoFeeTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.tokenIn = new GenericToken({
            tokenID: decodedEvent.tokenInID.toString(),
            amount: decodedEvent.tokenInAmount,
        });
        this.tokenOut = new GenericToken({
            tokenID: decodedEvent.tokenOutID.toString(),
            amount: decodedEvent.tokenOutAmount,
        });
    }

    getTokenAmountOut(): GenericToken {
        return this.tokenOut;
    }

    getDestination(): Address {
        return this.destination;
    }

    toJSON(): SwapNoFeeEventType {
        return {
            ...super.toJSON(),
            tokenIn: this.tokenIn.toJSON(),
            tokenOut: this.tokenOut.toJSON(),
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

        const [decoded] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('SwapNoFeeAndForwardEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('tokenInID', '', new TokenIdentifierType()),
            new FieldDefinition('tokenInAmount', '', new BigUIntType()),
            new FieldDefinition('tokenOutID', '', new TokenIdentifierType()),
            new FieldDefinition('tokenOutAmount', '', new BigUIntType()),
            new FieldDefinition('destination', '', new AddressType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
