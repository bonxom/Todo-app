import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useCreateCategoryMutation } from "@/features/categories/api/categoryMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";

const AddCategoryForm = ({ onClose, onCategoryCreated }) => {
  const { t } = useTranslation("workspace");

  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [description, setDescription] = useState("");
  const createCategoryMutation = useCreateCategoryMutation();
  const isSubmitting = createCategoryMutation.isPending;

  const handleReset = () => {
    setName("");
    setDescription("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    try {
      const newCategory = {
        name,
        description,
      };

      const response = await createCategoryMutation.mutateAsync(newCategory);

      if (onCategoryCreated) {
        onCategoryCreated(response);
      }

      handleReset();
      onClose();
    } catch (error) {
      console.error("Failed to create category:", error);
      setSubmitError(
        getApiErrorMessage(error, t("failedToCreateCategoryPleaseTryAgain")),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="workspace-form flex flex-col gap-[20px] [&_label]:[font-weight:600] [&_label]:mb-[8px]
      [&_legend]:[font-weight:600] [&_legend]:mb-[8px] [&_.ui-input::placeholder]:opacity-[0.7]
      [@media(max-width:600px)]:gap-[17px]"
    >
      <div>
        <label
          htmlFor="category-name"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
          {t("categoryName")}{" "}
          <span className="text-[color:var(--color-danger)]">*</span>
        </label>
        <input
          id="category-name"
          name="category_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("eGWorkPersonalLearning")}
          className="ui-input"
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <label
          htmlFor="category-description"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
          {t("description")}
        </label>
        <textarea
          id="category-description"
          name="category_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("describeWhatBelongsInThisCategory")}
          rows={3}
          className="ui-input"
          autoComplete="off"
        />
      </div>

      {submitError && (
        <p
          className="workspace-form-error text-[var(--color-danger)] [background:var(--color-danger-soft)] rounded-[9px] p-[11px_13px] text-[12px] [line-height:1.6]"
          role="alert"
        >
          {submitError}
        </p>
      )}
      <div
        className="workspace-form-actions flex justify-end items-center gap-[10px] m-[4px_-28px_0]
        [background:var(--color-surface)] [border-top:1px_solid_var(--color-line)] sticky bottom-[0] z-1
        [&_button]:flex-[initial] [&_button]:rounded-[9px] [&_button]:min-h-[40px]
        [&_button[type=submit]]:min-w-[120px] [@media(max-width:600px)]:mx-[-20px]"
      >
        <button
          type="button"
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="ui-btn-secondary"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("adding") : t("addCategory")}
        </button>
      </div>
    </form>
  );
};

export default AddCategoryForm;
