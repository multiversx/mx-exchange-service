import {
    AddressType,
    BigUIntType,
    BinaryCodec,
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
import { ExitFarmEventType } from './farm.types';

export class ExitFarmEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    private farmingToken: FftTokenAmountPairType;
    private farmingReserve: BigNumber;
    private farmToken: GenericTokenAmountPairType;
    private farmSupply: BigNumber;
    private rewardToken: GenericTokenAmountPairType;
    private rewardReserve: BigNumber;
    private farmAttributes: FarmTokenAttributesModel;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.farmAttributes,
        );
    }

    toPlainObject(): ExitFarmEventType {
        return {
            ...super.toPlainObject(),
            farmingToken: {
                tokenID: this.farmingToken.tokenID.toString(),
                amount: this.farmingToken.amount.toFixed(),
            },
            farmingReserve: this.farmingReserve.toFixed(),
            farmToken: {
                tokenID: this.farmToken.tokenID.toString(),
                tokenNonce: this.farmToken.tokenNonce.toNumber(),
                amount: this.farmToken.amount.toFixed(),
            },
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: {
                tokenID: this.rewardToken.tokenID.toString(),
                tokenNonce: this.rewardToken.tokenNonce.toNumber(),
                amount: this.rewardToken.amount.toFixed(),
            },
            rewardReserve: this.rewardReserve.toFixed(),
            farmAttributes: this.farmAttributes.toPlainObject(),
        };
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
                'rewardToken',
                '',
                GenericTokenAmountPairStruct(),
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
