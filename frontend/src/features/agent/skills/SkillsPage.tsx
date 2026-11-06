import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Search,
  Loader2,
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useSkills,
  useToggleSkillMutation,
  useSessionKey,
  currentSessionKey,
} from "./useSkillQueries";
import { TemplateGallery } from "./TemplateGallery";
import { AgentNavigation } from "../AgentNavigation";
import type { SkillSummary } from "@/shared/types/skill";
import "./skills.css";

export function SkillsPage() {
  const sessionKey = useSessionKey();
  return <SkillsList key={sessionKey} />;
}

function SkillsList() {
  const sessionKey = useSessionKey();
  const { data: skills, isLoading, error, refetch } = useSkills();
  const [searchQuery, setSearchQuery] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const toggleMutation = useToggleSkillMutation();
  const filtered = useMemo(
    () =>
      (skills ?? []).filter((s) =>
        `${s.name} ${s.description}`
          .toLocaleLowerCase()
          .includes(searchQuery.trim().toLocaleLowerCase()),
      ),
    [skills, searchQuery],
  );
  const handleToggle = async (skill: SkillSummary) => {
    setToggleError(null);
    try {
      await toggleMutation.mutateAsync({ skill, enabled: !skill.enabled });
      if (currentSessionKey() === sessionKey)
        setNotice("Changes apply from the next chat turn");
    } catch (err) {
      if (currentSessionKey() === sessionKey)
        setToggleError(
          err instanceof Error
            ? err.message
            : "Unable to update skill. Please try again.",
        );
    }
  };
  return (
    <div className="ui-page-shell skills-page">
      <TemplateGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      <div className="skills-section-bar">
        <span className="skills-section-name">
          <span className="skills-orbit-dot" />
          Orbit Agent
        </span>
        <AgentNavigation active="skills" />
      </div>
      <header className="skills-heading">
        <div>
          <h1 className="ui-page-title">Personal Skills</h1>
          <p className="ui-page-description">
            Customize how Agent works with you.
          </p>
        </div>
        <div className="skills-actions">
          <button
            className="ui-btn-secondary"
            onClick={() => setGalleryOpen(true)}
          >
            <BookOpen size={16} />
            Add from template
          </button>
          <Link className="ui-btn-primary" to="/agent/skills/new">
            <Plus size={17} />
            Create skill
          </Link>
        </div>
      </header>
      {(toggleError || notice) && (
        <div
          className={`skills-notice ${toggleError ? "skills-notice--error" : ""}`}
          role={toggleError ? "alert" : "status"}
        >
          {toggleError ? <AlertCircle size={17} /> : <Check size={17} />}
          <span>{toggleError || notice}</span>
          <button
            className="skills-icon-button"
            aria-label="Close notice"
            onClick={() => {
              setToggleError(null);
              setNotice(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section className="skill-library" aria-label="Personal skills library">
        <div className="skill-library-toolbar">
          <div>
            <h2>
              Your skills{" "}
              <span className="skill-count">{skills?.length ?? 0}</span>
            </h2>
            <p>
              {skills?.filter((s) => s.enabled).length ?? 0} active{" "}
              <span aria-hidden="true">·</span> Max 50 skills
            </p>
          </div>
          <label className="skill-search">
            <Search size={17} />
            <span className="sr-only">Search skills</span>
            <input
              type="search"
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        {isLoading ? (
          <div className="skills-empty" role="status">
            <Loader2 className="animate-spin" />
            Loading skills…
          </div>
        ) : error ? (
          <div className="skills-empty" role="alert">
            <AlertCircle />
            <h3>Unable to load skills</h3>
            <p>Check your connection and try again.</p>
            <button className="ui-btn-secondary" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="skills-empty">
            <div className="skill-empty-symbol">
              <BookOpen size={28} />
            </div>
            <h3>
              {searchQuery
                ? "No matching skills found"
                : "No personal skills yet"}
            </h3>
            <p>
              {searchQuery
                ? "Try a different keyword or clear your search to see all skills."
                : "Save guidelines you frequently repeat. Agent will read and apply them when relevant to your conversation."}
            </p>
            {searchQuery ? (
              <button
                className="ui-btn-secondary"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </button>
            ) : (
              <button
                className="skill-text-action"
                onClick={() => setGalleryOpen(true)}
              >
                Explore IELTS and Gym templates <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <ul className="skill-list">
            {filtered.map((skill) => (
              <li
                key={skill.id}
                className={`skill-row ${!skill.enabled ? "skill-row--paused" : ""}`}
              >
                <Link
                  to={`/agent/skills/${skill.id}`}
                  className="skill-row-link"
                >
                  <span className="skill-document-icon">
                    {skill.sourceTemplateId ? (
                      <BookOpen size={21} />
                    ) : (
                      <SlidersHorizontal size={21} />
                    )}
                  </span>
                  <div className="skill-row-copy">
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    <div className="skill-row-meta">
                      <span>
                        {skill.sourceTemplateId
                          ? `From ${skill.sourceTemplateId === "ielts" ? "IELTS" : skill.sourceTemplateId === "gym" ? "Gym" : skill.sourceTemplateId} template`
                          : "Custom"}
                      </span>
                      <span>v{skill.version}</span>
                      <span>
                        Updated{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(skill.updatedAt))}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="skill-row-state">
                  <span>{skill.enabled ? "Enabled" : "Disabled"}</span>
                  <button
                    className="skill-switch"
                    role="switch"
                    aria-checked={skill.enabled}
                    aria-label={`Toggle ${skill.name}`}
                    disabled={toggleMutation.isPending}
                    onClick={() => void handleToggle(skill)}
                  >
                    <span />
                  </button>
                </div>
                <ChevronRight
                  className="skill-row-chevron"
                  size={17}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="skill-library-footer">
          <BookOpen size={15} />
          <span>
            Agent only reads relevant skills. You can edit or disable them anytime.
          </span>
        </div>
      </section>
    </div>
  );
}
