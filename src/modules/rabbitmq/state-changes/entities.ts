import { EnumType, EnumVariantDefinition } from '@multiversx/sdk-core/out';

export const PAIR_RESERVE_PREFIX = Buffer.from('reserve').toString('hex');

export enum PAIR_FIELDS {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
    state = 'state',
    totalFeePercent = 'totalFeePercent',
    specialFeePercent = 'specialFeePercent',
    lpTokenID = 'lpTokenID',
}

export const enum PAIR_ENUMS {
    state = 'state',
}

export const ENUM_TYPES: Record<PAIR_ENUMS, EnumType> = {
    state: new EnumType('State', [
        new EnumVariantDefinition('Inactive', 0),
        new EnumVariantDefinition('Active', 1),
        new EnumVariantDefinition('PartialActive', 2),
    ]),
};

export type PairStorageDecoder<T> = {
    outputField: PAIR_FIELDS;
    decode: (value: Uint8Array) => T;
};

export type PairStateChanges = Partial<Record<PAIR_FIELDS, any>>;
