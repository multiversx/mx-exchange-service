import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProposalVotes {
    @Field()
    upVotes: number;
    @Field()
    downVotes: number;
    @Field()
    downVetoVotes: number;
    @Field()
    abstainVotes: number;
    @Field()
    quorum: string;

    constructor(init?: Partial<ProposalVotes>) {
        Object.assign(this, init);
    }

    static default(): ProposalVotes {
        return new ProposalVotes({
            upVotes: 0,
            downVotes: 0,
            downVetoVotes: 0,
            abstainVotes: 0,
            quorum: '0',
        });
    }
}
