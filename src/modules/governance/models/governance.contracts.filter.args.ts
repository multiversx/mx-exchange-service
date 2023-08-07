import { ArgsType, Field } from '@nestjs/graphql';
import { GovernanceType } from 'src/utils/governance';

@ArgsType()
export class GovernanceContractsFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field(() => [String], { nullable: true })
    contracts: string;
    @Field({ nullable: true })
    type: GovernanceType;
}
