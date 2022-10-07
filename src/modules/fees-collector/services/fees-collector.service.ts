import { Injectable } from "@nestjs/common";
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "../models/fees-collector.model";


@Injectable()
export abstract class FeesCollectorService {
    feesCollector(scAddress: string, week: number): FeesCollectorModel {
        return new FeesCollectorModel({
            address: scAddress,
            week: week,
        });
    }

    userFeesCollector(scAddress: string, userAddress: string, week: number): UserEntryFeesCollectorModel {
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            week: week,
        });
    }


}
