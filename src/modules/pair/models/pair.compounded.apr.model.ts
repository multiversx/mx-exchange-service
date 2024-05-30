import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PairCompoundedAPRModel {
    @Field()
    address: string;

    @Field({ nullable: true })
    feesAPR: string;

    @Field({ nullable: true })
    farmBaseAPR: string;

    @Field({ nullable: true })
    farmBoostedAPR: string;

    @Field({ nullable: true })
    dualFarmBaseAPR: string;

    @Field({ nullable: true })
    dualFarmBoostedAPR: string;

    constructor(init?: Partial<PairCompoundedAPRModel>) {
        Object.assign(this, init);
    }
}
