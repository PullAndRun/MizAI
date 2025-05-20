async function urlToJson(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(5000) })
    .then((res) => res.json())
    .catch((_) => undefined);
}

export { urlToJson };
