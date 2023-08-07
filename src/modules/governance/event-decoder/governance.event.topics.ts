import { Address } from '@multiversx/sdk-core/out';
import BigNumber from 'bignumber.js';

export class GovernanceEventTopics {
    readonly eventName: string;
    readonly voter: Address;
    readonly proposalId: number;
    readonly nrVotes: string;
    readonly quorumUsed: string;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.voter = new Address(Buffer.from(rawTopics[1], 'base64'));
        this.proposalId = parseInt(
            Buffer.from(rawTopics[2], 'base64').toString('hex'),
            16,
        );
        this.nrVotes = new BigNumber(
            Buffer.from(rawTopics[3], 'base64').toString('hex'),
            16,
        ).toFixed();
        this.quorumUsed = new BigNumber(
            Buffer.from(rawTopics[4], 'base64').toString('hex'),
            16,
        ).toFixed();
    }

    toJSON() {
        return {
            eventName: this.eventName,
            voter: this.voter.bech32(),
            proposalId: this.proposalId,
            nrVotes: this.nrVotes,
            quorumUsed: this.quorumUsed,
        };
    }
}
