import { CompareSection } from './components/CompareSection';
import { HeroSection } from './components/HeroSection';
import { LatestPricesSection } from './components/LatestPricesSection';
import { MethodologySection } from './components/MethodologySection';
import { SiteHeader } from './components/SiteHeader';
import { StatusScreen } from './components/StatusScreen';
import { TrendsSection } from './components/TrendsSection';
import { useFuelData } from './hooks/useFuelData';
import { getFuelDashboardModel } from './utils/fuelData';

function App() {
  const { latest, history, loading, error } = useFuelData();

  if (loading) {
    return <StatusScreen message="Loading DOE-based fuel data..." />;
  }

  if (error || !latest) {
    return <StatusScreen message={`Failed to load data. ${error ?? ''}`.trim()} />;
  }

  const dashboard = getFuelDashboardModel(latest, history);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <HeroSection
          latest={dashboard.latest}
          focusRegion={dashboard.focusRegion}
          primaryRegions={dashboard.primaryRegions}
        />
        <LatestPricesSection
          primaryRegions={dashboard.primaryRegions}
          weeklyAdjustment={dashboard.weeklyAdjustment}
        />
        <CompareSection
          regions={dashboard.regions}
          highestGasolineRegion={dashboard.highestGasolineRegion}
        />
        <TrendsSection history={dashboard.history} />
        <MethodologySection />
      </main>
    </div>
  );
}

export default App;
