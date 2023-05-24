import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { PDMetricsBuckets } from '../models/price.discovery.args';

const metrics = [
    'launchedTokenAmount',
    'acceptedTokenAmount',
    'launchedTokenPrice',
    'acceptedTokenPrice',
    'launchedTokenPriceUSD',
    'acceptedTokenPriceUSD',
];

@ValidatorConstraint()
export class IsValidMetricConstraint implements ValidatorConstraintInterface {
    validate(metric: string): boolean {
        return metrics.includes(metric);
    }

    defaultMessage() {
        // here you can provide default error message if validation failed
        return 'Invalid price discovery metric';
    }
}

export function IsValidPDMetric(validationOptions?: ValidationOptions) {
    return (object: any, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidMetricConstraint,
        });
    };
}

@ValidatorConstraint()
export class IsValidBucketConstraint implements ValidatorConstraintInterface {
    validate(bucket: PDMetricsBuckets): boolean {
        return Object.values(PDMetricsBuckets).includes(bucket);
    }

    defaultMessage() {
        // here you can provide default error message if validation failed
        return 'Invalid price discovery bucket';
    }
}

export function IsValidPDBucket(validationOptions?: ValidationOptions) {
    return (object: any, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidBucketConstraint,
        });
    };
}
