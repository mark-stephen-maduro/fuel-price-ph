export function getFocusRegion(regions) {
  return regions.find((region) => region.region === 'NCR') ?? regions[0];
}

export function getHighestGasolineRegion(regions) {
  return regions.reduce((highest, region) =>
    region.products.gasoline.average > highest.products.gasoline.average ? region : highest,
  );
}

export function getFuelDashboardModel(latest, history) {
  const regions = latest.regions;

  return {
    latest,
    history,
    regions,
    weeklyAdjustment: latest.weeklyAdjustment,
    focusRegion: getFocusRegion(regions),
    highestGasolineRegion: getHighestGasolineRegion(regions),
  };
}
