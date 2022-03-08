import {
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
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { farmVersion } from 'src/utils/farm.utils';
import { GenericEvent } from '../generic.event';
import { FarmEventsTopics } from './farm.event.topics';
import { RewardsEventType } from './rewards.types';

@ObjectType()
export class RewardsEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(() => GenericToken)
    private oldFarmToken: GenericToken;
    @Field(() => GenericToken)
    private newFarmToken: GenericToken;
    @Field(() => String)
    private farmSupply: BigNumber;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;
    @Field(() => String)
    private rewardTokenReserves: BigNumber;
    @Field(() => FarmTokenAttributesModel)
    private oldFarmAttributes: FarmTokenAttributesModel;
    @Field(() => FarmTokenAttributesModel)
    private newFarmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        const version = farmVersion(this.getAddress());
        this.decodedTopics = new FarmEventsTopics(this.topics);
        const decodedEvent = this.decodeEvent(version);
        Object.assign(this, decodedEvent);
        this.oldFarmToken = new GenericToken({
            tokenID: decodedEvent.oldFarmTokenID.toString(),
            nonce: decodedEvent.oldFarmTokenNonce,
            amount: decodedEvent.oldFarmTokenAmount,
        });
        this.newFarmToken = new GenericToken({
            tokenID: decodedEvent.newFarmTokenID.toString(),
            nonce: decodedEvent.newFarmTokenNonce,
            amount: decodedEvent.newFarmTokenAmount,
        });
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID.toString(),
            nonce: decodedEvent.rewardTokenNonce,
            amount: decodedEvent.rewardTokenAmount,
        });
        this.oldFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldFarmAttributes,
            version,
        );
        this.newFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newFarmAttributes,
            version,
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
        return this.rewardTokenReserves;
    }

    toJSON(): RewardsEventType {
        return {
            ...super.toJSON(),
            oldFarmToken: this.oldFarmToken.toJSON(),
            newFarmToken: this.newFarmToken.toJSON(),
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: this.rewardToken.toJSON(),
            rewardTokenReserves: this.rewardTokenReserves.toFixed(),
            oldFarmAttributes: this.oldFarmAttributes.toPlainObject(),
            newFarmAttributes: this.newFarmAttributes.toPlainObject(),
            createdWithMerge: this.createdWithMerge,
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent(version: FarmVersion) {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure(version);

        const [decoded] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    getStructure(version: FarmVersion): StructType {
        return new StructType('ClaimRewardsEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition(
                'oldFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('oldFarmTokenNonce', '', new U64Type()),
            new FieldDefinition('oldFarmTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'newFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('newFarmTokenNonce', '', new U64Type()),
            new FieldDefinition('newFarmTokenAmount', '', new BigUIntType()),
            new FieldDefinition('farmSupply', '', new BigUIntType()),
            new FieldDefinition('rewardTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('rewardTokenNonce', '', new U64Type()),
            new FieldDefinition('rewardTokenAmount', '', new BigUIntType()),
            new FieldDefinition('rewardTokenReserves', '', new BigUIntType()),
            new FieldDefinition(
                'oldFarmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(version),
            ),
            new FieldDefinition(
                'newFarmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(version),
            ),
            new FieldDefinition('createdWithMerge', '', new BooleanType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
