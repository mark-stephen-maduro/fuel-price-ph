const PRIMARY_REGION_ORDER = [{ region: 'NCR', label: 'NCR' }];

export function getPrimaryRegions(regions) {
  return PRIMARY_REGION_ORDER.map((primaryRegion) => {
    const match = regions.find((region) => region.region === primaryRegion.region);

    return {
      key: primaryRegion.region,
      label: primaryRegion.label,
      data: match ?? null,
    };
  });
}

export function getFocusRegion(regions, preferredRegionName) {
  if (preferredRegionName) {
    const matchingRegion = regions.find((region) => region.region === preferredRegionName);

    if (matchingRegion) {
      return matchingRegion;
    }
  }

  return regions.find((region) => region.region === 'NCR') ?? regions[0];
}

export function getHighestGasolineRegion(regions) {
  return regions.reduce((highest, region) =>
    region.products.gasoline.average > highest.products.gasoline.average ? region : highest,
  );
}

export function getFuelDashboardModel(latest, history) {
  const regions = latest.regions;
  const primaryRegions = getPrimaryRegions(regions);

  return {
    latest,
    history,
    regions,
    primaryRegions,
    weeklyAdjustment: latest.weeklyAdjustment,
    focusRegion: getFocusRegion(regions, latest.focusRegionName),
    highestGasolineRegion: getHighestGasolineRegion(regions),
  };
}
