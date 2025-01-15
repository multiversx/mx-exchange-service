import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GlobalState, GlobalStateInitStatus } from '../entities/global.state';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import moment from 'moment';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { constantsConfig } from 'src/config';

@Injectable()
export class MemoryStoreCronService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'updateStatus', verbose: false })
    async updateStatus(): Promise<void> {
        const profiler = new PerformanceProfiler();

        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const newStatus = this.determineGlobalStatus(pairsMetadata);
        profiler.stop();

        if (GlobalState.initStatus !== newStatus) {
            this.logger.info(
                `Memory Store status updated (${GlobalState.initStatus} => ${newStatus}) in ${profiler.duration}ms `,
                {
                    context: 'MemoryStoreCronService',
                },
            );
        }
        GlobalState.routerAddresses = pairsMetadata.map((pair) => pair.address);
        GlobalState.initStatus = newStatus;
    }

    private determineGlobalStatus(
        pairsMetadata: PairMetadata[],
    ): GlobalStateInitStatus {
        let overallStatus = GlobalStateInitStatus.DONE;

        for (const pairMetadata of pairsMetadata) {
            const { address } = pairMetadata;

            if (!this.isStorePairDataValid(address)) {
                overallStatus = GlobalStateInitStatus.IN_PROGRESS;
                break;
            }

            if (!this.areStorePairTokensFresh(address)) {
                overallStatus = GlobalStateInitStatus.IN_PROGRESS;
                break;
            }

            // TODO update pair tokens with the ones from store - better guarantees than doing it on cache warmer
        }

        return overallStatus;
    }

    private isStorePairDataValid(address: string): boolean {
        if (
            !GlobalState.pairsState[address] ||
            !GlobalState.pairsLastUpdate[address]
        ) {
            // console.log(`pair missing data ${address} - early exit`);
            // console.log('missing data points', {
            //     state: !GlobalState.pairsState[address],
            //     lastUpdate: !GlobalState.pairsLastUpdate,
            // });
            return false;
        }

        const lastUpdate = GlobalState.pairsLastUpdate[address];
        const stalenessThresholds =
            constantsConfig.memoryStore.pairsStalenessThreshold;
        const now = moment().unix();

        if (
            now - lastUpdate.tokensFarms > stalenessThresholds.tokensFarms ||
            now - lastUpdate.analytics > stalenessThresholds.analytics ||
            now - lastUpdate.info > stalenessThresholds.info ||
            now - lastUpdate.prices > stalenessThresholds.prices
        ) {
            // console.log(`pair stale ${address} - early exit`);
            // console.log({
            //     tokenFarms: now - lastUpdate.tokensFarms,
            //     analytics: now - lastUpdate.analytics,
            //     info: now - lastUpdate.info,
            //     prices: now - lastUpdate.prices,
            // });
            return false;
        }

        return true;
    }

    private areStorePairTokensFresh(address: string): boolean {
        if (!GlobalState.pairsEsdtTokens[address]) {
            console.log(`pair missing esdtTokens ${address} - early exit`);
            return false;
        }

        const pairTokens = GlobalState.pairsEsdtTokens[address];
        const tokenIDs = [pairTokens.firstTokenID, pairTokens.secondTokenID];

        if (pairTokens.lpTokenID) {
            tokenIDs.push(pairTokens.lpTokenID);
        }

        if (pairTokens.dualFarmRewardTokenID) {
            tokenIDs.push(pairTokens.dualFarmRewardTokenID);
        }

        const now = moment().unix();
        const stalenessThresholds =
            constantsConfig.memoryStore.tokensStalenessThreshold;

        for (const tokenID of tokenIDs) {
            if (
                !GlobalState.tokensLastUpdate[tokenID] ||
                !GlobalState.tokensState[tokenID]
            ) {
                // console.log(`token missing data ${tokenID} - early exit`);
                // console.log('missing data points', {
                //     state: !GlobalState.tokensState[tokenID],
                //     lastUpdate: !GlobalState.tokensLastUpdate[tokenID],
                // });
                return false;
            }

            const lastUpdate = GlobalState.tokensLastUpdate[tokenID];

            if (
                now - lastUpdate.metadata > stalenessThresholds.metadata ||
                now - lastUpdate.extra > stalenessThresholds.extra ||
                now - lastUpdate.price > stalenessThresholds.price
            ) {
                // console.log(`token stale ${tokenID} - early exit`);
                // console.log({
                //     metadata: now - lastUpdate.metadata,
                //     extra: now - lastUpdate.extra,
                //     price: now - lastUpdate.price,
                // });
                return false;
            }
        }

        return true;
    }
}
