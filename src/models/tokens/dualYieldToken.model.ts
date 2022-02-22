import { Field, ObjectType } from '@nestjs/graphql';
import { DualYieldTokenAttributesModel } from 'src/modules/staking-proxy/models/dualYieldTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class DualYieldToken extends NftToken {
    @Field(() => DualYieldTokenAttributesModel)
    decodedAttributes: DualYieldTokenAttributesModel;
}
