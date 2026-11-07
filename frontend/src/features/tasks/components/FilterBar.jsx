import CustomSelect from "@/shared/components/CustomSelect";

const FilterBar = ({ selectedStatus, onStatusChange }) => {
  const statusOptions = [
    { value: "all", label: "All Tasks" },
    { value: "pending", label: "Pending Tasks" },
    { value: "in-progress", label: "In Progress Tasks" },
    { value: "completed", label: "Completed Tasks" },
    { value: "given-up", label: "Given Up Tasks" },
  ];

  return (
    <div className="relative">
      <CustomSelect
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter by status"
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
