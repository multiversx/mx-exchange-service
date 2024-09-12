import { EnergyType } from '@multiversx/sdk-exchange';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum UnlockType {
    TERM_UNLOCK,
    EARLY_UNLOCK,
    REDUCE_PERIOD,
}

registerEnumType(UnlockType, {
    name: 'UnlockType',
});

@ObjectType()
export class EnergyModel {
    @Field()
    amount: string;
    @Field(() => Int)
    lastUpdateEpoch: number;
    @Field()
    totalLockedTokens: string;

    constructor(init?: Partial<EnergyType>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UserEnergyModel extends EnergyModel {
    @Field(() => String)
    league: string;

    constructor(init?: Partial<UserEnergyModel>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class LeagueModel {
    @Field()
    name: string;
    @Field()
    minEnergy: string;
    @Field()
    maxEnergy: string;

    constructor(init?: Partial<LeagueModel>) {
        Object.assign(this, init);
    }
}
