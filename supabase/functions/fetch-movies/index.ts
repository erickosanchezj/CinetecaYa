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
  location: string
}

interface CinemaConfig {
  id: string
  name: string
}

const CINEMA_CONFIGS: CinemaConfig[] = [
  { id: '003', name: 'Cineteca Nacional' },
  { id: '002', name: 'Cineteca CENART' }
]

const MOVIE_CONTAINER_SELECTORS = [
  '.col-12.col-md-6.col-lg-4.float-left',
  '.col-12.col-sm-6.col-lg-4.float-left',
  '.col-12.col-md-6.col-xl-3.float-left',
  '.col-12.col-lg-4.float-left',
  '.cartelera-card',
  '.movie-card'
]

const buildCinemaUrl = (cinemaId: string, date: string) =>
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=${cinemaId}&dia=${date}`

async function fetchCinemaMovies(cinema: CinemaConfig, date: string) {
  const url = buildCinemaUrl(cinema.id, date)

  console.log(`Fetching movies for ${cinema.name} on ${date} from ${url}`)

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  console.log(`Received HTML for ${cinema.name}, length: ${html.length}`)

  const doc = new DOMParser().parseFromString(html, 'text/html')

  if (!doc) {
    throw new Error('Failed to parse HTML')
  }

  const movies: Movie[] = []

  const containerSet = new Set<Element>()
  for (const selector of MOVIE_CONTAINER_SELECTORS) {
    const found = doc.querySelectorAll(selector)
    for (const el of found) {
      containerSet.add(el)
    }
  }

  // Fallback: grab any column that contains a recognizable movie title element
  const potentialColumns = doc.querySelectorAll('div.col-12')
  for (const column of potentialColumns) {
    if (column.querySelector('p.font-weight-bold.text-uppercase.text-decoration-none.text-black')) {
      containerSet.add(column)
    }
  }

  const movieContainers = Array.from(containerSet)
  console.log(`Found ${movieContainers.length} potential movie containers for ${cinema.name}`)

  for (const container of movieContainers) {
    try {
      const titleElement = container.querySelector(
        'p.font-weight-bold.text-uppercase.text-decoration-none.text-black'
      )
      const title = titleElement?.textContent?.trim() || ''

      if (!title) {
        console.log(`Skipping container: no title found for ${cinema.name}`)
        continue
      }

      const imgElement = container.querySelector('img.img-fluid')
      const image = imgElement?.getAttribute('src') || ''

      const infoElement = container.querySelector('div.small')
      const info = infoElement?.textContent?.trim() || ''

      let director = '', year = '', duration = ''
      const dirMatch = info.match(/Dir\.:\s*([^,]+)/)
      const yearMatch = info.match(/(\d{4})/)
      const durMatch = info.match(/Dur\.:\s*(\d+)\s*mins/)

      if (dirMatch) director = dirMatch[1].trim()
      if (yearMatch) year = yearMatch[1]
      if (durMatch) duration = durMatch[1] + ' mins'

      const showtimes: string[] = []
      const ticketLinks: string[] = []
      let room = ''

      const timeRegex = /^\d{1,2}:\d{2}$/
      const anchorLinks = Array.from(container.querySelectorAll('a'))
      const badgeElements = Array.from(container.querySelectorAll('span.badge, span.badge-pill, span.badge-secondary'))

      const potentialTimeElements = [...anchorLinks, ...badgeElements]
      console.log(
        `Found ${potentialTimeElements.length} potential time elements for "${title}" at ${cinema.name}`
      )

      for (const element of potentialTimeElements) {
        const time = element.textContent?.trim()

        if (!time || !timeRegex.test(time)) {
          continue
        }

        if (showtimes.includes(time)) {
          continue
        }

        let ticketUrl = '#'
        if ((element as Element).tagName === 'A') {
          const href = (element as Element).getAttribute('href')
          if (href) {
            ticketUrl = href
          }
        }

        showtimes.push(time)
        ticketLinks.push(ticketUrl)
      }

      if (showtimes.length === 0) {
        // Some listings expose times as plain text separated by pipes or new lines
        const textMatches = (container.textContent || '')
          .split(/\n|\|/)
          .map((segment) => segment.trim())
          .filter((segment) => timeRegex.test(segment) && !showtimes.includes(segment))

        for (const match of textMatches) {
          showtimes.push(match)
          ticketLinks.push('#')
        }
      }

      const textContent = container.textContent || ''
      const roomMatch = textContent.match(/SALA\s+[^\n\r]*/i)
      if (roomMatch) {
        const cleanedRoom = roomMatch[0]
          .replace(/\s+(Xoco|CENART).*/i, '')
          .replace(/^SALA/i, 'Sala')
          .trim()
        room = cleanedRoom
      }

      console.log(`Parsed movie: "${title}", ${showtimes.length} showtimes, room: ${room}, location: ${cinema.name}`)

      movies.push({
        title,
        showtimes,
        image,
        room,
        director,
        year,
        duration,
        ticketLinks,
        location: cinema.name
      })
    } catch (error) {
      console.error(`Error parsing movie container for ${cinema.name}:`, error)
      continue
    }
  }

  return {
    movies,
    containersFound: movieContainers.length,
    url
  }
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
    let date: string | null = null

    // Try to read the JSON body first – if the request has no body (e.g. a GET
    // request that only includes query parameters) `req.json()` will throw. We
    // swallow that error so the function can still respond with a friendly
    // message instead of bubbling up a 500 status code to the caller.
    try {
      const body = await req.json()
      date = body?.date ?? null
    } catch (parseError) {
      console.warn('Request body could not be parsed as JSON:', parseError)
    }

    if (!date) {
      const urlObj = new URL(req.url)
      date = urlObj.searchParams.get('date')
    }

    if (!date) {
      return new Response(
        JSON.stringify({
          movies: [],
          error: 'Date parameter is required',
          debug: {
            timestamp: new Date().toISOString(),
            url: req.url
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }
    
    const cinemaResults = [] as Array<{
      movies: Movie[]
      containersFound: number
      url: string
      cinema: CinemaConfig
      error: string | null
    }>

    for (const cinema of CINEMA_CONFIGS) {
      try {
        const result = await fetchCinemaMovies(cinema, date)
        cinemaResults.push({ ...result, cinema, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error(`Error fetching movies for ${cinema.name}:`, errorMessage)
        cinemaResults.push({
          movies: [] as Movie[],
          containersFound: 0,
          url: buildCinemaUrl(cinema.id, date),
          cinema,
          error: errorMessage
        })

        // Be kind to the remote server if it is rate limiting us
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    const movies = cinemaResults.flatMap((result) => result.movies)

    console.log(`Successfully parsed ${movies.length} movies across ${cinemaResults.length} cinemas`)

    return new Response(
      JSON.stringify({
        movies,
        debug: {
          date,
          totalFound: movies.length,
          timestamp: new Date().toISOString(),
          cinemas: cinemaResults.map((result) => ({
            cinemaId: result.cinema.id,
            location: result.cinema.name,
            totalFound: result.movies.length,
            containersFound: result.containersFound,
            url: result.url,
            error: result.error
          }))
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
        movies: [],
        error: errorMessage,
        debug: {
          timestamp: new Date().toISOString(),
          url: req.url
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    )
  }
})
