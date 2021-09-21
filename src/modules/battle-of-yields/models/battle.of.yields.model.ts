import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BoYAccount } from './BoYAccount.model';

@ObjectType()
export class BattleOfYieldsModel {
    @Field()
    timestamp: string;
    @Field(type => [BoYAccount])
    leaderboard: BoYAccount[];

    constructor(init?: Partial<BattleOfYieldsModel>) {
        Object.assign(this, init);
    }
}
