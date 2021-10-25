import {
    AddressType,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { PairProxyEvent } from './pairProxy.event';
import { AddLiquidityProxyEventType } from './pair.proxy.types';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model

@ObjectType()
export class AddLiquidityProxyEvent extends PairProxyEvent {
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        const decodedEvent = this.decodeEvent();
        Object.assign(this.decodeEvent);
        this.wrappedLpAttributes = WrappedLpTokenAttributesModel.fromDecodedAttributes(
            decodedEvent.wrappedLpAttributes,
        );
    }

    toJSON(): AddLiquidityProxyEventType {
        return {
            ...super.toJSON(),
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
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition(
                'secondToken',
                '',
                GenericToken.getStructure(),
            ),
            new StructFieldDefinition(
                'wrappedLpToken',
                '',
                GenericToken.getStructure(),
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
