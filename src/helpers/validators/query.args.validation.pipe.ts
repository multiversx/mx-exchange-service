import { ApolloServerErrorCode } from '@apollo/server/errors';
import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';

export class QueryArgsValidationPipe extends ValidationPipe {
    constructor() {
        super({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
            transform: true,
            exceptionFactory: validationExceptionFactory,
            stopAtFirstError: true,
        });
    }
}

function validationExceptionFactory(errors: ValidationError[]): any {
    const result = errors.map(
        (error) => error.constraints[Object.keys(error.constraints)[0]],
    );
    return new GraphQLError(`Validation errors: ${result.join(' | ')}`, {
        extensions: {
            code: ApolloServerErrorCode.BAD_USER_INPUT,
        },
    });
}
