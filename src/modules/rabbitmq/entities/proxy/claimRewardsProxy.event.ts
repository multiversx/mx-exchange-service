import {
    Address,
    AddressType,
    BinaryCodec,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericTokenAmountPair } from 'src/models/genericTokenAmountPair.model';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { ClaimRewardsProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class ClaimRewardsProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(type => String)
    private farmAddress: Address;
    @Field(type => GenericTokenAmountPair)
    private oldWrappedFarmToken: GenericTokenAmountPair;
    @Field(type => GenericTokenAmountPair)
    private newWrappedFarmToken: GenericTokenAmountPair;
    @Field(type => GenericTokenAmountPair)
    private rewardToken: GenericTokenAmountPair;
    @Field(type => WrappedFarmTokenAttributesModel)
    private oldWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field(type => WrappedFarmTokenAttributesModel)
    private newWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.oldWrappedFarmToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.oldWrappedFarmToken,
        );
        this.newWrappedFarmToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.newWrappedFarmToken,
        );
        this.rewardToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.rewardToken,
        );
        this.oldWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldWrappedFarmAttributes,
        );
        this.newWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newWrappedFarmAttributes,
        );
    }

    toJSON(): ClaimRewardsProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.toString(),
            oldWrappedFarmToken: this.oldWrappedFarmToken.toJSON(),
            newWrappedFarmToken: this.newWrappedFarmToken.toJSON(),
            rewardToken: this.rewardToken.toJSON(),
            oldWrappedFarmAttributes: this.oldWrappedFarmAttributes.toPlainObject(),
            newWrappedFarmAttributes: this.newWrappedFarmAttributes.toPlainObject(),
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
        return new StructType('ClaimRewardsProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
            new StructFieldDefinition(
                'oldWrappedFarmToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'oldWrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmAttributes',
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
