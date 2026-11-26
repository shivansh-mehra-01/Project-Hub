import React, { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagMultiSelectProps {
  label?: string;
  helperText?: string;
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  allowCustom?: boolean;
  className?: string;
}

export const TagMultiSelect: React.FC<TagMultiSelectProps> = ({
  label,
  helperText,
  availableTags,
  selectedTags,
  onChange,
  allowCustom = true,
  className,
}) => {
  const [customInput, setCustomInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setTagError(null);
    if (selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange(selectedTags.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
    } else {
      if (selectedTags.length >= 25) {
        setTagError("Maximum 25 skills can be selected.");
        return;
      }
      onChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (trimmed.includes(",")) {
      setTagError("Skill name cannot contain commas.");
      return;
    }
    if (trimmed.length > 50) {
      setTagError("Skill name cannot exceed 50 characters.");
      return;
    }
    if (selectedTags.length >= 25) {
      setTagError("Maximum 25 skills can be selected.");
      return;
    }
    if (selectedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagError(`"${trimmed}" is already selected.`);
      return;
    }
    setTagError(null);
    onChange([...selectedTags, trimmed]);
    setCustomInput("");
    setIsAdding(false);
  };

  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {label && (
        <label className="text-xs font-semibold text-[#0F172A] tracking-tight">
          {label}
        </label>
      )}

      {/* Selected & Available Chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                isSelected
                  ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              )}
            >
              {isSelected ? <Check className="h-3 w-3" strokeWidth={2} /> : null}
              <span>{tag}</span>
            </button>
          );
        })}

        {/* Custom Tags not in availableTags */}
        {selectedTags
          .filter((t) => !availableTags.some((a) => a.toLowerCase() === t.toLowerCase()))
          .map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-primary text-white border border-brand-primary"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                aria-label={`Remove ${tag}`}
                className="hover:text-red-200 cursor-pointer"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}

        {/* Add custom tag trigger */}
        {allowCustom &&
          (isAdding ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                  if (e.key === "Escape") setIsAdding(false);
                }}
                autoFocus
                placeholder="Type tag..."
                className="h-7 w-28 rounded-md border border-brand-primary px-2 text-xs text-[#0F172A] focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="h-7 px-2 bg-brand-primary text-white text-xs rounded-md font-medium cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-brand-primary hover:bg-brand-primary-tint border border-dashed border-[#CBD5E1] transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              <span>Add Other</span>
            </button>
          ))}
      </div>

      {tagError && <span role="alert" className="text-[11px] text-rose-600 font-medium">{tagError}</span>}
      {helperText && <span className="text-[11px] text-[#475569]">{helperText}</span>}
    </div>
  );
};

