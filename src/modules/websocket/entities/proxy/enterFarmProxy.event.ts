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
import { EnterFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

export class EnterFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    private farmAddress: Address;
    private farmingToken: GenericTokenAmountPairType;
    private wrappedFarmToken: GenericTokenAmountPairType;
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.wrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedFarmAttributes,
        );
    }

    toPlainObject(): EnterFarmProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.bech32(),
            farmingToken: {
                tokenID: this.farmingToken.tokenID.toString(),
                tokenNonce: this.farmingToken.tokenNonce.toNumber(),
                amount: this.farmingToken.amount.toFixed(),
            },
            wrappedFarmToken: {
                tokenID: this.wrappedFarmToken.tokenID.toString(),
                tokenNonce: this.wrappedFarmToken.tokenNonce.toNumber(),
                amount: this.wrappedFarmToken.amount.toFixed(),
            },
            wrappedFarmAttributes: this.wrappedFarmAttributes.toPlainObject(),
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
        return new StructType('EnterFarmProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
            new StructFieldDefinition(
                'farmingToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'wrappedFarmToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'wrappedFarmAttributes',
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
