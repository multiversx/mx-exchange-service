import {
    Address,
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
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { ExitFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

@ObjectType()
export class ExitFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    @Field(() => String)
    private farmAddress: Address;
    @Field(() => GenericToken)
    private wrappedFarmToken: GenericToken;
    @Field(() => WrappedFarmTokenAttributesModel)
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field(() => GenericToken)
    private farmingToken: GenericToken;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.wrappedFarmToken = new GenericToken({
            tokenID: decodedEvent.wrappedFarmTokenID.toString(),
            nonce: decodedEvent.wrappedFarmTokenNonce,
            amount: decodedEvent.wrappedFarmTokenAmount,
        });
        this.wrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedFarmAttributes,
        );
        this.farmingToken = new GenericToken({
            tokenID: decodedEvent.farmingTokenID.toString(),
            nonce: decodedEvent.farmingTokenNonce,
            amount: decodedEvent.farmingTokenAmount,
        });
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID.toString(),
            nonce: decodedEvent.rewardTokenNonce,
            amount: decodedEvent.rewardTokenAmount,
        });
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

        const [decoded] = codec.decodeNested(data, eventStructure);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('ExitFarmProxyEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('farmAddress', '', new AddressType()),
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
            new FieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('farmingTokenNonce', '', new U64Type()),
            new FieldDefinition('farmingTokenAmount', '', new BigUIntType()),
            new FieldDefinition('rewardTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('rewardTokenNonce', '', new U64Type()),
            new FieldDefinition('rewardTokenAmount', '', new BigUIntType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
