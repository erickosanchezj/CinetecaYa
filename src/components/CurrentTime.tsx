import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const CurrentTime = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const mexicoCityTime = toZonedTime(new Date(), "America/Mexico_City");
      setCurrentTime(mexicoCityTime);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-primary font-medium">
      <Clock className="w-5 h-5" />
      <div className="text-center">
        <div className="text-lg font-bold">
          {format(currentTime, "HH:mm:ss")}
        </div>
        <div className="text-sm text-muted-foreground">
          Mexico City • {format(currentTime, "EEEE, MMMM do")}
        </div>
      </div>
    </div>
  );
};