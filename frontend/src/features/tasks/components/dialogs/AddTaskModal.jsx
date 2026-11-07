import { workspaceTranslate } from "@/features/tasks/utils/workspaceTranslation";
import FormDialog from "@/shared/components/FormDialog";
import AddTaskForm from "../Form/AddTaskForm";

const AddTaskModal = ({ isOpen, onClose, ...formProps }) => (
  <FormDialog
    isOpen={isOpen}
    onClose={onClose}
    title={workspaceTranslate("addTaskCasedAddTask")}
    kind="task"
  >
    <AddTaskForm onClose={onClose} {...formProps} />
  </FormDialog>
);
export default AddTaskModal;
