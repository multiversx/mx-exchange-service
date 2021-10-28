import {
    AddressType,
    BigUIntType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEvent } from '../generic.event';
import { PairEventTopics } from './pair.event.topics';
import { SwapEventType } from './pair.types';

@ObjectType()
export class SwapFixedInputEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    @Field(() => GenericToken)
    private tokenIn: GenericToken;
    @Field(() => GenericToken)
    private tokenOut: GenericToken;
    @Field(() => String)
    feeAmount: BigNumber;
    @Field(() => String)
    tokenInReserves: BigNumber;
    @Field(() => String)
    tokenOutReserves: BigNumber;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
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

    getTokenIn(): GenericToken {
        return this.tokenIn;
    }

    getTokenOut(): GenericToken {
        return this.tokenOut;
    }

    getTokenInReserves(): BigNumber {
        return this.tokenInReserves;
    }

    getTokenOutReserves(): BigNumber {
        return this.tokenOutReserves;
    }

    toJSON(): SwapEventType {
        return {
            ...super.toJSON(),
            tokenIn: this.tokenIn.toJSON(),
            tokenOut: this.tokenOut.toJSON(),
            feeAmount: this.feeAmount.toFixed(),
            tokenInReserves: this.tokenInReserves.toFixed(),
            tokenOutReserves: this.tokenOutReserves.toFixed(),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const swapEventStructure = this.getStructure();

        const [decoded] = codec.decodeNested(data, swapEventStructure);

        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('SwapEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'tokenInID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('tokenInAmount', '', new BigUIntType()),
            new StructFieldDefinition(
                'tokenOutID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('tokenOutAmount', '', new BigUIntType()),
            new StructFieldDefinition('feeAmount', '', new BigUIntType()),
            new StructFieldDefinition('tokenInReserves', '', new BigUIntType()),
            new StructFieldDefinition(
                'tokenOutReserves',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
