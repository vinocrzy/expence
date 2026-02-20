
import { motion } from 'framer-motion';

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function NativeSegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex bg-gray-800 p-1 rounded-xl relative w-full sm:w-auto">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                onChange(option.value);
            }}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-active"
                className="absolute inset-0 bg-gray-600 rounded-lg -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
