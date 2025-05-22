async function urlToJson(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(5000) })
    .then((res) => res.json())
    .catch((_) => undefined);
}

async function urlToBuffer(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(5000) })
    .then(async (res) => Buffer.from(await res.arrayBuffer()))
    .catch((_) => undefined);
}

export { urlToBuffer, urlToJson };
