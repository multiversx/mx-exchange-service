import { Injectable } from '@nestjs/common';
import { GovernanceDescriptionUnion } from '../models/governance.union';
import { Description_v0, Description_v1 } from '../models/governance.proposal.model';


@Injectable()
export class GovernanceDescriptionService {
    getGovernanceDescription(descriptionJson: string): typeof GovernanceDescriptionUnion {
        const description = JSON.parse(descriptionJson);
        switch (description.version) {
            case 0:
                return new Description_v0(description);
            case 1:
                return new Description_v1(description);
            default:
                throw new Error(`Unknown description version: ${description.version}`);
        }
    }
}
