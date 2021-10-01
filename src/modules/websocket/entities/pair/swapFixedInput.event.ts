import {
    AddressType,
    BigUIntType,
    BinaryCodec,
    ListType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { FftTokenAmountPair } from 'src/models/fftTokenAmountPair.model';
import { GenericEvent } from '../generic.event';
import { PairEventTopics } from './pair.event.topics';
import { SwapEventType } from './pair.types';

@ObjectType()
export class SwapFixedInputEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    @Field(type => FftTokenAmountPair)
    private tokenAmountIn: FftTokenAmountPair;
    @Field(type => FftTokenAmountPair)
    private tokenAmountOut: FftTokenAmountPair;
    @Field(type => String)
    feeAmount: BigNumber;
    @Field(type => [FftTokenAmountPair])
    private pairReserves: FftTokenAmountPair[];

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();

        Object.assign(this, decodedEvent);
        this.tokenAmountIn = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.tokenAmountIn,
        );
        this.tokenAmountOut = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.tokenAmountOut,
        );
        this.pairReserves = decodedEvent.pairReserves.map(reserve =>
            FftTokenAmountPair.fromDecodedAttributes(reserve),
        );
    }

    getTokenAmountIn(): FftTokenAmountPair {
        return this.tokenAmountIn;
    }

    getTokenAmountOut(): FftTokenAmountPair {
        return this.tokenAmountOut;
    }

    getPairReserves(): FftTokenAmountPair[] {
        return this.pairReserves;
    }

    toJSON(): SwapEventType {
        return {
            ...super.toJSON(),
            tokenAmountIn: this.tokenAmountIn.toJSON(),
            tokenAmountOut: this.tokenAmountOut.toJSON(),
            feeAmount: this.feeAmount.toFixed(),
            pairReserves: this.pairReserves.map(reserve => {
                return reserve.toJSON();
            }),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const swapEventStructure = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(
            data,
            swapEventStructure,
        );

        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('SwapEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'tokenAmountIn',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'tokenAmountOut',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition('feeAmount', '', new BigUIntType()),
            new StructFieldDefinition(
                'pairReserves',
                '',
                new ListType(FftTokenAmountPair.getStructure()),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
