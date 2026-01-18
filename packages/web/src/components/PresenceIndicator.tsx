/**
 * Presence Indicator Component
 * Shows online/away/offline status with colored dot
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import type { Id } from "../../../convex/convex/_generated/dataModel";

interface PresenceIndicatorProps {
    userId: Id<"users">;
    showLabel?: boolean;
}

export const PresenceIndicator = ({ userId, showLabel = false }: PresenceIndicatorProps) => {
    const presence = useQuery(api.presence.getUserPresence, { userId });

    if (!presence) {
        return null;
    }

    const getStatusColor = () => {
        switch (presence.status) {
            case "online":
                return "bg-green-500";
            case "away":
                return "bg-yellow-500";
            case "offline":
                return "bg-gray-400";
        }
    };

    const getStatusLabel = () => {
        switch (presence.status) {
            case "online":
                return "Online";
            case "away":
                return "Away";
            case "offline":
                return "Offline";
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div
                className={`w-3 h-3 rounded-full ${getStatusColor()}`}
                title={getStatusLabel()}
            />
            {showLabel && (
                <span className="text-sm text-gray-600">{getStatusLabel()}</span>
            )}
        </div>
    );
};
