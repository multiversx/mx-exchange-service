import {
    BigUIntType,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
} from '@elrondnetwork/erdjs/out';
import { Field } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { PriceDiscoveryEvent } from './price.discovery.event';
import { InitialLiquidityEventType } from './price.discovery.types';

export class InitialLiquidityEvent extends PriceDiscoveryEvent {
    @Field(() => GenericToken)
    lpToken: GenericToken;

    constructor(init?: Partial<PriceDiscoveryEvent>) {
        super(init);

        const decodedEvent = this.decodeEvent();

        this.lpToken = new GenericToken({
            tokenID: decodedEvent.lpTokenID.toString(),
            amount: decodedEvent.lpTokensReceived,
        });
    }

    toJSON(): InitialLiquidityEventType {
        return {
            ...super.toJSON(),
            lpToken: this.lpToken.toJSON(),
        };
    }

    getStructure(): StructType {
        return new StructType('InitialLiquidityEvent', [
            new FieldDefinition('lpTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('lpTokensReceived', '', new BigUIntType()),
        ]);
    }
}
