import { ApiProvider } from '@elrondnetwork/erdjs';
import { elrondConfig } from '../../config';
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

@Injectable()
export class ElrondApiService {
    private readonly apiProvider: ApiProvider;
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
        return await this.doGetGeneric(
            this.getAccountStats.name,
            `accounts/${address}`,
            response => response,
        );
    }

    async getNftCollection(tokenID: string): Promise<NftCollection> {
        return this.doGetGeneric(
            this.getNftCollection.name,
            `collections/${tokenID}`,
            response => response,
        );
    }

    async getTokensCountForUser(address: string): Promise<number> {
        return this.doGetGeneric(
            this.getTokensCountForUser.name,
            `accounts/${address}/tokens/count`,
            response => response,
        );
    }

    async getNftsCountForUser(address: string): Promise<number> {
        return this.doGetGeneric(
            this.getNftsCountForUser.name,
            `accounts/${address}/nfts/count`,
            response => response,
        );
    }

    async getTokensForUser(
        address: string,
        from = 0,
        size = 100,
    ): Promise<EsdtToken[]> {
        return this.doGetGeneric(
            this.getTokensForUser.name,
            `accounts/${address}/tokens?from=${from}&size=${size}`,
            response => response,
        );
    }

    async getTokenForUser(
        address: string,
        tokenID: string,
    ): Promise<EsdtToken> {
        return this.doGetGeneric(
            this.getTokenForUser.name,
            `accounts/${address}/tokens/${tokenID}`,
            response => response,
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
    ): Promise<NftToken[]> {
        return this.doGetGeneric(
            this.getNftsForUser.name,
            `accounts/${address}/nfts?from=${from}&size=${size}&type=${type}`,
            response => response,
        );
    }

    async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        return await this.doGetGeneric(
            this.getNftByTokenIdentifier.name,
            `accounts/${address}/nfts/${nftIdentifier}`,
            response => response,
        );
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        return this.doGetGeneric(
            this.getCurrentNonce.name,
            `network/status/${shardId}`,
            response => response,
        );
    }

    async getCurrentBlockNonce(shardId: number): Promise<number> {
        const latestBlock = await this.doGetGeneric(
            this.getCurrentNonce.name,
            `blocks?size=1&shard=${shardId}`,
            response => response,
        );
        return latestBlock[0].nonce;
    }

    async getShardTimestamp(shardId: number): Promise<number> {
        const latestShardBlock = await this.doGetGeneric(
            this.getShardTimestamp.name,
            `blocks?from=0&size=1&shard=${shardId}`,
            response => response,
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
            response => response,
        );
    }
}
