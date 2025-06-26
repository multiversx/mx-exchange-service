import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { SettingsCategoryEnum } from '../models/settings.model';

@ArgsType()
export class SettingsArgs {
    @Field()
    @IsString()
    @IsNotEmpty()
    name: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    value: string;

    @Field(() => SettingsCategoryEnum)
    @IsEnum(SettingsCategoryEnum)
    category: SettingsCategoryEnum;
}
