function getConfig() {
  const url = process.env.BLOB_BUNNY_URL;
  const token = process.env.BLOB_BUNNY_TOKEN;
  if (!url) {
    throw new Error("BLOB_BUNNY_URL is not set in the environment.");
  }
  if (!token) {
    throw new Error("BLOB_BUNNY_TOKEN is not set in the environment.");
  }
  return { baseUrl: url.replace(/\/+$/, ""), token };
}

/**
 * blob-bunny keys a blob by its request URL pathname, so `path` must be the
 * exact stored path (e.g. `memory/foo.md`) with no leading slash. Its charset
 * matches blob-bunny's own validation, so it is safe to place directly in the
 * URL without percent-encoding.
 */
function blobUrl(baseUrl: string, path: string) {
  return `${baseUrl}/${path}`;
}

export async function getBlob(path: string): Promise<string | null> {
  const { baseUrl, token } = getConfig();
  const res = await fetch(blobUrl(baseUrl, path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`blob-bunny read failed (${res.status}): ${await res.text()}`);
  }
  return res.text();
}

export async function putBlob(
  path: string,
  content: string,
  { filename = "memory.md", contentType = "text/markdown" } = {},
): Promise<void> {
  const { baseUrl, token } = getConfig();
  const form = new FormData();
  form.append("file", new File([content], filename, { type: contentType }));
  const res = await fetch(blobUrl(baseUrl, path), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`blob-bunny write failed (${res.status}): ${await res.text()}`);
  }
}

export async function deleteBlob(path: string): Promise<boolean> {
  const { baseUrl, token } = getConfig();
  const res = await fetch(blobUrl(baseUrl, path), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`blob-bunny delete failed (${res.status}): ${await res.text()}`);
  }
  return true;
}
