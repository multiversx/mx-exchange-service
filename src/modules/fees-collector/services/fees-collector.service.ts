import { Injectable } from "@nestjs/common";
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "../models/fees-collector.model";


@Injectable()
export class FeesCollectorService {
    async feesCollector(scAddress: string, week: number): Promise<FeesCollectorModel> {
        return new FeesCollectorModel({
            address: scAddress,
            week: week,
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string, week: number): Promise<UserEntryFeesCollectorModel> {
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            week: week,
        });
    }
}
