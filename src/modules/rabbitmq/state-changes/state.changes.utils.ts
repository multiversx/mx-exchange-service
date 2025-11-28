import {
    BigUIntType,
    BinaryCodec,
    EnumType,
    EnumVariantDefinition,
    TokenIdentifierType,
    TokenIdentifierValue,
    U64Type,
} from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { TrackedPairFields } from 'src/modules/persistence/entities';

type PairStorageDecoder<T> = {
    outputField: TrackedPairFields;
    decode: (value: Buffer) => T;
};

const ENUM_TYPES: Record<string, EnumType> = {
    state: new EnumType('State', [
        new EnumVariantDefinition('Inactive', 0),
        new EnumVariantDefinition('Active', 1),
        new EnumVariantDefinition('PartialActive', 2),
    ]),
};

const PAIR_RESERVE_PREFIX = Buffer.from('reserve').toString('hex');
const LP_TOKEN_SUPPLY_KEY = Buffer.from('lp_token_supply').toString('hex');
const LP_TOKEN_ID_KEY = Buffer.from('lpTokenIdentifier').toString('hex');
const STATE_KEY = Buffer.from('state').toString('hex');
const TOTAL_FEE_PERCENT_KEY = Buffer.from('total_fee_percent').toString('hex');
const SPECIAL_FEE_PERCENT_KEY = Buffer.from('special_fee_percent').toString(
    'hex',
);

export const getPairDecoders = (
    pair: PairModel,
): Record<string, PairStorageDecoder<any>> => {
    const codec = new BinaryCodec();

    const keyFirstTokenReserves =
        PAIR_RESERVE_PREFIX +
        codec
            .encodeNested(new TokenIdentifierValue(pair.firstTokenId))
            .toString('hex');
    const keySecondTokenReserves =
        PAIR_RESERVE_PREFIX +
        codec
            .encodeNested(new TokenIdentifierValue(pair.secondTokenId))
            .toString('hex');

    const storageToFieldMap: Record<string, PairStorageDecoder<any>> = {
        [keyFirstTokenReserves]: {
            outputField: TrackedPairFields.firstTokenReserve,
            decode: decodeBigUIntType,
        },
        [keySecondTokenReserves]: {
            outputField: TrackedPairFields.secondTokenReserve,
            decode: decodeBigUIntType,
        },
        [LP_TOKEN_SUPPLY_KEY]: {
            outputField: TrackedPairFields.totalSupply,
            decode: decodeBigUIntType,
        },
        [STATE_KEY]: {
            outputField: TrackedPairFields.state,
            decode: (value) => decodeEnumType(value, ENUM_TYPES.state),
        },
        [TOTAL_FEE_PERCENT_KEY]: {
            outputField: TrackedPairFields.totalFeePercent,
            decode: (value) => {
                const raw = decodeU64Type(value);
                return new BigNumber(raw)
                    .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                    .toNumber();
            },
        },
        [SPECIAL_FEE_PERCENT_KEY]: {
            outputField: TrackedPairFields.specialFeePercent,
            decode: (value) => {
                const raw = decodeU64Type(value);
                return new BigNumber(raw)
                    .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                    .toNumber();
            },
        },
        [LP_TOKEN_ID_KEY]: {
            outputField: TrackedPairFields.lpTokenID,
            decode: decodeTokenIdentifierType,
        },
    };

    return storageToFieldMap;
};

const decodeBigUIntType = (value: Buffer): string => {
    return new BinaryCodec()
        .decodeTopLevel(value, new BigUIntType())
        .valueOf()
        .toFixed();
};

const decodeU64Type = (value: Buffer): number => {
    return new BinaryCodec()
        .decodeTopLevel(value, new U64Type())
        .valueOf()
        .toNumber();
};

const decodeTokenIdentifierType = (value: Buffer): string => {
    return new BinaryCodec()
        .decodeTopLevel(value, new TokenIdentifierType())
        .valueOf()
        .toString();
};

const decodeEnumType = (value: Buffer, enumType: EnumType): string => {
    return new BinaryCodec().decodeTopLevel(value, enumType).valueOf().name;
};
