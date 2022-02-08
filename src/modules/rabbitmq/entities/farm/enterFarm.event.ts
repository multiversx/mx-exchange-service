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
import { EnterFarmEventType } from './farm.types';

@ObjectType()
export class EnterFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(() => GenericToken)
    private farmingToken: GenericToken;
    @Field(() => String)
    private farmingReserve: BigNumber;
    @Field(() => GenericToken)
    private farmToken: GenericToken;
    @Field(() => String)
    private farmSupply: BigNumber;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;
    @Field(() => String)
    private rewardTokenReserves: BigNumber;
    @Field(() => FarmTokenAttributesModel)
    private farmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);
        const version = farmVersion(this.getAddress());
        const decodedEvent = this.decodeEvent(version);
        Object.assign(this, decodedEvent);
        this.farmingToken = new GenericToken({
            tokenID: decodedEvent.farmingTokenID.toString(),
            amount: decodedEvent.farmingTokenAmount,
        });
        this.farmToken = new GenericToken({
            tokenID: decodedEvent.farmTokenID.toString(),
            nonce: decodedEvent.farmTokenNonce,
            amount: decodedEvent.farmTokenAmount,
        });
        this.rewardToken = new GenericToken({
            tokenID: decodedEvent.rewardTokenID.toString(),
            amount: new BigNumber(0),
        });
        this.farmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.farmAttributes,
            version,
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
            farmingReserve:
                this.farmingReserve !== undefined
                    ? this.farmingReserve.toFixed()
                    : '',
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

    decodeEvent(version: FarmVersion) {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStruct = this.getStructure(version);
        const [decoded] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    getStructure(version: FarmVersion): StructType {
        const eventStructType = new StructType('EnterFarmEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('farmingTokenAmount', '', new BigUIntType()),
            new FieldDefinition('farmTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('farmTokenNonce', '', new U64Type()),
            new FieldDefinition('farmTokenAmount', '', new BigUIntType()),
            new FieldDefinition('farmSupply', '', new BigUIntType()),
            new FieldDefinition('rewardTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('rewardTokenReserves', '', new BigUIntType()),
            new FieldDefinition(
                'farmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(version),
            ),
            new FieldDefinition('createdWithMerge', '', new BooleanType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);

        const structFields = eventStructType.getFieldsDefinitions();
        if (version === FarmVersion.V1_2) {
            structFields.splice(
                3,
                0,
                new FieldDefinition('farmingReserve', '', new BigUIntType()),
            );
        }
        return new StructType('EnterFarmEvent', structFields);
    }
}
