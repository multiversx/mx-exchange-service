import {
    Address,
    AddressType,
    BinaryCodec,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { GenericTokenAmountPairType } from '../generic.types';
import { ClaimRewardsProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

export class ClaimRewardsProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    private farmAddress: Address;
    private oldWrappedFarmToken: GenericTokenAmountPairType;
    private newWrappedFarmToken: GenericTokenAmountPairType;
    private rewardToken: GenericTokenAmountPairType;
    private oldWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    private newWrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.oldWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.oldWrappedFarmAttributes,
        );
        this.newWrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.newWrappedFarmAttributes,
        );
    }

    toPlainObject(): ClaimRewardsProxyEventType {
        return {
            ...super.toPlainObject(),
            farmAddress: this.farmAddress.bech32(),
            oldWrappedFarmToken: {
                tokenID: this.oldWrappedFarmToken.tokenID.toString(),
                tokenNonce: this.oldWrappedFarmToken.tokenNonce.toNumber(),
                amount: this.oldWrappedFarmToken.amount.toFixed(),
            },
            newWrappedFarmToken: {
                tokenID: this.newWrappedFarmToken.tokenID.toString(),
                tokenNonce: this.newWrappedFarmToken.tokenNonce.toNumber(),
                amount: this.newWrappedFarmToken.amount.toFixed(),
            },
            rewardToken: {
                tokenID: this.rewardToken.tokenID.toString(),
                tokenNonce: this.rewardToken.tokenNonce.toNumber(),
                amount: this.rewardToken.amount.toFixed(),
            },
            oldWrappedFarmAttributes: this.oldWrappedFarmAttributes.toPlainObject(),
            newWrappedFarmAttributes: this.newWrappedFarmAttributes.toPlainObject(),
            createdWithMerge: this.createdWithMerge,
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStructure = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(
            data,
            eventStructure,
        );
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('ClaimRewardsProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
            new StructFieldDefinition(
                'oldWrappedFarmToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'oldWrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'newWrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributesModel.getStructure(),
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
