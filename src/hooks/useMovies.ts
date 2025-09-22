import { useState, useEffect } from "react";
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

export const useMovies = () => {
  const [movies, setMovies] = useState<MovieWithUpcoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current date in Mexico City timezone
      const mexicoCityTime = toZonedTime(new Date(), "America/Mexico_City");
      const dateStr = format(mexicoCityTime, "yyyy-MM-dd");
      const currentHour = mexicoCityTime.getHours();
      const currentMinute = mexicoCityTime.getMinutes();

      console.log(`Fetching movies for ${dateStr}, current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

      // Call our edge function
      const { data, error: functionError } = await supabase.functions.invoke('fetch-movies', {
        body: { date: dateStr }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data || !data.movies) {
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
      if (upcomingCount > 0) {
        toast({
          title: "Movies Found!",
          description: `${upcomingCount} movie${upcomingCount > 1 ? 's' : ''} starting within the hour`,
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
  };

  useEffect(() => {
    fetchMovies();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchMovies, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    movies,
    loading,
    error,
    refetch: fetchMovies
  };
};