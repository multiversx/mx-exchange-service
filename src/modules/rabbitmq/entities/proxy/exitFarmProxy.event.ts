import {
    Address,
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
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
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
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
