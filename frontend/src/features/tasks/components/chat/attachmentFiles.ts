export const FILE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.csv";
export function checkFiles(files: File[]) {
  if (files.length > 4) return "Choose up to 4 files per message.";
  if (files.some((file) => !file.size || file.size > 10 * 1024 * 1024))
    return "Each file must be nonempty and 10 MiB or smaller.";
  if (
    files.some(
      (file) => !/\.(jpe?g|png|gif|webp|pdf|txt|md|csv)$/i.test(file.name),
    )
  )
    return "Choose an image, PDF, TXT, Markdown or CSV file.";
  return null;
}
