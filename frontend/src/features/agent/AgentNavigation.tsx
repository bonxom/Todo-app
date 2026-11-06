import { BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import "./agentNavigation.css";

export function AgentNavigation({ active }: { active: "chat" | "skills" }) {
  return (
    <nav className="agent-navigation" aria-label="Điều hướng Agent">
      <Link to="/agent" aria-current={active === "chat" ? "page" : undefined}>
        <MessageSquare size={15} aria-hidden="true" /> Trò chuyện
      </Link>
      <Link
        to="/agent/skills"
        aria-current={active === "skills" ? "page" : undefined}
      >
        <BookOpen size={15} aria-hidden="true" /> Kỹ năng
      </Link>
    </nav>
  );
}
