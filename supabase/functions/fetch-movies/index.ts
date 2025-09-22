import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    const { date } = await req.json()
    
    if (!date) {
      throw new Error('Date parameter is required')
    }
    
    // Construct the URL for Cineteca Nacional
    const url = `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${date}`
    
    console.log(`Fetching movies for date: ${date} from ${url}`)
    
    // Fetch the page with better headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`Received HTML, length: ${html.length}`)
    
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }
    
    const movies: Movie[] = []
    
    // Find all movie containers - updated selector based on actual HTML
    const movieContainers = doc.querySelectorAll('.col-12.col-md-6.col-lg-4.float-left')
    console.log(`Found ${movieContainers.length} movie containers`)
    
    for (const container of movieContainers) {
      try {
        // Extract movie title from the <p> tag with specific classes
        const titleElement = container.querySelector('p.font-weight-bold.text-uppercase.text-decoration-none.text-black')
        const title = titleElement?.textContent?.trim() || ''
        
        if (!title) {
          console.log('Skipping container: no title found')
          continue
        }
        
        // Extract image from the first <img> tag
        const imgElement = container.querySelector('img.img-fluid')
        const image = imgElement?.getAttribute('src') || ''
        
        // Extract director, year, duration info from the .small div
        const infoElement = container.querySelector('div.small')
        const info = infoElement?.textContent?.trim() || ''
        
        // Parse director, year, duration from info text
        let director = '', year = '', duration = ''
        const dirMatch = info.match(/Dir\.:\s*([^,]+)/)
        const yearMatch = info.match(/(\d{4})/)
        const durMatch = info.match(/Dur\.:\s*(\d+)\s*mins/)
        
        if (dirMatch) director = dirMatch[1].trim()
        if (yearMatch) year = yearMatch[1]
        if (durMatch) duration = durMatch[1] + ' mins'
        
        // Extract showtimes and ticket links from <a> tags with specific href pattern
        const showtimes: string[] = []
        const ticketLinks: string[] = []
        let room = ''
        
        // Find all ticket links within this container
        const timeLinks = container.querySelectorAll('a[href*="Ticketing"]')
        console.log(`Found ${timeLinks.length} ticket links for "${title}"`)
        
        for (const link of timeLinks) {
          const time = link.textContent?.trim()
          const ticketUrl = link.getAttribute('href')
          
          if (time && ticketUrl && time.match(/^\d{2}:\d{2}$/)) {
            showtimes.push(time)
            ticketLinks.push(ticketUrl)
          }
        }
        
        // Extract room information from the text content
        const textContent = container.textContent || ''
        const roomMatch = textContent.match(/SALA\s+(\d+[A-Za-z]*)\s+Xoco/)
        if (roomMatch) {
          room = `Sala ${roomMatch[1]}`
        }
        
        console.log(`Parsed movie: "${title}", ${showtimes.length} showtimes, room: ${room}`)
        
        if (title) {
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
    
    console.log(`Successfully parsed ${movies.length} movies`)
    
    return new Response(
      JSON.stringify({ 
        movies,
        debug: {
          url,
          date,
          totalFound: movies.length,
          containersFound: movieContainers.length,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    )
    
  } catch (error) {
    console.error('Error fetching movies:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        debug: {
          timestamp: new Date().toISOString(),
          url: req.url
        }
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    )
  }
})