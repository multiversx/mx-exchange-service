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
import { RewardsProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class CompoundRewardsProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(() => String)
    private farmAddress: Address;
    @Field(() => GenericToken)
    private oldWrappedFarmToken: GenericToken;
    @Field(() => GenericToken)
    private newWrappedFarmToken: GenericToken;
    @Field(() => WrappedFarmTokenAttributesModel)
    private oldWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field(() => WrappedFarmTokenAttributesModel)
    private newWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.oldWrappedFarmToken = new GenericToken({
            tokenID: decodedEvent.oldWrappedFarmTokenID.toString(),
            nonce: decodedEvent.oldWrappedFarmTokenNonce,
            amount: decodedEvent.oldWrappedFarmTokenAmount,
        });
        this.newWrappedFarmToken = new GenericToken({
            tokenID: decodedEvent.newWrappedFarmTokenID.toString(),
            nonce: decodedEvent.newWrappedFarmTokenNonce,
            amount: decodedEvent.newWrappedFarmTokenAmount,
        });
        this.oldWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldWrappedFarmAttributes,
        );
        this.newWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newWrappedFarmAttributes,
        );
    }

    toJSON(): RewardsProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.toString(),
            oldWrappedFarmToken: this.oldWrappedFarmToken.toJSON(),
            newWrappedFarmToken: this.newWrappedFarmToken.toJSON(),
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

        const [decoded] = codec.decodeNested(data, eventStructure);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('ClaimRewardsProxyEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('farmAddress', '', new AddressType()),
            new FieldDefinition(
                'oldWrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('oldWrappedFarmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'oldWrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new FieldDefinition(
                'newWrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('newWrappedFarmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'newWrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new FieldDefinition(
                'oldWrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new FieldDefinition(
                'newWrappedFarmAttributes',
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
