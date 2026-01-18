/**
 * Skills Autocomplete Component
 * Search and select skills with autocomplete functionality
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";

interface SkillAutocompleteProps {
    selectedSkills: string[];
    onChange: (skills: string[]) => void;
    placeholder?: string;
}

export const SkillAutocomplete = ({
    selectedSkills,
    onChange,
    placeholder = "Search for skills...",
}: SkillAutocompleteProps) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentUser = useQuery(
        api.auth.getUserByFirebaseUid,
        user ? { firebaseUid: user.uid } : "skip"
    );

    // Search skills with debouncing
    const searchResults = useQuery(
        api.skills.searchSkills,
        searchTerm.length >= 2 ? { searchTerm } : "skip"
    );

    const popularSkills = useQuery(api.skills.getAllSkills);
    const createSkill = useMutation(api.skills.createSkill);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addSkill = async (skillName: string) => {
        if (!selectedSkills.includes(skillName)) {
            onChange([...selectedSkills, skillName]);
        }
        setSearchTerm("");
        setIsOpen(false);
    };

    const removeSkill = (skillName: string) => {
        onChange(selectedSkills.filter((s) => s !== skillName));
    };

    const handleCreateNewSkill = async () => {
        if (searchTerm.trim() && currentUser) {
            try {
                await createSkill({
                    name: searchTerm.trim(),
                    category: "Other",
                    userId: currentUser._id,
                });
                addSkill(searchTerm.trim());
            } catch (error) {
                console.error("Error creating skill:", error);
            }
        }
    };

    const displaySkills = searchTerm.length >= 2 ? searchResults : popularSkills;
    const filteredSkills = displaySkills?.filter(
        (skill) => !selectedSkills.includes(skill.name)
    );

    const showCreateOption =
        searchTerm.length >= 2 &&
        !filteredSkills?.some((s) => s.name.toLowerCase() === searchTerm.toLowerCase());

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Selected Skills Tags */}
            {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedSkills.map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
                        >
                            {skill}
                            <button
                                onClick={() => removeSkill(skill)}
                                className="hover:text-primary-900 transition"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />

                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSkills && filteredSkills.length > 0 ? (
                        <ul>
                            {filteredSkills.slice(0, 10).map((skill) => (
                                <li key={skill._id}>
                                    <button
                                        onClick={() => addSkill(skill.name)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between"
                                    >
                                        <span className="font-medium">{skill.name}</span>
                                        <span className="text-xs text-gray-500">{skill.category}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : searchTerm.length >= 2 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm">No skills found</div>
                    ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">
                            {popularSkills && popularSkills.length > 0
                                ? "Popular skills"
                                : "Start typing to search..."}
                        </div>
                    )}

                    {/* Create New Skill Option */}
                    {showCreateOption && (
                        <button
                            onClick={handleCreateNewSkill}
                            className="w-full px-4 py-3 text-left border-t border-gray-200 hover:bg-primary-50 transition text-primary-700 font-medium"
                        >
                            + Create "{searchTerm}"
                        </button>
                    )}
                </div>
            )}

            {/* Helper Text */}
            <p className="text-sm text-gray-500 mt-2">
                {searchTerm.length < 2 && "Type at least 2 characters to search"}
                {selectedSkills.length > 0 && ` • ${selectedSkills.length} skill(s) selected`}
            </p>
        </div>
    );
};
