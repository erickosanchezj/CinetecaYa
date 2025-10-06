import { Clock, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Movie {
  title: string;
  showtimes: string[];
  image: string;
  room: string;
  director: string;
  year: string;
  duration: string;
  ticketLinks: string[];
  location: string;
}

interface MovieCardProps {
  movie: Movie;
  upcomingShowtimes: Array<{ time: string; ticketLink: string }>;
}

export const MovieCard = ({ movie, upcomingShowtimes }: MovieCardProps) => {
  return (
    <Card className="group bg-card hover:bg-card/80 border-border transition-all duration-300 hover:shadow-[var(--shadow-card)] hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={movie.image}
            alt={movie.title}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://images.unsplash.com/photo-1489599849699-c93c2f7d72b5?w=400&h=600&fit=crop&crop=center";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {upcomingShowtimes.length > 0 && (
            <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium cinema-glow">
              Comienza pronto
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {movie.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {movie.director && `Dir. ${movie.director}`}
              {movie.year && ` • ${movie.year}`}
              {movie.duration && ` • ${movie.duration}`}
            </p>
          </div>
          
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>
            {movie.room && movie.location
              ? `${movie.room} • ${movie.location}`
              : movie.room || movie.location || "Cineteca Nacional"}
          </span>
        </div>
          
          {upcomingShowtimes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Clock className="w-4 h-4" />
                <span>Comienza en la próxima hora:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {upcomingShowtimes.map((showtime, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                    asChild
                  >
                    <a
                      href={showtime.ticketLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      {showtime.time}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {upcomingShowtimes.length === 0 && movie.showtimes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Todas las funciones de hoy:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {movie.showtimes.slice(0, 4).map((time, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs"
                  >
                    {time}
                  </span>
                ))}
                {movie.showtimes.length > 4 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                    +{movie.showtimes.length - 4} más
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};