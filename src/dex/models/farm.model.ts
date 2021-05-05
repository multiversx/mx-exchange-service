import { Field, ObjectType } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class FarmModel {
    @Field()
    address: string;

    @Field(() => TokenModel)
    farmedToken: TokenModel;

    @Field()
    farmToken: TokenModel;

    @Field(type => [TokenModel], { nullable: true })
    acceptedTokens?: TokenModel[];

    @Field()
    state: string;
}
