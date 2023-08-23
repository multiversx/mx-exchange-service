import { GovernanceEventTopics } from './governance.event.topics';
import { GenericEvent, RawEventType } from '@multiversx/sdk-exchange';
import { VoteType } from '../models/governance.proposal.model';

export enum GOVERNANCE_EVENTS {
    UP = "upVoteCast",
    DOWN = "downVoteCast",
    DOWN_VETO = "downVetoVoteCast",
    ABSTAIN = "abstainVoteCast",
}

export function convertToVoteType(event: GOVERNANCE_EVENTS | string): VoteType {
    switch(event) {
        case GOVERNANCE_EVENTS.UP:
            return VoteType.UpVote;
        case GOVERNANCE_EVENTS.DOWN:
            return VoteType.DownVote;
        case GOVERNANCE_EVENTS.DOWN_VETO:
            return VoteType.DownVetoVote;
        case GOVERNANCE_EVENTS.ABSTAIN:
            return VoteType.AbstainVote;
        default:
            return VoteType.NotVoted;
    }
}

export class VoteEvent extends GenericEvent {
    private decodedTopics: GovernanceEventTopics;
    protected decodedEvent: any;

    constructor(init: RawEventType) {
        super(init);

        this.decodedTopics = new GovernanceEventTopics(this.topics);
    }

    getTopics() {
        return this.decodedTopics.toJSON();
    }
}
