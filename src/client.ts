import { Requester } from "./utils/requester";
import { CourseManager } from "./courses";
import { MoodleAuth } from "./types";

export class MoodleClient {
  private requester: Requester;
  public courses: CourseManager;
  private sesskey: string | null = null;

  constructor(private baseUrl: string) {
    this.requester = new Requester();
    this.courses = new CourseManager(this.baseUrl, this.requester);
  }

  async login(username: string, password: string, opt?: { signal?: AbortSignal }): Promise<MoodleAuth> {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    let res = await this.requester.request(`${this.baseUrl}/login/index.php`, {
      method: "GET",
      signal: opt?.signal,
    });
    let body = await res.text();
    let cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("MoodleSession"))
      ?.split("; ")[0];

    if (cookie) this.requester.setCookie(cookie);

    const logintokenMatch = body.match(/input type="hidden" name="logintoken" value="([^"]+)"/);
    if (!logintokenMatch) {
      throw new Error("Moodle login token not found");
    }
    const logintoken = logintokenMatch[1];
    form.append("logintoken", logintoken);

    res = await this.requester.request(`${this.baseUrl}/login/index.php`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: form.toString(),
      signal: opt?.signal,
    });

    cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("MoodleSession"))
      ?.split("; ")[0];

    if (!cookie) {
      throw new Error("Failed to get session cookie after login");
    }

    this.requester.setCookie(cookie);
    this.sesskey = await this.getSesskey(opt);
    this.courses.setSesskey(this.sesskey);

    return { cookie, sesskey: this.sesskey };
  }

  async verifyToken(opt?: { signal?: AbortSignal }): Promise<boolean> {
    const res = await this.requester.request(this.baseUrl, {
      method: "GET",
      signal: opt?.signal,
    });
    const body = await res.text();
    return /class="dropdown-item" href="https:\/\/[^\/]+\/user\/profile\.php" title="View profile"/.test(body);
  }

  async getSesskey(opt?: { signal?: AbortSignal }): Promise<string | null> {
    const res = await this.requester.request(this.baseUrl, {
      method: "GET",
      signal: opt?.signal,
    });
    const body = await res.text();
    const sesskeyMatch = body.match(/"sesskey":"([^"]+)"/);
    if (!sesskeyMatch) return null;
    return sesskeyMatch[1];
  }

  setAuth(cookie: string, sesskey: string | null = null) {
    this.requester.setCookie(cookie);
    this.sesskey = sesskey;
    this.courses.setSesskey(sesskey);
  }

  getAuth(): MoodleAuth {
    return {
      cookie: this.requester.getCookie(),
      sesskey: this.sesskey,
    };
  }
}
