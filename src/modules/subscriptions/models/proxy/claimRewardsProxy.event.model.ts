import { ClaimRewardsProxyEvent } from '@multiversx/sdk-exchange';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { RewardsProxyEventModel } from './rewardsProxy.event.model';

@ObjectType()
export class ClaimRewardsProxyEventModel extends RewardsProxyEventModel {
    @Field(() => GenericToken)
    private rewardToken: GenericToken;

    constructor(init?: Partial<ClaimRewardsProxyEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
