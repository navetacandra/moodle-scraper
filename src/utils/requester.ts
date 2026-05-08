export class Requester {
  private userAgent =
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0,gzip(gfe)";

  constructor(private cookie: string = "") {}

  setCookie(cookie: string) {
    this.cookie = cookie;
  }

  getCookie() {
    return this.cookie;
  }

  async request(
    url: string,
    init?: RequestInit & { signal?: AbortSignal },
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (this.cookie) {
      headers.set("cookie", this.cookie);
    }
    headers.set("User-Agent", this.userAgent);
    headers.set("Accept", "*/*");
    headers.set("Cache-Control", "no-cache");

    return fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });
  }

  async requestJson<T>(
    url: string,
    init?: RequestInit & { signal?: AbortSignal },
  ): Promise<T> {
    const res = await this.request(url, init);
    return (await res.json()) as T;
  }
}
