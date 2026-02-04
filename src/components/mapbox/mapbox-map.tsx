'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { createMarkerElement, updateMarkerSelection } from './map-marker-label'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string          // Display text on marker (shown as pill label)
  priceLabel?: string     // Alternative label e.g., "$$$"
  color?: string          // Fallback for simple dot markers
  draggable?: boolean
  useCustomMarker?: boolean  // Use Airbnb-style pill marker
}

export interface MarkerPosition {
  id: string
  x: number
  y: number
  lat: number
  lng: number
}

interface MapboxMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  selectedMarkerId?: string | null
  interactive?: boolean
  clickToSet?: boolean
  onMapClick?: (coords: { lat: number; lng: number }) => void
  onMarkerClick?: (markerId: string, position: MarkerPosition) => void
  onMarkerDrag?: (markerId: string, coords: { lat: number; lng: number }) => void
  className?: string
  height?: string
  radiusMeters?: number
}

export function MapboxMap({
  center = { lat: 40.7128, lng: -74.006 }, // Default to NYC
  zoom = 12,
  markers = [],
  selectedMarkerId,
  interactive = true,
  clickToSet = false,
  onMapClick,
  onMarkerClick,
  onMarkerDrag,
  className = '',
  height = '300px',
  radiusMeters,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, { marker: any; element: HTMLDivElement }>>(new Map())
  const mapboxglRef = useRef<any>(null)
  const hasFitBoundsRef = useRef(false)  // Track if we've already fit bounds
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Get marker screen position
  const getMarkerPosition = useCallback((markerId: string, lat: number, lng: number): MarkerPosition => {
    if (!mapRef.current) {
      return { id: markerId, x: 0, y: 0, lat, lng }
    }
    const point = mapRef.current.project([lng, lat])
    return { id: markerId, x: point.x, y: point.y, lat, lng }
  }, [])

  // Load mapbox-gl dynamically on client side
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapContainer.current) return
    if (mapRef.current) return // Already initialized
    if (!accessToken) return

    let isMounted = true

    const initMap = async () => {
      try {
        // Dynamically import mapbox-gl
        const mapboxModule = await import('mapbox-gl')
        const mapboxgl = mapboxModule.default

        // Import CSS
        await import('mapbox-gl/dist/mapbox-gl.css')

        if (!isMounted || !mapContainer.current) return

        // Store reference
        mapboxglRef.current = mapboxgl

        // Set access token
        mapboxgl.accessToken = accessToken

        // Create map
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [center.lng, center.lat],
          zoom: zoom,
          interactive: interactive,
        })

        mapRef.current = map

        map.on('load', () => {
          if (isMounted) {
            setMapReady(true)
          }
        })

        map.on('error', (e: any) => {
          const msg = e.error?.message || ''
          if (msg.includes('Not Authorized') || msg.includes('Invalid Token')) {
            setError('Invalid Mapbox token')
          } else {
            console.error('Mapbox error:', e.error)
          }
        })

        // Add navigation controls if interactive
        if (interactive) {
          map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        }

        // Handle click-to-set
        if (clickToSet && onMapClick) {
          map.on('click', (e: any) => {
            onMapClick({
              lat: e.lngLat.lat,
              lng: e.lngLat.lng,
            })
          })
          map.getCanvas().style.cursor = 'crosshair'
        }
      } catch (err) {
        console.error('Failed to load Mapbox:', err)
        if (isMounted) {
          setError('Failed to load map')
        }
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [accessToken, interactive, clickToSet])

  // Update center/zoom when props change
  useEffect(() => {
    if (mapRef.current && mapReady) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom,
        duration: 500,
      })
    }
  }, [center.lat, center.lng, zoom, mapReady])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady || !mapboxglRef.current) return

    const mapboxgl = mapboxglRef.current

    // Remove existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current.clear()

    // Add new markers
    markers.forEach((markerData) => {
      const useCustom = markerData.useCustomMarker !== false && (markerData.label || markerData.priceLabel)
      const isSelected = selectedMarkerId === markerData.id

      let el: HTMLDivElement

      if (useCustom) {
        // Create Airbnb-style pill marker
        el = createMarkerElement({
          label: markerData.label || markerData.priceLabel || '',
          priceLabel: markerData.priceLabel,
          isSelected,
        })
      } else {
        // Create simple dot marker
        el = document.createElement('div')
        el.className = 'mapbox-marker'
        el.style.backgroundColor = markerData.color || '#000000'
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '50%'
        el.style.border = '3px solid white'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        el.style.cursor = markerData.draggable ? 'grab' : 'pointer'
      }

      const marker = new mapboxgl.Marker({
          element: el,
          draggable: markerData.draggable || false,
          anchor: 'center'  // Center the marker on coordinates
        })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(mapRef.current!)

      // Handle drag end event
      if (markerData.draggable && onMarkerDrag) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          onMarkerDrag(markerData.id, { lat: lngLat.lat, lng: lngLat.lng })
        })
      }

      // Handle marker click
      if (onMarkerClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          const position = getMarkerPosition(markerData.id, markerData.lat, markerData.lng)
          onMarkerClick(markerData.id, position)
        })
      }

      markersRef.current.set(markerData.id, { marker, element: el })
    })

    // Fit bounds only on initial load (not when selection changes)
    if (markers.length > 1 && !hasFitBoundsRef.current) {
      hasFitBoundsRef.current = true
      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((m) => bounds.extend([m.lng, m.lat]))
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 1000,
      })
    }
  }, [markers, mapReady, onMarkerClick, onMarkerDrag, getMarkerPosition, selectedMarkerId])

  // Update selected marker styling
  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      const isSelected = selectedMarkerId === id
      updateMarkerSelection(element, isSelected)
    })
  }, [selectedMarkerId])

  // Draw radius circle
  useEffect(() => {
    if (!mapRef.current || !mapReady || !radiusMeters) return

    const map = mapRef.current
    const sourceId = 'radius-circle'
    const layerId = 'radius-circle-fill'
    const outlineLayerId = 'radius-circle-outline'

    // Create a GeoJSON circle (approximation using 64 points)
    const createGeoJSONCircle = (centerLng: number, centerLat: number, radiusInMeters: number, points = 64) => {
      const coords = []
      const km = radiusInMeters / 1000
      const distanceX = km / (111.32 * Math.cos((centerLat * Math.PI) / 180))
      const distanceY = km / 110.574

      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI)
        const x = distanceX * Math.cos(theta)
        const y = distanceY * Math.sin(theta)
        coords.push([centerLng + x, centerLat + y])
      }
      coords.push(coords[0]) // Close the circle

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
        properties: {},
      }
    }

    const circleData = createGeoJSONCircle(center.lng, center.lat, radiusMeters)

    // Helper to safely check if layer/source exists
    const safeGetLayer = (id: string) => {
      try {
        return map.getLayer(id)
      } catch {
        return undefined
      }
    }
    const safeGetSource = (id: string) => {
      try {
        return map.getSource(id)
      } catch {
        return undefined
      }
    }

    // Remove existing layers/source if they exist
    if (safeGetLayer(layerId)) map.removeLayer(layerId)
    if (safeGetLayer(outlineLayerId)) map.removeLayer(outlineLayerId)
    if (safeGetSource(sourceId)) map.removeSource(sourceId)

    // Add the circle source and layers
    map.addSource(sourceId, {
      type: 'geojson',
      data: circleData,
    })

    map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.1,
      },
    })

    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-opacity': 0.5,
      },
    })

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {
        // Map may have been removed, ignore cleanup errors
      }
    }
  }, [center.lat, center.lng, radiusMeters, mapReady])

  // No token configured
  if (!accessToken) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted rounded-md p-4 ${className}`}
        style={{ height }}
      >
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Mapbox not configured
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-destructive/10 rounded-md p-4 ${className}`}
        style={{ height }}
      >
        <p className="text-sm font-medium text-destructive mb-2">
          Map Error
        </p>
        <p className="text-xs text-destructive/80 text-center">
          {error}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className={`rounded-md overflow-hidden bg-muted ${className}`}
      style={{ height }}
    />
  )
}
