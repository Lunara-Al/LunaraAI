import { useToast as useToastBase } from "./use-toast";

export function useConditionalToast() {
  const { toast: baseToast, ...rest } = useToastBase();

  const toast = (props: Parameters<typeof baseToast>[0]) => {
    const notificationsEnabled = localStorage.getItem("lunara-toast-notifications");
    // Default to true if null, but if explicitly false, suppress
    const isEnabled = notificationsEnabled !== "false";

    if (isEnabled) {
      return baseToast(props);
    }
  };

  return {
    toast,
    ...rest,
  };
}
