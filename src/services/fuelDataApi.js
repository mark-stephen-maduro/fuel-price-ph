async function readJsonFile(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load ${path}.`);
  }

  return response.json();
}

export async function fetchFuelData() {
  const [latest, historyPayload] = await Promise.all([
    readJsonFile('./data/latest.json'),
    readJsonFile('./data/history.json'),
  ]);

  return {
    latest,
    history: historyPayload.history,
  };
}
