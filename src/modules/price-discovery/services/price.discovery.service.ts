import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { Logger } from 'winston';
import { PriceDiscoveryModel } from '../models/price.discovery.model';
import { PriceDiscoveryGetterService } from './price.discovery.getter.service';

@Injectable()
export class PriceDiscoveryService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getPriceDiscoveryContracts(): PriceDiscoveryModel[] {
        const priceDiscoveryAddresses = scAddress.priceDiscovery;
        const priceDiscoveryContracts: PriceDiscoveryModel[] = [];

        for (const priceDiscoveryAddress of priceDiscoveryAddresses) {
            priceDiscoveryContracts.push(
                new PriceDiscoveryModel({ address: priceDiscoveryAddress }),
            );
        }
        return priceDiscoveryContracts;
    }

    async getPriceDiscoveryAddresByRedeemToken(
        tokenID: string,
    ): Promise<string | undefined> {
        const priceDiscoveryAddresses = scAddress.priceDiscovery;
        for (const address of priceDiscoveryAddresses) {
            const redeemTokenID = await this.priceDiscoveryGetter.getRedeemTokenID(
                address,
            );
            if (redeemTokenID === tokenID) {
                return address;
            }
        }
        return undefined;
    }
}
