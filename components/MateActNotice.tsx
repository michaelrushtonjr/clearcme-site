import { mateActDeadline, type DeaRegistration } from "@/lib/mate-act";
export default function MateActNotice({ registration = {} }: { registration?: DeaRegistration }) {
  return <p data-mate-deadline="approved-2026-09-16">{mateActDeadline(registration).text}</p>;
}
