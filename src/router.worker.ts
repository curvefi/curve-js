// Breadth-first search
import {IDict, IRoutePoolData, IRouteStep, IRouteTvl, ISwapType} from "./interfaces";

type FindRoute = (inputCoinAddress: string, outputCoinAddress: string, routerGraph: IDict<IDict<IRouteStep[]>>, poolData: IDict<IRoutePoolData>) => IRouteTvl[];
export let findRouteAlgos: FindRoute[];

export function routerWorker(): void {
    const addStep = (route: IRouteTvl, step: IRouteStep) => ({
        route: [...route.route, step],
        minTvl: Math.min(step.tvl, route.minTvl),
        totalTvl: route.totalTvl + step.tvl,
    });

    function log(fnName: string, ...args: unknown[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`curve-js/router-worker@${new Date().toISOString()} -> ${fnName}:`, args)
        }
    }

    const MAX_ROUTES_FOR_ONE_COIN = 5;
    const MAX_DEPTH = 4;

    const _removeDuplications = (routes: IRouteTvl[]) =>
        routes.filter(
            (r, i, _routes) => _routes.map((r) => r.route.map((s) => s.poolId).toString()).indexOf(r.route.map((s) => s.poolId).toString()) === i
        )
    const itemAt = <T>(route: T[], index: number) => route.length > index ? route[index] : undefined;
    const lastItem = <T>(route: T[]) => itemAt(route, route.length - 1);
    const _sortByTvl = (a: IRouteTvl, b: IRouteTvl) => b.minTvl - a.minTvl || b.totalTvl - a.totalTvl || a.route.length - b.route.length;
    const _sortByLength = (a: IRouteTvl, b: IRouteTvl) => a.route.length - b.route.length || b.minTvl - a.minTvl || b.totalTvl - a.totalTvl;

    // 4 --> 6, 5 --> 7 not allowed
    // 4 --> 7, 5 --> 6 allowed
    const _handleSwapType = (swapType: ISwapType): string => {
        if (swapType === 6) return "4";
        if (swapType === 7) return "5";
        return swapType.toString()
    }

    class SortedSizedArray<T> {
        readonly items: T[] = [];
        constructor(private readonly compareFn: (a: T, b: T) => number, private readonly maxSize: number) {}

        push(item: T) {
            if (!this.fits(item)) {
                return;
            }
            if (this.items.length === this.maxSize) {
                this.items.pop();
            }
            const position = this.items.findIndex((existingItem) => this.compareFn(item, existingItem) < 0);
            if (position === -1) {
                this.items.push(item);
            } else {
                this.items.splice(position, 0, item);
            }
        }
        fits(item: T): boolean {
            if (this.items.length < this.maxSize) return true;
            const last = this.items[this.items.length - 1];
            return this.compareFn(item, last) < 0;
        }
    }

    const _isVisitedCoin = (coinAddress: string, route: IRouteTvl): boolean =>
        route.route.find((r) => r.inputCoinAddress === coinAddress) !== undefined

    const _findPool = (route: IRouteTvl, poolId: string) => route.route.find((r) => r.poolId === poolId);

    const _isVisitedPool = (poolId: string, route: IRouteTvl): boolean => _findPool(route, poolId) !== undefined

    const _findRoutes0: FindRoute = (inputCoinAddress, outputCoinAddress, routerGraph, poolData) => {

        inputCoinAddress = inputCoinAddress.toLowerCase();
        outputCoinAddress = outputCoinAddress.toLowerCase();

        const routes: IRouteTvl[] = [{ route: [], minTvl: Infinity, totalTvl: 0 }];
        let targetRoutes: IRouteTvl[] = [];
        let count = 0;
        const start = Date.now();

        while (routes.length > 0) {
            count++;
            // @ts-ignore
            const route: IRouteTvl = routes.pop();
            const inCoin = route.route.length > 0 ? route.route[route.route.length - 1].outputCoinAddress : inputCoinAddress;

            if (inCoin === outputCoinAddress) {
                targetRoutes.push(route);
            } else if (route.route.length <= MAX_DEPTH) {
                const inCoinGraph = routerGraph[inCoin];
                for (const outCoin in inCoinGraph) {
                    if (_isVisitedCoin(outCoin, route)) continue;

                    for (const step of inCoinGraph[outCoin]) {
                        const pool = poolData[step.poolId];

                        if (!pool?.is_lending && _isVisitedPool(step.poolId, route)) continue;

                        // 4 --> 6, 5 --> 7 not allowed
                        // 4 --> 7, 5 --> 6 allowed
                        const routePoolIdsPlusSwapType = route.route.map((s) => s.poolId + "+" + _handleSwapType(s.swapParams[2]));
                        if (routePoolIdsPlusSwapType.includes(step.poolId + "+" + _handleSwapType(step.swapParams[2]))) continue;

                        const poolCoins = pool ? pool.wrapped_coin_addresses.concat(pool.underlying_coin_addresses) : [];
                        // Exclude such cases as:
                        // cvxeth -> tricrypto2 -> tusd -> susd (cvxeth -> tricrypto2 -> tusd instead)
                        if (!pool?.is_lending && poolCoins.includes(outputCoinAddress) && outCoin !== outputCoinAddress) continue;
                        // Exclude such cases as:
                        // aave -> aave -> 3pool (aave -> aave instead)
                        if (pool?.is_lending && poolCoins.includes(outputCoinAddress) && outCoin !== outputCoinAddress && outCoin !== pool.token_address) continue;

                        routes.push({
                            route: [...route.route, step],
                            minTvl: Math.min(step.tvl, route.minTvl),
                            totalTvl: route.totalTvl + step.tvl,
                        });
                    }
                }
            }
        }

        targetRoutes = _removeDuplications([
            ...targetRoutes.sort(_sortByTvl).slice(0, MAX_ROUTES_FOR_ONE_COIN),
            ...targetRoutes.sort(_sortByLength).slice(0, MAX_ROUTES_FOR_ONE_COIN),
        ]);
        log(`[old algo] Searched ${count} routes resulting in ${targetRoutes.length} routes between ${inputCoinAddress} and ${outputCoinAddress}`, `${Date.now() - start}ms`);
        return targetRoutes;
    }

    const _findRoutes1: FindRoute = (inputCoinAddress, outputCoinAddress, routerGraph, poolData) => {
        inputCoinAddress = inputCoinAddress.toLowerCase();
        outputCoinAddress = outputCoinAddress.toLowerCase();

        const routes: IRouteTvl[] = [{route: [], minTvl: Infinity, totalTvl: 0}];
        const targetRoutesByTvl = new SortedSizedArray<IRouteTvl>(_sortByTvl, MAX_ROUTES_FOR_ONE_COIN);
        const targetRoutesByLength = new SortedSizedArray<IRouteTvl>(_sortByLength, MAX_ROUTES_FOR_ONE_COIN);

        let count = 0;
        const start = Date.now();

        while (routes.length) {
            count++;
            const route = routes.pop() as IRouteTvl;
            const inCoin = lastItem(route.route)?.outputCoinAddress ?? inputCoinAddress;
            const inCoinGraph = routerGraph[inCoin];

            for (const outCoin in inCoinGraph) {
                if (_isVisitedCoin(outCoin, route)) continue;

                for (const step of inCoinGraph[outCoin]) {
                    const {
                        is_lending,
                        token_address,
                        underlying_coin_addresses = [],
                        wrapped_coin_addresses = [],
                    } = poolData[step.poolId] || {};

                    const currentPoolInRoute = route.route.find((r) => r.poolId === step.poolId);
                    if (currentPoolInRoute) {
                        if (!is_lending) continue;
                        // 4 --> 6, 5 --> 7 not allowed
                        // 4 --> 7, 5 --> 6 allowed
                        if (_handleSwapType(step.swapParams[2]) === _handleSwapType(currentPoolInRoute.swapParams[2])) {
                            continue;
                        }
                    }

                    if (step.outputCoinAddress === outputCoinAddress) {
                        const newRoute = addStep(route, step);
                        targetRoutesByTvl.push(newRoute);
                        targetRoutesByLength.push(newRoute);
                        continue;
                    }

                    if (wrapped_coin_addresses.includes(outputCoinAddress) || underlying_coin_addresses.includes(outputCoinAddress)) {
                        // Exclude such cases as: cvxeth -> tricrypto2 -> tusd -> susd (cvxeth -> tricrypto2 -> tusd instead)
                        if (!is_lending) continue;
                        // Exclude such cases as: aave -> aave -> 3pool (aave -> aave instead)
                        if (outCoin !== token_address) continue;
                    }
                    if (route.route.length < MAX_DEPTH) {
                        const newRoute = addStep(route, step);
                        if (targetRoutesByTvl.fits(newRoute) || targetRoutesByLength.fits(newRoute)) {
                            routes.push(newRoute); // try another step
                        }
                    }
                }
            }
        }
        log(`[new algo, sorted array] Searched ${count} routes resulting in ${targetRoutesByTvl.items.length + targetRoutesByLength.items.length} routes between ${inputCoinAddress} and ${outputCoinAddress}`, `${Date.now() - start}ms`);

        return _removeDuplications([...targetRoutesByTvl.items, ...targetRoutesByLength.items]);
    }

    const _findRoutes2: FindRoute = (inputCoinAddress, outputCoinAddress, routerGraph, poolData) => {
        inputCoinAddress = inputCoinAddress.toLowerCase();
        outputCoinAddress = outputCoinAddress.toLowerCase();

        const routes: IRouteTvl[] = [{route: [], minTvl: Infinity, totalTvl: 0}];
        const targetRoutes: IRouteTvl[] = [];

        let count = 0;
        const start = Date.now();

        while (routes.length) {
            count++;
            const route = routes.pop() as IRouteTvl;
            const inCoin = lastItem(route.route)?.outputCoinAddress ?? inputCoinAddress;
            const inCoinGraph = routerGraph[inCoin];

            for (const outCoin in inCoinGraph) {
                if (_isVisitedCoin(outCoin, route)) continue;

                for (const step of inCoinGraph[outCoin]) {
                    const {
                        is_lending,
                        token_address,
                        underlying_coin_addresses = [],
                        wrapped_coin_addresses = [],
                    } = poolData[step.poolId] || {};

                    const currentPoolInRoute = route.route.find((r) => r.poolId === step.poolId);
                    if (currentPoolInRoute) {
                        if (!is_lending) continue;
                        // 4 --> 6, 5 --> 7 not allowed
                        // 4 --> 7, 5 --> 6 allowed
                        if (_handleSwapType(step.swapParams[2]) === _handleSwapType(currentPoolInRoute.swapParams[2])) {
                            continue;
                        }
                    }

                    if (step.outputCoinAddress === outputCoinAddress) {
                        const updatedRoute = addStep(route, step);
                        targetRoutes.push(updatedRoute);
                        continue;
                    }

                    if (wrapped_coin_addresses.includes(outputCoinAddress) || underlying_coin_addresses.includes(outputCoinAddress)) {
                        // Exclude such cases as: cvxeth -> tricrypto2 -> tusd -> susd (cvxeth -> tricrypto2 -> tusd instead)
                        if (!is_lending) continue;
                        // Exclude such cases as: aave -> aave -> 3pool (aave -> aave instead)
                        if (outCoin !== token_address) continue;
                    }
                    if (route.route.length < MAX_DEPTH) {
                        routes.push(addStep(route, step)); // try another step
                    }
                }
            }
        }
        log(`[new algo, normal array] Searched ${count} routes resulting in ${targetRoutes.length} routes between ${inputCoinAddress} and ${outputCoinAddress}`, `${Date.now() - start}ms`);

        return _removeDuplications([
            ...targetRoutes.sort(_sortByTvl).slice(0, MAX_ROUTES_FOR_ONE_COIN),
            ...targetRoutes.sort(_sortByLength).slice(0, MAX_ROUTES_FOR_ONE_COIN),
        ]);
    }

    addEventListener('message', (e) => {
        const {type, routerGraph, outputCoinAddress, inputCoinAddress, poolData} = e.data;
        if (type === 'findRoutes') {
            const routes = _findRoutes2(inputCoinAddress, outputCoinAddress, routerGraph, poolData);
            postMessage({type, routes});
        }
    });

    findRouteAlgos = [_findRoutes0, _findRoutes1, _findRoutes2];
}

// this is a workaround to avoid importing web-worker in the main bundle (nextjs will try to inject invalid hot-reloading code)
const routerWorkerCode = `${routerWorker.toString()}; ${routerWorker.name}();`;
const blob = new Blob([routerWorkerCode], { type: 'application/javascript' });
export const routerWorkerBlob = URL.createObjectURL(blob);
