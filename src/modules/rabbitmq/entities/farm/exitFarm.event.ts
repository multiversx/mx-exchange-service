import {
    AddressType,
    BigUIntType,
    BinaryCodec,
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
import { ExitFarmEventType } from './farm.types';

@ObjectType()
export class ExitFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    @Field(type => FftTokenAmountPair)
    private farmingToken: FftTokenAmountPair;
    @Field(type => String)
    private farmingReserve: BigNumber;
    @Field(type => GenericToken)
    private farmToken: GenericToken;
    @Field(type => String)
    private farmSupply: BigNumber;
    @Field(type => GenericToken)
    private rewardToken: GenericToken;
    @Field(type => String)
    private rewardReserve: BigNumber;
    @Field(type => FarmTokenAttributesModel)
    private farmAttributes: FarmTokenAttributesModel;

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
        this.rewardToken = GenericToken.fromDecodedAttributes(
            decodedEvent.rewardToken,
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

    getRewardToken(): GenericToken {
        return this.rewardToken;
    }

    getRewardReserve(): BigNumber {
        return this.rewardReserve;
    }

    toJSON(): ExitFarmEventType {
        return {
            ...super.toJSON(),
            farmingToken: this.farmingToken.toJSON(),
            farmingReserve: this.farmingReserve.toFixed(),
            farmToken: this.farmToken.toJSON(),
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: this.rewardToken.toJSON(),
            rewardReserve: this.rewardReserve.toFixed(),
            farmAttributes: this.farmAttributes.toPlainObject(),
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
        return new StructType('ExitFarmEvent', [
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
                'rewardToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition('rewardReserve', '', new BigUIntType()),
            new StructFieldDefinition(
                'farmAttributes',
                '',
                FarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
