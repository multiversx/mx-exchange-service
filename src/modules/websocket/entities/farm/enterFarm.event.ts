import {
    AddressType,
    BigUIntType,
    BinaryCodec,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import {
    FftTokenAmountPairStruct,
    GenericTokenAmountPairStruct,
} from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import {
    FftTokenAmountPairType,
    GenericTokenAmountPairType,
} from '../generic.types';
import { FarmEventsTopics } from './farm.event.topics';
import { EnterFarmEventType } from './farm.types';

export class EnterFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    private farmingToken: FftTokenAmountPairType;
    private farmToken: GenericTokenAmountPairType;
    private farmSupply: BigNumber;
    private rewardTokenReserve: FftTokenAmountPairType;
    private farmAttributes: FarmTokenAttributesModel;
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);

        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.farmAttributes,
        );
    }

    toPlainObject(): EnterFarmEventType {
        return {
            ...super.toJSON(),
            farmingToken: {
                tokenID: this.farmingToken.tokenID.toString(),
                amount: this.farmingToken.amount.toFixed(),
            },
            farmToken: {
                tokenID: this.farmToken.tokenID.toString(),
                tokenNonce: this.farmToken.tokenNonce.toNumber(),
                amount: this.farmToken.amount.toFixed(),
            },
            farmSupply: this.farmSupply.toFixed(),
            rewardTokenReserve: {
                tokenID: this.rewardTokenReserve.tokenID.toString(),
                amount: this.rewardTokenReserve.amount.toFixed(),
            },
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
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('farmingReserve', '', new BigUIntType()),
            new StructFieldDefinition(
                'farmToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
            new StructFieldDefinition(
                'rewardTokenReserve',
                '',
                FftTokenAmountPairStruct(),
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
