import { PairProxyEvent } from '@multiversx/sdk-exchange';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericToken } from 'src/models/genericToken.model';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { GenericEventModel } from '../generic.event.model';

@ObjectType()
export class PairProxyEventModel extends GenericEventModel {
    @Field(() => GenericToken)
    protected firstToken: GenericToken;
    @Field(() => GenericToken)
    protected secondToken: GenericToken;
    @Field(() => GenericToken)
    protected wrappedLpToken: GenericToken;
    @Field(() => WrappedLpTokenAttributesModel)
    protected wrappedLpAttributes: WrappedLpTokenAttributesModel;

    constructor(init?: Partial<PairProxyEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
