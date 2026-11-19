import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}

// Phone-only breakpoint (matches the stylesheet's <=639px surface). Charts and
// other layout-heavy widgets use this to switch to their compact control set
// without changing tablet or desktop presentation.
export function useIsPhone() {
  const query = '(max-width: 639px)'
  const [isPhone, setIsPhone] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsPhone(mql.matches)
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isPhone
}
