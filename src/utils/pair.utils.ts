import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';

export const determineBaseAndQuoteTokens = (
    pair: PairMetadata,
    commonTokens: string[],
): { baseToken: string; quoteToken: string } => {
    const sortedCommonTokens = commonTokens.sort((a, b) => {
        const order = ['USD', 'USH', 'EGLD'];
        const indexA = order.findIndex((token) => a.includes(token));
        const indexB = order.findIndex((token) => b.includes(token));
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    for (const token of sortedCommonTokens) {
        if (pair.firstTokenID === token || pair.secondTokenID === token) {
            return {
                baseToken: token,
                quoteToken:
                    pair.firstTokenID === token
                        ? pair.secondTokenID
                        : pair.firstTokenID,
            };
        }
    }

    return {
        baseToken: pair.firstTokenID,
        quoteToken: pair.secondTokenID,
    };
};
