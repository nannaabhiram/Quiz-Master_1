import type { Route } from "./+types/host";
import HostScreen from "../components/HostScreen";
import ProtectedRoute from "../components/ProtectedRoute";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "quiz Host Screen" },
    { name: "description", content: "Host screen for projector display" },
  ];
}

export default function HostRoute() {
  return (
    <ProtectedRoute>
      <HostScreen />
    </ProtectedRoute>
  );
}