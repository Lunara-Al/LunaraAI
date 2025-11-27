import { useToast as useToastBase } from "./use-toast";

export function useConditionalToast() {
  const { toast: baseToast, ...rest } = useToastBase();

  const toast = (props: Parameters<typeof baseToast>[0]) => {
    const notificationsEnabled = localStorage.getItem("lunara-toast-notifications");
    const isEnabled = notificationsEnabled === null || JSON.parse(notificationsEnabled);

    if (isEnabled) {
      return baseToast(props);
    }
  };

  return {
    toast,
    ...rest,
  };
}
