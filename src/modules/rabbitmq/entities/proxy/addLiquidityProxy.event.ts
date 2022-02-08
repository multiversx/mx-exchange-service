import {
    AddressType,
    BigUIntType,
    BooleanType,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEvent } from '../generic.event';
import { PairProxyEvent } from './pairProxy.event';
import { AddLiquidityProxyEventType } from './pair.proxy.types';
import { Field, ObjectType } from '@nestjs/graphql';

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
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('pairAddress', '', new AddressType()),
            new FieldDefinition('firstTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('firstTokenNonce', '', new U64Type()),
            new FieldDefinition('firstTokenAmount', '', new BigUIntType()),
            new FieldDefinition('secondTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('secondTokenNonce', '', new U64Type()),
            new FieldDefinition('secondTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'wrappedLpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('wrappedLpTokenNonce', '', new U64Type()),
            new FieldDefinition('wrappedLpTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'wrappedLpAttributes',
                '',
                WrappedLpTokenAttributesModel.getStructure(),
            ),
            new FieldDefinition('createdWithMerge', '', new BooleanType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
