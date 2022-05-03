import { CreatePairEvent } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import { GenericEventModel } from '../generic.event.model';

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
