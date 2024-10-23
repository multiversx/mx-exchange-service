export class PriceDiscoveryMetadata {
    address: string;
    launchedTokenID: string;
    acceptedTokenID: string;

    constructor(init?: Partial<PriceDiscoveryMetadata>) {
        Object.assign(this, init);
    }
}
