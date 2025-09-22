import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Movie {
  title: string;
  showtimes: string[];
  image: string;
  room: string;
  director: string;
  year: string;
  duration: string;
  ticketLinks: string[];
}

interface MovieWithUpcoming extends Movie {
  upcomingShowtimes: Array<{ time: string; ticketLink: string }>;
}

interface UseMoviesOptions {
  manualDate?: Date;
  manualTime?: string;
}

export const useMovies = (options: UseMoviesOptions = {}) => {
  const [movies, setMovies] = useState<MovieWithUpcoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchMovies = useCallback(async (customDate?: Date, customTime?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Use custom date/time if provided, otherwise use current Mexico City time
      const useCustom = customDate || options.manualDate;
      const targetDate = useCustom || toZonedTime(new Date(), "America/Mexico_City");
      const dateStr = format(targetDate, "yyyy-MM-dd");
      
      let currentHour: number;
      let currentMinute: number;
      
      if (customTime || options.manualTime) {
        const timeStr = customTime || options.manualTime || "00:00";
        const [hourStr, minuteStr] = timeStr.split(':');
        currentHour = parseInt(hourStr);
        currentMinute = parseInt(minuteStr);
      } else {
        const mexicoCityTime = toZonedTime(new Date(), "America/Mexico_City");
        currentHour = mexicoCityTime.getHours();
        currentMinute = mexicoCityTime.getMinutes();
      }

      console.log(`Fetching movies for ${dateStr}, time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} ${useCustom ? '(manual)' : '(auto)'}`);

      setLastFetchTime(new Date());

      // Call our edge function
      const { data, error: functionError } = await supabase.functions.invoke('fetch-movies', {
        body: { date: dateStr }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data) {
        throw new Error('No movie data received');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.movies) {
        throw new Error('No movie data received');
      }

      // Process movies to find upcoming showtimes
      const processedMovies: MovieWithUpcoming[] = data.movies.map((movie: Movie) => {
        const upcomingShowtimes: Array<{ time: string; ticketLink: string }> = [];

        movie.showtimes.forEach((time, index) => {
          // Parse showtime (format: HH:MM)
          const [hourStr, minuteStr] = time.split(':');
          const showtimeHour = parseInt(hourStr);
          const showtimeMinute = parseInt(minuteStr);

          // Check if showtime is within the next hour
          const currentTotalMinutes = currentHour * 60 + currentMinute;
          const showtimeTotalMinutes = showtimeHour * 60 + showtimeMinute;
          const timeDiff = showtimeTotalMinutes - currentTotalMinutes;

          // If showtime is within the next 60 minutes (and not in the past)
          if (timeDiff >= 0 && timeDiff <= 60) {
            upcomingShowtimes.push({
              time,
              ticketLink: movie.ticketLinks[index] || '#'
            });
          }
        });

        return {
          ...movie,
          upcomingShowtimes
        };
      });

      // Sort movies: those with upcoming showtimes first
      const sortedMovies = processedMovies.sort((a, b) => {
        if (a.upcomingShowtimes.length > 0 && b.upcomingShowtimes.length === 0) return -1;
        if (a.upcomingShowtimes.length === 0 && b.upcomingShowtimes.length > 0) return 1;
        return 0;
      });

      setMovies(sortedMovies);

      const upcomingCount = sortedMovies.filter(m => m.upcomingShowtimes.length > 0).length;
      const timeType = (customDate || customTime || options.manualDate || options.manualTime) ? 'manual' : 'live';
      
      if (upcomingCount > 0) {
        toast({
          title: `Movies Found! (${timeType})`,
          description: `${upcomingCount} movie${upcomingCount > 1 ? 's' : ''} starting within the hour`,
        });
      } else {
        toast({
          title: `No Upcoming Movies (${timeType})`,
          description: `Found ${sortedMovies.length} total movies, but none starting soon`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch movies';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [options.manualDate, options.manualTime, toast]);

  useEffect(() => {
    // Only auto-fetch if not using manual date/time
    if (!options.manualDate && !options.manualTime) {
      fetchMovies();
      
      // Refresh every 5 minutes for live mode only
      const interval = setInterval(() => fetchMovies(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchMovies, options.manualDate, options.manualTime]);

  return {
    movies,
    loading,
    error,
    lastFetchTime,
    refetch: fetchMovies
  };
};