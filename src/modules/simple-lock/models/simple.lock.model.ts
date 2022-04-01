import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SimpleLockModel {
    @Field()
    address: string;
    @Field()
    lockedTokenID: string;
    @Field()
    lpProxyTokenID: string;

    constructor(init?: Partial<SimpleLockModel>) {
        Object.assign(this, init);
    }
}
