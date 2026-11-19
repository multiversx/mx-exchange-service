import {
    DocumentNode,
    FragmentDefinitionNode,
    getOperationAST,
    GraphQLSchema,
    Kind,
    parse,
    SelectionSetNode,
} from 'graphql';
import { graphqlParseOptions } from './graphql.limits';

// Label values stay bounded: validated, derived from the schema, or capped.

const MAX_OPERATION_LABEL_LENGTH = 120;
const META_FIELDS = new Set(['__schema', '__type', '__typename']);
const VALID_ORIGIN_LABEL = /^[A-Za-z0-9.:/_-]{1,100}$/;
export const OTHER_LABEL = 'other';
export const NO_ORIGIN_LABEL = 'none';

// Sorted root field names of the operation; with a schema, only known ones.
export function operationLabel(
    document: DocumentNode | undefined,
    operationName?: string | null,
    schema?: GraphQLSchema,
): string {
    if (!document) {
        return OTHER_LABEL;
    }

    const operation = getOperationAST(document, operationName);
    if (!operation) {
        return OTHER_LABEL;
    }

    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
            fragments.set(definition.name.value, definition);
        }
    }

    const fieldNames = new Set<string>();
    collectRootFieldNames(
        operation.selectionSet,
        fragments,
        new Set(),
        fieldNames,
    );

    const rootFields = schema?.getRootType(operation.operation)?.getFields();
    const label = [...fieldNames]
        .filter(
            (name) =>
                !schema ||
                META_FIELDS.has(name) ||
                rootFields?.[name] !== undefined,
        )
        .sort()
        .join('|')
        .slice(0, MAX_OPERATION_LABEL_LENGTH);

    return label || OTHER_LABEL;
}

export function operationLabelFromQuery(
    query: string,
    operationName?: string | null,
    schema?: GraphQLSchema,
): string {
    let document: DocumentNode;
    try {
        document = parse(query, graphqlParseOptions);
    } catch {
        return OTHER_LABEL;
    }
    return operationLabel(document, operationName, schema);
}

export function originLabel(origin: string | null | undefined): string {
    if (!origin) {
        return NO_ORIGIN_LABEL;
    }
    return VALID_ORIGIN_LABEL.test(origin) ? origin : OTHER_LABEL;
}

// Caps distinct label sets; once full, new sets are recorded as other.
export class LabelLimiter {
    private readonly seen = new Set<string>();

    constructor(
        private readonly maxLabelSets: number,
        private readonly onOverflow: () => void = () => undefined,
    ) {}

    limit(labels: readonly string[]): string[] {
        const key = labels.join('\u0000');
        if (this.seen.has(key)) {
            return [...labels];
        }
        if (this.seen.size < this.maxLabelSets) {
            this.seen.add(key);
            return [...labels];
        }
        this.onOverflow();
        return labels.map(() => OTHER_LABEL);
    }
}

function collectRootFieldNames(
    selectionSet: SelectionSetNode,
    fragments: Map<string, FragmentDefinitionNode>,
    visitedFragments: Set<string>,
    fieldNames: Set<string>,
): void {
    for (const selection of selectionSet.selections) {
        switch (selection.kind) {
            case Kind.FIELD:
                fieldNames.add(selection.name.value);
                break;
            case Kind.INLINE_FRAGMENT:
                collectRootFieldNames(
                    selection.selectionSet,
                    fragments,
                    visitedFragments,
                    fieldNames,
                );
                break;
            case Kind.FRAGMENT_SPREAD: {
                const name = selection.name.value;
                const fragment = fragments.get(name);
                if (fragment && !visitedFragments.has(name)) {
                    visitedFragments.add(name);
                    collectRootFieldNames(
                        fragment.selectionSet,
                        fragments,
                        visitedFragments,
                        fieldNames,
                    );
                }
                break;
            }
        }
    }
}
