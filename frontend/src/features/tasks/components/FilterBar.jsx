import { useTranslation } from "react-i18next";
import CustomSelect from "@/shared/components/CustomSelect";

const FilterBar = ({ selectedStatus, onStatusChange }) => {
  const { t } = useTranslation("workspace");

  const statusOptions = [
    { value: "all", label: t("allTasksCasedAllTasks") },
    { value: "pending", label: t("pendingTasks") },
    { value: "in-progress", label: t("inProgressTasks") },
    { value: "completed", label: t("completedTasks") },
    { value: "given-up", label: t("givenUpTasks") },
  ];

  return (
    <div className="relative">
      <CustomSelect
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label={t("filterByStatus")}
        className="ui-input min-w-[200px]"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CustomSelect>
    </div>
  );
};

export default FilterBar;
