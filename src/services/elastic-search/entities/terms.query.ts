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
