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
            return typeA;
    }
}
