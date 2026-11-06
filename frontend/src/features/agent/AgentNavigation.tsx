import { BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import "./agentNavigation.css";

export function AgentNavigation({ active }: { active: "chat" | "skills" }) {
  return (
    <nav className="agent-navigation" aria-label="Agent navigation">
      <Link to="/agent" aria-current={active === "chat" ? "page" : undefined}>
        <MessageSquare size={15} aria-hidden="true" /> Chat
      </Link>
      <Link
        to="/agent/skills"
        aria-current={active === "skills" ? "page" : undefined}
      >
        <BookOpen size={15} aria-hidden="true" /> Skills
      </Link>
    </nav>
  );
}
