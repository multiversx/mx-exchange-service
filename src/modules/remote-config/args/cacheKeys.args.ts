import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class CacheKeysArgs {
    @Field(() => [String])
    keys: string[];
}
