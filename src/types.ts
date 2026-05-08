export interface MoodleTeacher {
  id: number;
  name: string;
  nip: string | null;
}

export interface MoodleSearchResult {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  teachers: MoodleTeacher[];
}

export interface MoodleAssignmentDetail {
  opened_time: number;
  due_time: number;
  submitted: boolean;
  is_late: boolean;
  is_overdue: boolean;
}

export interface MoodleCourseContent {
  id: string;
  type: string;
  title: string;
  detail?: MoodleAssignmentDetail;
}

export interface MoodleCourseDetail {
  title: string;
  contents: MoodleCourseContent[];
}

export interface RawMoodleCourse {
  id: number;
  fullname: string;
  coursecategory: string;
  startdate: number;
  enddate: number;
}

export interface MoodleCoursesResponse {
  error: boolean;
  data: {
    courses: RawMoodleCourse[];
  };
}

export interface MoodleCourse {
  id: number;
  name: string;
  category: string;
  start: number;
  end: number;
}

export interface MoodleAuth {
  cookie: string;
  sesskey: string | null;
}

export interface MoodleClientOptions {
  awake?: boolean;
  awakeInterval?: number; // in milliseconds
}

export interface MoodleEvent {
  id: string;
  title: string;
  time: number;
  description: string | null;
  course_id: number;
  course_name: string;
  assign_id: string;
}
