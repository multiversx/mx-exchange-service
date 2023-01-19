import { InitialLiquidityEvent } from '@multiversx/sdk-exchange';
import { Field } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { PriceDiscoveryEventModel } from './price.discovery.event.model';

export class InitialLiquidityEventModel extends PriceDiscoveryEventModel {
    @Field(() => GenericToken)
    lpToken: GenericToken;

    constructor(init?: Partial<InitialLiquidityEvent>) {
        super(init);

        Object.assign(this, init);
    }
}
