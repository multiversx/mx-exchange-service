import { SwapEvent } from '@multiversx/sdk-exchange';
import {
    ElasticQuery,
    ElasticService,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class ESLogsService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getTokenSwapsCount(
        startTimestamp: number,
        endTimestamp: number,
        pairAddresses: string[],
    ): Promise<Map<string, number>> {
        const swapEvents: SwapEvent[] = [];
        const tokensSwapCountMap: Map<string, number> = new Map();

        const processLogsAction = async (items: any[]): Promise<void> => {
            for (const transactionLogs of items) {
                swapEvents.push(
                    ...this.processSwapEvents(
                        transactionLogs.events,
                        pairAddresses,
                    ),
                );
            }
        };

        await Promise.all([
            this.getTransactionsLogs(
                'swapTokensFixedInput',
                startTimestamp,
                endTimestamp,
                processLogsAction,
            ),
            this.getTransactionsLogs(
                'swapTokensFixedOutput',
                startTimestamp,
                endTimestamp,
                processLogsAction,
            ),
        ]);

        for (const swapEvent of swapEvents) {
            const eventTopics = swapEvent.getTopics();

            if (tokensSwapCountMap.has(eventTopics.firstTokenID)) {
                const currentCount = tokensSwapCountMap.get(
                    eventTopics.firstTokenID,
                );
                tokensSwapCountMap.set(
                    eventTopics.firstTokenID,
                    currentCount + 1,
                );
            } else {
                tokensSwapCountMap.set(eventTopics.firstTokenID, 1);
            }

            if (tokensSwapCountMap.has(eventTopics.secondTokenID)) {
                const currentCount = tokensSwapCountMap.get(
                    eventTopics.secondTokenID,
                );
                tokensSwapCountMap.set(
                    eventTopics.secondTokenID,
                    currentCount + 1,
                );
            } else {
                tokensSwapCountMap.set(eventTopics.secondTokenID, 1);
            }
        }

        return tokensSwapCountMap;
    }

    private async getTransactionsLogs(
        eventName: string,
        startTimestamp: number,
        endTimestamp: number,
        action: (items: any[]) => Promise<void>,
    ): Promise<void> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', eventName),
            ]),
        ];

        elasticQueryAdapter.filter = [
            QueryType.Range(
                'timestamp',
                {
                    key: 'gte',
                    value: startTimestamp,
                },
                {
                    key: 'lte',
                    value: endTimestamp,
                },
            ),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        await this.elasticService.getScrollableList(
            'logs',
            '',
            elasticQueryAdapter,
            action,
        );
    }

    private processSwapEvents(
        events: any[],
        pairAddresses: string[],
    ): SwapEvent[] {
        const esdtSwapEvents: SwapEvent[] = [];

        for (const event of events) {
            if (!pairAddresses.includes(event.address)) {
                continue;
            }
            if (
                event.identifier === 'swapTokensFixedInput' ||
                event.identifier === 'swapTokensFixedOutput'
            ) {
                esdtSwapEvents.push(new SwapEvent(event));
            }
        }

        return esdtSwapEvents;
    }
}
