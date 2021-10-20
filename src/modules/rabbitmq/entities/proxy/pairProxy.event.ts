import {
    AddressType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericTokenAmountPair } from 'src/models/genericTokenAmountPair.model';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { PairProxyEventType } from './pair.proxy.types';
import { PairProxyTopics } from './proxy.event.topics';

@ObjectType()
export class PairProxyEvent extends GenericEvent {
    protected decodedTopics: PairProxyTopics;

    @Field(type => GenericTokenAmountPair)
    protected firstToken: GenericTokenAmountPair;
    @Field(type => GenericTokenAmountPair)
    protected secondToken: GenericTokenAmountPair;
    @Field(type => GenericTokenAmountPair)
    protected wrappedLpToken: GenericTokenAmountPair;
    @Field(type => WrappedLpTokenAttributesModel)
    protected wrappedLpAttributes: WrappedLpTokenAttributesModel;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.firstToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.firstToken,
        );
        this.secondToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.secondToken,
        );
        this.wrappedLpToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.wrappedLpToken,
        );
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
                'wrappedLpToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'wrappedLpAttributes',
                '',
                WrappedLpTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'firstToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'secondToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
