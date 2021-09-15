import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElasticQuery } from 'src/helpers/entities/elastic/elastic.query';
import { QueryType } from 'src/helpers/entities/elastic/query.type';
import { ElasticService } from 'src/helpers/elastic.service';
import { scAddress, whitelistedAddressesConfig } from 'src/config';
import { base64Decode } from 'src/helpers/helpers';
import { Address } from '@elrondnetwork/erdjs/out';

@Injectable()
export class MetricsService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeTxCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
        ];
        const txCount = await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
        );
        return txCount;
    }

    async computePairSwapCount(address: string): Promise<number> {
        let swapTxCount = 0;
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzR*',
            ),
        ];

        let txCount = await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
        );
        swapTxCount += txCount;

        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDRmNzU3NDcwNzU3NE*',
            ),
        ];

        txCount = await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
        );
        swapTxCount += txCount;

        return swapTxCount;
    }

    async computePairAddLiquidityCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard('data', 'YWRkTGlxdWlkaXR*'),
        ];

        const txCount = await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
        );

        return txCount;
    }

    async computePairRemoveLiquidityCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDcyNjU2ZDZmNzY2NTRjNjk3MTc1Njk2NDY5NzQ3OU*',
            ),
        ];

        const txCount = await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
        );

        return txCount;
    }

    async computeUniqueUsers(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
        ];

        const transactions = await this.elasticService.getList(
            'transactions',
            ['sender'],
            elasticQueryAdapter,
        );

        const uniqueUsersMap = new Map<string, number>();
        for (const transaction of transactions) {
            const sender = transaction._source.sender;
            if (!uniqueUsersMap.has(sender)) {
                uniqueUsersMap.set(sender, 1);
            } else {
                uniqueUsersMap.set(sender, uniqueUsersMap.get(sender) + 1);
            }
        }

        return uniqueUsersMap.size;
    }

    async computeAvgUserTransactions(address: string): Promise<number> {
        const [totalTxCount, uniqueUsersCount] = await Promise.all([
            this.computeTxCount(address),
            this.computeUniqueUsers(address),
        ]);
        return totalTxCount / uniqueUsersCount;
    }

    async getUserdisalowedOutgoingTxs(address: string): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('sender', address),
        ];

        const transactions = await this.elasticService.getList(
            'transactions',
            [],
            elasticQueryAdapter,
        );
        const whitelistedAddresses: string[] = whitelistedAddressesConfig;

        const badTransactions = [];

        for (const transaction of transactions) {
            if (
                whitelistedAddresses.find(
                    whitelistedAddress =>
                        whitelistedAddress === transaction._source.receiver,
                ) === undefined &&
                address !== transaction._source.receiver
            ) {
                badTransactions.push(transaction);
            }

            if (address === transaction._source.receiver) {
                const decodedData = base64Decode(
                    transaction._source.data,
                ).split('@');
                if (decodedData[0] !== 'ESDTNFTTransfer') {
                    continue;
                }
                console.log(decodedData);
                const scAddress = new Address(decodedData[4]);
                if (
                    whitelistedAddresses.find(
                        whitelistedAddress =>
                            whitelistedAddress === scAddress.bech32(),
                    ) === undefined
                ) {
                    badTransactions.push(transaction);
                }
            }
        }

        return badTransactions;
    }

    async getDisalowedIncomingTxs(address: string): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
        ];

        const transactions = await this.elasticService.getList(
            'transactions',
            [],
            elasticQueryAdapter,
        );
        const whitelistedAddresses: string[] = whitelistedAddressesConfig;
        const badTransactions = [];
        for (const transaction of transactions) {
            if (
                whitelistedAddresses.find(
                    whitelistedAddress =>
                        whitelistedAddress === transaction._source.sender,
                ) === undefined &&
                address !== transaction._source.sender
            ) {
                badTransactions.push(transaction);
            }
        }

        const scresults = await this.elasticService.getList(
            'scresults',
            [],
            elasticQueryAdapter,
        );

        for (const scresult of scresults) {
            if (
                whitelistedAddresses.find(
                    whitelistedAddress =>
                        whitelistedAddress === scresult._source.sender,
                ) === undefined &&
                address !== scresult._source.sender
            ) {
                badTransactions.push(scresult);
            }
        }

        return badTransactions;
    }

    async checkUserDistributedLockedMex(address: string): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('sender', address),
            QueryType.Match('receiver', scAddress.distributionAddress),
        ];

        const claimTransactions = [];

        const transactions = await this.elasticService.getList(
            'transactions',
            [],
            elasticQueryAdapter,
        );

        for (const transaction of transactions) {
            if (transaction._source.data === 'Y2xhaW1Mb2NrZWRBc3NldHM=') {
                claimTransactions.push(transaction);
            }
        }

        elasticQueryAdapter.condition.must = [
            QueryType.Match('sender', scAddress.lockedAssetAddress),
            QueryType.Match('receiver', address),
        ];

        const scresults = await this.elasticService.getList(
            'scresults',
            [],
            elasticQueryAdapter,
        );

        for (const scresult of scresults) {
            const decodedData = base64Decode(scresult._source.data).split('@');
            if (decodedData[3] === '02a5a058fc295ed00000') {
                claimTransactions.push(scresult);
            }
        }

        return claimTransactions;
    }

    async checkUserDistributedBUSD(address: string): Promise<any> {
        const account = new Address(address);
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match(
                'receiver',
                'erd1qqqqqqqqqqqqqpgqauyawadp2eex5kd30z5ehrrprgksjpyp0n4s00cy97',
            ),
        ];

        const claimTransactions = [];

        const transactions = await this.elasticService.getList(
            'transactions',
            [],
            elasticQueryAdapter,
        );

        for (const transaction of transactions) {
            const decodedData = base64Decode(transaction._source.data).split(
                '@',
            );

            if (decodedData[0] !== 'mintTokenAndForward') {
                continue;
            }
            const decodedAddress = new Address(decodedData[1]);
            if (account.toString() === decodedAddress.toString()) {
                claimTransactions.push(transaction);
            }
        }

        elasticQueryAdapter.condition.must = [
            QueryType.Match(
                'sender',
                'erd1qqqqqqqqqqqqqpgqauyawadp2eex5kd30z5ehrrprgksjpyp0n4s00cy97',
            ),
            QueryType.Match('receiver', address),
        ];

        const scresults = await this.elasticService.getList(
            'scresults',
            [],
            elasticQueryAdapter,
        );

        for (const scresult of scresults) {
            const decodedData = base64Decode(scresult._source.data).split('@');
            console.log(decodedData);
            if (decodedData[2] === '43c33c193756480000') {
                claimTransactions.push(scresult);
            }
        }

        return claimTransactions;
    }
}
