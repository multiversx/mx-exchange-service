import { Address } from '@multiversx/sdk-core';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class IsValidSeriesConstraint implements ValidatorConstraintInterface {
    validate(series: any): boolean {
        try {
            return !Address.fromBech32(series).isEmpty();
        } catch (error) {
            if (this.isValidTokenIdentifier(series)) {
                return true;
            }

            return series === 'factory';
        }
    }

    defaultMessage() {
        // here you can provide default error message if validation failed
        return 'Invalid series';
    }

    private isValidTokenIdentifier(tokenID: string): boolean {
        return tokenID.split('-').length == 2;
    }
}

export function IsValidSeries(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidSeriesConstraint,
        });
    };
}
