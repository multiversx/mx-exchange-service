import { FactoryModel } from '../models/factory.model';
import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { PairModel } from '../../pair/models/pair.model';
import { PairMetadata } from '../models/pair.metadata.model';
import { PairFilterArgs } from '../models/filter.args';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from './router.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class RouterService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.routerAbi.pairsMetadata();
        return pairs.find((pair) => pair.address === pairAddress);
    }

    async getAllPairs(
        offset: number,
        limit: number,
        pairFilter: PairFilterArgs,
    ): Promise<PairModel[]> {
        let pairsMetadata = await this.routerAbi.pairsMetadata();
        if (pairFilter.issuedLpToken) {
            pairsMetadata = await this.pairsByIssuedLpToken(pairsMetadata);
        }

        pairsMetadata = this.filterPairsByAddress(pairFilter, pairsMetadata);
        pairsMetadata = this.filterPairsByTokens(pairFilter, pairsMetadata);
        pairsMetadata = await this.filterPairsByState(
            pairFilter,
            pairsMetadata,
        );

        return pairsMetadata
            .map(
                (pairMetadata) =>
                    new PairModel({
                        address: pairMetadata.address,
                    }),
            )
            .slice(offset, limit);
    }

    private filterPairsByAddress(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.address === pair.address,
            );
        }
        return pairsMetadata;
    }

    private filterPairsByTokens(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.firstTokenID) {
            if (pairFilter.secondTokenID) {
                pairsMetadata = pairsMetadata.filter(
                    (pair) =>
                        (pairFilter.firstTokenID === pair.firstTokenID &&
                            pairFilter.secondTokenID === pair.secondTokenID) ||
                        (pairFilter.firstTokenID === pair.secondTokenID &&
                            pairFilter.secondTokenID === pair.firstTokenID),
                );
            } else {
                pairsMetadata = pairsMetadata.filter(
                    (pair) => pairFilter.firstTokenID === pair.firstTokenID,
                );
            }
        } else if (pairFilter.secondTokenID) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.secondTokenID === pair.secondTokenID,
            );
        }
        return pairsMetadata;
    }

    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneSecond() * 30,
        localTtl: Constants.oneSecond() * 6,
    })
    private async pairsByIssuedLpToken(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        return await this.filterPairsByIssuedLpTokenRaw(pairsMetadata);
    }

    private async filterPairsByIssuedLpTokenRaw(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairAbi.lpTokenID(pairMetadata.address),
        );
        const lpTokensIDs = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < lpTokensIDs.length; index++) {
            if (
                lpTokensIDs[index] === undefined ||
                lpTokensIDs[index] === 'undefined' ||
                lpTokensIDs[index] === ''
            ) {
                continue;
            }
            filteredPairsMetadata.push(pairsMetadata[index]);
        }

        return filteredPairsMetadata;
    }

    private async filterPairsByState(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state) {
            return pairsMetadata;
        }

        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairAbi.state(pairMetadata.address),
        );
        const pairsStates = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < pairsStates.length; index++) {
            if (pairsStates[index] === pairFilter.state) {
                filteredPairsMetadata.push(pairsMetadata[index]);
            }
        }

        return filteredPairsMetadata;
    }

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }
}
