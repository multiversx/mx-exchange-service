import {
    AddressType,
    BigUIntType,
    BinaryCodec,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEvent } from '../generic.event';
import { PairEventTopics } from './pair.event.topics';
import { AddLiquidityEventType } from './pair.types';

@ObjectType()
export class AddLiquidityEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    @Field(() => GenericToken)
    private firstToken: GenericToken;
    @Field(() => GenericToken)
    private secondToken: GenericToken;
    @Field(() => GenericToken)
    private liquidityPoolToken: GenericToken;
    @Field(() => String)
    private liquidityPoolSupply: BigNumber;
    @Field(() => String)
    private firstTokenReserves: BigNumber;
    @Field(() => String)
    private secondTokenReserves: BigNumber;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.firstToken = new GenericToken({
            tokenID: decodedEvent.firstTokenID.toString(),
            amount: decodedEvent.firstTokenAmount,
        });
        this.secondToken = new GenericToken({
            tokenID: decodedEvent.secondTokenID.toString(),
            amount: decodedEvent.secondTokenAmount,
        });
        this.liquidityPoolToken = new GenericToken({
            tokenID: decodedEvent.lpTokenID.toString(),
            amount: decodedEvent.lpTokenAmount,
        });
    }

    getFirstToken(): GenericToken {
        return this.firstToken;
    }

    getSecondToken(): GenericToken {
        return this.secondToken;
    }

    getLiquidityPoolToken(): GenericToken {
        return this.liquidityPoolToken;
    }

    getLiquidityPoolSupply(): BigNumber {
        return this.liquidityPoolSupply;
    }

    getFirstTokenReserves(): BigNumber {
        return this.firstTokenReserves;
    }

    getSecondTokenReserves(): BigNumber {
        return this.secondTokenReserves;
    }

    toJSON(): AddLiquidityEventType {
        return {
            ...super.toJSON(),
            firstToken: this.firstToken.toJSON(),
            secondToken: this.secondToken.toJSON(),
            liquidityPoolToken: this.liquidityPoolToken.toJSON(),
            liquidityPoolSupply: this.liquidityPoolSupply.toFixed(),
            firstTokenReserves: this.firstTokenReserves.toFixed(),
            secondTokenReserves: this.secondTokenReserves.toFixed(),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure();

        const [decoded] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('LiquidityEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('firstTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('firstTokenAmount', '', new BigUIntType()),
            new FieldDefinition('secondTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('secondTokenAmount', '', new BigUIntType()),
            new FieldDefinition('lpTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('lpTokenAmount', '', new BigUIntType()),
            new FieldDefinition('liquidityPoolSupply', '', new BigUIntType()),
            new FieldDefinition('firstTokenReserves', '', new BigUIntType()),
            new FieldDefinition('secondTokenReserves', '', new BigUIntType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
