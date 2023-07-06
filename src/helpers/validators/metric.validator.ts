import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

const metrics = [
    'totalLockedValueUSD',
    'firstTokenLocked',
    'firstTokenLockedValueUSD',
    'firstTokenPrice',
    'firstTokenVolume',
    'secondTokenLocked',
    'secondTokenLockedValueUSD',
    'secondTokenPrice',
    'secondTokenVolume',
    'lockedValueUSD',
    'liquidity',
    'lockedValue',
    'lockedValueUSD',
    'priceUSD',
    'volume',
    'volumeUSD',
    'feesUSD',
    'launchedTokenAmount',
    'acceptedTokenAmount',
    'launchedTokenPrice',
    'acceptedTokenPrice',
    'launchedTokenPriceUSD',
    'acceptedTokenPriceUSD',
    'feeBurned',
    'penaltyBurned',
];

@ValidatorConstraint()
export class IsValidMetricConstraint implements ValidatorConstraintInterface {
    validate(metric: any): boolean {
        return metrics.includes(metric);
    }

    defaultMessage() {
        // here you can provide default error message if validation failed
        return 'Invalid metric';
    }
}

export function IsValidMetric(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidMetricConstraint,
        });
    };
}
