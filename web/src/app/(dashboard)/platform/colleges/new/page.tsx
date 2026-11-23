import { AddCollegeView } from "@/features/platform/colleges/AddCollegeView";

export const metadata = {
  title: "Add New College | Colabex Super Admin",
  description: "Register a new institution on Project Hub and provision its dedicated multi-tenant schema.",
};

export default function AddCollegePage() {
  return <AddCollegeView />;
}
