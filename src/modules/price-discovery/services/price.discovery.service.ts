import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { Logger } from 'winston';
import { PriceDiscoveryModel } from '../models/price.discovery.model';

@Injectable()
export class PriceDiscoveryService {
    constructor(
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
}
