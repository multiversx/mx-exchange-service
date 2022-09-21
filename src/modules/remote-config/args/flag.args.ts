import { ArgsType, Field } from '@nestjs/graphql';
import { FlagType } from '../models/flag.model';

@ArgsType()
export class FlagArgs {
    @Field(() => FlagType)
    name: FlagType;
    @Field()
    value: boolean;
}
