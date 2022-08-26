import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairMetadata } from '../../modules/router/models/pair.metadata.model';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';

@Injectable()
export class ContextService {
    constructor(
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetterService: RouterGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return this.routerGetterService.getPairsMetadata();
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.routerGetterService.getPairsMetadata();
        return pairs.find(pair => pair.address === pairAddress);
    }

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        const pairsMetadata = await this.routerGetterService.getPairsMetadata();
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
        const pairsMetadata = await this.routerGetterService.getPairsMetadata();
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
}
