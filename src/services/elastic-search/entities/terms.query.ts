import { AbstractQuery } from '@multiversx/sdk-nestjs-elastic';

export class CustomTermsQuery extends AbstractQuery {
    constructor(private readonly key: string, private readonly values: any) {
        super();
    }

    getQuery(): any {
        return {
            terms: {
                [this.key]: this.values,
            },
        };
    }
}

export class TermFilter extends AbstractQuery {
    constructor(private readonly key: string, private readonly value: any) {
        super();
    }

    getQuery(): any {
        return {
            term: {
                [this.key]: this.value,
            },
        };
    }
}
