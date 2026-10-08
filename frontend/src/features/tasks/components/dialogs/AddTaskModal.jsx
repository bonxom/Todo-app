import FormDialog from "@/shared/components/FormDialog";
import AddTaskForm from "../Form/AddTaskForm";

const AddTaskModal = ({ isOpen, onClose, ...formProps }) => (
  <FormDialog isOpen={isOpen} onClose={onClose} title="Add Task" kind="task">
    <AddTaskForm onClose={onClose} {...formProps} />
  </FormDialog>
);
export default AddTaskModal;
