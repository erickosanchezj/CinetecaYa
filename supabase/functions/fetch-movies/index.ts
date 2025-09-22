import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

interface Movie {
  title: string
  showtimes: string[]
  image: string
  room: string
  director: string
  year: string
  duration: string
  ticketLinks: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { date } = await req.json()
    
    // Construct the URL for Cineteca Nacional
    const url = `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${date}`
    
    console.log(`Fetching movies for date: ${date} from ${url}`)
    
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }
    
    const movies: Movie[] = []
    
    // Find all movie containers
    const movieContainers = doc.querySelectorAll('.col-12.col-md-6.col-lg-4.float-left')
    
    for (const container of movieContainers) {
      try {
        // Extract movie title
        const titleElement = container.querySelector('.font-weight-bold.text-uppercase')
        const title = titleElement?.textContent?.trim() || ''
        
        // Extract image
        const imgElement = container.querySelector('img')
        const image = imgElement?.getAttribute('src') || ''
        
        // Extract director, year, duration info
        const infoElement = container.querySelector('.small')
        const info = infoElement?.textContent?.trim() || ''
        
        // Parse director, year, duration from info text
        let director = '', year = '', duration = ''
        const dirMatch = info.match(/Dir\.: ([^,]+)/)
        const yearMatch = info.match(/(\d{4})/)
        const durMatch = info.match(/Dur\.: (\d+) mins/)
        
        if (dirMatch) director = dirMatch[1].trim()
        if (yearMatch) year = yearMatch[1]
        if (durMatch) duration = durMatch[1] + ' mins'
        
        // Extract showtimes and ticket links
        const showtimes: string[] = []
        const ticketLinks: string[] = []
        let room = ''
        
        const timeLinks = container.querySelectorAll('a[href*="Ticketing"]')
        for (const link of timeLinks) {
          const time = link.textContent?.trim()
          const ticketUrl = link.getAttribute('href')
          
          if (time && ticketUrl) {
            showtimes.push(time)
            ticketLinks.push(ticketUrl)
          }
        }
        
        // Extract room information
        const roomElement = container.querySelector('.pb-1.small')
        if (roomElement) {
          const roomText = roomElement.textContent || ''
          const roomMatch = roomText.match(/SALA (\d+[A-Za-z]*) Xoco/)
          if (roomMatch) {
            room = `Sala ${roomMatch[1]}`
          }
        }
        
        if (title && showtimes.length > 0) {
          movies.push({
            title,
            showtimes,
            image,
            room,
            director,
            year,
            duration,
            ticketLinks
          })
        }
      } catch (error) {
        console.error('Error parsing movie container:', error)
        continue
      }
    }
    
    console.log(`Found ${movies.length} movies`)
    
    return new Response(
      JSON.stringify({ movies }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
    
  } catch (error) {
    console.error('Error fetching movies:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})