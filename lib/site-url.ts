export function getSiteOrigin(fallbackOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  const url = new URL(configured || fallbackOrigin)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('The site origin is invalid.')
  }
  return url.origin
}
