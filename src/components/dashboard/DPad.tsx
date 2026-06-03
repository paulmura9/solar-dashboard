import type { FC } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommandDirection } from "@/lib/types";

interface DPadProps {
  onDirection: (dir: CommandDirection) => void;
  disabled?: boolean;
}

const DPad: FC<DPadProps> = ({ onDirection, disabled = false }) => (
  <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
    <div />
    <Button
      variant="outline"
      size="icon"
      className="w-10 h-10 border-[#cbd5e1] text-[#64748b] shadow-sm hover:border-[#3b82f6] hover:text-[#3b82f6]"
      disabled={disabled}
      onClick={() => onDirection("UP")}
      aria-label="Move up"
    >
      <ChevronUp size={15} />
    </Button>
    <div />

    <Button
      variant="outline"
      size="icon"
      className="w-10 h-10 border-[#cbd5e1] text-[#64748b] shadow-sm hover:border-[#3b82f6] hover:text-[#3b82f6]"
      disabled={disabled}
      onClick={() => onDirection("LEFT")}
      aria-label="Move left"
    >
      <ChevronLeft size={15} />
    </Button>
    <div className="w-10 h-10 rounded-lg bg-[#f1f5f9] border border-[#cbd5e1] shadow-sm flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
    </div>
    <Button
      variant="outline"
      size="icon"
      className="w-10 h-10 border-[#cbd5e1] text-[#64748b] shadow-sm hover:border-[#3b82f6] hover:text-[#3b82f6]"
      disabled={disabled}
      onClick={() => onDirection("RIGHT")}
      aria-label="Move right"
    >
      <ChevronRight size={15} />
    </Button>

    <div />
    <Button
      variant="outline"
      size="icon"
      className="w-10 h-10 border-[#cbd5e1] text-[#64748b] shadow-sm hover:border-[#3b82f6] hover:text-[#3b82f6]"
      disabled={disabled}
      onClick={() => onDirection("DOWN")}
      aria-label="Move down"
    >
      <ChevronDown size={15} />
    </Button>
    <div />
  </div>
);

export default DPad;
