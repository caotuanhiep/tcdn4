import RequireAuth from "@/components/RequireAuth";
import GalleryView from "./GalleryView";

export const metadata = { title: "Ký ức - TCDN4 Hub" };

export default function GalleryPage() {
  return (
    <RequireAuth>
      <GalleryView />
    </RequireAuth>
  );
}
