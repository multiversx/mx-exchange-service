import { Injectable } from "@nestjs/common";
import {
    FeesCollectorModel,
    UserEntryFeesCollectorModel
} from "../models/fees-collector.model";
import { WeekTimekeepingResolver } from "../../../submodules/week-timekeeping/week-timekeeping.resolver";
import { FeesCollectorGetterService } from "./fees-collector.getter.service";
import { EsdtTokenPayment } from "../../../models/esdtTokenPayment.model";


@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly weekTimekeepingResolver: WeekTimekeepingResolver,
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
    ) {
    }

    async getAccumulatedFees(scAddress: string, week: number, allTokens: string[]): Promise<EsdtTokenPayment[]> {
        const accumulatedFees: EsdtTokenPayment[] = []

        for (const token of allTokens) {
            accumulatedFees.push( new EsdtTokenPayment({
                tokenID: token,
                tokenType: 0,
                amount: await this.feesCollectorGetterService.getAccumulatedFees(scAddress, week, token),
                nonce: 0
            }))
        }
        return accumulatedFees
    }

    async feesCollector(scAddress: string, startWeek: number, endWeek: number): Promise<FeesCollectorModel> {
        const [
            time,
            allToken
        ] = await Promise.all([
            this.weekTimekeepingResolver.weeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress)
        ])

        const [start, end] = this.validateAndSetIfUndefined(startWeek, endWeek, time.currentWeek);

        return new FeesCollectorModel({
            address: scAddress,
            startWeek: start,
            endWeek: end,
            time: time,
            allTokens: allToken
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string, startWeek: number, endWeek: number): Promise<UserEntryFeesCollectorModel> {
        const time = await this.weekTimekeepingResolver.weeklyTimekeeping(scAddress);
        const [start, end] = this.validateAndSetIfUndefined(startWeek, endWeek, time.currentWeek);
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek: start,
            endWeek: end,
            time: time
        });
    }

    private validateAndSetIfUndefined(startWeek: number, endWeek: number, currentWeek: number) {
        if (startWeek === undefined && endWeek === undefined) {
            return [1, currentWeek]
        }

        if (startWeek !== undefined) {
            if (startWeek > currentWeek) {
                throw new Error('Invalid start week');
            }
        } else {
            startWeek = 1
        }

        if (endWeek !== undefined) {
            if (endWeek > currentWeek) {
                throw new Error('Invalid end week');
            }
        } else {
            endWeek = startWeek
        }

        return [startWeek, endWeek]
    }
}
