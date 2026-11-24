import { FacultyWeeklyLogsView } from "@/features/faculty/views/FacultyWeeklyLogsView";

export const metadata = {
  title: "Weekly Progress Logs | Colabex",
  description: "Verify and sign Friday student engineering diary logs.",
};

export default function FacultyWeeklyLogsPage() {
  return <FacultyWeeklyLogsView />;
}
