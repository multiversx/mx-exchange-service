import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EnergyUpdateModel {
    @Field()
    address: string;

    constructor(init?: Partial<EnergyUpdateModel>) {
        Object.assign(this, init);
    }
}
