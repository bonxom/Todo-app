import type { IUserDocument } from "./IUser.js";
import type { TaskDto } from "../validations/taskDtoValidation.js";

export type TaskCommandOperation = "create" | "update" | "delete";

export type UiCommandOrigin = {
  channel: "a2ui";
  conversationId: string;
  turnId: string;
  surfaceId: string;
  actionId: string;
};

export type TaskCommandContext = Readonly<{
  user: IUserDocument;
  requestId: string;
  beforeWrite?: () => Promise<void>;
  origin?: UiCommandOrigin;
}>;

export type TaskCommandOutput = {
  task: TaskDto;
  deleted?: true;
};
