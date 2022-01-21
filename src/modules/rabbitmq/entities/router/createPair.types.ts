import { GenericEventType } from '../generic.types';

export type CreatePairEventType = GenericEventType & {
    firstTokenID: string;
    secondTokenID: string;
    totalFeePercent: number;
    specialFeePercent: number;
};
