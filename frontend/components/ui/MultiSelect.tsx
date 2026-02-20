import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

interface Option {
    id: string;
    label: string;
    color?: string; // Optional color dot
}

interface MultiSelectProps {
    options: Option[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
    label?: string;
}

export default function MultiSelect({ 
    options, 
    selectedIds, 
    onChange, 
    placeholder = "Select...",
    label
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleOption = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(item => item !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectAll = () => {
        onChange(options.map(o => o.id));
    };

    const clearAll = () => {
        onChange([]);
    };

    const displayText = selectedIds.length === 0 
        ? placeholder 
        : selectedIds.length === options.length 
            ? "All Selected" 
            : `${selectedIds.length} Selected`;

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>}
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-xl transition-colors border",
                    isOpen 
                        ? "bg-[#27272a] border-blue-500/50 text-white" 
                        : "bg-[#18181b] border-white/10 text-gray-300 hover:bg-[#27272a]"
                )}
            >
                <span className="truncate mr-2">{displayText}</span>
                <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#18181b] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden p-1 custom-scrollbar">
                    <div className="flex justify-between px-2 py-1.5 border-b border-white/5 mb-1 sticky top-0 bg-[#18181b] z-10">
                        <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Select All</button>
                        <button onClick={clearAll} className="text-xs text-gray-400 hover:text-white transition-colors">Clear</button>
                    </div>
                    
                    <div className="space-y-0.5">
                        {options.map(option => {
                            const isSelected = selectedIds.includes(option.id);
                            return (
                                <div 
                                    key={option.id}
                                    onClick={() => toggleOption(option.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors mx-1",
                                        isSelected ? "bg-blue-500/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                        isSelected ? "bg-blue-500 border-blue-500" : "border-gray-600 group-hover:border-gray-500"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    
                                    {option.color && (
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
                                    )}
                                    
                                    <span className="truncate flex-1">{option.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
