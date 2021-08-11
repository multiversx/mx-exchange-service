import { Inject, Injectable } from '@nestjs/common';
import { elrondConfig } from '../../config';
import { TypedValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import {
    SmartContract,
    GasLimit,
    ContractFunction,
} from '@elrondnetwork/erdjs';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { TransactionModel } from '../../models/transaction.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RouterService } from '../../modules/router/router.service';
import { PairMetadata } from '../../modules/router/models/pair.metadata.model';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { oneHour } from '../../helpers/helpers';

@Injectable()
export class ContextService {
    private redisClient: Redis.Redis;

    constructor(
        private readonly apiService: ElrondApiService,
        private readonly routerService: RouterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.cachingService.getClient();
    }

    async getAllPairsAddress(): Promise<string[]> {
        return this.routerService.getAllPairsAddress();
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return this.routerService.getPairsMetadata();
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.routerService.getPairsMetadata();
        const pair = pairs.find(pair => pair.address === pairAddress);

        return pair;
    }

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        const pairsMetadata = await this.routerService.getPairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return pair;
            }
        }
        return;
    }

    async getPairsMap(): Promise<Map<string, string[]>> {
        const pairsMetadata = await this.routerService.getPairsMetadata();
        const pairsMap = new Map<string, string[]>();
        for (const pairMetadata of pairsMetadata) {
            pairsMap.set(pairMetadata.firstTokenID, []);
            pairsMap.set(pairMetadata.secondTokenID, []);
        }

        pairsMetadata.forEach(pair => {
            pairsMap.get(pair.firstTokenID).push(pair.secondTokenID);
            pairsMap.get(pair.secondTokenID).push(pair.firstTokenID);
        });

        return pairsMap;
    }

    async getPath(input: string, output: string): Promise<string[]> {
        const path = [input];
        const queue = [input];
        const visited = new Map<string, boolean>();

        const pairsMap = await this.getPairsMap();
        for (const key of pairsMap.keys()) {
            visited.set(key, false);
        }

        visited.set(input, true);
        while (queue.length > 0) {
            const node = queue.shift();
            const adjacentVertices = pairsMap.get(node);
            if (!adjacentVertices) {
                return [];
            }
            for (const value of adjacentVertices) {
                if (value === output) {
                    path.push(output);
                    return path;
                }

                if (!visited.get(value)) {
                    visited.set(value, true);
                    queue.push(value);
                    path.push(value);
                }
            }
        }

        return [];
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        const cacheKey = this.getContextCacheKey(tokenID);
        try {
            const getTokenMetadata = () =>
                this.apiService.getService().getESDTToken(tokenID);
            return this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                getTokenMetadata,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextService.name,
                this.getTokenMetadata.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getContextCacheKey(collection);
        try {
            const getNftCollectionMetadata = () =>
                this.apiService.getNftCollection(collection);
            return this.cachingService.getOrSet(
                this.redisClient,
                cacheKey,
                getNftCollectionMetadata,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextService.name,
                this.getTokenMetadata.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    esdtTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const transaction = contract.call({
            func: new ContractFunction('ESDTTransfer'),
            args: args,
            gasLimit: gasLimit,
        });
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    nftTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const transaction = contract.call({
            func: new ContractFunction('ESDTNFTTransfer'),
            args: args,
            gasLimit: gasLimit,
        });

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
