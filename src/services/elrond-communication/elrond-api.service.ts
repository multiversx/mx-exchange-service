import { constantsConfig, elrondConfig } from '../../config';
import { Inject, Injectable } from '@nestjs/common';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { MetricsCollector } from '../../utils/metrics.collector';
import { Stats } from '../../models/stats.model';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ApiNetworkProvider } from '@elrondnetwork/erdjs-network-providers/out';
import { isEsdtToken, isNftCollection } from 'src/utils/token.type.compare';
import { PendingExecutor } from 'src/utils/pending.executor';

type GenericGetArgs = {
    methodName: string;
    resourceUrl: string;
    retries?: number;
};

@Injectable()
export class ElrondApiService {
    private readonly apiProvider: ApiNetworkProvider;
    private genericGetExecutor: PendingExecutor<GenericGetArgs, any>;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.apiProvider = new ApiNetworkProvider(process.env.ELRONDAPI_URL, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
            headers: {
                origin: 'MaiarExchangeService',
            },
        });
        this.genericGetExecutor = new PendingExecutor(
            async (getGenericArgs: GenericGetArgs) =>
                await this.doGetGeneric(
                    getGenericArgs.methodName,
                    getGenericArgs.resourceUrl,
                    getGenericArgs.retries,
                ),
        );
    }

    getService(): ApiNetworkProvider {
        return this.apiProvider;
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async doGetGeneric<T>(
        name: string,
        resourceUrl: string,
        retries = 1,
    ): Promise<T> {
        const profiler = new PerformanceProfiler(`${name} ${resourceUrl}`);
        try {
            return await this.getService().doGetGeneric(resourceUrl);
        } catch (error) {
            if (
                error.inner.isAxiosError &&
                error.inner.code === 'ECONNABORTED' &&
                retries < 3
            ) {
                await this.delay(500 * retries);
                return await this.doGetGeneric(name, resourceUrl, retries + 1);
            }
            this.logger.error(`${error.message} after ${retries} retries`, {
                path: `${ElrondApiService.name}.${name}`,
            });
            throw new Error(error);
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                ElrondApiService.name,
                name,
                profiler.duration,
            );
        }
    }

    async getStats(): Promise<Stats> {
        const stats = await this.doGetGeneric<Stats>(
            this.getStats.name,
            'stats',
        );
        return new Stats(stats);
    }

    async getBlockCountInEpoch(epoch: number): Promise<Stats> {
        return await this.doGetGeneric<Stats>(
            this.getStats.name,
            `blocks/count?epoch=${epoch}`,
        );
    }

    async getAccountStats(address: string): Promise<any | undefined> {
        return await this.doGetGeneric(
            this.getAccountStats.name,
            `accounts/${address}`,
        );
    }

    async getToken(tokenID: string): Promise<EsdtToken> {
        try {
            const rawToken = await this.doGetGeneric<EsdtToken>(
                this.getToken.name,
                `tokens/${tokenID}`,
            );
            const esdtToken = new EsdtToken(rawToken);
            if (!isEsdtToken(esdtToken)) {
                return undefined;
            }
            return esdtToken;
        } catch (error) {
            return undefined;
        }
    }

    async getNftCollection(tokenID: string): Promise<NftCollection> {
        try {
            const rawCollection = await this.doGetGeneric(
                this.getNftCollection.name,
                `collections/${tokenID}`,
            );
            const collection = new NftCollection(rawCollection);
            if (!isNftCollection(collection)) {
                return undefined;
            }
            return collection;
        } catch (error) {
            return undefined;
        }
    }

    async getTokensCountForUser(address: string): Promise<number> {
        return this.doGetGeneric<number>(
            this.getTokensCountForUser.name,
            `accounts/${address}/tokens/count`,
        );
    }

    async getNftsCountForUser(address: string): Promise<number> {
        return this.doGetGeneric<number>(
            this.getNftsCountForUser.name,
            `accounts/${address}/nfts/count`,
        );
    }

    async getTokensForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<EsdtToken[]> {
        return this.doGetGeneric<EsdtToken[]>(
            this.getTokensForUser.name,
            `accounts/${address}/tokens?from=${from}&size=${size}`,
        );
    }

    async getTokenForUser(
        address: string,
        tokenID: string,
    ): Promise<EsdtToken> {
        return this.doGetGeneric<EsdtToken>(
            this.getTokenForUser.name,
            `accounts/${address}/tokens/${tokenID}`,
        );
    }

    async getTokenBalanceForUser(
        address: string,
        tokenID: string,
    ): Promise<string> {
        try {
            const token = await this.getTokenForUser(address, tokenID);
            return token.balance;
        } catch (error) {
            return '0';
        }
    }

    async getNftsForUser(
        address: string,
        from = 0,
        size = 100,
        type = 'MetaESDT',
        collections?: string[],
    ): Promise<NftToken[]> {
        const nfts: NftToken[] = await this.genericGetExecutor.execute({
            methodName: this.getNftsForUser.name,
            resourceUrl: `accounts/${address}/nfts?type=${type}&size=${constantsConfig.MAX_USER_NFTS}&fields=identifier,collection,ticker,decimals,timestamp,attributes,nonce,type,name,creator,royalties,uris,url,tags,balance,assets`,
        });

        return collections
            ? nfts
                  .filter((nft) => collections.includes(nft.collection))
                  .slice(from, size)
            : nfts.slice(from, size);
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        return await this.doGetGeneric<NftToken>(
            this.getNftByTokenIdentifier.name,
            `accounts/${address}/nfts/${nftIdentifier}?fields=identifier,collection,ticker,decimals,timestamp,attributes,nonce,type,name,creator,royalties,uris,url,tags,balance,assets`,
        );
    }

    async getNftAttributesByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<string> {
        const response = await this.doGetGeneric<NftToken>(
            this.getNftAttributesByTokenIdentifier.name,
            `accounts/${address}/nfts/${nftIdentifier}?fields=attributes`,
        );
        return response.attributes;
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        return this.doGetGeneric(
            this.getCurrentNonce.name,
            `network/status/${shardId}`,
        );
    }

    async getCurrentBlockNonce(shardId: number): Promise<number> {
        const latestBlock = await this.doGetGeneric(
            this.getCurrentNonce.name,
            `blocks?size=1&shard=${shardId}`,
        );
        return latestBlock[0].nonce;
    }

    async getShardTimestamp(shardId: number): Promise<number> {
        const latestShardBlock = await this.doGetGeneric(
            this.getShardTimestamp.name,
            `blocks?from=0&size=1&shard=${shardId}`,
        );
        return latestShardBlock[0].timestamp;
    }

    async getTransactions(
        after: number,
        before: number,
        receiverShard: number,
    ): Promise<any> {
        return await this.doGetGeneric(
            this.getTransactions.name,
            `transactions?receiverShard=${receiverShard}&after=${after}&before=${before}`,
        );
    }
}
