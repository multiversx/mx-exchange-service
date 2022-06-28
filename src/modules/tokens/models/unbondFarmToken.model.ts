import { Field, ObjectType } from '@nestjs/graphql';
import { UnbondTokenAttributesModel } from 'src/modules/staking/models/stakingTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class UnbondFarmToken extends NftToken {
    @Field(() => UnbondTokenAttributesModel)
    decodedAttributes: UnbondTokenAttributesModel;
}
