import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class IsValidUnixTimeConstraint implements ValidatorConstraintInterface {
    validate(timestamp: any): boolean {
        if (timestamp === '') {
            return true;
        }
        return new Date(timestamp * 1000).getTime() > 0;
    }

    defaultMessage() {
        // here you can provide default error message if validation failed
        return 'Invalid unix timestamp';
    }
}

export function IsValidUnixTime(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidUnixTimeConstraint,
        });
    };
}
