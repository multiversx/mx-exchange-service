import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';

export function leastType(typeA: string, typeB: string): string {
    switch (typeA) {
        case 'Core':
            return typeB;
        case 'Ecosystem':
            if (typeB === 'Core') {
                return typeA;
            }
            return typeB;
        case 'Community':
            if (typeB === 'Core' || typeB === 'Ecosystem') {
                return typeA;
            }
            return typeB;
        case 'Experimental':
            if (
                typeB === 'Core' ||
                typeB === 'Ecosystem' ||
                typeB === 'Community'
            ) {
                return typeA;
            }
            return typeB;
        case 'Jungle':
            if (
                typeB === 'Core' ||
                typeB === 'Ecosystem' ||
                typeB === 'Community' ||
                typeB === 'Experimental'
            ) {
                return typeA;
            }
        case 'Unlisted':
            return typeA;
    }
}

export function isEsdtToken(
    token: EsdtToken | NftCollection | NftToken,
): token is EsdtToken {
    return (
        (token as EsdtToken).identifier !== undefined &&
        (token as NftToken).collection === undefined
    );
}

export function isNftCollection(
    token: EsdtToken | NftCollection | NftToken,
): token is NftCollection {
    return (
        (token as EsdtToken).identifier === undefined &&
        (token as NftCollection).collection !== undefined
    );
}

export function isNftToken(
    token: EsdtToken | NftCollection | NftToken,
): token is NftToken {
    return (
        (token as NftToken).identifier !== undefined &&
        (token as NftToken).collection !== undefined
    );
}
