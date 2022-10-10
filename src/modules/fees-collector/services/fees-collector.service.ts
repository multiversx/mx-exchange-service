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

    async feesCollector(scAddress: string): Promise<FeesCollectorModel> {
        const [
            time,
            allToken
        ] = await Promise.all([
            this.weekTimekeepingResolver.weeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress)
        ])

        return new FeesCollectorModel({
            address: scAddress,
            time: time,
            allTokens: allToken
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string): Promise<UserEntryFeesCollectorModel> {
        const time = await this.weekTimekeepingResolver.weeklyTimekeeping(scAddress);
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            time: time
        });
    }
}
