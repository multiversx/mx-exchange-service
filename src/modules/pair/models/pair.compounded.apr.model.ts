import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PairCompoundedAPRModel {
    @Field({ nullable: true })
    feesAPR: string;

    @Field({ nullable: true })
    farmBaseAPR: string;

    @Field({ nullable: true })
    farmBoostedAPR: string;

    @Field({ nullable: true })
    dualFarmAPR: string;

    @Field({ nullable: true })
    dualFarmBoostedAPR: string;

    constructor(init?: Partial<PairCompoundedAPRModel>) {
        Object.assign(this, init);
    }
}
