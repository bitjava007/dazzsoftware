import { getNotifications } from "@/actions/notifications";
import { NotificationsContent } from "./notifications-content";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const notifications = await getNotifications({
    status: params.status,
    channel: params.channel,
    start: params.start,
    end: params.end,
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique des messages envoyés aux clients
          </p>
        </div>
      </div>
      <NotificationsContent notifications={notifications} filters={params} />
    </div>
  );
}
