import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { PriceDiscoveryModel } from '../models/price.discovery.model';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class PriceDiscoveryService {
    constructor(
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly tokenService: TokenService,
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

    async getLaunchedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const launchedTokenID = await this.priceDiscoveryAbi.launchedTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenService.tokenMetadata(launchedTokenID);
    }

    async getAcceptedToken(priceDiscoveryAddress: string): Promise<EsdtToken> {
        const acceptedTokenID = await this.priceDiscoveryAbi.acceptedTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenService.tokenMetadata(acceptedTokenID);
    }

    async getRedeemToken(
        priceDiscoveryAddress: string,
    ): Promise<NftCollection> {
        const redeemTokenID = await this.priceDiscoveryAbi.redeemTokenID(
            priceDiscoveryAddress,
        );
        return this.tokenService.getNftCollectionMetadata(redeemTokenID);
    }

    async getLockingSC(
        priceDiscoveryAddress: string,
    ): Promise<SimpleLockModel> {
        const address = await this.priceDiscoveryAbi.lockingScAddress(
            priceDiscoveryAddress,
        );
        return new SimpleLockModel({ address });
    }

    async getPriceDiscoveryAddresByRedeemToken(
        tokenID: string,
    ): Promise<string | undefined> {
        const priceDiscoveryAddresses = scAddress.priceDiscovery;
        for (const address of priceDiscoveryAddresses) {
            const redeemTokenID = await this.priceDiscoveryAbi.redeemTokenID(
                address,
            );
            if (redeemTokenID === tokenID) {
                return address;
            }
        }
        return undefined;
    }
}
