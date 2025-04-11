import { Lock, OriginLogger } from '@multiversx/sdk-nestjs-common';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SwapBenchmarkSnapshotService } from './snapshot.service';
import { PairSnapshotRepositoryService } from './repository.service';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

@Injectable()
export class SnapshotCronService {
    private readonly logger = new OriginLogger(SnapshotCronService.name);

    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly pairSnapshotRepository: PairSnapshotRepositoryService,
    ) {}

    // @Cron(CronExpression.EVERY_10_SECONDS)
    @Lock({ name: 'indexPairReserves', verbose: false })
    async indexPairReserves(): Promise<void> {
        const pairSnapshot = await this.pairSnapshotRepository.findOne({
            reservesInitialised: false,
        });

        if (!pairSnapshot) {
            return;
        }

        const profiler = new PerformanceProfiler();

        const { pairs } = pairSnapshot;

        const pairAddresses = pairs.map((pair) => pair.address);

        const allInfo = await this.snapshotService.getPairsInfo(
            pairSnapshot.timestamp,
            pairAddresses,
        );

        for (const [index, info] of allInfo.entries()) {
            pairs[index].info = info;
        }

        pairSnapshot.pairs = pairs;

        await this.pairSnapshotRepository.findOneAndUpdate(
            { timestamp: pairSnapshot.timestamp },
            { pairs: pairs, reservesInitialised: true },
        );

        profiler.stop();
        this.logger.log(
            `Snapshot for timestamp ${pairSnapshot.timestamp} completed in ${profiler.duration}ms`,
        );
    }

    // @Cron(CronExpression.EVERY_5_SECONDS)
    @Lock({ name: 'indexPairs', verbose: false })
    async indexPairs(): Promise<void> {
        const pairSnapshot = await this.pairSnapshotRepository.findOne({
            reservesInitialised: false,
        });

        if (!pairSnapshot) {
            return;
        }

        const profiler = new PerformanceProfiler();

        const pairs = await this.snapshotService.fixMissingPairs(
            pairSnapshot.timestamp,
            pairSnapshot.blockNonce,
            pairSnapshot.pairs,
        );

        pairSnapshot.pairs = pairs;

        await this.pairSnapshotRepository.findOneAndUpdate(
            { timestamp: pairSnapshot.timestamp },
            { pairs: pairs, reservesInitialised: true },
        );

        profiler.stop();
        this.logger.log(
            `Snapshot for timestamp ${pairSnapshot.timestamp} completed in ${profiler.duration}ms`,
        );
    }

    // @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'fixPairsFeePercentage', verbose: false })
    async fixPairsFee(): Promise<void> {
        // const pairSnapshot = await this.pairSnapshotRepository.findOne({
        //     reservesInitialised: false,
        // });
        const entity = this.pairSnapshotRepository.getEntity();

        const cursor = entity.find().cursor();

        for (
            let doc = await cursor.next();
            doc != null;
            doc = await cursor.next()
        ) {
            const result = this.snapshotService.fixPairsFeePercentage(
                doc.pairs,
            );
            if (result.needUpdate > 0) {
                console.log(doc.timestamp, result.needUpdate);
                doc.pairs = result.pairs;

                // await this.pairSnapshotRepository.findOneAndUpdate(
                //     { timestamp: doc.timestamp },
                //     { pairs: result.pairs, reservesInitialised: true },
                // );
            }
        }

        console.log('DONE');
    }
}
