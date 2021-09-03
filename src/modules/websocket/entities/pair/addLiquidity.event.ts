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
import { AddLiquidityEventType } from './pair.types';

@ObjectType()
export class AddLiquidityEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    @Field(type => FftTokenAmountPair)
    private firstTokenAmount: FftTokenAmountPair;
    @Field(type => FftTokenAmountPair)
    private secondTokenAmount: FftTokenAmountPair;
    @Field(type => FftTokenAmountPair)
    private liquidityPoolTokenAmount: FftTokenAmountPair;
    @Field(type => String)
    private liquidityPoolSupply: BigNumber;
    @Field(type => [FftTokenAmountPair])
    private pairReserves: FftTokenAmountPair[];

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.firstTokenAmount = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.firstTokenAmount,
        );
        this.secondTokenAmount = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.secondTokenAmount,
        );
        this.liquidityPoolTokenAmount = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.liquidityPoolTokenAmount,
        );
        this.pairReserves = decodedEvent.pairReserves.map(reserve =>
            FftTokenAmountPair.fromDecodedAttributes(reserve),
        );
    }

    toJSON(): AddLiquidityEventType {
        return {
            ...super.toJSON(),
            firstTokenAmount: this.firstTokenAmount.toJSON(),
            secondTokenAmount: this.secondTokenAmount.toJSON(),
            liquidityPoolTokenAmount: this.liquidityPoolTokenAmount.toJSON(),
            liquidityPoolSupply: this.liquidityPoolSupply.toFixed(),
            pairReserves: this.pairReserves.map(reserve => reserve.toJSON()),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('SwapEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'firstTokenAmount',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'secondTokenAmount',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'liquidityPoolTokenAmount',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'liquidityPoolSupply',
                '',
                new BigUIntType(),
            ),
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
