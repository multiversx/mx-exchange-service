import { Field, ObjectType } from '@nestjs/graphql';
import { StakingTokenAttributesModel } from 'src/modules/staking/models/stakingTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class StakeFarmToken extends NftToken {
    @Field(() => StakingTokenAttributesModel)
    decodedAttributes: StakingTokenAttributesModel;
}
