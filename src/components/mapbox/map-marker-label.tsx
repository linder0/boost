/**
 * Custom Airbnb-style map marker with label
 * Creates pill-shaped markers that show price or name
 */

export interface MarkerLabelOptions {
  label: string
  isSelected?: boolean
  priceLabel?: string // e.g., "$$$"
}

/**
 * Create a custom marker element with Airbnb-style pill design
 */
export function createMarkerElement(options: MarkerLabelOptions): HTMLDivElement {
  const { label, isSelected = false, priceLabel } = options

  const el = document.createElement('div')
  el.className = 'mapbox-custom-marker'

// Always show the name (label), ignore priceLabel
  const displayText = label

  // Truncate long names
  const truncatedText = displayText.length > 18
    ? displayText.substring(0, 16) + '...'
    : displayText

  // Apply styles - use object assignment for better control
  el.style.display = 'inline-block'
  el.style.backgroundColor = isSelected ? '#1a1a1a' : '#ffffff'
  el.style.color = isSelected ? '#ffffff' : '#1a1a1a'
  el.style.padding = '6px 10px'
  el.style.borderRadius = '16px'
  el.style.fontSize = '12px'
  el.style.fontWeight = '600'
  el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  el.style.whiteSpace = 'nowrap'
  el.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)'
  el.style.cursor = 'pointer'
  el.style.border = isSelected ? '2px solid #1a1a1a' : '1px solid rgba(0, 0, 0, 0.1)'
  el.style.transition = 'box-shadow 0.15s ease'
  el.style.pointerEvents = 'auto'
  el.style.width = 'auto'
  el.style.maxWidth = '120px'
  el.style.textAlign = 'center'
  el.style.overflow = 'hidden'
  el.style.textOverflow = 'ellipsis'

  el.textContent = truncatedText

  // Add hover effect - only change shadow, not transform (transforms break Mapbox positioning)
  el.addEventListener('mouseenter', () => {
    if (!isSelected) {
      el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)'
      el.style.backgroundColor = '#f5f5f5'
    }
  })

  el.addEventListener('mouseleave', () => {
    if (!isSelected) {
      el.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)'
      el.style.backgroundColor = '#ffffff'
    }
  })

  return el
}

/**
 * Update an existing marker element's selected state
 */
export function updateMarkerSelection(el: HTMLDivElement, isSelected: boolean): void {
  el.style.backgroundColor = isSelected ? '#1a1a1a' : '#ffffff'
  el.style.color = isSelected ? '#ffffff' : '#1a1a1a'
  el.style.border = isSelected ? '2px solid #1a1a1a' : '1px solid rgba(0, 0, 0, 0.1)'
  el.style.boxShadow = isSelected ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.15)'
}
