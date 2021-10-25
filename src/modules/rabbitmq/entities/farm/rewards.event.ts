import {
    AddressType,
    BigUIntType,
    BinaryCodec,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericTokenAmountPair } from 'src/models/genericTokenAmountPair.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { FarmEventsTopics } from './farm.event.topics';
import { RewardsEventType } from './rewards.types';

@ObjectType()
export class RewardsEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(type => GenericTokenAmountPair)
    private oldFarmToken: GenericTokenAmountPair;
    @Field(type => GenericTokenAmountPair)
    private newFarmToken: GenericTokenAmountPair;
    @Field(type => String)
    private farmSupply: BigNumber;
    @Field(type => GenericTokenAmountPair)
    private rewardToken: GenericTokenAmountPair;
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
        this.oldFarmToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.oldFarmToken,
        );
        this.newFarmToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.newFarmToken,
        );
        this.rewardToken = GenericTokenAmountPair.fromDecodedAttributes(
            decodedEvent.rewardToken,
        );
        this.oldFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldFarmAttributes,
        );
        this.newFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newFarmAttributes,
        );
    }

    getOldFarmToken(): GenericTokenAmountPair {
        return this.oldFarmToken;
    }

    getNewFarmToken(): GenericTokenAmountPair {
        return this.newFarmToken;
    }

    getFarmSupply(): BigNumber {
        return this.farmSupply;
    }

    getRewardToken(): GenericTokenAmountPair {
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
                'oldFarmToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'newFarmToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition(
                'rewardTokenReserve',
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
