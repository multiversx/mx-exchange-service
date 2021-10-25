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
import { FftTokenAmountPair } from 'src/models/fftTokenAmountPair.model';
import { GenericToken } from 'src/models/genericToken.model
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { FarmEventsTopics } from './farm.event.topics';
import { EnterFarmEventType } from './farm.types';

@ObjectType()
export class EnterFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(type => FftTokenAmountPair)
    private farmingToken: FftTokenAmountPair;
    @Field(type => String)
    private farmingReserve: BigNumber;
    @Field(type => GenericToken)
    private farmToken: GenericToken;
    @Field(type => String)
    private farmSupply: BigNumber;
    @Field(type => FftTokenAmountPair)
    private rewardTokenReserve: FftTokenAmountPair;
    @Field(type => FarmTokenAttributesModel)
    private farmAttributes: FarmTokenAttributesModel;
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);

        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmingToken = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.farmingToken,
        );
        this.farmToken = GenericToken.fromDecodedAttributes(
            decodedEvent.farmToken,
        );
        this.rewardTokenReserve = FftTokenAmountPair.fromDecodedAttributes(
            decodedEvent.rewardTokenReserve,
        );
        this.farmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.farmAttributes,
        );
    }

    getFarmingToken(): FftTokenAmountPair {
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

    getRewardTokenReserve(): FftTokenAmountPair {
        return this.rewardTokenReserve;
    }

    toJSON(): EnterFarmEventType {
        return {
            ...super.toJSON(),
            farmingToken: this.farmingToken.toJSON(),
            farmingReserve: this.farmingReserve.toFixed(),
            farmToken: this.farmToken.toJSON(),
            farmSupply: this.farmSupply.toFixed(),
            rewardTokenReserve: this.rewardTokenReserve.toJSON(),
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
                'farmingToken',
                '',
                FftTokenAmountPair.getStructure(),
            ),
            new StructFieldDefinition('farmingReserve', '', new BigUIntType()),
            new StructFieldDefinition(
                'farmToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
            new StructFieldDefinition(
                'rewardTokenReserve',
                '',
                FftTokenAmountPair.getStructure(),
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
