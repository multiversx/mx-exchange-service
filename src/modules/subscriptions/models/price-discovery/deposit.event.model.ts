import { DepositEvent } from '@multiversx/sdk-exchange';
import { Field } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { GenericToken } from 'src/models/genericToken.model';
import { PhaseModel } from 'src/modules/price-discovery/models/price.discovery.model';
import { PriceDiscoveryEventModel } from './price.discovery.event.model';

export class DepositEventModel extends PriceDiscoveryEventModel {
    @Field(() => GenericToken)
    token: GenericToken;
    @Field(() => GenericToken)
    redeemToken: GenericToken;
    @Field(() => String)
    launchedTokenAmount: BigNumber;
    @Field(() => String)
    acceptedTokenAmount: BigNumber;
    @Field(() => String)
    launchedTokenPrice: BigNumber;
    @Field(() => PhaseModel)
    currentPhase: PhaseModel;

    constructor(init?: Partial<DepositEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
