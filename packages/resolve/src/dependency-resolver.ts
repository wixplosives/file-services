/**
 * Extracts and resolves dependency requests of one or more assets, shallow or deep.
 *
 * @param assetKey unique key(s) of asset(s) to resolve dependency requests for.
 * @param deep should process follow resolved requests, and resolve these assets as well (defaults to `false`).
 * @returns record containing asset keys as fields, and their resolved dependecy requests as values.
 */
export type DependencyResolver = (assetKey: string | string[], deep?: boolean) => Record<string, ResolvedRequests>;

/**
 * Record containing requests as fields, and their resolutions (asset keys) as values.
 * `undefined` is used when a request couldn't be resolved.
 */
export type ResolvedRequests = Record<string, string | false | undefined>;

export interface IDependencyResolverOptions {
  /**
   * Extracts a dependency requests list of an asset.
   *
   * @param assetKey unique identifier for an asset to extract from.
   * @returns list of dependency requests by the asset.
   */
  extractRequests(assetKey: string): string[];

  /**
   * Resolve a dependency request by an asset.
   *
   * @param assetKey unique identifier of the requesting asset.
   * @returns unique key for the asset the request resolves to.
   */
  resolveRequest: (assetKey: string, request: string) => string | false | undefined;
}

const { hasOwnProperty } = Object.prototype;

/**
 * Create a dependency resolver by providing a callback to extract requests,
 * and another callbck to resolve such requests.
 */
export function createDependencyResolver({
  extractRequests,
  resolveRequest,
}: IDependencyResolverOptions): DependencyResolver {
  return (assetKey, deep) => {
    const resolvedAssets = Object.create(null) as Record<string, ResolvedRequests>;
    const assetsToResolve: string[] = Array.isArray(assetKey) ? [...assetKey] : [assetKey];

    while (assetsToResolve.length > 0) {
      const currentAsset = assetsToResolve.shift()!;

      if (resolvedAssets[currentAsset]) {
        continue;
      }

      const resolvedRequests = Object.create(null) as ResolvedRequests;
      resolvedAssets[currentAsset] = resolvedRequests;

      const assetRequests = extractRequests(currentAsset);

      for (const request of assetRequests) {
        if (hasOwnProperty.call(resolvedRequests, request)) {
          continue; // already resolved this request
        }

        const resolvedRequest = resolveRequest(currentAsset, request);
        resolvedRequests[request] = resolvedRequest;
        if (deep && resolvedRequest !== undefined && resolvedRequest !== false) {
          assetsToResolve.push(resolvedRequest);
        }
      }
    }

    return resolvedAssets;
  };
}
