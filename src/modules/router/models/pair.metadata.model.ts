import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PairMetadata {
    @Field()
    address: string;
    @Field()
    firstTokenID: string;
    @Field()
    secondTokenID: string;

    constructor(init?: Partial<PairMetadata>) {
        Object.assign(this, init);
    }
}
