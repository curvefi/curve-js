// Breadth-first search
import type {IDict, IPoolData, IRoute, IRouteStep, IRouteTvl, ISwapType} from "./interfaces";

function routerWorker(): void {
    // this is a workaround to avoid using [...] operator, as nextjs will try to use some stupid swc helpers
    const concatArrays = <T>(a: T[], b: T[]): T[] => a.map((x) => x).concat(b);

    function log(fnName: string, ...args: unknown[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`curve-js/router-worker@${new Date().toISOString()} -> ${fnName}:`, args)
        }
    }

    const MAX_ROUTES_FOR_ONE_COIN = 5;
    const MAX_DEPTH = 5;

    const _removeDuplications = (routes: IRouteTvl[]) =>
        routes.filter(
            (r, i, _routes) => _routes.map((r) => r.route.map((s) => s.poolId).toString()).indexOf(r.route.map((s) => s.poolId).toString()) === i
        )

    const _sortByTvl = (a: IRouteTvl, b: IRouteTvl) => b.minTvl - a.minTvl || b.totalTvl - a.totalTvl || a.route.length - b.route.length;
    const _sortByLength = (a: IRouteTvl, b: IRouteTvl) => a.route.length - b.route.length || b.minTvl - a.minTvl || b.totalTvl - a.totalTvl;

    // 4 --> 6, 5 --> 7 not allowed
    // 4 --> 7, 5 --> 6 allowed
    const _handleSwapType = (swapType: ISwapType): string => {
        if (swapType === 6) return "4";
        if (swapType === 7) return "5";
        return swapType.toString()
    }

    const _isVisitedCoin = (coinAddress: string, route: IRouteTvl): boolean =>
        route.route.find((r) => r.inputCoinAddress === coinAddress) !== undefined

    const _isVisitedPool = (poolId: string, route: IRouteTvl): boolean =>
        route.route.find((r) => r.poolId === poolId) !== undefined

    const _findRoutes = (inputCoinAddress: string, outputCoinAddress: string, routerGraph: IDict<IDict<IRouteStep[]>>, allPools: IDict<IPoolData>): IRoute[] => {
        inputCoinAddress = inputCoinAddress.toLowerCase();
        outputCoinAddress = outputCoinAddress.toLowerCase();

        const routes: IRouteTvl[] = [{route: [], minTvl: Infinity, totalTvl: 0}];
        let targetRoutes: IRouteTvl[] = [];

        let count = 0;
        let start = Date.now();

        while (routes.length > 0) {
            count++;
            // @ts-ignore
            const route: IRouteTvl = routes.pop();
            const inCoin = route.route.length > 0 ? route.route[route.route.length - 1].outputCoinAddress : inputCoinAddress;

            if (inCoin === outputCoinAddress) {
                targetRoutes.push(route);
            } else if (route.route.length < MAX_DEPTH) {
                const inCoinGraph = routerGraph[inCoin];
                for (const outCoin in inCoinGraph) {
                    if (_isVisitedCoin(outCoin, route)) continue;

                    for (const step of inCoinGraph[outCoin]) {
                        const poolData = allPools[step.poolId];

                        if (!poolData?.is_lending && _isVisitedPool(step.poolId, route)) continue;

                        // 4 --> 6, 5 --> 7 not allowed
                        // 4 --> 7, 5 --> 6 allowed
                        const swapType = _handleSwapType(step.swapParams[2]);
                        if (route.route.find((s) => s.poolId === step.poolId && swapType === _handleSwapType(s.swapParams[2])))
                            continue;

                        if (poolData && outCoin !== outputCoinAddress && (
                            poolData.wrapped_coin_addresses.includes(outputCoinAddress) || poolData.underlying_coin_addresses.includes(outputCoinAddress)
                        )) {
                            // Exclude such cases as: cvxeth -> tricrypto2 -> tusd -> susd (cvxeth -> tricrypto2 -> tusd instead)
                            if (!poolData?.is_lending) continue;
                            // Exclude such cases as: aave -> aave -> 3pool (aave -> aave instead)
                            if (outCoin !== poolData.token_address) continue;
                        }

                        routes.push({
                            route: concatArrays(route.route, [step]),
                            minTvl: Math.min(step.tvl, route.minTvl),
                            totalTvl: route.totalTvl + step.tvl,
                        });
                    }
                }
            }
        }
        log(`Searched ${count} routes resulting in ${targetRoutes.length} routes between ${inputCoinAddress} and ${outputCoinAddress}`, `${Date.now() - start}ms`);
        start = Date.now();

        targetRoutes = _removeDuplications(
            concatArrays(
                targetRoutes.sort(_sortByTvl).slice(0, MAX_ROUTES_FOR_ONE_COIN),
                targetRoutes.sort(_sortByLength).slice(0, MAX_ROUTES_FOR_ONE_COIN),
            )
        );

        const result = targetRoutes.map((r) => r.route);
        log(`Deduplicated to ${result.length} routes`, `${Date.now() - start}ms`);
        return result;
    }

    addEventListener('message', (e) => {
        const {type, routerGraph, outputCoinAddress, inputCoinAddress, allPools} = e.data;
        console.assert(type === 'findRoutes');
        const routes = _findRoutes(inputCoinAddress, outputCoinAddress, routerGraph, allPools);
        postMessage({ type, routes });
    });
}

// this is a workaround to avoid importing web-worker in the main bundle (nextjs will try to inject invalid hot-reloading code)
export const routerWorkerCode = `${routerWorker.toString()}; ${routerWorker.name}();`;
