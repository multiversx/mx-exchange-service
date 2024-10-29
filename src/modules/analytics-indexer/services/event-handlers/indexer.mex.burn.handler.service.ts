import {
    BaseFarmEvent,
    EsdtLocalBurnEvent,
    ExitFarmEventV1_2,
    ExitFarmEventV1_3,
    ExitFarmEventV2,
} from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import { RawElasticEventType } from 'src/services/elastic-search/entities/raw.elastic.event';
import { IndexerEventIdentifiers } from '../../entities/indexer.event.types';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';

@Injectable()
export class IndexerMexBurnHandlerService {
    public handleSwapBurnEvents(
        transactionEvents: Map<string, RawElasticEventType[]>,
    ): [any[], number] | undefined {
        let feeBurnedTotal = new BigNumber(0);
        let timestamp: number;
        const txHashes = transactionEvents.keys();

        for (const txHash of txHashes) {
            const events = transactionEvents.get(txHash);

            let hasSwapEvents = false;

            const burnEvents: EsdtLocalBurnEvent[] = [];
            events.forEach((event) => {
                if (
                    event.identifier === IndexerEventIdentifiers.ESDT_LOCAL_BURN
                ) {
                    burnEvents.push(new EsdtLocalBurnEvent(event));
                } else {
                    hasSwapEvents = true;
                    timestamp = event.timestamp;
                }
            });

            if (!hasSwapEvents || burnEvents.length === 0) {
                continue;
            }

            const feeBurned = this.getBurnedFee(burnEvents);
            feeBurnedTotal = feeBurnedTotal.plus(feeBurned);
        }

        if (feeBurnedTotal.toFixed() === '0') {
            return undefined;
        }

        const data = [];
        data[constantsConfig.MEX_TOKEN_ID] = {
            feeBurned: feeBurnedTotal.toFixed(),
        };

        return [data, timestamp];
    }

    public handleExitFarmBurnEvents(
        transactionEvents: Map<string, RawElasticEventType[]>,
    ): [any[], number] | undefined {
        let feeBurnedTotal = new BigNumber(0);
        let timestamp: number;
        const txHashes = transactionEvents.keys();

        for (const txHash of txHashes) {
            const events = transactionEvents.get(txHash);

            const burnEvents: EsdtLocalBurnEvent[] = [];
            let exitFarmEvent: BaseFarmEvent | ExitFarmEventV2 | undefined =
                undefined;

            events.forEach((event) => {
                switch (event.identifier) {
                    case IndexerEventIdentifiers.EXIT_FARM:
                        if (event.data === '') {
                            break;
                        }
                        const version = farmVersion(event.address);
                        switch (version) {
                            case FarmVersion.V1_2:
                                exitFarmEvent = new ExitFarmEventV1_2(event);
                                break;
                            case FarmVersion.V1_3:
                                exitFarmEvent = new ExitFarmEventV1_3(event);
                                break;
                            case FarmVersion.V2:
                                if (event.topics.length !== 6) {
                                    break;
                                }
                                exitFarmEvent = new ExitFarmEventV2(event);
                                break;
                        }
                        timestamp = event.timestamp;
                        break;
                    case IndexerEventIdentifiers.ESDT_LOCAL_BURN:
                        burnEvents.push(new EsdtLocalBurnEvent(event));
                        break;
                    default:
                        break;
                }
            });

            if (exitFarmEvent === undefined) {
                continue;
            }

            const feeBurned = this.getBurnedPenalty(exitFarmEvent, burnEvents);
            feeBurnedTotal = feeBurnedTotal.plus(feeBurned);
        }

        if (feeBurnedTotal.toFixed() === '0') {
            return undefined;
        }

        const data = [];
        data[constantsConfig.MEX_TOKEN_ID] = {
            penaltyBurned: feeBurnedTotal.toFixed(),
        };

        return [data, timestamp];
    }

    private getBurnedPenalty(
        exitFarmEvent: BaseFarmEvent | ExitFarmEventV2,
        esdtLocalBurnEvents: EsdtLocalBurnEvent[],
    ): string {
        if (!(exitFarmEvent instanceof ExitFarmEventV2)) {
            return this.getBurnedPenaltyOldFarms(
                exitFarmEvent,
                esdtLocalBurnEvents,
            );
        }

        let penalty = new BigNumber(0);

        for (const localBurn of esdtLocalBurnEvents) {
            const burnedTokenID = localBurn.getTopics().tokenID;
            const burnedAmount = localBurn.getTopics().amount;

            // Skip LP tokens burn
            if (burnedTokenID !== constantsConfig.MEX_TOKEN_ID) {
                continue;
            }

            if (
                burnedAmount === exitFarmEvent.farmingToken.amount &&
                burnedTokenID === exitFarmEvent.farmingToken.tokenIdentifier
            ) {
                continue;
            }

            penalty = penalty.plus(burnedAmount);
        }

        return penalty.toFixed();
    }

    private getBurnedPenaltyOldFarms(
        exitFarmEvent: BaseFarmEvent,
        esdtLocalBurnEvents: EsdtLocalBurnEvent[],
    ): string {
        const lockedRewards =
            exitFarmEvent instanceof ExitFarmEventV1_2
                ? exitFarmEvent.toJSON().farmAttributes.lockedRewards
                : undefined;

        let penalty = new BigNumber(0);

        for (const localBurn of esdtLocalBurnEvents) {
            const burnedTokenID = localBurn.getTopics().tokenID;
            const burnedAmount = localBurn.getTopics().amount;

            // Skip LP tokens burn
            if (burnedTokenID !== constantsConfig.MEX_TOKEN_ID) {
                continue;
            }

            // Skip MEX to LKMEX rewards for V1_2 farms
            if (
                burnedAmount === exitFarmEvent.rewardToken.amount.toFixed() &&
                lockedRewards
            ) {
                continue;
            }

            // Skip MEX to LKMEX farming tokens
            if (
                burnedAmount === exitFarmEvent.farmingToken.amount.toFixed() &&
                burnedTokenID === exitFarmEvent.farmingToken.tokenID
            ) {
                continue;
            }

            penalty = penalty.plus(burnedAmount);
        }

        return penalty.toFixed();
    }

    private getBurnedFee(esdtLocalBurnEvents: EsdtLocalBurnEvent[]): string {
        let fee = new BigNumber(0);
        for (const localBurn of esdtLocalBurnEvents) {
            const burnedTokenID = localBurn.getTopics().tokenID;
            const burnedAmount = localBurn.getTopics().amount;

            if (burnedTokenID !== constantsConfig.MEX_TOKEN_ID) {
                continue;
            }

            fee = fee.plus(burnedAmount);
        }

        return fee.toFixed();
    }
}
