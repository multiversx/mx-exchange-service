export class SettingsModel {
    name: string;
    value: string;
    category: SettingsCategoryEnum;
}

export enum SettingsCategoryEnum {
    SMART_SWAP = 'SMART_SWAP',
}
