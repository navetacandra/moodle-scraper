import { Requester } from "./utils/requester";
import { MoodleEvent } from "./types";

const header = `<div data-type="event" data-course-id="[^"]+" data-event-id="([^"]+)" class="event mt-3" data-event-component="mod_assign" data-event-eventtype="[^"]+" data-eventtype-course="1" data-event-title="([^"]+)" data-event-count="[^"]*?">\\s*?<div class="card rounded">\\s*?<div class="box card-header clearfix calendar_event_course">\\s*?<div class="commands float-sm-right">\\s*?</div>\\s*?<div class="d-inline-block mt-1 align-top"><img [^>]*?>\\s*?</div>\\s*?<div class="d-inline-block">\\s*?<h3 class="name d-inline-block">[^<]+</h3>\\s*?</div>\\s*?</div>\\s*?<div class="description card-body">\\s*?`;
const row1 = `<div class="row">\\s*?<div class="col-1"><i class="icon fa fa-clock-o fa-fw ?"[^>]*?></i></div>\\s*?<div class="col-11"><a href=".*?/calendar/view\\.php\\?view=day&amp;time=([0-9]+)">[^<]*?</a>[^<]*?</div>\\s*?</div>\\s*?`;
const row2 = `<div class="row mt-1">\\s*?<div class="col-1"><i class="icon fa fa-calendar fa-fw ?"[^>]*?></i></div>\\s*?<div class="col-11">[^<]*?</div>\\s*?</div>\\s*?`;
const row3 = `<div class="row mt-1">\\s*?<div class="col-1"><i class="icon fa fa-align-left fa-fw ?"[^>]*?></i></div>\\s*?<div class="description-content col-11">([\\s\\S]*?)</div>\\s*?</div>\\s*?`;
const row4 = `<div class="row mt-1">\\s*?<div class="col-1"><i class="icon fa fa-graduation-cap fa-fw ?"[^>]*?></i></div>\\s*?<div class="col-11"><a href=".*?/course/view\\.php\\?id=([0-9]+)">([^<]+)</a></div>\\s*?</div>\\s*?</div>\\s*?`;
const footer = `<div class="card-footer text-right bg-transparent">\\s*?<a href=".*?/mod/assign/view\\.php\\?id=([0-9]+)[^"]*?" class="card-link">[^<]*?</a>\\s*?`;

const fullPattern = `${header}${row1}${row2}(${row3})?${row4}${footer}`;

export class EventManager {
  constructor(
    private baseUrl: string,
    private requester: Requester,
  ) {}

  async upcoming(opt?: { signal?: AbortSignal }): Promise<MoodleEvent[]> {
    const res = await this.requester.request(
      `${this.baseUrl}/calendar/view.php?view=upcoming`,
      {
        method: "GET",
        signal: opt?.signal,
      },
    );

    const body = await res.text();
    const fullRegex = new RegExp(fullPattern, "gm");
    const matches = body.match(fullRegex);

    if (!matches) return [];

    const headerRegex = new RegExp(header);
    const row1Regex = new RegExp(row1);
    const row3Regex = new RegExp(row3);
    const row4Regex = new RegExp(row4);
    const footerRegex = new RegExp(footer);

    return matches.map((m) => {
      const headerMatch = m.match(headerRegex);
      const row1Match = m.match(row1Regex);
      const row3Match = m.match(row3Regex);
      const row4Match = m.match(row4Regex);
      const footerMatch = m.match(footerRegex);

      return {
        id: headerMatch?.[1] ?? "",
        title: headerMatch?.[2] ?? "",
        time: parseInt(row1Match?.[1] ?? "0"),
        description: row3Match?.[1] ?? null,
        course_id: parseInt(row4Match?.[1] ?? "0"),
        course_name: (row4Match?.[2] ?? "").replace(/&amp;/g, "&"),
        assign_id: footerMatch?.[1] ?? "",
      };
    });
  }
}
