import type { Route } from "./+types/host";
import HostScreen from "../components/HostScreen";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quiz Host Screen" },
    { name: "description", content: "Host screen for projector display" },
  ];
}

export default function HostRoute() {
  return <HostScreen />;
}