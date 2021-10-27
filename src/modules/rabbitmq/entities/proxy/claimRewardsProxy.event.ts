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
import { ClaimRewardsProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class ClaimRewardsProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(type => String)
    private farmAddress: Address;
    @Field(type => GenericToken)
    private oldWrappedFarmToken: GenericToken;
    @Field(type => GenericToken)
    private newWrappedFarmToken: GenericToken;
    @Field(type => GenericToken)
    private rewardToken: GenericToken;
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
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID.toString(),
            nonce: decodedEvent.rewardTokenNonce,
            amount: decodedEvent.rewardTokenAmount,
        });
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
                'oldWrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'oldWrappedFarmTokenNonce',
                '',
                new U64Type(),
            ),
            new StructFieldDefinition(
                'oldWrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmTokenNonce',
                '',
                new U64Type(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'rewardTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('rewardTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'rewardTokenAmount',
                '',
                new BigUIntType(),
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
