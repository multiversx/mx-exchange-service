import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
} from '@elrondnetwork/erdjs/out';

export const FftTokenAmountPairStruct = (): StructType => {
    return new StructType('FftTokenAmountPair', [
        new StructFieldDefinition('tokenID', '', new TokenIdentifierType()),
        new StructFieldDefinition('amount', '', new BigUIntType()),
    ]);
};
