import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class ProxyModel {
    @Field()
    address: string;

    @Field()
    wrappedLpToken: TokenModel;

    @Field()
    wrappedFarmToken: TokenModel;

    @Field(type => [TokenModel])
    acceptedLockedTokens: TokenModel[];

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];
}
