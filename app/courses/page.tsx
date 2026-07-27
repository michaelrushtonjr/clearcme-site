import { redirect } from "next/navigation";

// /courses has no index view — topic pages live at /courses/[topic].
// Send stray links to the homepage instead of a 404.
export default function CoursesIndexPage() {
  redirect("/");
}
