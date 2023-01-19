import { PairProxyEventModel } from './pairProxy.event.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { AddLiquidityProxyEvent } from '@multiversx/sdk-exchange';

@ObjectType()
export class AddLiquidityProxyEventModel extends PairProxyEventModel {
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<AddLiquidityProxyEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
