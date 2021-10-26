import {
    AddressType,
    BigUIntType,
    BooleanType,
    StructFieldDefinition,
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
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition('pairAddress', '', new AddressType()),
            new StructFieldDefinition(
                'firstTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('firstTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'firstTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'secondTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('secondTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'secondTokenAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'wrappedLpTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new StructFieldDefinition('wrappedLpTokenNonce', '', new U64Type()),
            new StructFieldDefinition(
                'wrappedLpTokenAmount',
                '',
                new BigUIntType(),
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
