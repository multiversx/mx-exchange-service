import { AddLiquidityEvent } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class AddLiquidityEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    private firstToken: GenericToken;
    @Field(() => GenericToken)
    private secondToken: GenericToken;
    @Field(() => GenericToken)
    private liquidityPoolToken: GenericToken;
    @Field(() => String)
    private liquidityPoolSupply: BigNumber;
    @Field(() => String)
    private firstTokenReserves: BigNumber;
    @Field(() => String)
    private secondTokenReserves: BigNumber;

    constructor(init?: Partial<AddLiquidityEvent>) {
        console.log(init);
        super(init);
        Object.assign(this, init);
    }
}
