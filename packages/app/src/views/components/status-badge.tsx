import type { FC } from "hono/jsx";
import type { Status } from "@marapulse/shared";

const STATUS_STYLES: Record<Status, { bg: string; text: string }> = {
  new: { bg: "#EFF6FF", text: "#1D4ED8" },
  under_review: { bg: "#FEF9C3", text: "#854D0E" },
  planned: { bg: "#F3E8FF", text: "#7C3AED" },
  in_progress: { bg: "#FFF7ED", text: "#C2410C" },
  done: { bg: "#ECFDF5", text: "#059669" },
  dismissed: { bg: "#F3F4F6", text: "#6B7280" },
};

const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
  dismissed: "Dismissed",
};

type Props = {
  status: Status;
};

export const StatusBadge: FC<Props> = ({ status }) => {
  const style = STATUS_STYLES[status];
  return (
    <span
      class="status-badge"
      style={`background: ${style.bg}; color: ${style.text}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
};
