// important: only type imports, the worker needs to be standalone
import type {IDict, IRoutePoolData, IRouteStep, IRouteTvl, ISwapType} from "./interfaces";

export type IRouterWorkerInput = {
    inputCoinAddress: string,
    outputCoinAddress: string,
    routerGraph: IDict<IDict<IRouteStep[]>>,
    poolData: IDict<IRoutePoolData>
}

export function routeFinderWorker() {
    const MAX_ROUTES_FOR_ONE_COIN = 5;
    const MAX_DEPTH = 4;

    const _removeDuplications = (routesA: IRouteTvl[], routesB: IRouteTvl[]) => {
        const routeToStr = (r: IRouteTvl) => r.route.map((s) => s.poolId).toString();
        const routeIdsA = new Set(routesA.map(routeToStr));
        return routesA.concat(routesB.filter((r) => !routeIdsA.has(routeToStr(r))));
    }

    const _sortByTvl = (a: IRouteTvl, b: IRouteTvl) => b.minTvl - a.minTvl || b.totalTvl - a.totalTvl || a.route.length - b.route.length;
    const _sortByLength = (a: IRouteTvl, b: IRouteTvl) => a.route.length - b.route.length || b.minTvl - a.minTvl || b.totalTvl - a.totalTvl;

    // 4 --> 6, 5 --> 7 not allowed
    // 4 --> 7, 5 --> 6 allowed
    const _handleSwapType = (swapType: ISwapType): string => {
        if (swapType === 6) return "4";
        if (swapType === 7) return "5";
        return swapType.toString()
    }

    /** Add step to route */
    const _addStep = (route: IRouteTvl, step: IRouteStep) => ({
        route: route.route.concat(step),
        minTvl: Math.min(step.tvl, route.minTvl),
        totalTvl: route.totalTvl + step.tvl,
    });

    /** Check if item fits in a sorted-sized array */
    function _fits<T>(array: T[], item: T, compareFn: (a: T, b: T) => number, maxSize: number) {
        if (array.length < maxSize) return true;
        const last = array[array.length - 1];
        return compareFn(item, last) < 0;
    }

    /** Add item to sorted-sized array */
    function _sortedPush<T>(array: T[], item: T, compareFn: (a: T, b: T) => number, maxSize: number) {
        if (!_fits(array, item, compareFn, maxSize)) return;
        if (array.length === maxSize) {
            array.pop();
        }
        const position = array.findIndex((existingItem) => compareFn(item, existingItem) < 0);
        if (position === -1) {
            array.push(item);
        } else {
            array.splice(position, 0, item);
        }
    }

    const _isVisitedCoin = (coinAddress: string, route: IRouteTvl): boolean =>
        route.route.find((r) => r.inputCoinAddress === coinAddress) !== undefined

    const _findPool = (route: IRouteTvl, poolId: string) => route.route.find((r) => r.poolId === poolId);

    const findRoutes = ({ inputCoinAddress, outputCoinAddress, routerGraph, poolData }: IRouterWorkerInput): IRouteStep[][] => {
        inputCoinAddress = inputCoinAddress.toLowerCase();
        outputCoinAddress = outputCoinAddress.toLowerCase();

        const routes: IRouteTvl[] = [{route: [], minTvl: Infinity, totalTvl: 0}];
        const targetRoutesByTvl: IRouteTvl[] = [];
        const targetRoutesByLength: IRouteTvl[] = [];

        while (routes.length) {
            const route = routes.pop() as IRouteTvl;
            const inCoin = route.route.length > 0 ? route.route[route.route.length - 1].outputCoinAddress : inputCoinAddress;
            Object.entries(routerGraph[inCoin]).forEach((leaf) => {
                const outCoin = leaf[0], steps = leaf[1];
                if (_isVisitedCoin(outCoin, route)) return;

                steps.forEach((step) => {
                    const pool = poolData[step.poolId];

                    const currentPoolInRoute = _findPool(route, step.poolId);
                    if (currentPoolInRoute) {
                        if (!pool?.is_lending) return;
                        // 4 --> 6, 5 --> 7 not allowed
                        // 4 --> 7, 5 --> 6 allowed
                        if (_handleSwapType(step.swapParams[2]) === _handleSwapType(currentPoolInRoute.swapParams[2])) {
                            return;
                        }
                    }

                    if (step.outputCoinAddress === outputCoinAddress) {
                        const newRoute = _addStep(route, step);
                        _sortedPush(targetRoutesByTvl, newRoute, _sortByTvl, MAX_ROUTES_FOR_ONE_COIN);
                        _sortedPush(targetRoutesByLength, newRoute, _sortByLength, MAX_ROUTES_FOR_ONE_COIN);
                        return;
                    }

                    if (pool?.wrapped_coin_addresses.includes(outputCoinAddress) || pool?.underlying_coin_addresses.includes(outputCoinAddress)) {
                        // Exclude such cases as: cvxeth -> tricrypto2 -> tusd -> susd (cvxeth -> tricrypto2 -> tusd instead)
                        if (!pool?.is_lending) return;
                        // Exclude such cases as: aave -> aave -> 3pool (aave -> aave instead)
                        if (outCoin !== pool?.token_address) return;
                    }

                    if (route.route.length < MAX_DEPTH) {
                        const newRoute = _addStep(route, step);
                        if (_fits(targetRoutesByTvl, newRoute, _sortByTvl, MAX_ROUTES_FOR_ONE_COIN) ||
                            _fits(targetRoutesByLength, newRoute, _sortByLength, MAX_ROUTES_FOR_ONE_COIN)) {
                            routes.push(newRoute); // try another step
                        }
                    }
                })
            })
        }
        return _removeDuplications(targetRoutesByTvl, targetRoutesByLength).map((r) => r.route);
    }

    if (typeof addEventListener === 'undefined') {
        return findRoutes; // for nodejs
    }

    addEventListener('message', (e) => {
        const { type } = e.data;
        if (type === 'findRoutes') {
            postMessage({ type, result: findRoutes(e.data) });
        }
    });
}

// this is a workaround to avoid importing web-worker in the main bundle (nextjs will try to inject invalid hot-reloading code)
export const routeFinderWorkerCode = `${routeFinderWorker.toString()}; ${routeFinderWorker.name}();`;
