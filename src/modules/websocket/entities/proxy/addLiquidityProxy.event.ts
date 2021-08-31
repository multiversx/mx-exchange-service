import {
    AddressType,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { PairProxyEvent } from './pairProxy.event';
import { AddLiquidityProxyEventType } from './pair.proxy.types';

export class AddLiquidityProxyEvent extends PairProxyEvent {
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        const decodedEvent = this.decodeEvent();
        Object.assign(this.decodeEvent);
        this.wrappedLpAttributes = WrappedLpTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedLpAttributes,
        );
    }

    toPlainObject(): AddLiquidityProxyEventType {
        return {
            ...super.toPlainObject(),
            createdWithMerge: this.createdWithMerge,
        };
    }

    getStructure(): StructType {
        return new StructType('AddLiquidityProxyEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('pairAddress', '', new AddressType()),
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
