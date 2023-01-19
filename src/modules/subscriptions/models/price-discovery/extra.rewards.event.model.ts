import { ExtraRewardsEvent } from '@multiversx/sdk-exchange';
import { Field } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { PriceDiscoveryEventModel } from './price.discovery.event.model';

export class ExtraRewardsEventModel extends PriceDiscoveryEventModel {
    @Field(() => GenericToken)
    rewardsToken: GenericToken;

    constructor(init?: Partial<ExtraRewardsEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
