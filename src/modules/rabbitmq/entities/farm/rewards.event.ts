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
import { RewardsEventType } from './rewards.types';

@ObjectType()
export class RewardsEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(type => GenericToken)
    private oldFarmToken: GenericToken;
    @Field(type => GenericToken)
    private newFarmToken: GenericToken;
    @Field(type => String)
    private farmSupply: BigNumber;
    @Field(type => GenericToken)
    private rewardToken: GenericToken;
    @Field(type => String)
    private rewardTokenReserve: BigNumber;
    @Field(type => FarmTokenAttributesModel)
    private oldFarmAttributes: FarmTokenAttributesModel;
    @Field(type => FarmTokenAttributesModel)
    private newFarmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.oldFarmToken = new GenericToken({
            tokenID: decodedEvent.oldFarmTokenID,
            nonce: decodedEvent.oldFarmTokenNonce,
            amount: decodedEvent.oldFarmTokenAmount,
        });
        this.newFarmToken = new GenericToken({
            tokenID: decodedEvent.newFarmTokenID,
            nonce: decodedEvent.newFarmTokenNonce,
            amount: decodedEvent.newFarmTokenAmount,
        });
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID,
            nonce: decodedEvent.rewardTokenNonce,
            amount: decodedEvent.rewardTokenAmount,
        });
        this.oldFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldFarmAttributes,
        );
        this.newFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newFarmAttributes,
        );
    }

    getOldFarmToken(): GenericToken {
        return this.oldFarmToken;
    }

    getNewFarmToken(): GenericToken {
        return this.newFarmToken;
    }

    getFarmSupply(): BigNumber {
        return this.farmSupply;
    }

    getRewardToken(): GenericToken {
        return this.rewardToken;
    }

    getRewardTokenReserve(): BigNumber {
        return this.rewardTokenReserve;
    }

    toJSON(): RewardsEventType {
        return {
            ...super.toJSON(),
            oldFarmToken: this.oldFarmToken.toJSON(),
            newFarmToken: this.newFarmToken.toJSON(),
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: this.rewardToken.toJSON(),
            rewardTokenReserve: this.rewardTokenReserve.toFixed(),
            oldFarmAttributes: this.oldFarmAttributes.toPlainObject(),
            newFarmAttributes: this.newFarmAttributes.toPlainObject(),
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
        return new StructType('ClaimRewardsEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'oldFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('oldFarmTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'oldFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'newFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('newFarmTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'newFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
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
                'rewardTokenReserves',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'oldFarmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'newFarmAttributes',
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
