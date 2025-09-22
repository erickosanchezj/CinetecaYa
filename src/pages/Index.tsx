import { useState } from "react";
import { RefreshCw, Film, Search } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CurrentTime } from "@/components/CurrentTime";
import { MovieCard } from "@/components/MovieCard";
import { DateTimePicker } from "@/components/DateTimePicker";
import { useMovies } from "@/hooks/useMovies";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [manualDate, setManualDate] = useState<Date | undefined>();
  const [manualTime, setManualTime] = useState<string | undefined>();
  const [isManualMode, setIsManualMode] = useState(false);

  const { movies, loading, error, lastFetchTime, refetch } = useMovies({
    manualDate,
    manualTime
  });

  const handleDateTimeChange = (date: Date, time: string) => {
    setManualDate(date);
    setManualTime(time);
    setIsManualMode(true);
    refetch(date, time);
  };

  const handleReset = () => {
    setManualDate(undefined);
    setManualTime(undefined);
    setIsManualMode(false);
    refetch();
  };

  const getCurrentDateTime = () => {
    const mexicoCityTime = toZonedTime(new Date(), "America/Mexico_City");
    return {
      date: mexicoCityTime,
      time: format(mexicoCityTime, "HH:mm")
    };
  };

  const upcomingMovies = movies.filter(movie => movie.upcomingShowtimes.length > 0);
  const otherMovies = movies.filter(movie => movie.upcomingShowtimes.length === 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Film className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Cineteca Ahora</h1>
                <p className="text-sm text-muted-foreground">Movies starting soon</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <CurrentTime />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={loading}
                className="border-primary/30 hover:bg-primary/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Debug Controls */}
          <div className="mt-4">
            <DateTimePicker
              onDateTimeChange={handleDateTimeChange}
              onReset={handleReset}
              currentDate={manualDate || getCurrentDateTime().date}
              currentTime={manualTime || getCurrentDateTime().time}
              isManual={isManualMode}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="space-y-8">
            <div className="text-center">
              <Skeleton className="h-8 w-64 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to fetch movies</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && movies.length > 0 && lastFetchTime && (
          <div className="text-center text-xs text-muted-foreground mb-6">
            Last updated: {format(lastFetchTime, "HH:mm:ss")} • 
            {isManualMode ? " Manual mode" : " Live mode"}
          </div>
        )}

        {/* Movies Content */}
        {!loading && !error && (
          <div className="space-y-12">
            {/* Upcoming Movies Section */}
            {upcomingMovies.length > 0 && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0 cinema-glow"></div>
                    Starting Within the Hour
                  </h2>
                  <p className="text-muted-foreground">
                    {upcomingMovies.length} movie{upcomingMovies.length > 1 ? 's' : ''} you can catch right now
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {upcomingMovies.map((movie, index) => (
                    <MovieCard
                      key={`upcoming-${index}`}
                      movie={movie}
                      upcomingShowtimes={movie.upcomingShowtimes}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Movies Section */}
            {otherMovies.length > 0 && (
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {upcomingMovies.length > 0 ? 'All Other Movies Today' : 'Today\'s Movies'}
                  </h2>
                  <p className="text-muted-foreground">
                    Complete lineup at Cineteca Nacional
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {otherMovies.map((movie, index) => (
                    <MovieCard
                      key={`other-${index}`}
                      movie={movie}
                      upcomingShowtimes={[]}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {movies.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Film className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">No movies found</h2>
                <p className="text-muted-foreground">
                  Check back later or try refreshing the page
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Data from{" "}
            <a
              href="https://www.cinetecanacional.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Cineteca Nacional
            </a>
            {" • "}Updates every 5 minutes
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
