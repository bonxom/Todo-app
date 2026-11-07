import i18n from "@/shared/i18n";
export const FILE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.csv";
export function checkFiles(files: File[]) {
  if (files.length > 4) return i18n.t("agent:fileLimit");
  if (files.some((file) => !file.size || file.size > 10 * 1024 * 1024))
    return i18n.t("agent:fileSize");
  if (
    files.some(
      (file) => !/\.(jpe?g|png|gif|webp|pdf|txt|md|csv)$/i.test(file.name),
    )
  )
    return i18n.t("agent:fileType");
  return null;
}
