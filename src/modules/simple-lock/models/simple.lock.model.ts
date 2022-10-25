import {
    EnumType,
    EnumVariantDefinition,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/enum';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';

export enum FarmType {
    SIMPLE_FARM,
    FARM_WITH_LOCKED_REWARDS,
}

registerEnumType(FarmType, { name: 'FarmType' });

export const FarmTypeEnumType = new EnumType('FarmType', [
    new EnumVariantDefinition('SimpleFarm', 0),
    new EnumVariantDefinition('FarmWithLockedRewards', 1),
]);

export enum SimpleLockType {
    BASE_TYPE,
    ENERGY_TYPE,
}

@ObjectType()
export class LockedTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    originalTokenID: string;
    @Field(() => Int)
    originalTokenNonce: number;
    @Field(() => Int)
    unlockEpoch: number;

    constructor(init?: Partial<LockedTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LpProxyTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    lpTokenID: string;
    @Field()
    firstTokenID: string;
    @Field(() => Int)
    firstTokenLockedNonce: number;
    @Field(() => LockedTokenAttributesModel, { nullable: true })
    firstTokenLockedAttributes: LockedTokenAttributesModel;
    @Field()
    secondTokenID: string;
    @Field(() => Int)
    secondTokenLockedNonce: number;
    @Field(() => LockedTokenAttributesModel, { nullable: true })
    secondTokenLockedAttributes: LockedTokenAttributesModel;

    constructor(init?: Partial<LpProxyTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class FarmProxyTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    farmType: string;
    @Field()
    farmTokenID: string;
    @Field(() => Int)
    farmTokenNonce: number;
    @Field()
    farmingTokenID: string;
    @Field(() => Int)
    farmingTokenLockedNonce: number;
    @Field(() => LpProxyTokenAttributesModel)
    farmingTokenAttributes: LpProxyTokenAttributesModel;
    @Field(() => FarmTokenAttributesModel)
    farmTokenAttributes: FarmTokenAttributesModel;

    constructor(init?: Partial<FarmProxyTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class SimpleLockModel {
    @Field()
    address: string;
    @Field()
    lockedToken: NftCollection;
    @Field()
    lpProxyToken: NftCollection;
    @Field()
    farmProxyToken: NftCollection;
    @Field(() => [String])
    intermediatedPairs: string[];
    @Field(() => [String])
    intermediatedFarms: string[];

    constructor(init?: Partial<SimpleLockModel>) {
        Object.assign(this, init);
    }
}
