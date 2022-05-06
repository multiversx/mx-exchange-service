import { SwapFixedInputEvent } from '@elrondnetwork/erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class SwapFixedInputEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    private tokenIn: GenericToken;
    @Field(() => GenericToken)
    private tokenOut: GenericToken;
    @Field(() => String)
    feeAmount: BigNumber;
    @Field(() => String)
    tokenInReserves: BigNumber;
    @Field(() => String)
    tokenOutReserves: BigNumber;

    constructor(init?: Partial<SwapFixedInputEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
