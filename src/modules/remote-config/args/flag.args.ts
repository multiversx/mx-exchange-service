import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class FlagArgs {
    @Field()
    name: string;
    @Field()
    value: boolean;
}
