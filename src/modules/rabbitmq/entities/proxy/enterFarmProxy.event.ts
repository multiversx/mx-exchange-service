import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    BooleanType,
    StructFieldDefinition,
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

    @Field(type => String)
    private farmAddress: Address;
    @Field(type => GenericToken)
    private farmingToken: GenericToken;
    @Field(type => GenericToken)
    private wrappedFarmToken: GenericToken;
    @Field(type => WrappedFarmTokenAttributesModel)
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

        const [decoded, decodedLength] = codec.decodeNested(
            data,
            eventStructure,
        );
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('EnterFarmProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
            new StructFieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('farmingTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'farmingTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'wrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'wrappedFarmTokenNonce',
                '',
                new U64Type(),
            ),
            new StructFieldDefinition(
                'wrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'wrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'createdWithMerge',
                '',
                new BooleanType(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
