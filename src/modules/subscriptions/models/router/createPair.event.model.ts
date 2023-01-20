import { Field, ObjectType } from '@nestjs/graphql';
import { GenericEventModel } from '../generic.event.model';
import { CreatePairEvent } from '@multiversx/sdk-exchange';

@ObjectType()
export class CreatePairEventModel extends GenericEventModel {
    @Field()
    private firstTokenID: string;
    @Field()
    private secondTokenID: string;
    @Field()
    private totalFeePercent: number;
    @Field()
    private specialFeePercent: number;

    constructor(init?: Partial<CreatePairEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
