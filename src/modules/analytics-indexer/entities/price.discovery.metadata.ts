import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

export class PriceDiscoveryMetadata {
    address: string;
    launchedToken: EsdtToken;
    acceptedToken: EsdtToken;

    constructor(init?: Partial<PriceDiscoveryMetadata>) {
        Object.assign(this, init);
    }
}
