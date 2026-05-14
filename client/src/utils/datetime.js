import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

export function formatLocal(d, fmt = 'MMM D, YYYY · h:mm A') {
  if (!d) return '—'
  return dayjs(d).format(fmt)
}

export function fromNow(d) {
  if (!d) return ''
  return dayjs(d).fromNow()
}

export function toInputValue(d) {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DDTHH:mm')
}

export default dayjs
