import { redirect } from "next/navigation";

export default function PlatformLogoutPage() {
  redirect("/platform/dashboard");
}
