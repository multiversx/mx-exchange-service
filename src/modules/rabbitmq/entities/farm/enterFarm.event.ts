import {
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
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { FarmEventsTopics } from './farm.event.topics';
import { EnterFarmEventType } from './farm.types';

@ObjectType()
export class EnterFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(type => GenericToken)
    private farmingToken: GenericToken;
    @Field(type => String)
    private farmingReserve: BigNumber;
    @Field(type => GenericToken)
    private farmToken: GenericToken;
    @Field(type => String)
    private farmSupply: BigNumber;
    @Field(type => GenericToken)
    private rewardToken: GenericToken;
    @Field(type => String)
    private rewardTokenReserves: BigNumber;
    @Field(type => FarmTokenAttributesModel)
    private farmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);

        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmingToken = new GenericToken({
            tokenID: decodedEvent.farmingTokenID,
            amount: decodedEvent.farmingTokenAmount,
        });
        this.farmToken = new GenericToken({
            tokenID: decodedEvent.farmTokenID,
            nonce: decodedEvent.farmTokenNonce,
            amount: decodedEvent.farmTokenAmount,
        });
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID,
            amount: new BigNumber(0),
        });
        this.farmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.farmAttributes,
        );
    }

    getFarmingToken(): GenericToken {
        return this.farmingToken;
    }

    getFarmingReserve(): BigNumber {
        return this.farmingReserve;
    }

    getFarmToken(): GenericToken {
        return this.farmToken;
    }

    getFarmSupply(): BigNumber {
        return this.farmSupply;
    }

    getRewardTokenReserve(): GenericToken {
        return this.rewardToken;
    }

    toJSON(): EnterFarmEventType {
        return {
            ...super.toJSON(),
            farmingToken: this.farmingToken.toJSON(),
            farmingReserve: this.farmingReserve.toFixed(),
            farmToken: this.farmToken.toJSON(),
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: this.rewardToken.toJSON(),
            rewardTokenReserves: this.rewardTokenReserves.toFixed(),
            farmAttributes: this.farmAttributes.toPlainObject(),
            createdWithMerge: this.createdWithMerge,
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('EnterFarmEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'farmingTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition('farmingReserve', '', new BigUIntType()),
            new StructFieldDefinition(
                'farmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('farmTokenNonce', '', new U64Type()),
            new StructFieldDefinition('farmTokenAmount', '', new BigUIntType()),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
            new StructFieldDefinition(
                'rewardTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition(
                'rewardTokenReserves',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'farmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(),
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
