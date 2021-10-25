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
import { GenericToken } from 'src/models/genericToken.model';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { PairProxyEventType } from './pair.proxy.types';
import { PairProxyTopics } from './proxy.event.topics';

@ObjectType()
export class PairProxyEvent extends GenericEvent {
    protected decodedTopics: PairProxyTopics;

    @Field(type => GenericToken)
    protected firstToken: GenericToken;
    @Field(type => GenericToken)
    protected secondToken: GenericToken;
    @Field(type => GenericToken)
    protected wrappedLpToken: GenericToken;
    @Field(type => WrappedLpTokenAttributesModel)
    protected wrappedLpAttributes: WrappedLpTokenAttributesModel;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.firstToken = new GenericToken({
            tokenID: decodedEvent.firstTokenID,
            nonce: decodedEvent.firstTokenNonce,
            amount: decodedEvent.firstTokenAmount,
        });
        this.secondToken = new GenericToken({
            tokenID: decodedEvent.secondTokenID,
            nonce: decodedEvent.secondTokenNonce,
            amount: decodedEvent.secondTokenAmount,
        });
        this.wrappedLpToken = new GenericToken({
            tokenID: decodedEvent.wrappedLpTokenID,
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

        const [decoded, decodedLength] = codec.decodeNested(
            data,
            eventStructure,
        );

        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('RemoveLiquidityProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('pairAddress', '', new AddressType()),
            new StructFieldDefinition(
                'firstTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('firstTokenNonce', '', new U64Type()),
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
            new StructFieldDefinition('secondTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'secondTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'wrappedLpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('wrappedLpTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'wrappedLpTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'wrappedLpAttributes',
                '',
                WrappedLpTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
