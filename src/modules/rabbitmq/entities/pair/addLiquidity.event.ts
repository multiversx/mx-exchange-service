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
import { AddLiquidityEventType } from './pair.types';

@ObjectType()
export class AddLiquidityEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    @Field(type => GenericToken)
    private firstToken: GenericToken;
    @Field(type => GenericToken)
    private secondToken: GenericToken;
    @Field(type => GenericToken)
    private liquidityPoolToken: GenericToken;
    @Field(type => String)
    private liquidityPoolSupply: BigNumber;
    @Field(type => String)
    private firstTokenReserves: BigNumber;
    @Field(type => String)
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

        const [decoded, decodedLength] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('LiquidityEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'firstTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'firstTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'secondTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'secondTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'lpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('lpTokenAmount', '', new BigUIntType()),
            new StructFieldDefinition(
                'liquidityPoolSupply',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'firstTokenReserves',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'secondTokenReserves',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
