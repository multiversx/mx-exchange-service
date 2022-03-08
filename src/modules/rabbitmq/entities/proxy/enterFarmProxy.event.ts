import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    BooleanType,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { EnterFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class EnterFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(() => String)
    private farmAddress: Address;
    @Field(() => GenericToken)
    private farmingToken: GenericToken;
    @Field(() => GenericToken)
    private wrappedFarmToken: GenericToken;
    @Field(() => WrappedFarmTokenAttributesModel)
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmingToken = new GenericToken({
            tokenID: decodedEvent.farmingTokenID.toString(),
            nonce: decodedEvent.farmingTokenNonce,
            amount: decodedEvent.farmingTokenAmount,
        });
        this.wrappedFarmToken = new GenericToken({
            tokenID: decodedEvent.wrappedFarmTokenID.toString(),
            nonce: decodedEvent.wrappedFarmTokenNonce,
            amount: decodedEvent.wrappedFarmTokenAmount,
        });
        this.wrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedFarmAttributes,
        );
    }

    toJSON(): EnterFarmProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.toString(),
            farmingToken: this.farmingToken.toJSON(),
            wrappedFarmToken: this.wrappedFarmToken.toJSON(),
            wrappedFarmAttributes: this.wrappedFarmAttributes.toPlainObject(),
            createdWithMerge: this.createdWithMerge,
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
        return new StructType('EnterFarmProxyEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('farmAddress', '', new AddressType()),
            new FieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('farmingTokenNonce', '', new U64Type()),
            new FieldDefinition('farmingTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'wrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('wrappedFarmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'wrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new FieldDefinition(
                'wrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new FieldDefinition('createdWithMerge', '', new BooleanType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
