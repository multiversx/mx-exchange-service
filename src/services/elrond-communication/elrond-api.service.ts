import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
import { Inject, Injectable } from '@nestjs/common';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import Agent, { HttpOptions, HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { MetricsCollector } from '../../utils/metrics.collector';
import { Stats } from '../../models/stats.model';

@Injectable()
export class ElrondApiService {
    private apiProvider: ApiProvider;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions: HttpOptions = {
            keepAlive: elrondConfig.keepAlive,
            maxSockets: Infinity,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: elrondConfig.keepAliveTimeout,
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.apiProvider = new ApiProvider(process.env.ELRONDAPI_URL, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        });
    }

    getService(): ApiProvider {
        return this.apiProvider;
    }

    async doGetGeneric(
        name: string,
        resourceUrl: string,
        callback: (response: any) => any,
    ): Promise<any> {
        const profiler = new PerformanceProfiler(`${name} ${resourceUrl}`);

        const response = await this.getService().doGetGeneric(
            resourceUrl,
            callback,
        );

        profiler.stop();

        MetricsCollector.setExternalCall(
            ElrondApiService.name,
            name,
            profiler.duration,
        );

        return response;
    }

    async getStats(): Promise<Stats> {
        try {
            const stats = await this.doGetGeneric(
                this.getStats.name,
                'stats',
                resonse => resonse,
            );
            return new Stats(stats);
        } catch (error) {
            this.logger.error('An error occurred while get stats', {
                path: 'ElrondApiService.getStats',
                error,
            });
            throw error;
        }
    }

    async getAccountStats(address: string): Promise<any | undefined> {
        try {
            const account = await this.doGetGeneric(
                this.getAccountStats.name,
                `accounts/${address}`,
                response => response,
            );
            return account;
        } catch (error) {
            this.logger.error(
                `An error occured while get account stats ${address}`,
                {
                    path: `${ElrondApiService.name}.${this.getAccountStats.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getNftCollection(tokenID: string): Promise<NftCollection> {
        try {
            return this.doGetGeneric(
                this.getNftCollection.name,
                `collections/${tokenID}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get nft collection ${tokenID}`,
                {
                    path: `${ElrondApiService.name}.${this.getNftCollection.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getTokensCountForUser(address: string): Promise<number> {
        try {
            return this.doGetGeneric(
                this.getTokensCountForUser.name,
                `accounts/${address}/tokens/count`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get tokens count for user ${address}`,
                {
                    path: `${ElrondApiService.name}.${this.getTokensCountForUser.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getNftsCountForUser(address: string): Promise<number> {
        try {
            return this.doGetGeneric(
                this.getNftsCountForUser.name,
                `accounts/${address}/nfts/count`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get nfts count for user ${address}`,
                {
                    path: `${ElrondApiService.name}.${this.getNftsCountForUser.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getTokensForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<EsdtToken[]> {
        try {
            return this.doGetGeneric(
                this.getTokensForUser.name,
                `accounts/${address}/tokens?from=${from}&size=${size}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get tokens for user ${address}`,
                {
                    path: `${ElrondApiService.name}.${this.getTokensForUser.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<NftToken[]> {
        try {
            return this.doGetGeneric(
                this.getNftsForUser.name,
                `accounts/${address}/nfts?from=${from}&size=${size}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get nfts for user ${address}`,
                {
                    path: `${ElrondApiService.name}.${this.getNftsForUser.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        try {
            return await this.doGetGeneric(
                this.getNftByTokenIdentifier.name,
                `accounts/${address}/nfts/${nftIdentifier}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                'An error occurred while get nft by token identifier',
                {
                    path: 'ElrondApiService.getNftTokenIdentifier',
                    error,
                },
            );
            throw error;
        }
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        try {
            return this.doGetGeneric(
                this.getCurrentNonce.name,
                `network/status/${shardId}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(`An error occured while get current nonce`, {
                path: `${ElrondApiService.name}.${this.getCurrentNonce.name}`,
                error,
            });
            throw error;
        }
    }

    async getCurrentBlockNonce(shardId: number): Promise<number> {
        return this.doGetGeneric(
            this.getCurrentNonce.name,
            `blocks/count?shard=${shardId}`,
            response => response,
        );
    }

    async getHyperblockByNonce(nonce: number): Promise<any> {
        try {
            return this.doGetGeneric(
                this.getHyperblockByNonce.name,
                `hyperblock/by-nonce/${nonce}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(
                `An error occured while get hyperblock by nonce`,
                {
                    path: `${ElrondApiService.name}.${this.getHyperblockByNonce.name}`,
                    error,
                },
            );
            throw error;
        }
    }

    async getTransaction(hash: string, withResults = false): Promise<any> {
        try {
            return this.doGetGeneric(
                this.getTransaction.name,
                `transaction/${hash}?withResults=${withResults}`,
                response => response,
            );
        } catch (error) {
            this.logger.error(`An error occured while get transaction`, {
                path: `${ElrondApiService.name}.${this.getTransaction.name}`,
                error,
            });
            throw error;
        }
    }
}
