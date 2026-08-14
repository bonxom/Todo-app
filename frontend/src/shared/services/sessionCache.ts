type CacheResetHandler = () => void | Promise<void>;

let activeResetHandler: CacheResetHandler | null = null;

export const registerUserCacheReset = (handler: CacheResetHandler): (() => void) => {
  activeResetHandler = handler;
  return () => {
    if (activeResetHandler === handler) {
      activeResetHandler = null;
    }
  };
};

export const resetUserCache = async (): Promise<void> => {
  if (activeResetHandler) {
    await activeResetHandler();
  }
};
