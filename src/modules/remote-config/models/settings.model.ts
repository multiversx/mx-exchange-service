import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class SettingsModel {
    @Field()
    name: string;
    @Field()
    value: string;
    @Field(() => SettingsCategoryEnum)
    category: SettingsCategoryEnum;
}

export enum SettingsCategoryEnum {
    SMART_SWAP = 'SMART_SWAP',
}
registerEnumType(SettingsCategoryEnum, { name: 'SettingsCategory' });
