import { constantsConfig } from 'src/config';
import { PairModel } from 'src/modules/pair/models/pair.model';

export class GraphService {
    private static pairsLength = 0;
    private static instance: GraphService;

    private adjList: Map<string, string[]>;

    private constructor(pairs: PairModel[]) {
        GraphService.pairsLength = pairs.length;

        this.adjList = new Map<string, string[]>();

        for (const pair of pairs) {
            this.addEdge(
                pair.firstToken.identifier,
                pair.secondToken.identifier,
            );
            this.addEdge(
                pair.secondToken.identifier,
                pair.firstToken.identifier,
            );
        }
    }

    static getInstance(pairs: PairModel[]): GraphService {
        if (
            !GraphService.instance ||
            GraphService.pairsLength !== pairs.length
        ) {
            GraphService.instance = new GraphService(pairs);
        }
        return GraphService.instance;
    }

    addEdge(u: string, v: string) {
        const node = this.adjList.get(u);
        if (node === undefined) {
            this.adjList.set(u, [v]);
        } else {
            node.push(v);
        }
    }

    private getAllPathsUtil(
        node: string,
        destination: string,
        isVisited: Map<string, boolean>,
        localPathList: Array<string>,
        paths: Array<string[]>,
    ) {
        if (node === destination) {
            paths.push([...localPathList]);
            return;
        }

        if (localPathList.length > constantsConfig.MAX_SWAP_ROUTE_DEPTH) {
            return;
        }

        isVisited.set(node, true);
        const adjNodes = this.adjList.get(node);

        if (!adjNodes) {
            return;
        }

        for (const adjNode of adjNodes) {
            if (isVisited.get(adjNode) === false) {
                localPathList.push(adjNode);
                this.getAllPathsUtil(
                    adjNode,
                    destination,
                    isVisited,
                    localPathList,
                    paths,
                );
                localPathList.splice(localPathList.indexOf(adjNode), 1);
            }
        }
        isVisited.set(node, false);
    }

    getAllPaths(source: string, destination: string) {
        const isVisited = new Map<string, boolean>();
        const nodes = this.adjList.keys();
        const paths = new Array<string[]>();

        for (const v of nodes) {
            isVisited.set(v, false);
        }

        const pathList = new Array<string>();
        pathList.push(source);

        this.getAllPathsUtil(source, destination, isVisited, pathList, paths);

        return paths;
    }
}
