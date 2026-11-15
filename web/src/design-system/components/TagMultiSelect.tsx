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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
      setCustomInput("");
      setIsAdding(false);
    }
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
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                isSelected
                  ? "bg-[#047857] text-white border-[#047857] shadow-xs"
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
          .filter((t) => !availableTags.includes(t))
          .map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#047857] text-white border border-[#047857]"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
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
                className="h-7 w-28 rounded-md border border-[#047857] px-2 text-xs text-[#0F172A] focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="h-7 px-2 bg-[#047857] text-white text-xs rounded-md font-medium cursor-pointer"
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
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#047857] hover:bg-[#ECFDF5] border border-dashed border-[#CBD5E1] transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              <span>Add Other</span>
            </button>
          ))}
      </div>

      {helperText && <span className="text-[11px] text-[#475569]">{helperText}</span>}
    </div>
  );
};

