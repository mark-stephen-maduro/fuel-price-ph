import { useEffect, useState } from 'react';
import { fetchFuelData } from '../services/fuelDataApi';

export function useFuelData() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadFuelData() {
      try {
        const { latest: latestData, history: historyData } = await fetchFuelData();

        if (!isMounted) {
          return;
        }

        setLatest(latestData);
        setHistory(historyData);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load fuel data.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFuelData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { latest, history, loading, error };
}
