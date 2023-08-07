import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProposalVotes {
    @Field()
    upVotes: string;
    @Field()
    downVotes: string;
    @Field()
    downVetoVotes: string;
    @Field()
    abstainVotes: string;
    @Field()
    totalVotes: string;
    @Field()
    upPercentage: string;
    @Field()
    downPercentage: string;
    @Field()
    downVetoPercentage: string;
    @Field()
    abstainPercentage: string;
    @Field()
    quorum: string;

    constructor(init?: Partial<ProposalVotes>) {
        Object.assign(this, init);
    }

    static default(): ProposalVotes {
        return new ProposalVotes({
            upVotes: '0',
            downVotes: '0',
            downVetoVotes: '0',
            abstainVotes: '0',
            quorum: '0',
        });
    }
}
