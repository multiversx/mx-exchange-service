import {
    AddressType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { GenericTokenAmountPairType } from '../generic.types';
import { PairProxyEventType } from './pair.proxy.types';
import { PairProxyTopics } from './proxy.event.topics';

export class PairProxyEvent extends GenericEvent {
    protected decodedTopics: PairProxyTopics;

    protected firstToken: GenericTokenAmountPairType;
    protected secondToken: GenericTokenAmountPairType;
    protected wrappedLpToken: GenericTokenAmountPairType;
    protected wrappedLpAttributes: WrappedLpTokenAttributesModel;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.wrappedLpAttributes = WrappedLpTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedLpAttributes,
        );
    }

    toPlainObject(): PairProxyEventType {
        return {
            ...super.toPlainObject(),
            firstToken: {
                tokenID: this.firstToken.tokenID.toString(),
                tokenNonce: this.firstToken.tokenNonce.toNumber(),
                amount: this.firstToken.amount.toFixed(),
            },
            secondToken: {
                tokenID: this.secondToken.tokenID.toString(),
                tokenNonce: this.secondToken.tokenNonce.toNumber(),
                amount: this.secondToken.amount.toFixed(),
            },
            wrappedLpToken: {
                tokenID: this.wrappedLpToken.tokenID.toString(),
                tokenNonce: this.wrappedLpToken.tokenNonce.toNumber(),
                amount: this.wrappedLpToken.amount.toFixed(),
            },
            wrappedLpAttributes: this.wrappedLpAttributes.toPlainObject(),
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
        return new StructType('RemoveLiquidityProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('pairAddress', '', new AddressType()),
            new StructFieldDefinition(
                'wrappedLpToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'wrappedLpAttributes',
                '',
                WrappedLpTokenAttributesModel.getStructure(),
            ),
            new StructFieldDefinition(
                'firstToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'secondToken',
                '',
                GenericTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
