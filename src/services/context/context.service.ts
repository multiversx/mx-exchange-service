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
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RouterService } from '../../modules/router/router.service';
import { PairMetadata } from '../../modules/router/models/pair.metadata.model';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { oneHour, oneSecond } from '../../helpers/helpers';
import { NftToken } from 'src/models/tokens/nftToken.model';

@Injectable()
export class ContextService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly routerService: RouterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

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

    isConnected(
        graph: Map<string, string[]>,
        input: string,
        output: string,
        discovered: Map<string, boolean>,
        path: string[] = [],
    ): boolean {
        discovered.set(input, true);
        path.push(input);

        if (input === output) {
            return true;
        }

        for (const vertex of graph.get(input)) {
            if (!discovered.get(vertex)) {
                if (this.isConnected(graph, vertex, output, discovered, path)) {
                    return true;
                }
            }
        }

        path.pop();
        return false;
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        const cacheKey = this.getContextCacheKey(tokenID);
        try {
            const getTokenMetadata = () =>
                this.apiService.getService().getESDTToken(tokenID);
            return this.cachingService.getOrSet(
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
            throw error;
        }
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getContextCacheKey(collection);
        try {
            const getNftCollectionMetadata = () =>
                this.apiService.getNftCollection(collection);
            return this.cachingService.getOrSet(
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
            throw error;
        }
    }

    async getNftMetadata(nftTokenID: string): Promise<NftToken> {
        const cacheKey = this.getContextCacheKey(nftTokenID);
        try {
            const getNftMetadata = () =>
                this.apiService.getService().getNFTToken(nftTokenID);
            return this.cachingService.getOrSet(
                cacheKey,
                getNftMetadata,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextService.name,
                this.getNftMetadata.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            console.log(error);
            throw error;
        }
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getContextCacheKey('currentEpoch');
        try {
            const getCurrentEpoch = async () =>
                (await this.apiService.getStats()).epoch;
            return this.cachingService.getOrSet(
                cacheKey,
                getCurrentEpoch,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextService.name,
                this.getCurrentEpoch.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            console.log(error);
            throw error;
        }
    }

    async getShardCurrentBlockNonce(shardID: number): Promise<number> {
        const cacheKey = this.getContextCacheKey('shardBlockNonce', shardID);
        try {
            const getCurrentBlockNonce = () =>
                this.apiService.getCurrentBlockNonce(shardID);
            return this.cachingService.getOrSet(
                cacheKey,
                getCurrentBlockNonce,
                oneSecond() * 6,
                oneHour() * 6,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ContextService.name,
                this.getShardCurrentBlockNonce.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            console.log(error);
            throw error;
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
