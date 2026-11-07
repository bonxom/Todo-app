import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import CustomSelect from "./CustomSelect";

export default function LanguageSelect() {
  const { t, i18n } = useTranslation("common");
  return (
    <CustomSelect
      aria-label={t("language")}
      value={i18n.resolvedLanguage === "vi" ? "vi" : "en"}
      onChange={(event) => {
        void setLanguage(event.target.value);
      }}
      wrapperClassName="ui-language-select ui-custom-select--inline"
      className="!w-auto !min-h-9 !px-2 !py-1 text-xs"
    >
      <option value="en" lang="en">
        English
      </option>
      <option value="vi" lang="vi">
        Tiếng Việt
      </option>
    </CustomSelect>
  );
}
