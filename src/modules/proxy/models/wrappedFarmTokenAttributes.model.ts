import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../../farm/models/farmTokenAttributes.model';

@ObjectType()
export class WrappedFarmTokenAttributesModel {
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field()
    farmTokenID: string;
    @Field(() => Int)
    farmTokenNonce: number;
    @Field()
    farmTokenAmount: string;
    @Field()
    farmTokenIdentifier: string;
    @Field(() => FarmTokenAttributesModel)
    farmTokenAttributes: FarmTokenAttributesModel;
    @Field()
    farmingTokenID: string;
    @Field(() => Int)
    farmingTokenNonce: number;
    @Field()
    farmingTokenAmount: string;

    constructor(init?: Partial<WrappedFarmTokenAttributesModel>) {
        Object.assign(this, init);
    }
}
