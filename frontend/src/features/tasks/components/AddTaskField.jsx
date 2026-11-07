import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";

const AddTaskForm = ({ onAddTask }) => {
  const { t } = useTranslation("workspace");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Medium");

  const categoriesQuery = useCategoriesQuery();
  const categories = useMemo(
    () => categoriesQuery.data || [],
    [categoriesQuery.data],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask({
        title: title.trim(),
        category: category || categories[0]?.name || "",
        priority,
      });
      setTitle("");
      setCategory("");
      setPriority("Medium");
    }
  };

  return (
    <div className="ui-section-card ui-card-padding">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("addANewTask")}
            className="ui-input flex-1"
            aria-label={t("taskTitleCasedTasktitle")}
          />
          <button
            type="submit"
            className="ui-btn-primary ui-btn-opposite-corners"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t("add")}</span>
          </button>
        </div>

        <div className="flex gap-3">
          <CustomSelect
            value={category || categories[0]?.name || ""}
            onChange={(e) => setCategory(e.target.value)}
            className="ui-input"
            aria-label={t("category")}
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </CustomSelect>

          <CustomSelect
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="ui-input"
            aria-label={t("priority")}
          >
            <option value="Low">{t("low")}</option>
            <option value="Medium">{t("medium")}</option>
            <option value="High">{t("high")}</option>
          </CustomSelect>
        </div>
      </form>
    </div>
  );
};

export default AddTaskForm;
