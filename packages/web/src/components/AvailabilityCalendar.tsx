/**
 * Availability Calendar Component
 * Visual weekly calendar for selecting availability time slots
 */

import { useState } from "react";

interface TimeSlot {
    start: string;
    end: string;
}

interface AvailabilityData {
    [day: string]: TimeSlot[];
}

interface AvailabilityCalendarProps {
    availability: AvailabilityData;
    onChange: (availability: AvailabilityData) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generate time slots (30-minute intervals)
const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 30]) {
            const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            slots.push(time);
        }
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

export const AvailabilityCalendar = ({
    availability,
    onChange,
}: AvailabilityCalendarProps) => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const isSlotSelected = (day: string, time: string): boolean => {
        const daySlots = availability[day] || [];
        return daySlots.some((slot) => {
            const slotStart = TIME_SLOTS.indexOf(slot.start);
            const slotEnd = TIME_SLOTS.indexOf(slot.end);
            const currentIndex = TIME_SLOTS.indexOf(time);
            return currentIndex >= slotStart && currentIndex < slotEnd;
        });
    };

    const toggleSlot = (day: string, time: string) => {
        const daySlots = availability[day] || [];
        const timeIndex = TIME_SLOTS.indexOf(time);
        const nextTime = TIME_SLOTS[timeIndex + 1];

        if (!nextTime) return;

        // Check if slot is already selected
        const existingSlotIndex = daySlots.findIndex((slot) => {
            const slotStart = TIME_SLOTS.indexOf(slot.start);
            const slotEnd = TIME_SLOTS.indexOf(slot.end);
            return timeIndex >= slotStart && timeIndex < slotEnd;
        });

        let newSlots;
        if (existingSlotIndex >= 0) {
            // Remove the slot
            newSlots = daySlots.filter((_, index) => index !== existingSlotIndex);
        } else {
            // Add new slot
            newSlots = [...daySlots, { start: time, end: nextTime }];
            // Merge overlapping slots
            newSlots = mergeTimeSlots(newSlots);
        }

        onChange({
            ...availability,
            [day]: newSlots,
        });
    };

    const mergeTimeSlots = (slots: TimeSlot[]): TimeSlot[] => {
        if (slots.length === 0) return [];

        // Sort by start time
        const sorted = [...slots].sort((a, b) => {
            return TIME_SLOTS.indexOf(a.start) - TIME_SLOTS.indexOf(b.start);
        });

        const merged: TimeSlot[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const last = merged[merged.length - 1];

            const lastEndIndex = TIME_SLOTS.indexOf(last.end);
            const currentStartIndex = TIME_SLOTS.indexOf(current.start);

            if (currentStartIndex <= lastEndIndex) {
                // Overlapping or adjacent, merge
                const currentEndIndex = TIME_SLOTS.indexOf(current.end);
                const mergedEndIndex = Math.max(lastEndIndex, currentEndIndex);
                last.end = TIME_SLOTS[mergedEndIndex];
            } else {
                merged.push(current);
            }
        }

        return merged;
    };

    const clearDay = (day: string) => {
        const newAvailability = { ...availability };
        delete newAvailability[day];
        onChange(newAvailability);
    };

    const formatTime = (time: string) => {
        const [hour, minute] = time.split(":");
        const h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
    };

    return (
        <div>
            {/* Day Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {DAYS.map((day, index) => {
                    const hasSlots = availability[day] && availability[day].length > 0;
                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${selectedDay === day
                                ? "bg-primary-600 text-white"
                                : hasSlots
                                    ? "bg-primary-100 text-primary-800"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            {DAY_LABELS[index]}
                            {hasSlots && (
                                <span className="ml-1 text-xs">
                                    ({availability[day].length})
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Time Slot Grid */}
            {selectedDay && (
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 capitalize">{selectedDay}</h3>
                        {availability[selectedDay] && availability[selectedDay].length > 0 && (
                            <button
                                onClick={() => clearDay(selectedDay)}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
                        {TIME_SLOTS.slice(16, 44).map((time) => {
                            // Show 8 AM to 10 PM (most common hours)
                            const isSelected = isSlotSelected(selectedDay, time);
                            return (
                                <button
                                    key={time}
                                    onClick={() => toggleSlot(selectedDay, time)}
                                    className={`px-2 py-2 text-xs rounded transition ${isSelected
                                        ? "bg-primary-600 text-white"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                        }`}
                                >
                                    {formatTime(time)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Ranges Display */}
                    {availability[selectedDay] && availability[selectedDay].length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">Selected times:</p>
                            <div className="flex flex-wrap gap-2">
                                {availability[selectedDay].map((slot, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                                    >
                                        {formatTime(slot.start)} - {formatTime(slot.end)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!selectedDay && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                    Select a day above to set your availability
                </div>
            )}

            {/* Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                    {Object.keys(availability).length === 0
                        ? "No availability set yet"
                        : `Availability set for ${Object.keys(availability).length} day(s)`}
                </p>
            </div>
        </div>
    );
};
