import { ArgsType, Field } from '@nestjs/graphql';
import { GovernanceType } from './energy.contract.model';

@ArgsType()
export class GovernanceContractsFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field(() => [String], { nullable: true })
    contracts: string;
    @Field({ nullable: true })
    type: GovernanceType;
}
