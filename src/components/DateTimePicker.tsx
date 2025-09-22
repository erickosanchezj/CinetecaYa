import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DateTimePickerProps {
  onDateTimeChange: (date: Date, time: string) => void;
  onReset: () => void;
  currentDate: Date;
  currentTime: string;
  isManual: boolean;
}

export const DateTimePicker = ({ 
  onDateTimeChange, 
  onReset, 
  currentDate, 
  currentTime,
  isManual 
}: DateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [selectedTime, setSelectedTime] = useState(currentTime);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateTimeChange(date, selectedTime);
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    onDateTimeChange(selectedDate, time);
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Test Scraping
        </CardTitle>
        <CardDescription className="text-xs">
          Override date and time to test different scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Date Picker */}
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 text-xs",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {selectedDate ? format(selectedDate, "MMM dd") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Input */}
          <div className="space-y-1">
            <Label htmlFor="time" className="text-xs">Time</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onDateTimeChange(selectedDate, selectedTime)}
            size="sm"
            className="flex-1 h-7 text-xs"
          >
            Test Scraping
          </Button>
          
          {isManual && (
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isManual && (
          <div className="text-xs text-accent font-medium text-center py-1 px-2 bg-accent/10 rounded">
            Using manual time: {format(selectedDate, "MMM dd")} at {selectedTime}
          </div>
        )}
      </CardContent>
    </Card>
  );
};