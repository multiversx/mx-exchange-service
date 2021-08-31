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
import { GenericTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { GenericTokenAmountPairType } from '../generic.types';
import { FarmEventsTopics } from './farm.event.topics';
import { RewardsEventType } from './rewards.types';

export class RewardsEvent extends GenericEvent {
    private decodedTopics: FarmEventsTopics;

    private oldFarmToken: GenericTokenAmountPairType;
    private newFarmToken: GenericTokenAmountPairType;
    private farmSupply: BigNumber;
    private rewardToken: GenericTokenAmountPairType;
    private rewardTokenReserve: BigNumber;
    private oldFarmAttributes: FarmTokenAttributesModel;
    private newFarmAttributes: FarmTokenAttributesModel;
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmEventsTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.oldFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldFarmAttributes,
        );
        this.newFarmAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newFarmAttributes,
        );
    }

    toPlainObject(): RewardsEventType {
        return {
            ...super.toPlainObject(),
            oldFarmToken: {
                tokenID: this.oldFarmToken.tokenID.toString(),
                tokenNonce: this.oldFarmToken.tokenNonce.toNumber(),
                amount: this.oldFarmToken.amount.toFixed(),
            },
            newFarmToken: {
                tokenID: this.newFarmToken.tokenID.toString(),
                tokenNonce: this.newFarmToken.tokenNonce.toNumber(),
                amount: this.newFarmToken.amount.toFixed(),
            },
            farmSupply: this.farmSupply.toFixed(),
            rewardToken: {
                tokenID: this.rewardToken.tokenID.toString(),
                tokenNonce: this.rewardToken.tokenNonce.toNumber(),
                amount: this.rewardToken.amount.toFixed(),
            },
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
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'newFarmToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('farmSupply', '', new BigUIntType()),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericTokenAmountPairStruct(),
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
