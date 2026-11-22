import { redirect } from "next/navigation";

export default function ManagementRedirectPage() {
  redirect("/platform/announcements");
}
