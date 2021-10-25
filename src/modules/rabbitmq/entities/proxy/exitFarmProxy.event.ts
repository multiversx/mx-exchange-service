import {
    Address,
    AddressType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { ExitFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class ExitFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(type => String)
    private farmAddress: Address;
    @Field(type => GenericToken)
    private wrappedFarmToken: GenericToken;
    @Field(type => WrappedFarmTokenAttributesModel)
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field(type => GenericToken)
    private farmingToken: GenericToken;
    @Field(type => GenericToken)
    private rewardToken: GenericToken;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.wrappedFarmToken = GenericToken.fromDecodedAttributes(
            decodedEvent.wrappedFarmToken,
        );
        this.wrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedFarmAttributes,
        );
        this.farmingToken = GenericToken.fromDecodedAttributes(
            decodedEvent.farmingToken,
        );
        this.rewardToken = GenericToken.fromDecodedAttributes(
            decodedEvent.rewardToken,
        );
    }

    toJSON(): ExitFarmProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.toString(),
            wrappedFarmToken: this.wrappedFarmToken.toJSON(),
            wrappedFarmAttributes: this.wrappedFarmAttributes.toPlainObject(),
            farmingToken: this.farmingToken.toJSON(),
            rewardToken: this.rewardToken.toJSON(),
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
        return new StructType('ExitFarmProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
            new StructFieldDefinition(
                'wrappedFarmToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition(
                'wrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'farmingToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
