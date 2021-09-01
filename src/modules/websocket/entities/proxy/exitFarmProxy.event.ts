import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { GenericTokenAmountPairType } from '../generic.types';
import { ExitFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

export class ExitFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    private farmAddress: Address;
    private wrappedFarmToken: GenericTokenAmountPairType;
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    private farmingToken: GenericTokenAmountPairType;
    private rewardToken: GenericTokenAmountPairType;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.wrappedFarmAttributes = WrappedFarmTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedFarmAttributes,
        );
    }

    toPlainObject(): ExitFarmProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress.bech32(),
            wrappedFarmToken: {
                tokenID: this.wrappedFarmToken.tokenID.toString(),
                tokenNonce: this.wrappedFarmToken.tokenNonce.toNumber(),
                amount: this.wrappedFarmToken.amount.toFixed(),
            },
            wrappedFarmAttributes: this.wrappedFarmAttributes.toPlainObject(),
            farmingToken: {
                tokenID: this.farmingToken.tokenID.toString(),
                tokenNonce: this.farmingToken.tokenNonce.toNumber(),
                amount: this.farmingToken.amount.toFixed(),
            },
            rewardToken: {
                tokenID: this.rewardToken.tokenID.toString(),
                tokenNonce: this.rewardToken.tokenNonce.toNumber(),
                amount: this.rewardToken.amount.toFixed(),
            },
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
        return new StructType('ExitFarmProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('farmAddress', '', new AddressType()),
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
                'farmingToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'rewardToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
