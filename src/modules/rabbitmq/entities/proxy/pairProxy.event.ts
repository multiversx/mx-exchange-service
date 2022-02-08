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
import { GenericToken } from 'src/models/genericToken.model';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { PairProxyEventType } from './pair.proxy.types';
import { PairProxyTopics } from './proxy.event.topics';

@ObjectType()
export class PairProxyEvent extends GenericEvent {
    protected decodedTopics: PairProxyTopics;

    @Field(() => GenericToken)
    protected firstToken: GenericToken;
    @Field(() => GenericToken)
    protected secondToken: GenericToken;
    @Field(() => GenericToken)
    protected wrappedLpToken: GenericToken;
    @Field(() => WrappedLpTokenAttributesModel)
    protected wrappedLpAttributes: WrappedLpTokenAttributesModel;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.firstToken = new GenericToken({
            tokenID: decodedEvent.firstTokenID.toString(),
            nonce: decodedEvent.firstTokenNonce,
            amount: decodedEvent.firstTokenAmount,
        });
        this.secondToken = new GenericToken({
            tokenID: decodedEvent.secondTokenID.toString(),
            nonce: decodedEvent.secondTokenNonce,
            amount: decodedEvent.secondTokenAmount,
        });
        this.wrappedLpToken = new GenericToken({
            tokenID: decodedEvent.wrappedLpTokenID.toString(),
            nonce: decodedEvent.wrappedLpTokenNonce,
            amount: decodedEvent.wrappedLpTokenAmount,
        });
        this.wrappedLpAttributes = WrappedLpTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedLpAttributes,
        );
    }

    toJSON(): PairProxyEventType {
        return {
            ...super.toJSON(),
            firstToken: this.firstToken.toJSON(),
            secondToken: this.firstToken.toJSON(),
            wrappedLpToken: this.wrappedLpToken.toJSON(),
            wrappedLpAttributes: this.wrappedLpAttributes.toPlainObject(),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStructure = this.getStructure();

        const [decoded] = codec.decodeNested(data, eventStructure);

        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('RemoveLiquidityProxyEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('pairAddress', '', new AddressType()),
            new FieldDefinition(
                'wrappedLpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('wrappedLpTokenNonce', '', new U64Type()),
            new FieldDefinition('wrappedLpTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'wrappedLpAttributes',
                '',
                WrappedLpTokenAttributesModel.getStructure(),
            ),
            new FieldDefinition('firstTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('firstTokenNonce', '', new U64Type()),
            new FieldDefinition('firstTokenAmount', '', new BigUIntType()),
            new FieldDefinition('secondTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('secondTokenNonce', '', new U64Type()),
            new FieldDefinition('secondTokenAmount', '', new BigUIntType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
