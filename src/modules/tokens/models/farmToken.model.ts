import { Field, ObjectType } from '@nestjs/graphql';
import { FarmTokenAttributesUnion } from 'src/modules/farm/models/farmTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class FarmToken extends NftToken {
    @Field(() => FarmTokenAttributesUnion)
    decodedAttributes: typeof FarmTokenAttributesUnion;
}
