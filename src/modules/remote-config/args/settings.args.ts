import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { SettingsCategoryEnum } from '../models/settings.model';

export class SettingsArgs {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    value: string;

    @IsEnum(SettingsCategoryEnum)
    category: SettingsCategoryEnum;
}
