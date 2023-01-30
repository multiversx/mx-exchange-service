import { RedeemEvent } from '@multiversx/sdk-exchange';
import { Field } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { PriceDiscoveryEventModel } from './price.discovery.event.model';

export class RedeemEventModel extends PriceDiscoveryEventModel {
    @Field(() => GenericToken)
    redeemToken: GenericToken;
    @Field(() => GenericToken)
    lpToken: GenericToken;
    @Field(() => String)
    remainingLpTokens: BigNumber;
    @Field(() => String)
    totalLpTokensReceived: BigNumber;
    @Field(() => GenericToken)
    rewardsToken: GenericToken;

    constructor(init?: Partial<RedeemEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
