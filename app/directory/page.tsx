import RequireAuth from "@/components/RequireAuth";
import DirectoryView from "./DirectoryView";

export const metadata = { title: "Danh bạ - TCDN4 Hub" };

export default function DirectoryPage() {
  return (
    <RequireAuth>
      <DirectoryView />
    </RequireAuth>
  );
}
