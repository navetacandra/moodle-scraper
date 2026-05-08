import { Requester } from "./utils/requester";
import {
  MoodleAssignmentDetail,
  MoodleCourse,
  MoodleCourseContent,
  MoodleCourseDetail,
  MoodleCoursesResponse,
  MoodleSearchResult,
  MoodleTeacher,
} from "./types";

export class CourseManager {
  constructor(private baseUrl: string, private requester: Requester, private sesskey: string | null = null) {}

  setSesskey(sesskey: string | null) {
    this.sesskey = sesskey;
  }

  async list(opt?: { signal?: AbortSignal }): Promise<MoodleCourse[]> {
    if (!this.sesskey) {
      throw new Error("Session key is required for listing courses");
    }

    const elearningRes = await this.requester.requestJson<[MoodleCoursesResponse]>(
      `${this.baseUrl}/lib/ajax/service.php?sesskey=${this.sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify([
          {
            index: 0,
            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
            args: {
              offset: 0,
              limit: 0,
              classification: "all",
              sort: "fullname",
              customfieldname: "",
              customfieldvalue: "",
            },
          },
        ]),
        signal: opt?.signal,
      },
    );

    if (elearningRes[0].error) return [];

    const courses = elearningRes[0].data.courses;
    return courses
      .map((c) => {
        return {
          id: c.id,
          name: c.fullname.replace(/&amp;/g, "&"),
          category: c.coursecategory.replace(/&amp;/g, "&"),
          start: c.startdate,
          end: c.enddate,
        };
      })
      .sort((a, b) => b.end - a.end);
  }

  async search(keyword: string, opt?: { signal?: AbortSignal }): Promise<MoodleSearchResult[]> {
    const classOpenPattern = `<div class="coursebox clearfix" data-courseid="([0-9]+)" data-type="1">`;
    const classNamePattern = `<div class="info"><h3 class="coursename"><a [^>]*>(.*?)</a></h3><div class="moreinfo"></div>(<div class="enrolmenticons">(<i [^>]*></i>)*</div>)?</div>`;
    const classSummaryPattern = `<div class="summary"><div class="no-overflow">([\\s\\S]*?)</div></div>(?=\\s*<)`;
    const teacherPattern = `<li>[a-zA-Z]+: <a href="https://[^/]+/user/view\\.php\\?id=([0-9]+)[^"]*">([^<]+)</a></li>`;
    const classTeachersPattern = `<ul class="teachers">(${teacherPattern})+</ul>`;
    const classCategoryPattern = `<div class="coursecat">Category: <a class="" href="https://[^/]+/course/index\\.php\\?categoryid=([^"]+)">([^<]+)</a></div>`;
    const contentPattern = `<div class="content">(${classSummaryPattern})?(${classTeachersPattern})?${classCategoryPattern}</div>`;
    const classPattern = `${classOpenPattern}${classNamePattern}${contentPattern}</div>`;

    const classOpenRegex = new RegExp(classOpenPattern);
    const classNameRegex = new RegExp(classNamePattern);
    const classCategoryRegex = new RegExp(classCategoryPattern);
    const classTeachersRegex = new RegExp(classTeachersPattern);
    const teacherRegex = new RegExp(teacherPattern);
    const teacherGlobalRegex = new RegExp(teacherPattern, "g");
    const classRegex = new RegExp(classPattern, "gm");

    const res = await this.requester.request(
      `${this.baseUrl}/course/search.php?search=${encodeURIComponent(keyword)}&perpage=all`,
      {
        method: "GET",
        signal: opt?.signal,
      },
    );

    const body = await res.text();
    if (!/<h2>Search results: [0-9]+<\/h2>/i.test(body)) return [];

    const classCards = body.match(classRegex);
    if (!classCards) return [];

    const results: MoodleSearchResult[] = classCards.map((_class: string) => {
      const id = parseInt(_class.match(classOpenRegex)?.[1] ?? "-1");

      const rawName = _class.match(classNameRegex)?.[1] ?? "";
      const name = rawName
        .replace(/<\/?span ?[^>]*>/g, "")
        .replace(/&amp;/g, "&");

      const categoryMatch = _class.match(classCategoryRegex) ?? Array(3).fill(null);
      const [, category_id, category_name] = categoryMatch;

      const teacherBlock = _class.match(classTeachersRegex);
      let teachers: MoodleTeacher[] = [];

      if (teacherBlock) {
        const teacherItems = teacherBlock[0].match(teacherGlobalRegex) ?? [];

        teachers = teacherItems.map((t: string) => {
          const [, teacherId, info] = t.match(teacherRegex) ?? Array(3).fill(null);
          const [, teacherName, nip] = info?.match(/^([\s\S]*?) ?([0-9]+)?$/) ?? Array(3).fill(null);

          return {
            id: parseInt(teacherId),
            nip,
            name: teacherName ?? info,
          };
        });
      }

      return {
        id,
        name,
        category_id: parseInt(category_id),
        category_name,
        teachers,
      };
    });

    return results.sort((a, b) => b.id - a.id);
  }

  async getDetail(courseId: string | number, opt?: { signal?: AbortSignal }): Promise<MoodleCourseDetail> {
    const res = await this.requester.request(`${this.baseUrl}/course/view.php?id=${courseId}`, {
      method: "GET",
      signal: opt?.signal,
    });
    const body = await res.text();

    if (body.includes("invalidcourseid") || body.includes('data-rel="fatalerror"')) {
      throw new Error("Invalid E-learning course id");
    }

    const regex = `class="" onclick="" href="https://[^/]+/mod/([a-z]+)/view\\.php\\?id=([0-9]+)"><img src="[^"]+" class="iconlarge activityicon" alt=" " role="presentation" /><span class="instancename">([^<]+)<`;
    const titleMatch = body.match(
      /<a itemprop="url" title="([^""]+)" aria-current="page" href="https:\/\/[^\/]+\/course\/view\.php\?id=[0-9]+"><span itemprop="title">[^<]+<\/span><\/a>/,
    );
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&") : "";

    const rawContents: MoodleCourseContent[] = (body.match(new RegExp(regex, "g")) || []).map((m) => {
      const match = m.match(new RegExp(regex));
      if (!match) return { id: "", type: "", title: "" };
      const [_, type, id, title] = match;
      return { id, type, title };
    });

    const contents = rawContents.map(async (c) => {
      if (c.type === "assign") {
        return {
          ...c,
          detail: await this.getAssignDetail(c.id, opt),
        };
      }
      return c;
    });

    return { title, contents: await Promise.all(contents) };
  }

  async getAssignDetail(postId: string, opt?: { signal?: AbortSignal }): Promise<MoodleAssignmentDetail> {
    const res = await this.requester.request(`${this.baseUrl}/mod/assign/view.php?id=${postId}`, {
      method: "GET",
      signal: opt?.signal,
    });
    const body = await res.text();
    const openedRegex = /<strong>Opened:<\/strong> (.+)/;
    const dueRegex = /<strong>Due:<\/strong> (.+)/;
    const submittedRegex = /<td class="submissionstatussubmitted cell c1 lastcol" style="">/;
    const lateRegex = /<td class="latesubmission cell c1 lastcol" style="">/;
    const overdueRegex = /<td class="overdue cell c1 lastcol" style="">/;

    const opened = body.match(openedRegex);
    const due = body.match(dueRegex);

    return {
      opened_time: opened ? new Date(opened[1]).getTime() / 1000 : 0,
      due_time: due ? new Date(due[1]).getTime() / 1000 : 0,
      submitted: submittedRegex.test(body),
      is_late: lateRegex.test(body),
      is_overdue: overdueRegex.test(body),
    };
  }

  async enroll(courseId: string | number, enrollkey: string, opt?: { signal?: AbortSignal }): Promise<string> {
    if (!this.sesskey) {
      throw new Error("Session key is required for enrollment");
    }

    const res = await this.requester.request(`${this.baseUrl}/enrol/index.php?id=${courseId}`, {
      method: "GET",
      signal: opt?.signal,
    });
    if (res.status === 303) {
      throw new Error("Already enrolled");
    }

    let body = await res.text();

    if (body.includes("invalidcourseid") || body.includes('data-rel="fatalerror"')) {
      throw new Error("Invalid E-learning course id");
    }

    const splitAction = body.split(`action="${this.baseUrl}/enrol/index.php"`);
    body = splitAction[splitAction.length - 1];

    const instanceRegex = /input name="instance" type="hidden" value="([^"]+)"/;
    const qfEnrolFormRegex = (instance: string) =>
      new RegExp(`input name="_qf__${instance}_enrol_self_enrol_form" type="hidden" value="([^"]+)"`);
    const mformExpandedRegex = /input name="mform_isexpanded_id_selfheader" type="hidden" value="([^"]+)"/;

    const instanceMatch = body.match(instanceRegex);
    if (!instanceMatch) throw new Error("Invalid E-learning course id");

    const qfEnrolFormMatch = body.match(qfEnrolFormRegex(instanceMatch[1]));
    if (!qfEnrolFormMatch) throw new Error("Failed get enroll info");

    const mformExpandedMatch = body.match(mformExpandedRegex);
    if (!mformExpandedMatch) throw new Error("Failed get enroll info");

    const payload = {
      sesskey: this.sesskey,
      id: `${courseId}`,
      instance: instanceMatch[1],
      [`_qf__${instanceMatch[1]}_enrol_self_enrol_form`]: qfEnrolFormMatch[1],
      mform_isexpanded_id_selfheader: mformExpandedMatch[1],
      enrolpassword: enrollkey,
      submitbutton: "Enrol me",
    };

    const enrollRes = await this.requester.request(`${this.baseUrl}/enrol/index.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload),
    });

    if (enrollRes.status !== 303) {
      const errorBody = await enrollRes.text();
      const errorMessageMatch = errorBody.match(
        new RegExp(
          `<div class="form-control-feedback invalid-feedback" id="enrolpassword_${instanceMatch[1]}"[^>]+>\\s*(.*)\\s*</div>`,
        ),
      );
      throw new Error(errorMessageMatch ? errorMessageMatch[1] : "Failed to enroll");
    }

    return "Enrollment successful";
  }

  async unenroll(courseId: string | number, opt?: { signal?: AbortSignal }): Promise<string> {
    if (!this.sesskey) {
      throw new Error("Session key is required for unenrollment");
    }

    const res = await this.requester.request(`${this.baseUrl}/course/view.php?id=${courseId}`, {
      method: "GET",
      signal: opt?.signal,
    });
    if (res.status === 303) {
      throw new Error("You're not enrolled");
    }

    const body = await res.text();

    if (body.includes("invalidcourseid") || body.includes('data-rel="fatalerror"')) {
      throw new Error("Invalid E-learning course id");
    }

    const enrollIdMatch = body.match(
      /<a href="https:\/\/[^\/]+\/enrol\/self\/unenrolself\.php\?enrolid=([0-9]+)" id="action_[^"]+" [^>]*>/,
    );
    if (!enrollIdMatch) throw new Error("You're not enrolled");

    const enrollId = enrollIdMatch[1];
    const payload = {
      sesskey: this.sesskey,
      enrolid: enrollId,
      confirm: "1",
    };
    const unenrollRes = await this.requester.request(`${this.baseUrl}/enrol/self/unenrolself.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload).toString(),
    });

    if (unenrollRes.status !== 303) {
      throw new Error("Failed to unenroll");
    }
    return "Unenroll successful";
  }
}
