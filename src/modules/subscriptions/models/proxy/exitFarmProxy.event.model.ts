import { ExitFarmProxyEvent } from '@multiversx/sdk-exchange';
import { Address } from '@multiversx/sdk-core';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { WrappedFarmTokenAttributesModel } from 'src/modules/proxy/models/wrappedFarmTokenAttributes.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class ExitFarmProxyEventModel extends GenericEventModel {
    @Field(() => String)
    private farmAddress: Address;
    @Field(() => GenericToken)
    private wrappedFarmToken: GenericToken;
    @Field(() => WrappedFarmTokenAttributesModel)
    private wrappedFarmAttributes: WrappedFarmTokenAttributesModel;
    @Field(() => GenericToken)
    private farmingToken: GenericToken;
    @Field(() => GenericToken)
    private rewardToken: GenericToken;

    constructor(init?: Partial<ExitFarmProxyEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
