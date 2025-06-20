function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

export { parseJson };
