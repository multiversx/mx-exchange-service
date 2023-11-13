import { EnumType, EnumVariantDefinition } from '@multiversx/sdk-core/out';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum StepsToPerform {
    ADD_LIQUIDITY,
    ENTER_FARM,
    ENTER_METASTAKING,
}

registerEnumType(StepsToPerform, {
    name: 'StepsToPerform',
});

export const StepsToPerformEnumType = new EnumType('StepsToPerform', [
    new EnumVariantDefinition('AddLiquidity', 0),
    new EnumVariantDefinition('EnterFarm', 1),
    new EnumVariantDefinition('EnterMetastaking', 2),
]);

@ObjectType()
export class PositionCreatorModel {
    @Field()
    address: string;

    constructor(init: Partial<PositionCreatorModel>) {
        Object.assign(this, init);
    }
}
